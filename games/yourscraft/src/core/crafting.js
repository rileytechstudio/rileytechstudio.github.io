/**
 * Minecraft 1.5 Crafting System Engine
 * 
 * Provides:
 * - Comprehensive Minecraft 1.5 Recipe Dictionary (shaped & shapeless)
 * - craft(grid): Matches 2x2 or 3x3 array of block/item IDs to recipe result
 * - Bounding-box trimming and horizontal mirror symmetry for shaped recipes
 */

import { BLOCKS } from './chunk.js';

// ==========================================
// 1. ITEM & MATERIAL IDS (Standard MC 1.5)
// ==========================================

export const ITEM_IDS = Object.freeze({
    // Food & Materials
    COAL: 263,
    DIAMOND: 264,
    IRON_INGOT: 265,
    GOLD_INGOT: 266,
    STICK: 280,
    REDSTONE: 331,
    WHEAT: 296,
    BREAD: 297,
    APPLE: 260,
    RAW_PORKCHOP: 319,
    COOKED_PORKCHOP: 320,
    GOLDEN_APPLE: 322,
    RAW_BEEF: 363,
    COOKED_BEEF: 364,
    GUNPOWDER: 289,
    BOOK: 340,
    ENCHANTED_BOOK: 403,
    BOW: 261,
    ARROW: 262,
    LAPIS_LAZULI: 351,
    EXPERIENCE_BOTTLE: 384,
    ENCHANTING_TABLE: BLOCKS.ENCHANTING_TABLE,
    ANVIL: BLOCKS.ANVIL,
    QUARTZ: 406,
    NETHER_QUARTZ: 406,
    QUARTZ_ORE: BLOCKS.QUARTZ_ORE,
    QUARTZ_BLOCK: BLOCKS.QUARTZ_BLOCK,
    QUARTZ_PILLAR: BLOCKS.QUARTZ_PILLAR,
    QUARTZ_CHISELED: BLOCKS.QUARTZ_CHISELED,

    // Armor
    IRON_HELMET: 306,
    IRON_CHESTPLATE: 307,
    IRON_LEGGINGS: 308,
    IRON_BOOTS: 309,
    DIAMOND_HELMET: 310,
    DIAMOND_CHESTPLATE: 311,
    DIAMOND_LEGGINGS: 312,
    DIAMOND_BOOTS: 313,
    GOLDEN_HELMET: 314,
    GOLDEN_CHESTPLATE: 315,
    GOLDEN_LEGGINGS: 316,
    GOLDEN_BOOTS: 317,

    // Wooden Tools
    WOODEN_SWORD: 268,
    WOODEN_SHOVEL: 269,
    WOODEN_PICKAXE: 270,
    WOODEN_AXE: 271,

    // Stone Tools
    STONE_SWORD: 272,
    STONE_SHOVEL: 273,
    STONE_PICKAXE: 274,
    STONE_AXE: 275,

    // Iron Tools
    IRON_SHOVEL: 256,
    IRON_PICKAXE: 257,
    IRON_AXE: 258,
    IRON_SWORD: 267,

    // Diamond Tools
    DIAMOND_SWORD: 276,
    DIAMOND_SHOVEL: 277,
    DIAMOND_PICKAXE: 278,
    DIAMOND_AXE: 279,

    // Golden Tools
    GOLDEN_SWORD: 283,
    GOLDEN_SHOVEL: 284,
    GOLDEN_PICKAXE: 285,
    GOLDEN_AXE: 286
});

export const QUARTZ = ITEM_IDS.QUARTZ;
export const NETHER_QUARTZ = ITEM_IDS.NETHER_QUARTZ;
export const QUARTZ_ORE = BLOCKS.QUARTZ_ORE;
export const QUARTZ_BLOCK = BLOCKS.QUARTZ_BLOCK;
export const QUARTZ_PILLAR = BLOCKS.QUARTZ_PILLAR;
export const QUARTZ_CHISELED = BLOCKS.QUARTZ_CHISELED;

/**
 * Minecraft 1.5 Food and Nutrition Properties Dictionary
 */
