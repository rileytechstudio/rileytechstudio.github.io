

import { Chunk, BLOCKS, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './chunk.js';
import { TerrainGenerator } from '../terrain/generator.js';
import { createChunkMesh } from './mesher.js';
import { createMob } from '../entity/mob.js';
import { getMobDrop, spawnDroppedItem } from '../entity/droppedItem.js';

export const DEFAULT_LOAD_RADIUS = 4;

export const NON_SOLID_BLOCKS = new Set([
    BLOCKS.AIR,
    BLOCKS.OAK_SAPLING,
    BLOCKS.WATER_FLOWING,
    BLOCKS.WATER,
    BLOCKS.LAVA_FLOWING,
    BLOCKS.LAVA,
    BLOCKS.TALL_GRASS,
    BLOCKS.DEAD_BUSH,
    BLOCKS.DANDELION,
    BLOCKS.POPPY,
    BLOCKS.BROWN_MUSHROOM,
    BLOCKS.RED_MUSHROOM,
    BLOCKS.TORCH,
    BLOCKS.FIRE,
    BLOCKS.WHEAT,
    BLOCKS.SNOW_LAYER,
    BLOCKS.SUGAR_CANE
]);

export class World {
    
    constructor(options = {}) {
        this.seed = options.seed !== undefined ? options.seed : 1337;
        this.dimension = options.dimension || (options.generator && options.generator.dimension) || (options.generatorConfig && options.generatorConfig.dimension) || 'overworld';

        const genConfig = Object.assign({ dimension: this.dimension }, options.generatorConfig || {});
        this.generator = options.generator || new TerrainGenerator(this.seed, genConfig);
        if (this.generator && this.generator.dimension) {
            this.dimension = this.generator.dimension;
        }

        this.loadRadius = options.loadRadius !== undefined ? options.loadRadius : DEFAULT_LOAD_RADIUS;
        this.radiusShape = options.radiusShape || 'circle';

        this.scene = options.scene || null;
        this.autoMesh = options.autoMesh !== undefined ? options.autoMesh : (this.scene !== null);
        this.material = options.material || null;
        this.storage = options.storage || null;

        this.chunks = new Map();

        this.entities = new Set();

        this.listeners = new Map();

        this.deferredBlocks = new Map();

        // Track player last chunk coordinates to optimize updates
        this.lastPlayerChunkX = null;
        this.lastPlayerChunkZ = null;
    }

    getDimension() {
        return this.dimension;
    }

    setDimension(dimension) {
        if (this.dimension === dimension) return;
        this.dimension = dimension;
        if (this.generator) {
            this.generator.dimension = dimension;
            if (this.generator.config) {
                this.generator.config.dimension = dimension;
            }
        }
        this.emit('dimensionChange', dimension);
    }

    // ==========================================
    // 1. COORDINATE TRANSFORMATIONS & HELPERS
    // ==========================================

    getChunkKey(cx, cz) {
        return `${cx},${cz}`;
    }

    parseChunkKey(key) {
        const parts = key.split(',');
        return { cx: Number(parts[0]), cz: Number(parts[1]) };
    }

    worldToChunkCoords(worldX, worldZ) {
        return {
            cx: Math.floor(worldX / CHUNK_SIZE_X),
            cz: Math.floor(worldZ / CHUNK_SIZE_Z)
        };
    }

    worldToLocalCoords(worldX, worldY, worldZ) {
        const cx = Math.floor(worldX / CHUNK_SIZE_X);
        const cz = Math.floor(worldZ / CHUNK_SIZE_Z);
        const lx = ((Math.floor(worldX) % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
        const lz = ((Math.floor(worldZ) % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
        const ly = Math.floor(worldY);

        return { cx, cz, lx, ly, lz };
    }

    // ==========================================
    // 2. CHUNK ACCESS & LIFECYCLE
    // ==========================================

    getChunk(cx, cz) {
        if (this._lastCx === cx && this._lastCz === cz && this._lastChunk !== undefined) {
            return this._lastChunk;
        }
        const chunk = this.chunks.get(this.getChunkKey(cx, cz)) || null;
        this._lastCx = cx;
        this._lastCz = cz;
        this._lastChunk = chunk;
        return chunk;
    }

    hasChunk(cx, cz) {
        return this.chunks.has(this.getChunkKey(cx, cz));
    }

    getChunkAtWorldPos(worldX, worldZ) {
        const { cx, cz } = this.worldToChunkCoords(worldX, worldZ);
        return this.getChunk(cx, cz);
    }

    setDeferredBlock(worldX, worldY, worldZ, blockId) {
        if (worldY < 0 || worldY >= CHUNK_SIZE_Y) return false;
        
        const { cx, cz, lx, ly, lz } = this.worldToLocalCoords(worldX, worldY, worldZ);
        const chunk = this.getChunk(cx, cz);
        
        if (chunk) {
            return this.setBlock(worldX, worldY, worldZ, blockId, false);
        } else {
            const key = this.getChunkKey(cx, cz);
            if (!this.deferredBlocks.has(key)) {
                this.deferredBlocks.set(key, []);
            }
            this.deferredBlocks.get(key).push({ lx, ly, lz, blockId });
            return true;
        }
    }

    loadChunk(cx, cz) {
        const key = this.getChunkKey(cx, cz);
        if (this.chunks.has(key)) {
            return this.chunks.get(key);
        }

        // Create new chunk instance
        const chunk = new Chunk(cx, cz, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z);
        this.chunks.set(key, chunk);

        // Populate chunk voxels via TerrainGenerator
        this.generator.generateChunk(cx, cz, chunk, this);

        // Apply deferred blocks
        if (this.deferredBlocks.has(key)) {
            const pending = this.deferredBlocks.get(key);
            for (const pb of pending) {
                chunk.setBlock(pb.lx, pb.ly, pb.lz, pb.blockId);
            }
            this.deferredBlocks.delete(key);
        }

        // Create Three.js mesh if scene and autoMesh are enabled
        if (this.scene && this.autoMesh) {
            // Pass 'this' (the world) so mesher can query neighboring chunk lighting
            const mesh = createChunkMesh(chunk, this);
            this.scene.add(mesh);
        }

        // Notify neighbors that a new chunk has loaded so they can update their border lighting
        const n1 = this.chunks.get(this.getChunkKey(cx - 1, cz));
        if (n1) n1.isDirty = true;
        const n2 = this.chunks.get(this.getChunkKey(cx + 1, cz));
        if (n2) n2.isDirty = true;
        const n3 = this.chunks.get(this.getChunkKey(cx, cz - 1));
        if (n3) n3.isDirty = true;
        const n4 = this.chunks.get(this.getChunkKey(cx, cz + 1));
        if (n4) n4.isDirty = true;
        
        // Ensure this chunk itself eventually gets remeshed if neighbors load later
        chunk.isDirty = true;

        this.emit('chunkLoad', chunk);
        return chunk;
    }

    unloadChunk(cx, cz) {
        if (this._lastCx === cx && this._lastCz === cz) {
            this._lastChunk = undefined;
        }
        const key = this.getChunkKey(cx, cz);
        const chunk = this.chunks.get(key);
        if (!chunk) return false;

        // Save to storage if storage is configured and chunk was modified
        if (this.storage && chunk.isDirty && typeof this.storage.saveChunk === 'function') {
            this.storage.saveChunk(chunk);
        }

        // Dispose Three.js mesh if attached
        if (chunk.mesh) {
            if (this.scene) {
                this.scene.remove(chunk.mesh);
            }
            if (chunk.mesh.geometry) {
                chunk.mesh.geometry.dispose();
            }
            chunk.mesh = null;
        }

        this.chunks.delete(key);
        this.emit('chunkUnload', chunk);
        return true;
    }

    // ==========================================
    // 3. DYNAMIC CHUNK STREAMING (UPDATE)
    // ==========================================

    isChunkInRadius(cx, cz, playerChunkX, playerChunkZ, radius) {
        const dx = cx - playerChunkX;
        const dz = cz - playerChunkZ;

        if (this.radiusShape === 'square') {
            return Math.abs(dx) <= radius && Math.abs(dz) <= radius;
        }

        // Default: Euclidean circular radius
        return (dx * dx + dz * dz) <= (radius * radius);
    }

    update(playerX, playerZ, radius = this.loadRadius) {
        const playerChunkX = Math.floor(playerX / CHUNK_SIZE_X);
        const playerChunkZ = Math.floor(playerZ / CHUNK_SIZE_Z);

        this.lastPlayerChunkX = playerChunkX;
        this.lastPlayerChunkZ = playerChunkZ;

        const requiredKeys = new Set();
        const toLoad = [];
        const unloadedChunks = [];

        // 1. Determine all chunk keys that must be loaded within the radius
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const cx = playerChunkX + dx;
                const cz = playerChunkZ + dz;

                if (this.isChunkInRadius(cx, cz, playerChunkX, playerChunkZ, radius)) {
                    const key = this.getChunkKey(cx, cz);
                    requiredKeys.add(key);

                    // If chunk is not yet loaded, queue it
                    if (!this.chunks.has(key)) {
                        toLoad.push({ cx, cz, dist: dx*dx + dz*dz });
                    }
                }
            }
        }

        // 2. Identify and unload any currently loaded chunks outside the radius
        for (const [key, chunk] of this.chunks.entries()) {
            if (!requiredKeys.has(key)) {
                unloadedChunks.push(chunk);
                this.unloadChunk(chunk.x, chunk.z);
            }
        }
        
        // 3. Load chunks asynchronously (max 2 per frame) to prevent stutter
        const loadedChunks = [];
        if (toLoad.length > 0) {
            toLoad.sort((a, b) => a.dist - b.dist);
            // Time-slice: generate closest chunks this frame
            const maxPerFrame = 1;
            for (let i = 0; i < maxPerFrame; i++) {
                const closest = toLoad[i];
                const chunk = this.loadChunk(closest.cx, closest.cz);
                loadedChunks.push(chunk);
            }
        }

        return {
            loaded: loadedChunks,
            unloaded: unloadedChunks,
            total: this.chunks.size
        };
    }

    // ==========================================
    // 4. VOXEL & BLOCK MANIPULATION
    // ==========================================

    getBlock(worldX, worldY, worldZ) {
        if (worldY < 0 || worldY >= CHUNK_SIZE_Y) {
            return BLOCKS.AIR;
        }

        const { cx, cz, lx, ly, lz } = this.worldToLocalCoords(worldX, worldY, worldZ);
        const chunk = this.getChunk(cx, cz);

        if (!chunk) {
            return -1; // -1 represents an unloaded chunk. Treated as solid to cull chunk boundaries and prevent player from falling into the void.
        }

        return chunk.getBlock(lx, ly, lz);
    }

    getBlockAt(worldX, worldY, worldZ) {
        return this.getBlock(worldX, worldY, worldZ);
    }

    setBlock(worldX, worldY, worldZ, blockId, markDirty = true) {
        if (worldY < 0 || worldY >= CHUNK_SIZE_Y) {
            return false;
        }

        const { cx, cz, lx, ly, lz } = this.worldToLocalCoords(worldX, worldY, worldZ);
        const chunk = this.getChunk(cx, cz);

        if (!chunk) {
            return false;
        }

        const oldBlock = chunk.getBlock(lx, ly, lz);
        if (oldBlock === blockId) {
            return true;
        }

        const success = chunk.setBlock(lx, ly, lz, blockId);
        if (!success) return false;

        if (markDirty) {
            chunk.isDirty = true;

            // Mark adjacent neighbor chunks dirty if modified voxel lies on chunk boundary
            if (lx === 0) {
                const neighbor = this.getChunk(cx - 1, cz);
                if (neighbor) neighbor.isDirty = true;
            } else if (lx === CHUNK_SIZE_X - 1) {
                const neighbor = this.getChunk(cx + 1, cz);
                if (neighbor) neighbor.isDirty = true;
            }

            if (lz === 0) {
                const neighbor = this.getChunk(cx, cz - 1);
                if (neighbor) neighbor.isDirty = true;
            } else if (lz === CHUNK_SIZE_Z - 1) {
                const neighbor = this.getChunk(cx, cz + 1);
                if (neighbor) neighbor.isDirty = true;
            }

            this.emit('blockChange', {
                x: worldX,
                y: worldY,
                z: worldZ,
                oldBlock,
                newBlock: blockId
            });
        }

        return true;
    }

    getLight(worldX, worldY, worldZ) {
        if (worldY < 0 || worldY >= CHUNK_SIZE_Y) return 15 << 4;
        const { cx, cz, lx, ly, lz } = this.worldToLocalCoords(worldX, worldY, worldZ);
        const chunk = this.getChunk(cx, cz);
        if (!chunk) {
            // Fake lighting for unloaded chunks mathematically
            if (this.generator && typeof this.generator.getHeight === 'function') {
                const surfaceY = this.generator.getHeight(worldX, worldZ);
                return worldY > surfaceY ? (15 << 4) : 0;
            }
            return 0;
        }
        return chunk.getLight(lx, ly, lz);
    }

    setLight(worldX, worldY, worldZ, lightValue) {
        if (worldY < 0 || worldY >= CHUNK_SIZE_Y) return false;
        const { cx, cz, lx, ly, lz } = this.worldToLocalCoords(worldX, worldY, worldZ);
        const chunk = this.getChunk(cx, cz);
        if (!chunk) return false;
        return chunk.setLight(lx, ly, lz, lightValue);
    }

    getMetadata(worldX, worldY, worldZ) {
        if (worldY < 0 || worldY >= CHUNK_SIZE_Y) return 0;
        const { cx, cz, lx, ly, lz } = this.worldToLocalCoords(worldX, worldY, worldZ);
        const chunk = this.getChunk(cx, cz);
        if (!chunk) return 0;
        return chunk.getMetadata(lx, ly, lz);
    }

    setMetadata(worldX, worldY, worldZ, meta) {
        if (worldY < 0 || worldY >= CHUNK_SIZE_Y) return false;
        const { cx, cz, lx, ly, lz } = this.worldToLocalCoords(worldX, worldY, worldZ);
        const chunk = this.getChunk(cx, cz);
        if (!chunk) return false;
        return chunk.setMetadata(lx, ly, lz, meta);
    }

    setBlockAt(worldX, worldY, worldZ, blockId, markDirty = true) {
        return this.setBlock(worldX, worldY, worldZ, blockId, markDirty);
    }

    isSolid(worldX, worldY, worldZ) {
        const blockId = this.getBlock(worldX, worldY, worldZ);
        if (blockId === BLOCKS.AIR) return false;
        return !NON_SOLID_BLOCKS.has(blockId);
    }

    getHighestBlockY(worldX, worldZ) {
        const { cx, cz, lx, lz } = this.worldToLocalCoords(worldX, 0, worldZ);
        const chunk = this.getChunk(cx, cz);
        if (!chunk) return 0;

        for (let y = CHUNK_SIZE_Y - 1; y >= 0; y--) {
            if (chunk.getBlock(lx, y, lz) !== BLOCKS.AIR) {
                return y;
            }
        }
        return 0;
    }

    getBiome(worldX, worldZ) {
        return this.generator.getBiome(worldX, worldZ);
    }

    getHeight(worldX, worldZ) {
        return this.generator.getHeight(worldX, worldZ);
    }

    // ==========================================
    // 5. MESH & RENDERING HELPERS
    // ==========================================

    rebuildChunkMesh(cx, cz) {
        const chunk = this.getChunk(cx, cz);
        if (!chunk || !this.scene) return null;

        if (chunk.mesh) {
            this.scene.remove(chunk.mesh);
            if (chunk.mesh.geometry) chunk.mesh.geometry.dispose();
            chunk.mesh = null;
        }

        const mesh = createChunkMesh(chunk, this.material);
        this.scene.add(mesh);
        chunk.isDirty = false;
        return mesh;
    }

    rebuildDirtyMeshes() {
        if (!this.scene) return 0;
        let count = 0;

        for (const chunk of this.chunks.values()) {
            if (chunk.isDirty) {
                this.rebuildChunkMesh(chunk.x, chunk.z);
                count++;
            }
        }

        return count;
    }

    // ==========================================
    // 6. ENTITY & EVENT MANAGEMENT
    // ==========================================

    addEntity(entity) {
        this.entities.add(entity);
        this.emit('entityAdd', entity);
    }

    removeEntity(entity) {
        this.entities.delete(entity);
        this.emit('entityRemove', entity);
    }

    getEntities() {
        return Array.from(this.entities);
    }

    updateEntities(dt = 0.05, player = null, inventory = null, audio = null) {
        for (const entity of this.entities) {
            if (typeof entity.update === 'function') {
                entity.update(dt, this, player, inventory, audio);
            }
            if (entity.isDead && !entity.userData.lootDropped && entity.type !== 'item' && entity.type !== 'arrow') {
                entity.userData.lootDropped = true;
                const drops = getMobDrop(entity.type);
                for (const d of drops) {
                    if (d && d.count > 0) {
                        spawnDroppedItem(d.id, d.count, entity.position.x, entity.position.y + 0.5, entity.position.z, this, this.scene);
                    }
                }
            }
            if (entity.removed || (entity.isDead && entity.deathTime > 1.0)) {
                this.removeEntity(entity);
            }
            
            // Player pushing minecarts
            if (player && entity.type && entity.type.includes('minecart') && !entity.passenger) {
                const dx = entity.position.x - player.position.x;
                const dy = entity.position.y - player.position.y;
                const dz = entity.position.z - player.position.z;
                const distSq = dx*dx + dy*dy + dz*dz;
                // If player is within 1 block
                if (distSq < 1.0) {
                    const dist = Math.sqrt(distSq);
                    // Push away from player
                    entity.velocity.x += (dx / dist) * 2.0 * dt;
                    entity.velocity.z += (dz / dist) * 2.0 * dt;
                }
            }
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, ...args) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            for (const cb of callbacks) {
                try {
                    cb(...args);
                } catch (err) {
                    console.error("Event Error:", err);
                }
            }
        }
    }

    getLoadedChunks() {
        return Array.from(this.chunks.values());
    }

    spawnMobs(player, dt) {
        if (!this.spawnTimer) this.spawnTimer = 0;
        this.spawnTimer -= dt;
        if (this.spawnTimer > 0) return;
        this.spawnTimer = 2.0; // Try spawning every 2 seconds

        let mobCount = 0;
        for (const e of this.entities) {
            if (e.type !== 'item' && e.type !== 'arrow') mobCount++;
        }
        if (mobCount > 40) return;

        // Pick a random location around player (radius 24 to 64 blocks)
        const angle = Math.random() * Math.PI * 2;
        const dist = 24 + Math.random() * 40;
        const spawnX = Math.floor(player.position.x + Math.sin(angle) * dist);
        const spawnZ = Math.floor(player.position.z + Math.cos(angle) * dist);
        const spawnY = this.getHighestBlockY(spawnX, spawnZ);

        if (spawnY <= 0) return; // No solid ground found

        const blockId = this.getBlock(spawnX, spawnY, spawnZ);
        if (!this.isSolid(spawnX, spawnY, spawnZ)) return;
        if (blockId === BLOCKS.WATER || blockId === BLOCKS.LAVA) return; // don't spawn in liquid

        const rawLight = this.getLight(spawnX, spawnY + 1, spawnZ);
        const skyLight = (rawLight >> 4) & 15;
        const blockLight = rawLight & 15;
        
        let sunLevel = 1.0;
        if (typeof window !== 'undefined' && window.MinecraftEngine && window.MinecraftEngine.dayNightCycle) {
            sunLevel = window.MinecraftEngine.dayNightCycle.sunIntensity || 1.0;
        }
        
        // Calculate the actual current light level (0-15) incorporating the sun
        const currentSkyLight = Math.floor(skyLight * sunLevel);
        const actualLight = Math.max(currentSkyLight, blockLight);
        
        let mobTypeToSpawn = null;

        // Passive mobs: exclusively on Grass Blocks under direct sky light
        if (blockId === BLOCKS.GRASS && skyLight === 15 && actualLight > 7) {
            if (Math.random() < 0.2) {
                const passives = ['pig', 'cow', 'sheep'];
                mobTypeToSpawn = passives[Math.floor(Math.random() * passives.length)];
            }
        }
        
        // Hostile mobs: solid blocks where actual light level <= 7
        if (actualLight <= 7) {
            if (Math.random() < 0.5) {
                const hostiles = ['zombie', 'skeleton', 'creeper', 'spider'];
                mobTypeToSpawn = hostiles[Math.floor(Math.random() * hostiles.length)];
            }
        }

        if (mobTypeToSpawn) {
            // Need to import createMob dynamically if not available, or just require it at the top
            // Since we cannot dynamically import easily synchronously, let's just trigger an event 
            // or we must import createMob in world.js. Let's add the import at the top of world.js.
            const mob = createMob(mobTypeToSpawn, spawnX + 0.5, spawnY + 1.0, spawnZ + 0.5);
            this.addEntity(mob);
        }
    }

    clear() {
        for (const chunk of Array.from(this.chunks.values())) {
            this.unloadChunk(chunk.x, chunk.z);
        }
        this.chunks.clear();
        this.entities.clear();
        this.lastPlayerChunkX = null;
        this.lastPlayerChunkZ = null;
    }
}

export default World;
