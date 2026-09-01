

import { Chunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z, CHUNK_VOLUME } from './chunk.js';

export const DB_NAME = 'Minecraft1_5_World';
export const DB_VERSION = 1;
export const STORES = Object.freeze({
    CHUNKS: 'chunks',
    PLAYER: 'player',
    WORLD: 'worldMeta'
});

// ==========================================
// 1. RUN-LENGTH ENCODING (RLE) COMPRESSION
// ==========================================

export function encodeChunkRLE(blocks) {
    const len = blocks.length;
    if (len === 0) return new Uint8Array(0);

    const runs = [];
    let currentVal = blocks[0];
    let currentCount = 1;

    for (let i = 1; i < len; i++) {
        const val = blocks[i];
        if (val === currentVal && currentCount < 65535) {
            currentCount++;
        } else {
            runs.push(currentCount, currentVal);
            currentVal = val;
            currentCount = 1;
        }
    }
    runs.push(currentCount, currentVal);

    // Each run takes 3 bytes: 2 bytes for count (Uint16), 1 byte for blockId (Uint8)
    const runCount = runs.length / 2;
    const buffer = new ArrayBuffer(runCount * 3);
    const view = new DataView(buffer);

    for (let i = 0; i < runCount; i++) {
        const count = runs[i * 2];
        const blockId = runs[i * 2 + 1];
        const byteOffset = i * 3;
        view.setUint16(byteOffset, count, true); // little-endian
        view.setUint8(byteOffset + 2, blockId);
    }

    return new Uint8Array(buffer);
}

export function decodeChunkRLE(rleBuffer, expectedLength = CHUNK_VOLUME) {
    if (!rleBuffer || rleBuffer.byteLength === 0) {
        return new Uint8Array(expectedLength);
    }

    const output = new Uint8Array(expectedLength);
    const view = new DataView(
        rleBuffer.buffer ? rleBuffer.buffer : rleBuffer,
        rleBuffer.byteOffset || 0,
        rleBuffer.byteLength || (rleBuffer.buffer ? rleBuffer.buffer.byteLength : 0)
    );

    const totalBytes = view.byteLength;
    const runCount = Math.floor(totalBytes / 3);
    let writeIdx = 0;

    for (let i = 0; i < runCount; i++) {
        const byteOffset = i * 3;
        const count = view.getUint16(byteOffset, true);
        const blockId = view.getUint8(byteOffset + 2);

        if (writeIdx + count > expectedLength) {
            output.fill(blockId, writeIdx, expectedLength);
            break;
        } else {
            output.fill(blockId, writeIdx, writeIdx + count);
            writeIdx += count;
        }
    }

    return output;
}

// ==========================================
// 2. INDEXED DB STORAGE WRAPPER
// ==========================================

export class WorldStorage {
    