export const FOOD_PROPERTIES = Object.freeze({
    [ITEM_IDS.APPLE]: { id: ITEM_IDS.APPLE, name: 'Apple', foodValue: 4, saturation: 2.4 },
    [ITEM_IDS.BREAD]: { id: ITEM_IDS.BREAD, name: 'Bread', foodValue: 5, saturation: 6.0 },
    [ITEM_IDS.COOKED_PORKCHOP]: { id: ITEM_IDS.COOKED_PORKCHOP, name: 'Cooked Porkchop', foodValue: 8, saturation: 12.8 },
    [ITEM_IDS.RAW_PORKCHOP]: { id: ITEM_IDS.RAW_PORKCHOP, name: 'Raw Porkchop', foodValue: 3, saturation: 1.8 },
    [ITEM_IDS.GOLDEN_APPLE]: { id: ITEM_IDS.GOLDEN_APPLE, name: 'Golden Apple', foodValue: 4, saturation: 9.6, canAlwaysEat: true },
    [ITEM_IDS.RAW_BEEF]: { id: ITEM_IDS.RAW_BEEF, name: 'Raw Beef', foodValue: 3, saturation: 1.8 },
    [ITEM_IDS.COOKED_BEEF]: { id: ITEM_IDS.COOKED_BEEF, name: 'Steak', foodValue: 8, saturation: 12.8 }
});

export const FOOD_ITEMS = FOOD_PROPERTIES;

/**
 * Get food properties for a given item ID
 * @param {number|string} itemId
 * @returns {{ id: number, name: string, foodValue: number, saturation: number, canAlwaysEat?: boolean }|null}
 */
export function getFoodProperties(itemId) {
    const id = Number(itemId);
    return FOOD_PROPERTIES[id] || null;
}

/**
 * Check if an item ID is edible food
 * @param {number|string} itemId
 * @returns {boolean}
 */
export function isFoodItem(itemId) {
    const id = Number(itemId);
    return Boolean(FOOD_PROPERTIES[id]);
}

// ==========================================
// 2. MINECRAFT 1.5 RECIPES DICTIONARY
// ==========================================

