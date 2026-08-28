import { BLOCKS, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './chunk.js';

export const BLOCK_LIGHT_OPACITY = new Uint8Array(256);
export const BLOCK_LIGHT_EMISSION = new Uint8Array(256);

for (let i = 0; i < 256; i++) {
    BLOCK_LIGHT_OPACITY[i] = 15;
    BLOCK_LIGHT_EMISSION[i] = 0;
}

const transparentBlocks = [
    BLOCKS.AIR, BLOCKS.GLASS, BLOCKS.OAK_LEAVES, BLOCKS.TALL_GRASS, 
    BLOCKS.DEAD_BUSH, BLOCKS.DANDELION, BLOCKS.POPPY, BLOCKS.BROWN_MUSHROOM, 
    BLOCKS.RED_MUSHROOM, 50, /* Torch */ 65, /* Ladder */ 66, /* Rail */
    BLOCKS.WATER, BLOCKS.WATER_FLOWING
];

for (const b of transparentBlocks) {
    if (b !== undefined) BLOCK_LIGHT_OPACITY[b] = 1;
}

BLOCK_LIGHT_OPACITY[BLOCKS.WATER] = 3;
BLOCK_LIGHT_OPACITY[BLOCKS.WATER_FLOWING] = 3;
BLOCK_LIGHT_OPACITY[BLOCKS.OAK_LEAVES] = 2;

// Torches are 50
BLOCK_LIGHT_EMISSION[50] = 14;
BLOCK_LIGHT_EMISSION[BLOCKS.LAVA] = 15;
BLOCK_LIGHT_EMISSION[BLOCKS.LAVA_FLOWING] = 15;

export class LightingEngine {
    constructor(world) {
        this.world = world;
        this.addQueue = [];
        this.removeQueue = [];
    }

    getSkyLight(x, y, z) {
        return (this.world.getLight(x, y, z) >> 4) & 0x0F;
    }

    setSkyLight(x, y, z, val) {
        const current = this.world.getLight(x, y, z);
        this.world.setLight(x, y, z, (current & 0x0F) | (val << 4));
    }

    getBlockLight(x, y, z) {
        return this.world.getLight(x, y, z) & 0x0F;
    }

    setBlockLight(x, y, z, val) {
        const current = this.world.getLight(x, y, z);
        this.world.setLight(x, y, z, (current & 0xF0) | val);
    }

    initializeChunkLighting(chunk) {
        // 1. Sunlight Pass
        for (let x = 0; x < CHUNK_SIZE_X; x++) {
            for (let z = 0; z < CHUNK_SIZE_Z; z++) {
                let currentSkyLight = 15;
                for (let y = CHUNK_SIZE_Y - 1; y >= 0; y--) {
                    const blockId = chunk.getBlock(x, y, z);
                    const opacity = BLOCK_LIGHT_OPACITY[blockId];
                    
                    if (opacity === 15) {
                        currentSkyLight = 0;
                    } else if (opacity > 1 && currentSkyLight > 0) {
                        currentSkyLight = Math.max(0, currentSkyLight - opacity);
                    }
                    
                    if (currentSkyLight > 0) {
                        const worldX = chunk.x * CHUNK_SIZE_X + x;
                        const worldY = y;
                        const worldZ = chunk.z * CHUNK_SIZE_Z + z;
                        
                        let lightVal = chunk.getLight(x, y, z);
                        lightVal = (lightVal & 0x0F) | (currentSkyLight << 4);
                        chunk.setLight(x, y, z, lightVal);
                        
                        this.addQueue.push({ x: worldX, y: worldY, z: worldZ, isSky: true });
                    }
                }
            }
        }

        // 2. Block Light Pass
        for (let x = 0; x < CHUNK_SIZE_X; x++) {
            for (let y = 0; y < CHUNK_SIZE_Y; y++) {
                for (let z = 0; z < CHUNK_SIZE_Z; z++) {
                    const blockId = chunk.getBlock(x, y, z);
                    const emission = BLOCK_LIGHT_EMISSION[blockId];
                    if (emission > 0) {
                        const worldX = chunk.x * CHUNK_SIZE_X + x;
                        const worldY = y;
                        const worldZ = chunk.z * CHUNK_SIZE_Z + z;
                        
                        let lightVal = chunk.getLight(x, y, z);
                        lightVal = (lightVal & 0xF0) | emission;
                        chunk.setLight(x, y, z, lightVal);
                        
                        this.addQueue.push({ x: worldX, y: worldY, z: worldZ, isSky: false });
                    }
                }
            }
        }
        
        this.processLightAddition();
    }

    onBlockPlaced(x, y, z, blockId) {
        const opacity = BLOCK_LIGHT_OPACITY[blockId];
        const emission = BLOCK_LIGHT_EMISSION[blockId];
        
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
            this.addQueue.push({ x: n.x, y: n.y, z: n.z, isSky: false });
            this.addQueue.push({ x: n.x, y: n.y, z: n.z, isSky: true });
        }
        
        let sunY = y + 1;
        let foundSun = false;
        while (sunY < CHUNK_SIZE_Y) {
            if (this.getSkyLight(x, sunY, z) === 15 && BLOCK_LIGHT_OPACITY[this.world.getBlockAt(x, sunY, z)] <= 1) {
                foundSun = true;
                break;
            }
            if (BLOCK_LIGHT_OPACITY[this.world.getBlockAt(x, sunY, z)] === 15) {
                break;
            }
            sunY++;
        }
        
        if (foundSun) {
            let fallY = sunY;
            while (fallY >= 0 && BLOCK_LIGHT_OPACITY[this.world.getBlockAt(x, fallY, z)] <= 1) {
                this.setSkyLight(x, fallY, z, 15);
                this.addQueue.push({ x, y: fallY, z, isSky: true });
                fallY--;
            }
        }
        
        this.processLightAddition();
    }

    processLightRemoval() {
        while (this.removeQueue.length > 0) {
            const node = this.removeQueue.shift();
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
    }

    processLightAddition() {
        while (this.addQueue.length > 0) {
            const node = this.addQueue.shift();
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
                
                const opacity = BLOCK_LIGHT_OPACITY[blockId];
                if (opacity === 15) continue;
                
                const neighborLight = isSky ? this.getSkyLight(n.x, n.y, n.z) : this.getBlockLight(n.x, n.y, n.z);
                
                let propagated = currentLight - Math.max(1, opacity);
                if (isSky && n.y === y - 1 && currentLight === 15 && opacity <= 1) {
                    propagated = 15;
                }

                if (propagated > neighborLight) {
                    if (isSky) this.setSkyLight(n.x, n.y, n.z, propagated);
                    else this.setBlockLight(n.x, n.y, n.z, propagated);
                    
                    this.addQueue.push({ x: n.x, y: n.y, z: n.z, isSky });
                    
                    const chunkInfo = this.world.worldToLocalCoords(n.x, n.y, n.z);
                    const chunk = this.world.getChunk(chunkInfo.cx, chunkInfo.cz);
                    if (chunk) {
                        chunk.isDirty = true;
                        chunk.lightDirty = true;
                    }
                }
            }
        }
    }
}
