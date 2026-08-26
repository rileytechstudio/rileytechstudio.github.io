/**
 * Chunk data structure for Minecraft 1.5 WebGL Engine
 * Represents a 16x256x16 column of voxels
 */

export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Y = 256;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_VOLUME = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z; // 65,536 voxels

export const BLOCKS = Object.freeze({
    AIR: 0,
    STONE: 1,
    GRASS: 2,
    DIRT: 3,
    COBBLESTONE: 4,
    OAK_PLANKS: 5,
    OAK_SAPLING: 6,
    BEDROCK: 7,
    WATER_FLOWING: 8,
    WATER: 9,
    LAVA_FLOWING: 10,
    LAVA: 11,
    SAND: 12,
    GRAVEL: 13,
    GOLD_ORE: 14,
    IRON_ORE: 15,
    COAL_ORE: 16,
    OAK_LOG: 17,
    OAK_LEAVES: 18,
    SPONGE: 19,
    GLASS: 20,
    LAPIS_ORE: 21,
    LAPIS_BLOCK: 22,
    SANDSTONE: 24,
    BED: 26,
    TALL_GRASS: 31,
    DEAD_BUSH: 32,
    WOOL: 35,
    DANDELION: 37,
    POPPY: 38,
    BROWN_MUSHROOM: 39,
    RED_MUSHROOM: 40,
    GOLD_BLOCK: 41,
    IRON_BLOCK: 42,
    DOUBLE_STONE_SLAB: 43,
    STONE_SLAB: 44,
    BRICKS: 45,
    TNT: 46,
    BOOKSHELF: 47,
    MOSSY_COBBLESTONE: 48,
    OBSIDIAN: 49,
    TORCH: 50,
    FIRE: 51,
    DIAMOND_ORE: 56,
    DIAMOND_BLOCK: 57,
    CRAFTING_TABLE: 58,
    WHEAT: 59,
    FARMLAND: 60,
    FURNACE: 61,
    LADDER: 65,
    RAIL: 66,
    POWERED_RAIL: 27,
    DETECTOR_RAIL: 28,
    ACTIVATOR_RAIL: 157,
    REDSTONE_ORE: 73,
    SNOW_LAYER: 78,
    ICE: 79,
    SNOW_BLOCK: 80,
    CACTUS: 81,
    CLAY: 82,
    SUGAR_CANE: 83,
    FENCE: 85,
    PUMPKIN: 86,
    NETHERRACK: 87,
    SOUL_SAND: 88,
    GLOWSTONE: 89,
    REDSTONE_BLOCK: 152,
    QUARTZ_ORE: 153,
    QUARTZ_BLOCK: 155,
    QUARTZ_PILLAR: 156,
    QUARTZ_CHISELED: 157,
    ENCHANTING_TABLE: 116,
    ANVIL: 145
});

export class Chunk {
    /**
     * @param {number} x - Chunk grid coordinate X (world X = x * CHUNK_SIZE_X)
     * @param {number} z - Chunk grid coordinate Z (world Z = z * CHUNK_SIZE_Z)
     * @param {number} [sizeX=CHUNK_SIZE_X]
     * @param {number} [sizeY=CHUNK_SIZE_Y]
     * @param {number} [sizeZ=CHUNK_SIZE_Z]
     */
    constructor(x = 0, z = 0, sizeX = CHUNK_SIZE_X, sizeY = CHUNK_SIZE_Y, sizeZ = CHUNK_SIZE_Z) {
        this.x = x;
        this.z = z;
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.sizeZ = sizeZ;
        this.blocks = new Uint8Array(sizeX * sizeY * sizeZ);
        this.isDirty = true;
        this.mesh = null;
    }

    /**
     * Convert local (x, y, z) to linear buffer index.
     * Uses layout: index = (y * sizeZ + z) * sizeX + x
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {number} Index, or -1 if out of bounds
     */
    getIndex(x, y, z) {
        if (x < 0 || x >= this.sizeX || y < 0 || y >= this.sizeY || z < 0 || z >= this.sizeZ) {
            return -1;
        }
        return (y * this.sizeZ + z) * this.sizeX + x;
    }

    /**
     * Get block ID at local coordinate
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {number} Block ID (0 = AIR)
     */
    getBlock(x, y, z) {
        const idx = this.getIndex(x, y, z);
        if (idx === -1) return BLOCKS.AIR;
        return this.blocks[idx];
    }

    /**
     * Set block ID at local coordinate
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} blockId 
     * @returns {boolean} True if set successfully
     */
    setBlock(x, y, z, blockId) {
        const idx = this.getIndex(x, y, z);
        if (idx === -1) return false;
        if (this.blocks[idx] !== blockId) {
            this.blocks[idx] = blockId;
            this.isDirty = true;
        }
        return true;
    }

    /**
     * Check if local coordinate is inside this chunk
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {boolean}
     */
    inBounds(x, y, z) {
        return x >= 0 && x < this.sizeX && y >= 0 && y < this.sizeY && z >= 0 && z < this.sizeZ;
    }

    /**
     * Get world coordinate of a block in this chunk
     * @param {number} localX
     * @param {number} localY
     * @param {number} localZ
     * @returns {{x: number, y: number, z: number}}
     */
    getWorldPos(localX, localY, localZ) {
        return {
            x: this.x * this.sizeX + localX,
            y: localY,
            z: this.z * this.sizeZ + localZ
        };
    }

    /**
     * Fill vertical layer from minY to maxY with blockId
     * @param {number} blockId
     * @param {number} [minY=0]
     * @param {number} [maxY=CHUNK_SIZE_Y-1]
     */
    fillLayer(blockId, minY = 0, maxY = this.sizeY - 1) {
        const clampedMinY = Math.max(0, minY);
        const clampedMaxY = Math.min(this.sizeY - 1, maxY);
        const layerSize = this.sizeX * this.sizeZ;
        for (let y = clampedMinY; y <= clampedMaxY; y++) {
            const start = y * layerSize;
            this.blocks.fill(blockId, start, start + layerSize);
        }
        this.isDirty = true;
    }

    /**
     * Get the collision bounding box for a block at local coordinate.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {{minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number}|null}
     */
    getBlockAABB(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (blockId === BLOCKS.AIR) return null;
        
        const worldPos = this.getWorldPos(x, y, z);
        
        if (blockId === BLOCKS.SNOW_LAYER) {
            // Assume metadata isn't implemented and render all as 1/8th height
            return {
                minX: worldPos.x, minY: worldPos.y, minZ: worldPos.z,
                maxX: worldPos.x + 1, maxY: worldPos.y + 0.125, maxZ: worldPos.z + 1
            };
        }
        
        return {
            minX: worldPos.x, minY: worldPos.y, minZ: worldPos.z,
            maxX: worldPos.x + 1, maxY: worldPos.y + 1, maxZ: worldPos.z + 1
        };
    }
}