    constructor(dbName = DB_NAME, version = DB_VERSION) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.isReady = false;
        this.initPromise = null;
        this.autoSaveTimer = null;
        this.fallbackMemory = {
            chunks: new Map(),
            player: null,
            worldMeta: null
        };
    }

    async init() {
        if (this.isReady && this.db) return this.db;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            // Check if IndexedDB is available in the current environment
            const indexedDB = typeof window !== 'undefined' 
                ? (window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB)
                : null;

            if (!indexedDB) {
                console.warn('[WorldStorage] IndexedDB not supported in this environment. Falling back to memory storage.');
                this.isReady = true;
                resolve(null);
                return;
            }

            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 1. Chunks Store (Key: "x,z", Value: { key, x, z, data, modifiedAt })
                if (!db.objectStoreNames.contains(STORES.CHUNKS)) {
                    const chunkStore = db.createObjectStore(STORES.CHUNKS, { keyPath: 'key' });
                    chunkStore.createIndex('x', 'x', { unique: false });
                    chunkStore.createIndex('z', 'z', { unique: false });
                    chunkStore.createIndex('modifiedAt', 'modifiedAt', { unique: false });
                }

                // 2. Player Store (Key: "id", Value: { id: "player", position, rotation, health, inventory, ... })
                if (!db.objectStoreNames.contains(STORES.PLAYER)) {
                    db.createObjectStore(STORES.PLAYER, { keyPath: 'id' });
                }

                // 3. World Metadata Store (Key: "id", Value: { id: "meta", seed, time, name, ... })
                if (!db.objectStoreNames.contains(STORES.WORLD)) {
                    db.createObjectStore(STORES.WORLD, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isReady = true;
                console.log(`[WorldStorage] IndexedDB "${this.dbName}" initialized successfully.`);
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('[WorldStorage] Failed to open IndexedDB:', event.target.error);
                this.isReady = true; // Fallback to memory
                resolve(null);
            };
        });

        return this.initPromise;
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    // ==========================================
    // 3. CHUNK PERSISTENCE METHODS
    // ==========================================

    async saveChunk(chunk) {
        await this.init();
        if (!chunk) return false;

        const key = this.getChunkKey(chunk.x, chunk.z);
        const rleData = encodeChunkRLE(chunk.blocks);
        const record = {
            key,
            x: chunk.x,
            z: chunk.z,
            sizeX: chunk.sizeX || CHUNK_SIZE_X,
            sizeY: chunk.sizeY || CHUNK_SIZE_Y,
            sizeZ: chunk.sizeZ || CHUNK_SIZE_Z,
            data: rleData,
            modifiedAt: Date.now()
        };

        if (!this.db) {
            this.fallbackMemory.chunks.set(key, record);
            chunk.isDirty = false;
            return true;
        }

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([STORES.CHUNKS], 'readwrite');
            const store = tx.objectStore(STORES.CHUNKS);
            const req = store.put(record);

            req.onsuccess = () => {
                chunk.isDirty = false;
                resolve(true);
            };
            req.onerror = (e) => {
                console.error(`[WorldStorage] Failed to save chunk ${key}:`, e.target.error);
                resolve(false);
            };
        });
    }

    async saveChunks(chunks, dirtyOnly = true) {
        await this.init();
        if (!Array.isArray(chunks) || chunks.length === 0) return 0;

        const chunksToSave = dirtyOnly ? chunks.filter(c => c && c.isDirty) : chunks;
        if (chunksToSave.length === 0) return 0;

        if (!this.db) {
            for (const chunk of chunksToSave) {
                const key = this.getChunkKey(chunk.x, chunk.z);
                const rleData = encodeChunkRLE(chunk.blocks);
                this.fallbackMemory.chunks.set(key, {
                    key,
                    x: chunk.x,
                    z: chunk.z,
                    data: rleData,
                    modifiedAt: Date.now()
                });
                chunk.isDirty = false;
            }
            return chunksToSave.length;
        }

        return new Promise((resolve) => {
            const tx = this.db.transaction([STORES.CHUNKS], 'readwrite');
            const store = tx.objectStore(STORES.CHUNKS);
            let savedCount = 0;

            for (const chunk of chunksToSave) {
                const key = this.getChunkKey(chunk.x, chunk.z);
                const rleData = encodeChunkRLE(chunk.blocks);
                const record = {
                    key,
                    x: chunk.x,
                    z: chunk.z,
                    sizeX: chunk.sizeX || CHUNK_SIZE_X,
                    sizeY: chunk.sizeY || CHUNK_SIZE_Y,
                    sizeZ: chunk.sizeZ || CHUNK_SIZE_Z,
                    data: rleData,
                    modifiedAt: Date.now()
                };

                const req = store.put(record);
                req.onsuccess = () => {
                    chunk.isDirty = false;
                    savedCount++;
                };
            }

            tx.oncomplete = () => resolve(savedCount);
            tx.onerror = (e) => {
                console.error('[WorldStorage] Batch chunk save transaction error:', e);
                resolve(savedCount);
            };
        });
    }

    async loadChunk(x, z, targetChunk = null) {
        await this.init();
        const key = this.getChunkKey(x, z);

        let record = null;
        if (!this.db) {
            record = this.fallbackMemory.chunks.get(key) || null;
        } else {
            record = await new Promise((resolve) => {
                const tx = this.db.transaction([STORES.CHUNKS], 'readonly');
                const store = tx.objectStore(STORES.CHUNKS);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        }

        if (!record || !record.data) {
            return null;
        }

        const sizeX = record.sizeX || CHUNK_SIZE_X;
        const sizeY = record.sizeY || CHUNK_SIZE_Y;
        const sizeZ = record.sizeZ || CHUNK_SIZE_Z;
        const decompressed = decodeChunkRLE(record.data, sizeX * sizeY * sizeZ);

        const chunk = targetChunk || new Chunk(x, z, sizeX, sizeY, sizeZ);
        chunk.blocks.set(decompressed);
        chunk.isDirty = false;

        return chunk;
    }

    async hasChunk(x, z) {
        await this.init();
        const key = this.getChunkKey(x, z);

        if (!this.db) {
            return this.fallbackMemory.chunks.has(key);
        }

        return new Promise((resolve) => {
            const tx = this.db.transaction([STORES.CHUNKS], 'readonly');
            const store = tx.objectStore(STORES.CHUNKS);
            const req = store.count(key);
            req.onsuccess = () => resolve(req.result > 0);
            req.onerror = () => resolve(false);
        });
    }

    async deleteChunk(x, z) {
        await this.init();
        const key = this.getChunkKey(x, z);

        if (!this.db) {
            return this.fallbackMemory.chunks.delete(key);
        }

        return new Promise((resolve) => {
            const tx = this.db.transaction([STORES.CHUNKS], 'readwrite');
            const store = tx.objectStore(STORES.CHUNKS);
            const req = store.delete(key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    }

    async getAllChunkKeys() {
        await this.init();

        if (!this.db) {
            return Array.from(this.fallbackMemory.chunks.keys());
        }

        return new Promise((resolve) => {
            const tx = this.db.transaction([STORES.CHUNKS], 'readonly');
            const store = tx.objectStore(STORES.CHUNKS);
            const req = store.getAllKeys();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    }

    async loadAllChunks() {
        await this.init();
        const chunkMap = new Map();

        if (!this.db) {
            for (const [key, record] of this.fallbackMemory.chunks) {
                const decompressed = decodeChunkRLE(record.data, (record.sizeX || CHUNK_SIZE_X) * (record.sizeY || CHUNK_SIZE_Y) * (record.sizeZ || CHUNK_SIZE_Z));
                const chunk = new Chunk(record.x, record.z, record.sizeX, record.sizeY, record.sizeZ);
                chunk.blocks.set(decompressed);
                chunk.isDirty = false;
                chunkMap.set(key, chunk);
            }
            return chunkMap;
        }

        return new Promise((resolve) => {
            const tx = this.db.transaction([STORES.CHUNKS], 'readonly');
            const store = tx.objectStore(STORES.CHUNKS);
            const req = store.getAll();

            req.onsuccess = () => {
                const records = req.result || [];
                for (const record of records) {
                    const decompressed = decodeChunkRLE(record.data, (record.sizeX || CHUNK_SIZE_X) * (record.sizeY || CHUNK_SIZE_Y) * (record.sizeZ || CHUNK_SIZE_Z));
                    const chunk = new Chunk(record.x, record.z, record.sizeX, record.sizeY, record.sizeZ);
                    chunk.blocks.set(decompressed);
                    chunk.isDirty = false;
                    chunkMap.set(record.key, chunk);
                }
                resolve(chunkMap);
            };

            req.onerror = () => resolve(chunkMap);
        });
    }

    // ==========================================
    // 4. PLAYER STATE PERSISTENCE
    // ==========================================

    async savePlayer(playerData, playerId = 'main_player') {
        await this.init();
        if (!playerData) return false;

        const record = {
            id: playerId,
            position: playerData.position ? {
                x: Number(playerData.position.x || 0),
                y: Number(playerData.position.y || 0),
                z: Number(playerData.position.z || 0)
            } : { x: 8, y: 30, z: 8 },
            rotation: playerData.rotation ? {
                yaw: Number(playerData.rotation.yaw || 0),
                pitch: Number(playerData.rotation.pitch || 0)
            } : { yaw: 0, pitch: 0 },
            health: playerData.health !== undefined ? Number(playerData.health) : 20,
            hunger: playerData.hunger !== undefined ? Number(playerData.hunger) : 20,
            selectedSlot: playerData.selectedSlot !== undefined ? Number(playerData.selectedSlot) : 0,
            inventory: playerData.inventory ? JSON.parse(JSON.stringify(playerData.inventory)) : [],
            armor: playerData.armor ? JSON.parse(JSON.stringify(playerData.armor)) : [],
            gameMode: playerData.gameMode || 'survival',
            savedAt: Date.now()
        };

        if (!this.db) {
            this.fallbackMemory.player = record;
            return true;
        }

        return new Promise((resolve) => {
            const tx = this.db.transaction([STORES.PLAYER], 'readwrite');
            const store = tx.objectStore(STORES.PLAYER);
            const req = store.put(record);
            req.onsuccess = () => resolve(true);
            req.onerror = (e) => {
                console.error('[WorldStorage] Failed to save player data:', e.target.error);
                resolve(false);
            };
        });
    }

    async loadPlayer(playerId = 'main_player') {
        await this.init();

        if (!this.db) {
            return this.fallbackMemory.player ? JSON.parse(JSON.stringify(this.fallbackMemory.player)) : null;
        }

        return new Promise((resolve) => {
            const tx = this.db.transaction([STORES.PLAYER], 'readonly');
            const store = tx.objectStore(STORES.PLAYER);
            const req = store.get(playerId);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    }

    // ==========================================
    // 5. WORLD METADATA PERSISTENCE
    // ==========================================

    async saveWorldMeta(meta, metaId = 'meta') {
        await this.init();
        if (!meta) return false;

        const record = {
            id: metaId,
            name: meta.name || 'World 1',
            seed: meta.seed !== undefined ? meta.seed : 1337,
            time: meta.time !== undefined ? meta.time : 6000,
            dayCount: meta.dayCount !== undefined ? meta.dayCount : 1,
            spawnPoint: meta.spawnPoint || { x: 8, y: 30, z: 8 },
            createdAt: meta.createdAt || Date.now(),
            lastSavedAt: Date.now()
        };

        if (!this.db) {
            this.fallbackMemory.worldMeta = record;
            return true;
        }

        return new Promise((resolve) => {
            const tx = this.db.transaction([STORES.WORLD], 'readwrite');
            const store = tx.objectStore(STORES.WORLD);
            const req = store.put(record);
            req.onsuccess = () => resolve(true);
            req.onerror = (e) => {
                console.error('[WorldStorage] Failed to save world meta:', e.target.error);
                resolve(false);
            };
        });
    }

    async loadWorldMeta(metaId = 'meta') {
        await this.init();

        if (!this.db) {
            return this.fallbackMemory.worldMeta ? JSON.parse(JSON.stringify(this.fallbackMemory.worldMeta)) : null;
        }

        return new Promise((resolve) => {
            const tx = this.db.transaction([STORES.WORLD], 'readonly');
            const store = tx.objectStore(STORES.WORLD);
            const req = store.get(metaId);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    }

    // ==========================================
    // 6. CLEAR / EXPORT / IMPORT SAVE FILE
    // ==========================================

    async clearWorld() {
        await this.init();

        this.fallbackMemory = {
            chunks: new Map(),
            player: null,
            worldMeta: null
        };

        if (!this.db) return true;

        return new Promise((resolve) => {
            const tx = this.db.transaction([STORES.CHUNKS, STORES.PLAYER, STORES.WORLD], 'readwrite');
            tx.objectStore(STORES.CHUNKS).clear();
            tx.objectStore(STORES.PLAYER).clear();
            tx.objectStore(STORES.WORLD).clear();

            tx.oncomplete = () => {
                console.log('[WorldStorage] World cleared successfully.');
                resolve(true);
            };
            tx.onerror = () => resolve(false);
        });
    }

    async exportWorldJSON() {
        await this.init();

        const player = await this.loadPlayer();
        const worldMeta = await this.loadWorldMeta();
        const chunkKeys = await this.getAllChunkKeys();
        const chunks = [];

        for (const key of chunkKeys) {
            const [x, z] = key.split(',').map(Number);
            const chunk = await this.loadChunk(x, z);
            if (chunk) {
                // Convert Uint8Array to base64
                let binary = '';
                const bytes = encodeChunkRLE(chunk.blocks);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64Data = (typeof btoa !== 'undefined') ? btoa(binary) : Buffer.from(bytes).toString('base64');

                chunks.push({
                    x: chunk.x,
                    z: chunk.z,
                    data: base64Data
                });
            }
        }

        const exportData = {
            version: '1.5.0',
            exportedAt: Date.now(),
            worldMeta,
            player,
            chunks
        };

        return JSON.stringify(exportData, null, 2);
    }

    async importWorldJSON(jsonString) {
        await this.init();
        try {
            const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
            await this.clearWorld();

            if (data.worldMeta) {
                await this.saveWorldMeta(data.worldMeta);
            }
            if (data.player) {
                await this.savePlayer(data.player);
            }
            if (Array.isArray(data.chunks)) {
                for (const chunkRecord of data.chunks) {
                    const binary = (typeof atob !== 'undefined') ? atob(chunkRecord.data) : Buffer.from(chunkRecord.data, 'base64').toString('binary');
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }

                    const decompressed = decodeChunkRLE(bytes);
                    const chunk = new Chunk(chunkRecord.x, chunkRecord.z);
                    chunk.blocks.set(decompressed);
                    await this.saveChunk(chunk);
                }
            }

            console.log(`[WorldStorage] Successfully imported world with ${data.chunks ? data.chunks.length : 0} chunks.`);
            return true;
        } catch (err) {
            console.error('[WorldStorage] Failed to import world JSON:', err);
            return false;
        }
    }

    // ==========================================
    // 7. AUTOSAVE SYSTEM
    // ==========================================

    startAutoSave(hooks, intervalMs = 15000) {
        this.stopAutoSave();

        this.autoSaveTimer = setInterval(async () => {
            try {
                if (hooks.getChunks) {
                    const chunks = hooks.getChunks();
                    if (Array.isArray(chunks)) {
                        const saved = await this.saveChunks(chunks, true);
                        if (saved > 0) {
                            console.log(`[WorldStorage Autosave] Saved ${saved} dirty chunk(s).`);
                        }
                    }
                }

                if (hooks.getPlayer) {
                    const player = hooks.getPlayer();
                    if (player) {
                        await this.savePlayer(player);
                    }
                }

                if (hooks.getWorldMeta) {
                    const meta = hooks.getWorldMeta();
                    if (meta) {
                        await this.saveWorldMeta(meta);
                    }
                }
            } catch (err) {
                console.error('[WorldStorage Autosave] Error during auto-save:', err);
            }
        }, intervalMs);

        console.log(`[WorldStorage] Autosave active (interval: ${intervalMs / 1000}s).`);
    }

    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('[WorldStorage] Autosave stopped.');
        }
    }
}
