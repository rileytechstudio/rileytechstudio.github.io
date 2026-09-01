import { BLOCKS, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './chunk.js';

export const BLOCK_LIGHT_OPACITY = new Uint8Array(256);
export const BLOCK_LIGHT_EMISSION = new Uint8Array(256);

// Initialize all blocks as fully opaque (15) and non-emitting (0)
for (let i = 0; i < 256; i++) {
    BLOCK_LIGHT_OPACITY[i] = 15;
    BLOCK_LIGHT_EMISSION[i] = 0;
}

// Transparent / non-opaque blocks (light decreases by 1 through air/transparent blocks)
const transparentBlocks = [
    BLOCKS.AIR,                // 0
    BLOCKS.OAK_SAPLING,        // 6
    BLOCKS.GLASS,              // 20
    BLOCKS.POWERED_RAIL,       // 27
    BLOCKS.DETECTOR_RAIL,      // 28
    BLOCKS.TALL_GRASS,         // 31
    BLOCKS.DEAD_BUSH,          // 32
    BLOCKS.DANDELION,          // 37
    BLOCKS.POPPY,              // 38
    BLOCKS.BROWN_MUSHROOM,     // 39
    BLOCKS.RED_MUSHROOM,       // 40
    BLOCKS.TORCH,              // 50
    BLOCKS.FIRE,               // 51
    BLOCKS.WHEAT,              // 59
    BLOCKS.LADDER,             // 65
    BLOCKS.RAIL,               // 66
    BLOCKS.SNOW_LAYER,         // 78
    BLOCKS.SUGAR_CANE,         // 83
    BLOCKS.FENCE,              // 85
    BLOCKS.ACTIVATOR_RAIL,     // 157
    324,                       // Wooden Door
    330                        // Iron Door
];

for (const b of transparentBlocks) {
    if (b !== undefined && b >= 0 && b < 256) {
        BLOCK_LIGHT_OPACITY[b] = 1;
    }
}

// Partially opaque blocks
if (BLOCKS.OAK_LEAVES !== undefined) BLOCK_LIGHT_OPACITY[BLOCKS.OAK_LEAVES] = 2;
if (BLOCKS.WATER !== undefined) BLOCK_LIGHT_OPACITY[BLOCKS.WATER] = 3;
if (BLOCKS.WATER_FLOWING !== undefined) BLOCK_LIGHT_OPACITY[BLOCKS.WATER_FLOWING] = 3;
if (BLOCKS.ICE !== undefined) BLOCK_LIGHT_OPACITY[BLOCKS.ICE] = 3;

// Light emitting blocks
if (BLOCKS.TORCH !== undefined) BLOCK_LIGHT_EMISSION[BLOCKS.TORCH] = 14;         // 50
if (BLOCKS.LAVA !== undefined) BLOCK_LIGHT_EMISSION[BLOCKS.LAVA] = 15;           // 11
if (BLOCKS.LAVA_FLOWING !== undefined) BLOCK_LIGHT_EMISSION[BLOCKS.LAVA_FLOWING] = 15; // 10
if (BLOCKS.FIRE !== undefined) BLOCK_LIGHT_EMISSION[BLOCKS.FIRE] = 15;           // 51
if (BLOCKS.GLOWSTONE !== undefined) BLOCK_LIGHT_EMISSION[BLOCKS.GLOWSTONE] = 15; // 89
if (BLOCKS.REDSTONE_BLOCK !== undefined) BLOCK_LIGHT_EMISSION[BLOCKS.REDSTONE_BLOCK] = 7; // 152

export class LightingEngine {
    constructor(world) {
        this.world = world;
        this.addQueue = [];
        this.removeQueue = [];
    }

    /**
     * Marks the chunk containing (wx, wy, wz) and any adjacent neighbor chunks dirty
     * so that lighting changes on borders and corners trigger immediate remeshing.
     *
     * @param {number} wx
     * @param {number} wy
     * @param {number} wz
     */
    markBlockAndNeighborsDirty(wx, wy, wz) {
        if (!this.world) return;
        const { cx, cz, lx, ly, lz } = this.world.worldToLocalCoords(wx, wy, wz);
        const chunk = this.world.getChunk(cx, cz);
        if (chunk) {
            chunk.isDirty = true;
            chunk.lightDirty = true;
        }

        // Cross-chunk boundary updates for meshing
        if (lx === 0) {
            const neighbor = this.world.getChunk(cx - 1, cz);
            if (neighbor) { neighbor.isDirty = true; neighbor.lightDirty = true; }
        } else if (lx === CHUNK_SIZE_X - 1) {
            const neighbor = this.world.getChunk(cx + 1, cz);
            if (neighbor) { neighbor.isDirty = true; neighbor.lightDirty = true; }
        }

        if (lz === 0) {
            const neighbor = this.world.getChunk(cx, cz - 1);
            if (neighbor) { neighbor.isDirty = true; neighbor.lightDirty = true; }
        } else if (lz === CHUNK_SIZE_Z - 1) {
            const neighbor = this.world.getChunk(cx, cz + 1);
            if (neighbor) { neighbor.isDirty = true; neighbor.lightDirty = true; }
        }

        // Cross-chunk corner updates for smooth lighting AO
        if (lx === 0 && lz === 0) {
            const neighbor = this.world.getChunk(cx - 1, cz - 1);
            if (neighbor) { neighbor.isDirty = true; neighbor.lightDirty = true; }
        } else if (lx === 0 && lz === CHUNK_SIZE_Z - 1) {
            const neighbor = this.world.getChunk(cx - 1, cz + 1);
            if (neighbor) { neighbor.isDirty = true; neighbor.lightDirty = true; }
        } else if (lx === CHUNK_SIZE_X - 1 && lz === 0) {
            const neighbor = this.world.getChunk(cx + 1, cz - 1);
            if (neighbor) { neighbor.isDirty = true; neighbor.lightDirty = true; }
        } else if (lx === CHUNK_SIZE_X - 1 && lz === CHUNK_SIZE_Z - 1) {
            const neighbor = this.world.getChunk(cx + 1, cz + 1);
            if (neighbor) { neighbor.isDirty = true; neighbor.lightDirty = true; }
        }
    }

    getSkyLight(x, y, z) {
        if (y < 0 || y >= CHUNK_SIZE_Y) return 15;
        return (this.world.getLight(x, y, z) >> 4) & 0x0F;
    }

    setSkyLight(x, y, z, val) {
        if (y < 0 || y >= CHUNK_SIZE_Y) return;
        const current = this.world.getLight(x, y, z);
        const clampedVal = Math.max(0, Math.min(15, val));
        this.world.setLight(x, y, z, (current & 0x0F) | (clampedVal << 4));
        this.markBlockAndNeighborsDirty(x, y, z);
    }

    getBlockLight(x, y, z) {
        if (y < 0 || y >= CHUNK_SIZE_Y) return 0;
        return this.world.getLight(x, y, z) & 0x0F;
    }

    setBlockLight(x, y, z, val) {
        if (y < 0 || y >= CHUNK_SIZE_Y) return;
        const current = this.world.getLight(x, y, z);
        const clampedVal = Math.max(0, Math.min(15, val));
        this.world.setLight(x, y, z, (current & 0xF0) | clampedVal);
        this.markBlockAndNeighborsDirty(x, y, z);
    }

    initializeChunkLighting(chunk) {
        // 1. Sunlight Pass (Vertical Only for fast initial load)
        for (let x = 0; x < CHUNK_SIZE_X; x++) {
            for (let z = 0; z < CHUNK_SIZE_Z; z++) {
                let currentSkyLight = 15;
                for (let y = CHUNK_SIZE_Y - 1; y >= 0; y--) {
                    const blockId = chunk.getBlock(x, y, z);
                    const opacity = BLOCK_LIGHT_OPACITY[blockId] !== undefined ? BLOCK_LIGHT_OPACITY[blockId] : 15;
                    
                    if (opacity === 15) {
                        currentSkyLight = 0;
                    } else if (opacity > 1 && currentSkyLight > 0) {
                        currentSkyLight = Math.max(0, currentSkyLight - opacity);
                    }
                    
                    if (currentSkyLight > 0) {
                        let lightVal = chunk.getLight(x, y, z);
                        lightVal = (lightVal & 0x0F) | (currentSkyLight << 4);
                        chunk.setLight(x, y, z, lightVal);
                        // Sunlight propagation sideways is too slow to calculate synchronously for every block
                    }
                }
            }
        }

        // 2. Block Light Pass
        for (let x = 0; x < CHUNK_SIZE_X; x++) {
            for (let y = 0; y < CHUNK_SIZE_Y; y++) {
                for (let z = 0; z < CHUNK_SIZE_Z; z++) {
                    const blockId = chunk.getBlock(x, y, z);
                    const emission = BLOCK_LIGHT_EMISSION[blockId] || 0;
                    if (emission > 0) {
                        let lightVal = chunk.getLight(x, y, z);
                        lightVal = (lightVal & 0xF0) | emission;
                        chunk.setLight(x, y, z, lightVal);
                        this.addQueue.push({ x: chunk.x * CHUNK_SIZE_X + x, y, z: chunk.z * CHUNK_SIZE_Z + z, isSky: false });
                    }
                }
            }
        }
        
        this.processLightAddition();
    }

    propagateLightFromNeighbors(chunk) {
        const startX = chunk.x * CHUNK_SIZE_X;
        const startZ = chunk.z * CHUNK_SIZE_Z;
        
        // Scan X boundaries (-1 and +16)
        for (let z = 0; z < CHUNK_SIZE_Z; z++) {
            for (let y = 0; y < CHUNK_SIZE_Y; y++) {
                // Left neighbor (x = -1)
                let lx = startX - 1;
                let lz = startZ + z;
                let bLight = this.getBlockLight(lx, y, lz);
                if (bLight > 1) this.addQueue.push({ x: lx, y, z: lz, isSky: false });
                
                // Right neighbor (x = 16)
                lx = startX + CHUNK_SIZE_X;
                bLight = this.getBlockLight(lx, y, lz);
                if (bLight > 1) this.addQueue.push({ x: lx, y, z: lz, isSky: false });
            }
        }
        
        // Scan Z boundaries (-1 and +16)
        for (let x = 0; x < CHUNK_SIZE_X; x++) {
            for (let y = 0; y < CHUNK_SIZE_Y; y++) {
                // Top neighbor (z = -1)
                let lx = startX + x;
                let lz = startZ - 1;
                let bLight = this.getBlockLight(lx, y, lz);
                if (bLight > 1) this.addQueue.push({ x: lx, y, z: lz, isSky: false });
                
                // Bottom neighbor (z = 16)
                lz = startZ + CHUNK_SIZE_Z;
                bLight = this.getBlockLight(lx, y, lz);
                if (bLight > 1) this.addQueue.push({ x: lx, y, z: lz, isSky: false });
            }
        }
        
        if (this.addQueue.length > 0) {
            this.processLightAddition();
        }
    }

    onBlockPlaced(x, y, z, blockId) {
        const opacity = BLOCK_LIGHT_OPACITY[blockId] !== undefined ? BLOCK_LIGHT_OPACITY[blockId] : 15;
        const emission = BLOCK_LIGHT_EMISSION[blockId] !== undefined ? BLOCK_LIGHT_EMISSION[blockId] : 0;
        
        const oldSky = this.getSkyLight(x, y, z);
        const oldBlock = this.getBlockLight(x, y, z);
        
        if (opacity > 1) {
            if (oldBlock > 0) {
                this.removeQueue.push({ x, y, z, val: oldBlock, isSky: false });
                this.setBlockLight(x, y, z, 0);
            }
            if (oldSky > 0) {
                this.removeQueue.push({ x, y, z, val: oldSky, isSky: true });
                this.setSkyLight(x, y, z, 0);
            }
            this.processLightRemoval();
        }

        if (emission > 0) {
            this.setBlockLight(x, y, z, emission);
            this.addQueue.push({ x, y, z, isSky: false });
        }
        
        this.processLightAddition();
        this.markBlockAndNeighborsDirty(x, y, z);
    }

    onBlockRemoved(x, y, z) {
        const oldBlockLight = this.getBlockLight(x, y, z);
        if (oldBlockLight > 0) {
            this.removeQueue.push({ x, y, z, val: oldBlockLight, isSky: false });
            this.setBlockLight(x, y, z, 0);
        }

        const oldSkyLight = this.getSkyLight(x, y, z);
        if (oldSkyLight > 0) {
            this.removeQueue.push({ x, y, z, val: oldSkyLight, isSky: true });
            this.setSkyLight(x, y, z, 0);
        }

        this.processLightRemoval();
        
        const neighbors = [
            { x: x+1, y, z }, { x: x-1, y, z },
            { x, y: y+1, z }, { x, y: y-1, z },
            { x, y, z: z+1 }, { x, y, z: z-1 }
        ];

        for (const n of neighbors) {
            if (n.y >= 0 && n.y < CHUNK_SIZE_Y) {
                this.addQueue.push({ x: n.x, y: n.y, z: n.z, isSky: false });
                this.addQueue.push({ x: n.x, y: n.y, z: n.z, isSky: true });
            }
        }
        
        // Check if sunlight column can reach down into the opened position
        let sunY = y + 1;
        let foundSun = false;
        while (sunY < CHUNK_SIZE_Y) {
            const blockId = this.world.getBlockAt(x, sunY, z);
            if (blockId === -1) break;
            const op = BLOCK_LIGHT_OPACITY[blockId] !== undefined ? BLOCK_LIGHT_OPACITY[blockId] : 15;
            if (this.getSkyLight(x, sunY, z) === 15 && op <= 1) {
                foundSun = true;
                break;
            }
            if (op >= 15) {
                break;
            }
            sunY++;
        }
        
        if (foundSun) {
            let fallY = y;
            while (fallY >= 0) {
                const blockId = this.world.getBlockAt(x, fallY, z);
                if (blockId === -1) break;
                const op = BLOCK_LIGHT_OPACITY[blockId] !== undefined ? BLOCK_LIGHT_OPACITY[blockId] : 15;
                if (op >= 15) break;
                
                this.setSkyLight(x, fallY, z, 15);
                this.addQueue.push({ x, y: fallY, z, isSky: true });
                if (op > 1) {
                    break;
                }
                fallY--;
            }
        }
        
        this.processLightAddition();
        this.markBlockAndNeighborsDirty(x, y, z);
    }

    processLightRemoval() {
        let head = 0;
        while (head < this.removeQueue.length) {
            const node = this.removeQueue[head++];
            const { x, y, z, val, isSky } = node;

            const neighbors = [
                { x: x+1, y, z }, { x: x-1, y, z },
                { x, y: y+1, z }, { x, y: y-1, z },
                { x, y, z: z+1 }, { x, y, z: z-1 }
            ];

            for (const n of neighbors) {
                if (n.y < 0 || n.y >= CHUNK_SIZE_Y) continue;
                
                const neighborLight = isSky ? this.getSkyLight(n.x, n.y, n.z) : this.getBlockLight(n.x, n.y, n.z);
                const isSkyDown = isSky && n.y === y - 1 && val === 15 && neighborLight === 15;
                
                if (neighborLight !== 0 && (neighborLight < val || isSkyDown)) {
                    if (isSky) this.setSkyLight(n.x, n.y, n.z, 0);
                    else this.setBlockLight(n.x, n.y, n.z, 0);
                    
                    this.removeQueue.push({ x: n.x, y: n.y, z: n.z, val: neighborLight, isSky });
                } else if (neighborLight >= val) {
                    this.addQueue.push({ x: n.x, y: n.y, z: n.z, isSky });
                }
            }
        }
        this.removeQueue = [];
    }

    processLightAddition() {
        let head = 0;
        while (head < this.addQueue.length) {
            const node = this.addQueue[head++];
            const { x, y, z, isSky } = node;

            const currentLight = isSky ? this.getSkyLight(x, y, z) : this.getBlockLight(x, y, z);
            if (currentLight <= 1) continue;

            const neighbors = [
                { x: x+1, y, z }, { x: x-1, y, z },
                { x, y: y+1, z }, { x, y: y-1, z },
                { x, y, z: z+1 }, { x, y, z: z-1 }
            ];

            for (const n of neighbors) {
                if (n.y < 0 || n.y >= CHUNK_SIZE_Y) continue;
                
                const blockId = this.world.getBlockAt(n.x, n.y, n.z);
                if (blockId === -1) continue;
                
                const opacity = BLOCK_LIGHT_OPACITY[blockId] !== undefined ? BLOCK_LIGHT_OPACITY[blockId] : 15;
                if (opacity >= 15) continue;
                
                const neighborLight = isSky ? this.getSkyLight(n.x, n.y, n.z) : this.getBlockLight(n.x, n.y, n.z);
                
                let propagated = currentLight - Math.max(1, opacity);
                if (isSky && n.y === y - 1 && currentLight === 15 && opacity <= 1) {
                    propagated = 15;
                }

                if (propagated > neighborLight) {
                    if (isSky) this.setSkyLight(n.x, n.y, n.z, propagated);
                    else this.setBlockLight(n.x, n.y, n.z, propagated);
                    
                    this.addQueue.push({ x: n.x, y: n.y, z: n.z, isSky });
                }
            }
        }
        this.addQueue = [];
    }
}
