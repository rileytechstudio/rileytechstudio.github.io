/**
 * World System for Minecraft 1.5 WebGL Engine
 *
 * Features:
 * - Dimension support ('overworld' or 'nether')
 * - Chunk management with Map<string, Chunk>
 * - Dynamic chunk loading & unloading based on player position (4-chunk radius)
 * - Procedural terrain generation integration with src/terrain/generator.js
 * - World coordinate to chunk/local coordinate transformations
 * - Global block querying and modification with chunk border dirty marking
 * - Optional Three.js scene and mesh management integration
 * - Entity and event handling system
 */

import { Chunk, BLOCKS, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './chunk.js';
import { TerrainGenerator } from '../terrain/generator.js';
import { createChunkMesh } from './mesher.js';
import { createMob } from '../entity/mob.js';
import { getMobDrop, spawnDroppedItem } from '../entity/droppedItem.js';

export const DEFAULT_LOAD_RADIUS = 4;

/**
 * Set of block IDs that are non-solid and passable (can be walked/looked through).
 */
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

/**
 * World class managing voxel chunks, player-centric loading, and world queries.
 */
export class World {
    /**
     * @param {Object} [options={}]
     * @param {number|string} [options.seed=1337] - World generation seed
     * @param {string} [options.dimension='overworld'] - World dimension ('overworld' | 'nether')
     * @param {TerrainGenerator} [options.generator=null] - Custom terrain generator
     * @param {Object} [options.generatorConfig={}] - Configuration passed to TerrainGenerator
     * @param {number} [options.loadRadius=DEFAULT_LOAD_RADIUS] - Chunk loading radius in chunks (default 4)
     * @param {'circle'|'square'} [options.radiusShape='circle'] - Distance metric for load radius
     * @param {THREE.Scene} [options.scene=null] - Optional Three.js scene for auto mesh management
     * @param {boolean} [options.autoMesh=false] - Whether to automatically create Three.js meshes
     * @param {THREE.Material} [options.material=null] - Custom material for chunk meshes
     * @param {Object} [options.storage=null] - Optional WorldStorage instance for persistence
     */
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

        /** @type {THREE.Scene|null} */
        this.scene = options.scene || null;
        this.autoMesh = options.autoMesh !== undefined ? options.autoMesh : (this.scene !== null);
        this.material = options.material || null;
        this.storage = options.storage || null;

        /** @type {Map<string, Chunk>} Map of loaded chunks keyed by "cx,cz" */
        this.chunks = new Map();

        /** @type {Set<Object>} Entities residing in the world */
        this.entities = new Set();

        /** @type {Map<string, Set<Function>>} Event listeners */
        this.listeners = new Map();

        /** @type {Map<string, Array<{lx: number, ly: number, lz: number, blockId: number}>>} */
        this.deferredBlocks = new Map();

        // Track player last chunk coordinates to optimize updates
        this.lastPlayerChunkX = null;
        this.lastPlayerChunkZ = null;
    }

    /**
     * Get current world dimension
     * @returns {string} 'overworld' | 'nether'
     */
    getDimension() {
        return this.dimension;
    }

    /**
     * Set world dimension ('overworld' or 'nether')
     * @param {string} dimension
     */
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

    /**
     * Generate standard Map key for chunk grid coordinates.
     * @param {number} cx - Chunk X index
     * @param {number} cz - Chunk Z index
     * @returns {string} Key in "cx,cz" format
     */
    getChunkKey(cx, cz) {
        return `${cx},${cz}`;
    }

    /**
     * Parse chunk key string back into integer coordinates.
     * @param {string} key - Key in "cx,cz" format
     * @returns {{cx: number, cz: number}}
     */
    parseChunkKey(key) {
        const parts = key.split(',');
        return { cx: Number(parts[0]), cz: Number(parts[1]) };
    }

    /**
     * Convert continuous or integer world coordinates to chunk coordinates.
     * @param {number} worldX 
     * @param {number} worldZ 
     * @returns {{cx: number, cz: number}}
     */
    worldToChunkCoords(worldX, worldZ) {
        return {
            cx: Math.floor(worldX / CHUNK_SIZE_X),
            cz: Math.floor(worldZ / CHUNK_SIZE_Z)
        };
    }

    /**
     * Convert 3D world coordinates to chunk indices and local voxel offsets.
     * @param {number} worldX 
     * @param {number} worldY 
     * @param {number} worldZ 
     * @returns {{cx: number, cz: number, lx: number, ly: number, lz: number}}
     */
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

    /**
     * Retrieve a loaded Chunk by chunk grid coordinates.
     * @param {number} cx - Chunk X index
     * @param {number} cz - Chunk Z index
     * @returns {Chunk|null} Chunk instance or null if not loaded
     */
    getChunk(cx, cz) {
        return this.chunks.get(this.getChunkKey(cx, cz)) || null;
    }

    /**
     * Check if a Chunk is currently loaded.
     * @param {number} cx - Chunk X index
     * @param {number} cz - Chunk Z index
     * @returns {boolean}
     */
    hasChunk(cx, cz) {
        return this.chunks.has(this.getChunkKey(cx, cz));
    }

    /**
     * Retrieve a loaded Chunk containing the specified world position.
     * @param {number} worldX 
     * @param {number} worldZ 
     * @returns {Chunk|null}
     */
    getChunkAtWorldPos(worldX, worldZ) {
        const { cx, cz } = this.worldToChunkCoords(worldX, worldZ);
        return this.getChunk(cx, cz);
    }

    /**
     * Load and populate a Chunk at chunk grid coordinates (cx, cz).
     * Uses TerrainGenerator to generate procedural terrain.
     *
     * @param {number} cx - Chunk X index
     * @param {number} cz - Chunk Z index
     * @returns {Chunk} The loaded and populated Chunk instance
     */
    /**
     * Set Block ID at world coordinate, or defer if chunk is not loaded.
     */
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

    /**
     * Load and populate a Chunk at chunk grid coordinates (cx, cz).
     * Uses TerrainGenerator to generate procedural terrain.
     *
     * @param {number} cx - Chunk X index
     * @param {number} cz - Chunk Z index
     * @returns {Chunk} The loaded and populated Chunk instance
     */
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

        chunk.isDirty = true;

        // Create Three.js mesh if scene and autoMesh are enabled
        if (this.scene && this.autoMesh) {
            const mesh = createChunkMesh(chunk, this.material);
            this.scene.add(mesh);
        }

        this.emit('chunkLoad', chunk);
        return chunk;
    }

    /**
     * Unload a Chunk at chunk grid coordinates (cx, cz).
     * Cleans up Three.js meshes and removes the chunk from memory.
     *
     * @param {number} cx - Chunk X index
     * @param {number} cz - Chunk Z index
     * @returns {boolean} True if a chunk was unloaded, false if it wasn't loaded
     */
    unloadChunk(cx, cz) {
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

    /**
     * Check if chunk (cx, cz) is within load radius of player chunk (playerChunkX, playerChunkZ).
     * @param {number} cx 
     * @param {number} cz 
     * @param {number} playerChunkX 
     * @param {number} playerChunkZ 
     * @param {number} radius 
     * @returns {boolean}
     */
    isChunkInRadius(cx, cz, playerChunkX, playerChunkZ, radius) {
        const dx = cx - playerChunkX;
        const dz = cz - playerChunkZ;

        if (this.radiusShape === 'square') {
            return Math.abs(dx) <= radius && Math.abs(dz) <= radius;
        }

        // Default: Euclidean circular radius
        return (dx * dx + dz * dz) <= (radius * radius);
    }

    /**
     * Update world chunks around player position.
     * Calculates which chunks should be loaded (within loadRadius chunks, default 4)
     * and which chunks outside the radius should be unloaded.
     *
     * @param {number} playerX - World X position of player
     * @param {number} playerZ - World Z position of player
     * @param {number} [radius=this.loadRadius] - Chunk radius (default 4)
     * @returns {{loaded: Chunk[], unloaded: Chunk[], total: number}} Summary of changes
     */
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

    /**
     * Get Block ID at integer world coordinate (worldX, worldY, worldZ).
     *
     * @param {number} worldX 
     * @param {number} worldY 
     * @param {number} worldZ 
     * @returns {number} Block ID (0 = AIR if out of bounds or chunk not loaded)
     */
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

    /**
     * Alias for getBlock.
     */
    getBlockAt(worldX, worldY, worldZ) {
        return this.getBlock(worldX, worldY, worldZ);
    }

    /**
     * Set Block ID at integer world coordinate (worldX, worldY, worldZ).
     * Automatically marks the chunk (and adjacent boundary chunks if on a border) as dirty.
     *
     * @param {number} worldX 
     * @param {number} worldY 
     * @param {number} worldZ 
     * @param {number} blockId - Block ID to set
     * @param {boolean} [markDirty=true] - Whether to mark chunk(s) dirty for remeshing
     * @returns {boolean} True if block was set successfully
     */
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

    /**
     * Get light level at integer world coordinate.
     */
    getLight(worldX, worldY, worldZ) {
        if (worldY < 0 || worldY >= CHUNK_SIZE_Y) return 15 << 4;
        const { cx, cz, lx, ly, lz } = this.worldToLocalCoords(worldX, worldY, worldZ);
        const chunk = this.getChunk(cx, cz);
        if (!chunk) return 0;
        return chunk.getLight(lx, ly, lz);
    }

    /**
     * Set light level at integer world coordinate.
     */
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

    /**
     * Alias for setBlock.
     */
    setBlockAt(worldX, worldY, worldZ, blockId, markDirty = true) {
        return this.setBlock(worldX, worldY, worldZ, blockId, markDirty);
    }

    /**
     * Check if a block at world coordinate is solid (collidable & opaque).
     * @param {number} worldX 
     * @param {number} worldY 
     * @param {number} worldZ 
     * @returns {boolean}
     */
    isSolid(worldX, worldY, worldZ) {
        const blockId = this.getBlock(worldX, worldY, worldZ);
        if (blockId === BLOCKS.AIR) return false;
        return !NON_SOLID_BLOCKS.has(blockId);
    }

    /**
     * Find the highest non-air block Y coordinate at world column (worldX, worldZ).
     * @param {number} worldX 
     * @param {number} worldZ 
     * @returns {number} Y coordinate (or 0 if empty)
     */
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

    /**
     * Get Biome at world coordinates from TerrainGenerator.
     * @param {number} worldX 
     * @param {number} worldZ 
     * @returns {Object} Biome definition
     */
    getBiome(worldX, worldZ) {
        return this.generator.getBiome(worldX, worldZ);
    }

    /**
     * Get procedural terrain height at world coordinates from TerrainGenerator.
     * @param {number} worldX 
     * @param {number} worldZ 
     * @returns {number}
     */
    getHeight(worldX, worldZ) {
        return this.generator.getHeight(worldX, worldZ);
    }

    // ==========================================
    // 5. MESH & RENDERING HELPERS
    // ==========================================

    /**
     * Rebuild Three.js mesh for a specific chunk.
     * @param {number} cx 
     * @param {number} cz 
     * @returns {THREE.Mesh|null}
     */
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

    /**
     * Rebuild meshes for all loaded chunks that are marked as isDirty.
     * @returns {number} Number of remeshed chunks
     */
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

    /**
     * Add an entity to the world.
     * @param {Object} entity 
     */
    addEntity(entity) {
        this.entities.add(entity);
        this.emit('entityAdd', entity);
    }

    /**
     * Remove an entity from the world.
     * @param {Object} entity 
     */
    removeEntity(entity) {
        this.entities.delete(entity);
        this.emit('entityRemove', entity);
    }

    /**
     * Get all active entities in the world.
     * @returns {Object[]}
     */
    getEntities() {
        return Array.from(this.entities);
    }

    /**
     * Update all active entities with delta time dt.
     * @param {number} dt Delta time in seconds
     */
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
        }
    }

    /**
     * Register an event listener.
     * @param {string} event - 'chunkLoad', 'chunkUnload', 'blockChange', 'entityAdd', 'entityRemove'
     * @param {Function} callback 
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    /**
     * Remove an event listener.
     * @param {string} event 
     * @param {Function} callback 
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    /**
     * Emit an event to all registered listeners.
     * @param {string} event 
     * @param {...any} args 
     */
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

    /**
     * Retrieve array of all currently loaded Chunk instances.
     * @returns {Chunk[]}
     */
    getLoadedChunks() {
        return Array.from(this.chunks.values());
    }

    /**
     * Clear and unload all chunks and entities.
     */

    /**
     * Placeholder light level calculation
     */
    getLight(x, y, z) {
        for (let checkY = Math.floor(y); checkY < 256; checkY++) {
            const blockId = this.getBlock(x, checkY, z);
            if (blockId !== BLOCKS.AIR && blockId !== BLOCKS.GLASS) {
                return 0; // Shadowed
            }
        }
        return 15; // Direct sky light
    }

    /**
     * Spawns mobs around the player based on light levels
     */
    spawnMobs(player, dt) {
        if (!this.spawnTimer) this.spawnTimer = 0;
        this.spawnTimer -= dt;
        if (this.spawnTimer > 0) return;
        this.spawnTimer = 2.0; // Try spawning every 2 seconds

        // Don't spawn if too many entities
        if (this.entities.size > 100) return;

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

        const lightLevel = this.getLight(spawnX, spawnY + 1, spawnZ);
        
        let mobTypeToSpawn = null;

        // Passive mobs: exclusively on Grass Blocks under direct sky light
        if (blockId === BLOCKS.GRASS && lightLevel === 15) {
            if (Math.random() < 0.2) {
                const passives = ['pig', 'cow', 'sheep'];
                mobTypeToSpawn = passives[Math.floor(Math.random() * passives.length)];
            }
        }
        
        // Hostile mobs: solid blocks where light level <= 7
        if (lightLevel <= 7) {
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