export const RECIPES = Object.freeze({
    // Basic Materials & Utilities
    OAK_PLANKS: {
        id: 'oak_planks',
        name: 'Oak Wood Planks',
        shapeless: true,
        ingredients: [BLOCKS.OAK_LOG],
        result: { id: BLOCKS.OAK_PLANKS, count: 4 }
    },
    STICK: {
        id: 'stick',
        name: 'Stick',
        width: 1,
        height: 2,
        grid: [
            BLOCKS.OAK_PLANKS,
            BLOCKS.OAK_PLANKS
        ],
        result: { id: ITEM_IDS.STICK, count: 4 }
    },
    TORCH: {
        id: 'torch',
        name: 'Torch',
        width: 1,
        height: 2,
        grid: [
            ITEM_IDS.COAL,
            ITEM_IDS.STICK
        ],
        result: { id: BLOCKS.TORCH, count: 4 }
    },
    CRAFTING_TABLE: {
        id: 'crafting_table',
        name: 'Crafting Table',
        width: 2,
        height: 2,
        grid: [
            BLOCKS.OAK_PLANKS, BLOCKS.OAK_PLANKS,
            BLOCKS.OAK_PLANKS, BLOCKS.OAK_PLANKS
        ],
        result: { id: BLOCKS.CRAFTING_TABLE, count: 1 }
    },
    SANDSTONE: {
        id: 'sandstone',
        name: 'Sandstone',
        width: 2,
        height: 2,
        grid: [
            BLOCKS.SAND, BLOCKS.SAND,
            BLOCKS.SAND, BLOCKS.SAND
        ],
        result: { id: BLOCKS.SANDSTONE, count: 1 }
    },
    FURNACE: {
        id: 'furnace',
        name: 'Furnace',
        width: 3,
        height: 3,
        grid: [
            BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE,
            BLOCKS.COBBLESTONE, 0,                  BLOCKS.COBBLESTONE,
            BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE
        ],
        result: { id: BLOCKS.FURNACE, count: 1 }
    },

    // Pickaxes (3x3)
    WOODEN_PICKAXE: {
        id: 'wooden_pickaxe',
        name: 'Wooden Pickaxe',
        width: 3,
        height: 3,
        grid: [
            BLOCKS.OAK_PLANKS, BLOCKS.OAK_PLANKS, BLOCKS.OAK_PLANKS,
            0,                 ITEM_IDS.STICK,    0,
            0,                 ITEM_IDS.STICK,    0
        ],
        result: { id: ITEM_IDS.WOODEN_PICKAXE, count: 1 }
    },
    STONE_PICKAXE: {
        id: 'stone_pickaxe',
        name: 'Stone Pickaxe',
        width: 3,
        height: 3,
        grid: [
            BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE,
            0,                  ITEM_IDS.STICK,     0,
            0,                  ITEM_IDS.STICK,     0
        ],
        result: { id: ITEM_IDS.STONE_PICKAXE, count: 1 }
    },
    IRON_PICKAXE: {
        id: 'iron_pickaxe',
        name: 'Iron Pickaxe',
        width: 3,
        height: 3,
        grid: [
            ITEM_IDS.IRON_INGOT, ITEM_IDS.IRON_INGOT, ITEM_IDS.IRON_INGOT,
            0,                   ITEM_IDS.STICK,      0,
            0,                   ITEM_IDS.STICK,      0
        ],
        result: { id: ITEM_IDS.IRON_PICKAXE, count: 1 }
    },
    DIAMOND_PICKAXE: {
        id: 'diamond_pickaxe',
        name: 'Diamond Pickaxe',
        width: 3,
        height: 3,
        grid: [
            ITEM_IDS.DIAMOND, ITEM_IDS.DIAMOND, ITEM_IDS.DIAMOND,
            0,                ITEM_IDS.STICK,   0,
            0,                ITEM_IDS.STICK,   0
        ],
        result: { id: ITEM_IDS.DIAMOND_PICKAXE, count: 1 }
    },
    GOLDEN_PICKAXE: {
        id: 'golden_pickaxe',
        name: 'Golden Pickaxe',
        width: 3,
        height: 3,
        grid: [
            ITEM_IDS.GOLD_INGOT, ITEM_IDS.GOLD_INGOT, ITEM_IDS.GOLD_INGOT,
            0,                   ITEM_IDS.STICK,      0,
            0,                   ITEM_IDS.STICK,      0
        ],
        result: { id: ITEM_IDS.GOLDEN_PICKAXE, count: 1 }
    },

    // Swords (1x3)
    WOODEN_SWORD: {
        id: 'wooden_sword',
        name: 'Wooden Sword',
        width: 1,
        height: 3,
        grid: [
            BLOCKS.OAK_PLANKS,
            BLOCKS.OAK_PLANKS,
            ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.WOODEN_SWORD, count: 1 }
    },
    STONE_SWORD: {
        id: 'stone_sword',
        name: 'Stone Sword',
        width: 1,
        height: 3,
        grid: [
            BLOCKS.COBBLESTONE,
            BLOCKS.COBBLESTONE,
            ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.STONE_SWORD, count: 1 }
    },
    IRON_SWORD: {
        id: 'iron_sword',
        name: 'Iron Sword',
        width: 1,
        height: 3,
        grid: [
            ITEM_IDS.IRON_INGOT,
            ITEM_IDS.IRON_INGOT,
            ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.IRON_SWORD, count: 1 }
    },
    DIAMOND_SWORD: {
        id: 'diamond_sword',
        name: 'Diamond Sword',
        width: 1,
        height: 3,
        grid: [
            ITEM_IDS.DIAMOND,
            ITEM_IDS.DIAMOND,
            ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.DIAMOND_SWORD, count: 1 }
    },
    GOLDEN_SWORD: {
        id: 'golden_sword',
        name: 'Golden Sword',
        width: 1,
        height: 3,
        grid: [
            ITEM_IDS.GOLD_INGOT,
            ITEM_IDS.GOLD_INGOT,
            ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.GOLDEN_SWORD, count: 1 }
    },

    // Axes (2x3)
    WOODEN_AXE: {
        id: 'wooden_axe',
        name: 'Wooden Axe',
        width: 2,
        height: 3,
        grid: [
            BLOCKS.OAK_PLANKS, BLOCKS.OAK_PLANKS,
            BLOCKS.OAK_PLANKS, ITEM_IDS.STICK,
            0,                 ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.WOODEN_AXE, count: 1 }
    },
    STONE_AXE: {
        id: 'stone_axe',
        name: 'Stone Axe',
        width: 2,
        height: 3,
        grid: [
            BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE,
            BLOCKS.COBBLESTONE, ITEM_IDS.STICK,
            0,                  ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.STONE_AXE, count: 1 }
    },
    IRON_AXE: {
        id: 'iron_axe',
        name: 'Iron Axe',
        width: 2,
        height: 3,
        grid: [
            ITEM_IDS.IRON_INGOT, ITEM_IDS.IRON_INGOT,
            ITEM_IDS.IRON_INGOT, ITEM_IDS.STICK,
            0,                   ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.IRON_AXE, count: 1 }
    },
    DIAMOND_AXE: {
        id: 'diamond_axe',
        name: 'Diamond Axe',
        width: 2,
        height: 3,
        grid: [
            ITEM_IDS.DIAMOND, ITEM_IDS.DIAMOND,
            ITEM_IDS.DIAMOND, ITEM_IDS.STICK,
            0,                ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.DIAMOND_AXE, count: 1 }
    },
    GOLDEN_AXE: {
        id: 'golden_axe',
        name: 'Golden Axe',
        width: 2,
        height: 3,
        grid: [
            ITEM_IDS.GOLD_INGOT, ITEM_IDS.GOLD_INGOT,
            ITEM_IDS.GOLD_INGOT, ITEM_IDS.STICK,
            0,                   ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.GOLDEN_AXE, count: 1 }
    },

    // Shovels (1x3)
    WOODEN_SHOVEL: {
        id: 'wooden_shovel',
        name: 'Wooden Shovel',
        width: 1,
        height: 3,
        grid: [
            BLOCKS.OAK_PLANKS,
            ITEM_IDS.STICK,
            ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.WOODEN_SHOVEL, count: 1 }
    },
    STONE_SHOVEL: {
        id: 'stone_shovel',
        name: 'Stone Shovel',
        width: 1,
        height: 3,
        grid: [
            BLOCKS.COBBLESTONE,
            ITEM_IDS.STICK,
            ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.STONE_SHOVEL, count: 1 }
    },
    IRON_SHOVEL: {
        id: 'iron_shovel',
        name: 'Iron Shovel',
        width: 1,
        height: 3,
        grid: [
            ITEM_IDS.IRON_INGOT,
            ITEM_IDS.STICK,
            ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.IRON_SHOVEL, count: 1 }
    },
    DIAMOND_SHOVEL: {
        id: 'diamond_shovel',
        name: 'Diamond Shovel',
        width: 1,
        height: 3,
        grid: [
            ITEM_IDS.DIAMOND,
            ITEM_IDS.STICK,
            ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.DIAMOND_SHOVEL, count: 1 }
    },
    GOLDEN_SHOVEL: {
        id: 'golden_shovel',
        name: 'Golden Shovel',
        width: 1,
        height: 3,
        grid: [
            ITEM_IDS.GOLD_INGOT,
            ITEM_IDS.STICK,
            ITEM_IDS.STICK
        ],
        result: { id: ITEM_IDS.GOLDEN_SHOVEL, count: 1 }
    },

    // Storage Mineral Blocks (3x3)
    IRON_BLOCK: {
        id: 'iron_block',
        name: 'Block of Iron',
        width: 3,
        height: 3,
        grid: [
            ITEM_IDS.IRON_INGOT, ITEM_IDS.IRON_INGOT, ITEM_IDS.IRON_INGOT,
            ITEM_IDS.IRON_INGOT, ITEM_IDS.IRON_INGOT, ITEM_IDS.IRON_INGOT,
            ITEM_IDS.IRON_INGOT, ITEM_IDS.IRON_INGOT, ITEM_IDS.IRON_INGOT
        ],
        result: { id: BLOCKS.IRON_BLOCK, count: 1 }
    },
    GOLD_BLOCK: {
        id: 'gold_block',
        name: 'Block of Gold',
        width: 3,
        height: 3,
        grid: [
            ITEM_IDS.GOLD_INGOT, ITEM_IDS.GOLD_INGOT, ITEM_IDS.GOLD_INGOT,
            ITEM_IDS.GOLD_INGOT, ITEM_IDS.GOLD_INGOT, ITEM_IDS.GOLD_INGOT,
            ITEM_IDS.GOLD_INGOT, ITEM_IDS.GOLD_INGOT, ITEM_IDS.GOLD_INGOT
        ],
        result: { id: BLOCKS.GOLD_BLOCK, count: 1 }
    },
    DIAMOND_BLOCK: {
        id: 'diamond_block',
        name: 'Block of Diamond',
        width: 3,
        height: 3,
        grid: [
            ITEM_IDS.DIAMOND, ITEM_IDS.DIAMOND, ITEM_IDS.DIAMOND,
            ITEM_IDS.DIAMOND, ITEM_IDS.DIAMOND, ITEM_IDS.DIAMOND,
            ITEM_IDS.DIAMOND, ITEM_IDS.DIAMOND, ITEM_IDS.DIAMOND
        ],
        result: { id: BLOCKS.DIAMOND_BLOCK, count: 1 }
    },
    REDSTONE_BLOCK: {
        id: 'redstone_block',
        name: 'Block of Redstone',
        width: 3,
        height: 3,
        grid: [
            ITEM_IDS.REDSTONE, ITEM_IDS.REDSTONE, ITEM_IDS.REDSTONE,
            ITEM_IDS.REDSTONE, ITEM_IDS.REDSTONE, ITEM_IDS.REDSTONE,
            ITEM_IDS.REDSTONE, ITEM_IDS.REDSTONE, ITEM_IDS.REDSTONE
        ],
        result: { id: BLOCKS.REDSTONE_BLOCK, count: 1 }
    },

    // Mineral Block Deconstruction (Shapeless)
    IRON_INGOTS_FROM_BLOCK: {
        id: 'iron_ingots_from_block',
        name: 'Iron Ingot x9',
        shapeless: true,
        ingredients: [BLOCKS.IRON_BLOCK],
        result: { id: ITEM_IDS.IRON_INGOT, count: 9 }
    },
    GOLD_INGOTS_FROM_BLOCK: {
        id: 'gold_ingots_from_block',
        name: 'Gold Ingot x9',
        shapeless: true,
        ingredients: [BLOCKS.GOLD_BLOCK],
        result: { id: ITEM_IDS.GOLD_INGOT, count: 9 }
    },
    DIAMONDS_FROM_BLOCK: {
        id: 'diamonds_from_block',
        name: 'Diamond x9',
        shapeless: true,
        ingredients: [BLOCKS.DIAMOND_BLOCK],
        result: { id: ITEM_IDS.DIAMOND, count: 9 }
    },
    REDSTONE_FROM_BLOCK: {
        id: 'redstone_from_block',
        name: 'Redstone Dust x9',
        shapeless: true,
        ingredients: [BLOCKS.REDSTONE_BLOCK],
        result: { id: ITEM_IDS.REDSTONE, count: 9 }
    },

    // Utilities & Miscellaneous
    TNT: {
        id: 'tnt',
        name: 'TNT',
        width: 3,
        height: 3,
        grid: [
            ITEM_IDS.GUNPOWDER, BLOCKS.SAND,        ITEM_IDS.GUNPOWDER,
            BLOCKS.SAND,        ITEM_IDS.GUNPOWDER, BLOCKS.SAND,
            ITEM_IDS.GUNPOWDER, BLOCKS.SAND,        ITEM_IDS.GUNPOWDER
        ],
        result: { id: BLOCKS.TNT, count: 1 }
    },
    LADDER: {
        id: 'ladder',
        name: 'Ladder',
        width: 3,
        height: 3,
        grid: [
            ITEM_IDS.STICK, 0,              ITEM_IDS.STICK,
            ITEM_IDS.STICK, ITEM_IDS.STICK, ITEM_IDS.STICK,
            ITEM_IDS.STICK, 0,              ITEM_IDS.STICK
        ],
        result: { id: BLOCKS.LADDER, count: 3 }
    },
    BREAD: {
        id: 'bread',
        name: 'Bread',
        shapeless: true,
        ingredients: [ITEM_IDS.WHEAT, ITEM_IDS.WHEAT, ITEM_IDS.WHEAT],
        result: { id: ITEM_IDS.BREAD, count: 1 }
    },
    BOOKSHELF: {
        id: 'bookshelf',
        name: 'Bookshelf',
        width: 3,
        height: 3,
        grid: [
            BLOCKS.OAK_PLANKS, BLOCKS.OAK_PLANKS, BLOCKS.OAK_PLANKS,
            ITEM_IDS.BOOK,     ITEM_IDS.BOOK,     ITEM_IDS.BOOK,
            BLOCKS.OAK_PLANKS, BLOCKS.OAK_PLANKS, BLOCKS.OAK_PLANKS
        ],
        result: { id: BLOCKS.BOOKSHELF, count: 1 }
    },

    // Nether Quartz Crafting (Minecraft 1.5 The Redstone Update)
    QUARTZ_BLOCK: {
        id: 'quartz_block',
        name: 'Block of Quartz',
        width: 2,
        height: 2,
        grid: [
            ITEM_IDS.QUARTZ, ITEM_IDS.QUARTZ,
            ITEM_IDS.QUARTZ, ITEM_IDS.QUARTZ
        ],
        result: { id: BLOCKS.QUARTZ_BLOCK, count: 1 }
    },
    QUARTZ_PILLAR: {
        id: 'quartz_pillar',
        name: 'Pillar Quartz Block',
        width: 1,
        height: 2,
        grid: [
            BLOCKS.QUARTZ_BLOCK,
            BLOCKS.QUARTZ_BLOCK
        ],
        result: { id: BLOCKS.QUARTZ_PILLAR, count: 2 }
    },
    QUARTZ_CHISELED: {
        id: 'quartz_chiseled',
        name: 'Chiseled Quartz Block',
        width: 1,
        height: 2,
        grid: [
            BLOCKS.QUARTZ_PILLAR,
            BLOCKS.QUARTZ_PILLAR
        ],
        result: { id: BLOCKS.QUARTZ_CHISELED, count: 2 }
    },
    QUARTZ_CHISELED_FROM_BLOCKS: {
        id: 'quartz_chiseled_from_blocks',
        name: 'Chiseled Quartz Block',
        width: 2,
        height: 1,
        grid: [
            BLOCKS.QUARTZ_BLOCK, BLOCKS.QUARTZ_BLOCK
        ],
        result: { id: BLOCKS.QUARTZ_CHISELED, count: 2 }
    },
    DAYLIGHT_DETECTOR: {
        id: 'daylight_detector',
        name: 'Daylight Sensor',
        width: 3,
        height: 3,
        grid: [
            BLOCKS.GLASS,      BLOCKS.GLASS,      BLOCKS.GLASS,
            ITEM_IDS.QUARTZ,   ITEM_IDS.QUARTZ,   ITEM_IDS.QUARTZ,
            BLOCKS.OAK_PLANKS, BLOCKS.OAK_PLANKS, BLOCKS.OAK_PLANKS
        ],
        result: { id: 151, count: 1 }
    },
    COMPARATOR: {
        id: 'comparator',
        name: 'Redstone Comparator',
        width: 3,
        height: 3,
        grid: [
            0,            BLOCKS.TORCH,    0,
            BLOCKS.TORCH, ITEM_IDS.QUARTZ, BLOCKS.TORCH,
            BLOCKS.STONE, BLOCKS.STONE,    BLOCKS.STONE
        ],
        result: { id: 149, count: 1 }
    },
    ENCHANTING_TABLE: {
        id: 'enchanting_table',
        name: 'Enchanting Table',
        width: 3,
        height: 3,
        grid: [
            0,                 ITEM_IDS.BOOK,   0,
            ITEM_IDS.DIAMOND,  BLOCKS.OBSIDIAN, ITEM_IDS.DIAMOND,
            BLOCKS.OBSIDIAN,   BLOCKS.OBSIDIAN, BLOCKS.OBSIDIAN
        ],
        result: { id: BLOCKS.ENCHANTING_TABLE, count: 1 }
    },
    ANVIL: {
        id: 'anvil',
        name: 'Anvil',
        width: 3,
        height: 3,
        grid: [
            BLOCKS.IRON_BLOCK,   BLOCKS.IRON_BLOCK,   BLOCKS.IRON_BLOCK,
            0,                   ITEM_IDS.IRON_INGOT, 0,
            ITEM_IDS.IRON_INGOT, ITEM_IDS.IRON_INGOT, ITEM_IDS.IRON_INGOT
        ],
        result: { id: BLOCKS.ANVIL, count: 1 }
    },
    GOLDEN_APPLE: {
        id: 'golden_apple',
        name: 'Golden Apple',
        width: 3,
        height: 3,
        grid: [
            ITEM_IDS.GOLD_INGOT, ITEM_IDS.GOLD_INGOT, ITEM_IDS.GOLD_INGOT,
            ITEM_IDS.GOLD_INGOT, ITEM_IDS.APPLE,      ITEM_IDS.GOLD_INGOT,
            ITEM_IDS.GOLD_INGOT, ITEM_IDS.GOLD_INGOT, ITEM_IDS.GOLD_INGOT
        ],
        result: { id: ITEM_IDS.GOLDEN_APPLE, count: 1 }
    }
});

