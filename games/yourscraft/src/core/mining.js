/**
 * Mining Time & Block Breaking Logic for Minecraft 1.5 WebGL Engine
 *
 * Implements authentic Minecraft 1.5 breaking mechanics:
 * - Block hardness and required harvest tool/level definitions
 * - Tool types (Pickaxe, Shovel, Axe, Sword, Shears, Hand)
 * - Material speed multipliers (Wood: 2, Stone: 4, Iron: 6, Diamond: 8, Gold: 12)
 * - Harvestability checking (canHarvest) determining drop eligibility & break speed divisor (30 vs 100)
 * - Exact tick-based breaking time calculations:
 *     damage = speedMultiplier / blockHardness / (canHarvest ? 30 : 100)
 *     ticks = ceil(1 / damage)
 *     timeInSeconds = ticks / 20
 * - Support for Hand, Wooden Pickaxe, Stone Pickaxe, Iron, Diamond, and Gold tools
 * - Flexible toolId input (numbers, strings, ItemStack objects, or null/undefined)
 */

import { BLOCKS } from './chunk.js';

// ==========================================
// 1. TOOL TYPES & MATERIAL DEFINITIONS
// ==========================================

export const TOOL_TYPES = Object.freeze({
    NONE: 'none',
    PICKAXE: 'pickaxe',
    SHOVEL: 'shovel',
    AXE: 'axe',
    SWORD: 'sword',
    SHEARS: 'shears'
});

export const TOOL_MATERIALS = Object.freeze({
    HAND: { name: 'hand', multiplier: 1.0, harvestLevel: -1 },
    WOOD: { name: 'wood', multiplier: 2.0, harvestLevel: 0 },
    STONE: { name: 'stone', multiplier: 4.0, harvestLevel: 1 },
    IRON: { name: 'iron', multiplier: 6.0, harvestLevel: 2 },
    DIAMOND: { name: 'diamond', multiplier: 8.0, harvestLevel: 3 },
    GOLD: { name: 'gold', multiplier: 12.0, harvestLevel: 0 }
});

/**
 * Tool item registry mapping numeric IDs and string aliases to type and material.
 */
export const TOOL_REGISTRY = Object.freeze({
    // --- Pickaxes ---
    270: { id: 270, name: 'Wooden Pickaxe', type: TOOL_TYPES.PICKAXE, material: TOOL_MATERIALS.WOOD },
    274: { id: 274, name: 'Stone Pickaxe', type: TOOL_TYPES.PICKAXE, material: TOOL_MATERIALS.STONE },
    257: { id: 257, name: 'Iron Pickaxe', type: TOOL_TYPES.PICKAXE, material: TOOL_MATERIALS.IRON },
    278: { id: 278, name: 'Diamond Pickaxe', type: TOOL_TYPES.PICKAXE, material: TOOL_MATERIALS.DIAMOND },
    285: { id: 285, name: 'Golden Pickaxe', type: TOOL_TYPES.PICKAXE, material: TOOL_MATERIALS.GOLD },

    // --- Shovels ---
    269: { id: 269, name: 'Wooden Shovel', type: TOOL_TYPES.SHOVEL, material: TOOL_MATERIALS.WOOD },
    273: { id: 273, name: 'Stone Shovel', type: TOOL_TYPES.SHOVEL, material: TOOL_MATERIALS.STONE },
    256: { id: 256, name: 'Iron Shovel', type: TOOL_TYPES.SHOVEL, material: TOOL_MATERIALS.IRON },
    277: { id: 277, name: 'Diamond Shovel', type: TOOL_TYPES.SHOVEL, material: TOOL_MATERIALS.DIAMOND },
    284: { id: 284, name: 'Golden Shovel', type: TOOL_TYPES.SHOVEL, material: TOOL_MATERIALS.GOLD },

    // --- Axes ---
    271: { id: 271, name: 'Wooden Axe', type: TOOL_TYPES.AXE, material: TOOL_MATERIALS.WOOD },
    275: { id: 275, name: 'Stone Axe', type: TOOL_TYPES.AXE, material: TOOL_MATERIALS.STONE },
    258: { id: 258, name: 'Iron Axe', type: TOOL_TYPES.AXE, material: TOOL_MATERIALS.IRON },
    279: { id: 279, name: 'Diamond Axe', type: TOOL_TYPES.AXE, material: TOOL_MATERIALS.DIAMOND },
    286: { id: 286, name: 'Golden Axe', type: TOOL_TYPES.AXE, material: TOOL_MATERIALS.GOLD },

    // --- Swords ---
    268: { id: 268, name: 'Wooden Sword', type: TOOL_TYPES.SWORD, material: TOOL_MATERIALS.WOOD },
    272: { id: 272, name: 'Stone Sword', type: TOOL_TYPES.SWORD, material: TOOL_MATERIALS.STONE },
    267: { id: 267, name: 'Iron Sword', type: TOOL_TYPES.SWORD, material: TOOL_MATERIALS.IRON },
    276: { id: 276, name: 'Diamond Sword', type: TOOL_TYPES.SWORD, material: TOOL_MATERIALS.DIAMOND },
    283: { id: 283, name: 'Golden Sword', type: TOOL_TYPES.SWORD, material: TOOL_MATERIALS.GOLD },

    // --- Shears ---
    359: { id: 359, name: 'Shears', type: TOOL_TYPES.SHEARS, material: { name: 'shears', multiplier: 1.5, harvestLevel: 0 } }
});