export const CRAFTING_RECIPES = Object.values(RECIPES);

/**
 * Smelting & Cooking Recipes Dictionary (Furnace)
 */
export const SMELTING_RECIPES = Object.freeze({
    RAW_PORKCHOP: {
        id: 'smelt_porkchop',
        name: 'Cooked Porkchop',
        input: ITEM_IDS.RAW_PORKCHOP,
        result: { id: ITEM_IDS.COOKED_PORKCHOP, count: 1 },
        xp: 0.35
    },
    RAW_BEEF: {
        id: 'smelt_beef',
        name: 'Steak',
        input: ITEM_IDS.RAW_BEEF,
        result: { id: ITEM_IDS.COOKED_BEEF, count: 1 },
        xp: 0.35
    },
    COBBLESTONE: {
        id: 'smelt_cobblestone',
        name: 'Stone',
        input: BLOCKS.COBBLESTONE,
        result: { id: BLOCKS.STONE, count: 1 },
        xp: 0.1
    },
    IRON_ORE: {
        id: 'smelt_iron_ore',
        name: 'Iron Ingot',
        input: BLOCKS.IRON_ORE,
        result: { id: ITEM_IDS.IRON_INGOT, count: 1 },
        xp: 0.7
    },
    GOLD_ORE: {
        id: 'smelt_gold_ore',
        name: 'Gold Ingot',
        input: BLOCKS.GOLD_ORE,
        result: { id: ITEM_IDS.GOLD_INGOT, count: 1 },
        xp: 1.0
    },
    SAND: {
        id: 'smelt_sand',
        name: 'Glass',
        input: BLOCKS.SAND,
        result: { id: BLOCKS.GLASS, count: 1 },
        xp: 0.1
    }
});