// String alias map for tool lookups
const TOOL_NAME_ALIASES = {
    'hand': { id: 0, name: 'Hand', type: TOOL_TYPES.NONE, material: TOOL_MATERIALS.HAND },
    'bare_hand': { id: 0, name: 'Hand', type: TOOL_TYPES.NONE, material: TOOL_MATERIALS.HAND },
    'none': { id: 0, name: 'Hand', type: TOOL_TYPES.NONE, material: TOOL_MATERIALS.HAND },

    'wood_pickaxe': TOOL_REGISTRY[270],
    'wooden_pickaxe': TOOL_REGISTRY[270],
    'stone_pickaxe': TOOL_REGISTRY[274],
    'iron_pickaxe': TOOL_REGISTRY[257],
    'diamond_pickaxe': TOOL_REGISTRY[278],
    'gold_pickaxe': TOOL_REGISTRY[285],
    'golden_pickaxe': TOOL_REGISTRY[285],

    'wood_shovel': TOOL_REGISTRY[269],
    'wooden_shovel': TOOL_REGISTRY[269],
    'stone_shovel': TOOL_REGISTRY[273],
    'iron_shovel': TOOL_REGISTRY[256],
    'diamond_shovel': TOOL_REGISTRY[277],
    'gold_shovel': TOOL_REGISTRY[284],
    'golden_shovel': TOOL_REGISTRY[284],

    'wood_axe': TOOL_REGISTRY[271],
    'wooden_axe': TOOL_REGISTRY[271],
    'stone_axe': TOOL_REGISTRY[275],
    'iron_axe': TOOL_REGISTRY[258],
    'diamond_axe': TOOL_REGISTRY[279],
    'gold_axe': TOOL_REGISTRY[286],
    'golden_axe': TOOL_REGISTRY[286],

    'wood_sword': TOOL_REGISTRY[268],
    'wooden_sword': TOOL_REGISTRY[268],
    'stone_sword': TOOL_REGISTRY[272],
    'iron_sword': TOOL_REGISTRY[267],
    'diamond_sword': TOOL_REGISTRY[276],
    'gold_sword': TOOL_REGISTRY[283],
    'golden_sword': TOOL_REGISTRY[283],

    'shears': TOOL_REGISTRY[359]
};

/**
 * Resolve tool definition from ID, string name, or ItemStack object.
 * @param {number|string|Object|null|undefined} tool
 * @returns {Object} Normalized tool definition
 */
export function getToolDef(tool) {
    if (!tool || tool === 0) {
        return { id: 0, name: 'Hand', type: TOOL_TYPES.NONE, material: TOOL_MATERIALS.HAND };
    }

    if (typeof tool === 'object') {
        const id = tool.id !== undefined ? tool.id : (tool.type !== undefined ? tool.type : 0);
        return getToolDef(id);
    }

    if (typeof tool === 'number') {
        if (TOOL_REGISTRY[tool]) {
            return TOOL_REGISTRY[tool];
        }
        return { id: tool, name: 'Tool #' + tool, type: TOOL_TYPES.NONE, material: TOOL_MATERIALS.HAND };
    }

    if (typeof tool === 'string') {
        const cleanName = tool.toLowerCase().trim().replace(/[\s-]+/g, '_');
        if (TOOL_NAME_ALIASES[cleanName]) {
            return TOOL_NAME_ALIASES[cleanName];
        }
        const parsedId = parseInt(tool, 10);
        if (!isNaN(parsedId)) {
            return getToolDef(parsedId);
        }
    }

    return { id: 0, name: 'Hand', type: TOOL_TYPES.NONE, material: TOOL_MATERIALS.HAND };
}

// ==========================================
// 2. BLOCK MINING PROPERTIES
// ==========================================

/**
 * Block mining definition:
 * - hardness: base hardness value (-1 for unbreakable like bedrock, 0 for instant break)
 * - preferredTool: preferred tool type that grants speed multiplier
 * - requiresTool: whether a suitable tool is required to harvest/drop items (and avoid 100x penalty divisor)
 * - minHarvestLevel: minimum material harvest level required (0: Wood/Gold, 1: Stone, 2: Iron, 3: Diamond)
 */
export const BLOCK_MINING_PROPERTIES = {
    [BLOCKS.AIR]: { hardness: 0.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.STONE]: { hardness: 1.5, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 0 },
    [BLOCKS.GRASS]: { hardness: 0.6, preferredTool: TOOL_TYPES.SHOVEL, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.DIRT]: { hardness: 0.5, preferredTool: TOOL_TYPES.SHOVEL, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.COBBLESTONE]: { hardness: 2.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 0 },
    [BLOCKS.OAK_PLANKS]: { hardness: 2.0, preferredTool: TOOL_TYPES.AXE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.OAK_SAPLING]: { hardness: 0.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.BEDROCK]: { hardness: -1.0, preferredTool: TOOL_TYPES.NONE, requiresTool: true, minHarvestLevel: 99 },
    [BLOCKS.WATER_FLOWING]: { hardness: 100.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.WATER]: { hardness: 100.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.LAVA_FLOWING]: { hardness: 100.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.LAVA]: { hardness: 100.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.SAND]: { hardness: 0.5, preferredTool: TOOL_TYPES.SHOVEL, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.GRAVEL]: { hardness: 0.6, preferredTool: TOOL_TYPES.SHOVEL, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.GOLD_ORE]: { hardness: 3.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 2 },
    [BLOCKS.IRON_ORE]: { hardness: 3.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 1 },
    [BLOCKS.COAL_ORE]: { hardness: 3.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 0 },
    [BLOCKS.OAK_LOG]: { hardness: 2.0, preferredTool: TOOL_TYPES.AXE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.OAK_LEAVES]: { hardness: 0.2, preferredTool: TOOL_TYPES.SHEARS, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.SPONGE]: { hardness: 0.6, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.GLASS]: { hardness: 0.3, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.LAPIS_ORE]: { hardness: 3.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 1 },
    [BLOCKS.LAPIS_BLOCK]: { hardness: 3.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 1 },
    [BLOCKS.SANDSTONE]: { hardness: 0.8, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 0 },
    [BLOCKS.BED]: { hardness: 0.2, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.TALL_GRASS]: { hardness: 0.0, preferredTool: TOOL_TYPES.SHEARS, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.DEAD_BUSH]: { hardness: 0.0, preferredTool: TOOL_TYPES.SHEARS, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.WOOL]: { hardness: 0.8, preferredTool: TOOL_TYPES.SHEARS, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.DANDELION]: { hardness: 0.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.POPPY]: { hardness: 0.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.BROWN_MUSHROOM]: { hardness: 0.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.RED_MUSHROOM]: { hardness: 0.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.GOLD_BLOCK]: { hardness: 3.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 2 },
    [BLOCKS.IRON_BLOCK]: { hardness: 5.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 1 },
    [BLOCKS.DOUBLE_STONE_SLAB]: { hardness: 2.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 0 },
    [BLOCKS.STONE_SLAB]: { hardness: 2.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 0 },
    [BLOCKS.BRICKS]: { hardness: 2.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 0 },
    [BLOCKS.TNT]: { hardness: 0.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.BOOKSHELF]: { hardness: 1.5, preferredTool: TOOL_TYPES.AXE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.MOSSY_COBBLESTONE]: { hardness: 2.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 0 },
    [BLOCKS.OBSIDIAN]: { hardness: 50.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 3 },
    [BLOCKS.TORCH]: { hardness: 0.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.FIRE]: { hardness: 0.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.DIAMOND_ORE]: { hardness: 3.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 2 },
    [BLOCKS.DIAMOND_BLOCK]: { hardness: 5.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 2 },
    [BLOCKS.CRAFTING_TABLE]: { hardness: 2.5, preferredTool: TOOL_TYPES.AXE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.WHEAT]: { hardness: 0.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.FARMLAND]: { hardness: 0.6, preferredTool: TOOL_TYPES.SHOVEL, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.FURNACE]: { hardness: 3.5, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 0 },
    [BLOCKS.LADDER]: { hardness: 0.4, preferredTool: TOOL_TYPES.AXE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.REDSTONE_ORE]: { hardness: 3.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 2 },
    [BLOCKS.SNOW_LAYER]: { hardness: 0.1, preferredTool: TOOL_TYPES.SHOVEL, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.ICE]: { hardness: 0.5, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.SNOW_BLOCK]: { hardness: 0.2, preferredTool: TOOL_TYPES.SHOVEL, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.CACTUS]: { hardness: 0.4, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.CLAY]: { hardness: 0.6, preferredTool: TOOL_TYPES.SHOVEL, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.SUGAR_CANE]: { hardness: 0.0, preferredTool: TOOL_TYPES.NONE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.FENCE]: { hardness: 2.0, preferredTool: TOOL_TYPES.AXE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.PUMPKIN]: { hardness: 1.0, preferredTool: TOOL_TYPES.AXE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.NETHERRACK]: { hardness: 0.4, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 0 },
    [BLOCKS.SOUL_SAND]: { hardness: 0.5, preferredTool: TOOL_TYPES.SHOVEL, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.GLOWSTONE]: { hardness: 0.3, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: false, minHarvestLevel: -1 },
    [BLOCKS.REDSTONE_BLOCK]: { hardness: 5.0, preferredTool: TOOL_TYPES.PICKAXE, requiresTool: true, minHarvestLevel: 0 }
};