// ==========================================
// 3. CRAFTING EVALUATOR FUNCTION
// ==========================================

function extractId(cell) {
    if (cell === null || cell === undefined) return 0;
    if (typeof cell === 'object') {
        return Number(cell.id) || 0;
    }
    return Number(cell) || 0;
}

/**
 * Crafts an item from a 2x2 or 3x3 grid of block / item IDs.
 * 
 * Supports:
 * - 1D array of 4 items (2x2) or 9 items (3x3)
 * - 2D array of 2x2 or 3x3 items
 * - Array of objects with .id property
 * - Shapeless recipes (matches any ingredient permutation)
 * - Shaped recipes with automatic bounding box trimming and horizontal mirroring
 * 
 * @param {Array<number|Object|null>|Array<Array<number|Object|null>>} grid 
 * @returns {{ id: number, count: number }|null} Crafted result or null if no recipe matches
 */
export function craft(grid) {
    if (!grid || !Array.isArray(grid)) {
        return null;
    }

    let flatGrid = [];
    let dim = 2;

    // Handle 2D Grid
    if (Array.isArray(grid[0])) {
        const rows = grid.length;
        const cols = grid[0].length;
        dim = Math.max(rows, cols);
        for (let r = 0; r < dim; r++) {
            for (let c = 0; c < dim; c++) {
                const cell = grid[r] ? grid[r][c] : 0;
                flatGrid.push(extractId(cell));
            }
        }
    } else {
        // Handle 1D Grid
        flatGrid = grid.map(extractId);
        if (flatGrid.length === 4) {
            dim = 2;
        } else if (flatGrid.length === 9) {
            dim = 3;
        } else if (flatGrid.length === 1) {
            dim = 1;
        } else {
            dim = Math.ceil(Math.sqrt(flatGrid.length));
        }
    }

    // 1. Check for any non-zero items
    const nonNullItems = flatGrid.filter(id => id > 0);
    if (nonNullItems.length === 0) {
        return null;
    }

    // 2. Extract bounding box for shaped recipes
    let minX = dim, maxX = -1, minY = dim, maxY = -1;
    for (let y = 0; y < dim; y++) {
        for (let x = 0; x < dim; x++) {
            const id = flatGrid[y * dim + x];
            if (id > 0) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }

    const patternWidth = (maxX - minX) + 1;
    const patternHeight = (maxY - minY) + 1;

    // Extract compact pattern IDs
    const pattern = [];
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            pattern.push(flatGrid[y * dim + x] || 0);
        }
    }

    const recipeList = Array.isArray(RECIPES) ? RECIPES : Object.values(RECIPES);

    // 3. Match against all recipes
    for (const recipe of recipeList) {
        // A. Shapeless Recipes Check
        if (recipe.shapeless) {
            if (recipe.ingredients.length !== nonNullItems.length) continue;

            const remaining = [...recipe.ingredients];
            let isMatch = true;

            for (const id of nonNullItems) {
                const idx = remaining.indexOf(id);
                if (idx !== -1) {
                    remaining.splice(idx, 1);
                } else {
                    isMatch = false;
                    break;
                }
            }

            if (isMatch && remaining.length === 0) {
                return {
                    id: recipe.result.id,
                    count: recipe.result.count
                };
            }
        }

        // B. Shaped Recipes Check
        if (!recipe.shapeless && recipe.width === patternWidth && recipe.height === patternHeight) {
            // Check exact pattern match
            let matchesNormal = true;
            for (let i = 0; i < pattern.length; i++) {
                if (recipe.grid[i] !== pattern[i]) {
                    matchesNormal = false;
                    break;
                }
            }
            if (matchesNormal) {
                return {
                    id: recipe.result.id,
                    count: recipe.result.count
                };
            }

            // Check horizontally mirrored pattern match
            let matchesMirrored = true;
            for (let y = 0; y < patternHeight; y++) {
                for (let x = 0; x < patternWidth; x++) {
                    const originalIdx = y * patternWidth + x;
                    const mirroredIdx = y * patternWidth + (patternWidth - 1 - x);
                    if (recipe.grid[mirroredIdx] !== pattern[originalIdx]) {
                        matchesMirrored = false;
                        break;
                    }
                }
            }
            if (matchesMirrored) {
                return {
                    id: recipe.result.id,
                    count: recipe.result.count
                };
            }
        }
    }

    return null;
}

export default craft;