/**
 * Get the mining properties of a block.
 * @param {number} blockId
 * @returns {Object}
 */
export function getBlockMiningProperties(blockId) {
    if (BLOCK_MINING_PROPERTIES[blockId] !== undefined) {
        return BLOCK_MINING_PROPERTIES[blockId];
    }
    // Default fallback for unknown blocks
    return {
        hardness: 1.5,
        preferredTool: TOOL_TYPES.NONE,
        requiresTool: false,
        minHarvestLevel: -1
    };
}

/**
 * Get the hardness of a block.
 * @param {number} blockId
 * @returns {number} Hardness value (-1 for unbreakable)
 */
export function getBlockHardness(blockId) {
    const props = getBlockMiningProperties(blockId);
    return props.hardness;
}

/**
 * Check if the tool is preferred for breaking the block (grants speed multiplier).
 * @param {number} blockId
 * @param {number|string|Object} toolId
 * @returns {boolean}
 */
export function isPreferredTool(blockId, toolId) {
    const blockProps = getBlockMiningProperties(blockId);
    const tool = getToolDef(toolId);

    if (blockProps.preferredTool === TOOL_TYPES.NONE || tool.type === TOOL_TYPES.NONE) {
        return false;
    }

    return blockProps.preferredTool === tool.type;
}

/**
 * Check if the tool is capable of harvesting/dropping the block.
 * @param {number} blockId
 * @param {number|string|Object} toolId
 * @returns {boolean}
 */
export function canHarvest(blockId, toolId) {
    const blockProps = getBlockMiningProperties(blockId);
    if (!blockProps.requiresTool) {
        return true;
    }

    const tool = getToolDef(toolId);
    if (tool.type !== blockProps.preferredTool) {
        return false;
    }

    return tool.material.harvestLevel >= blockProps.minHarvestLevel;
}

/**
 * Calculate the effective mining speed multiplier.
 * @param {number} blockId
 * @param {number|string|Object} toolId
 * @param {Object} [options={}]
 * @param {number} [options.efficiencyLevel=0]
 * @param {number} [options.hasteLevel=0]
 * @param {number} [options.miningFatigue=0]
 * @param {boolean} [options.inWater=false]
 * @param {boolean} [options.onGround=true]
 * @returns {number} Speed multiplier
 */
export function getMiningSpeedMultiplier(blockId, toolId, options = {}) {
    const tool = getToolDef(toolId);
    const preferred = isPreferredTool(blockId, toolId);

    let speed = 1.0;
    if (preferred) {
        speed = tool.material.multiplier;
        const efficiency = options.efficiencyLevel || 0;
        if (efficiency > 0) {
            speed += (efficiency * efficiency) + 1;
        }
    } else if (tool.type === TOOL_TYPES.SWORD) {
        // Swords have a 1.5x multiplier on certain soft blocks / web
        speed = 1.5;
    }

    // Status effects
    const haste = options.hasteLevel || 0;
    if (haste > 0) {
        speed *= (1 + 0.2 * haste);
    }

    const fatigue = options.miningFatigue || 0;
    if (fatigue > 0) {
        speed *= Math.pow(0.3, Math.min(fatigue, 4));
    }

    // Environmental penalties
    if (options.inWater && !options.hasAquaAffinity) {
        speed /= 5.0;
    }

    if (options.onGround === false) {
        speed /= 5.0;
    }

    return speed;
}

/**
 * Calculate the time in seconds to break a block based on Minecraft 1.5 mechanics.
 *
 * Formula:
 * - If hardness < 0: block is unbreakable (returns Infinity)
 * - If hardness === 0: block is instantly broken (returns 0.0s)
 * - damagePerTick = speedMultiplier / blockHardness / (canHarvest ? 30 : 100)
 * - if damagePerTick >= 1.0 -> instant (0.0s)
 * - ticks = ceil(1.0 / damagePerTick)
 * - timeInSeconds = ticks / 20.0
 *
 * @param {number} blockId - ID of the target block
 * @param {number|string|Object|null} [toolId=null] - Tool ID, tool name, or ItemStack (default hand)
 * @param {Object} [options={}] - Additional modifiers (onGround, inWater, efficiencyLevel, hasteLevel, etc.)
 * @returns {number} Time to break in seconds (e.g. 7.5s for Stone with Hand, 1.15s with Wooden Pickaxe)
 */
export function getMiningTime(blockId, toolId = null, options = {}) {
    const blockProps = getBlockMiningProperties(blockId);
    const hardness = blockProps.hardness;

    if (hardness < 0) {
        return Infinity; // Bedrock / unbreakable
    }

    if (hardness === 0) {
        return 0.0; // Instant break (torches, tall grass, saplings, etc.)
    }

    const speed = getMiningSpeedMultiplier(blockId, toolId, options);
    const harvestable = canHarvest(blockId, toolId);

    const divisor = harvestable ? 30.0 : 100.0;
    const damagePerTick = (speed / hardness) / divisor;

    if (damagePerTick >= 1.0) {
        return 0.0;
    }

    const ticks = Math.ceil(1.0 / damagePerTick);
    return ticks / 20.0;
}

/**
 * Calculate the number of game ticks (1/20 second) to break a block.
 * @param {number} blockId
 * @param {number|string|Object|null} [toolId=null]
 * @param {Object} [options={}]
 * @returns {number} Integer ticks (or Infinity)
 */
export function getMiningTicks(blockId, toolId = null, options = {}) {
    const timeInSeconds = getMiningTime(blockId, toolId, options);
    if (!isFinite(timeInSeconds)) return Infinity;
    return Math.round(timeInSeconds * 20);
}

/**
 * Helper class to track incremental block breaking progress across game frames/ticks.
 */
export class MiningTracker {
    constructor() {
        this.targetBlock = null; // { x, y, z, blockId }
        this.progress = 0.0;     // 0.0 to 1.0
        this.breakTime = 0.0;    // Total break time in seconds
    }

    /**
     * Start or continue mining a block.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} blockId
     * @param {number|string|Object} toolId
     * @param {number} dt - Delta time in seconds
     * @param {Object} [options={}]
     * @returns {{ broken: boolean, stage: number, progress: number }} Mining state
     */
    updateMining(x, y, z, blockId, toolId, dt, options = {}) {
        // If target changed, reset progress
        if (!this.targetBlock || this.targetBlock.x !== x || this.targetBlock.y !== y || this.targetBlock.z !== z || this.targetBlock.blockId !== blockId) {
            this.targetBlock = { x, y, z, blockId };
            this.progress = 0.0;
            this.breakTime = getMiningTime(blockId, toolId, options);
        }

        if (!isFinite(this.breakTime) || this.breakTime <= 0) {
            if (this.breakTime === 0) {
                return { broken: true, stage: 9, progress: 1.0 };
            }
            return { broken: false, stage: -1, progress: 0.0 };
        }

        this.progress += dt / this.breakTime;

        if (this.progress >= 1.0) {
            this.reset();
            return { broken: true, stage: 9, progress: 1.0 };
        }

        // Minecraft destruction overlay has 10 crack stages (0..9)
        const stage = Math.min(9, Math.floor(this.progress * 10));
        return { broken: false, stage, progress: this.progress };
    }

    /**
     * Reset mining progress.
     */
    reset() {
        this.targetBlock = null;
        this.progress = 0.0;
        this.breakTime = 0.0;
    }
}
