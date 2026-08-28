/**
 * Inventory & Crafting System for Minecraft 1.5 WebGL Engine
 * 
 * Features:
 * - 36-slot player inventory (9 hotbar slots [0..8] + 27 main inventory slots [9..35])
 * - 4 Armor slots (Helmet, Chestplate, Leggings, Boots)
 * - 2x2 Player Inventory Crafting Grid + Output Slot (Minecraft 1.5 Survival Inventory)
 * - 3x3 Crafting Table Grid + Output Slot
 * - Minecraft 1.5 Crafting System engine powered by src/core/crafting.js
 * - Full mouse drag-and-drop between all inventory slots and crafting grid
 * - Left-click & Right-click drag painting (distribute stacks / drop 1 item per slot)
 * - Native HTML5 drag-and-drop events support
 * - Right-click half-stack splitting and single-item placement
 * - Shift-click fast transfer and batch crafting
 * - Floating cursor item stack
 * - Keybinds ('E' for inventory toggle, 'Escape' to close, returning items to inventory on close)
 * - Save/Load serialization for WorldStorage
 */

import { BLOCKS } from "../core/chunk.js";
import { getItemIconDataUri } from "./hud.js";
import { renderBlockIcon, is3DBlock } from "../assets/iconRenderer.js";
import { craft, RECIPES, ITEM_IDS, CRAFTING_RECIPES } from "../core/crafting.js";

// ==========================================
// 1. ITEM DEFINITIONS & REGISTRY
// ==========================================

export const ITEM_TYPES = Object.freeze({
    // Blocks mapped directly to BLOCKS enum
    STONE: { id: BLOCKS.STONE, name: "Stone", maxStack: 64, isBlock: true },
    GRASS: { id: BLOCKS.GRASS, name: "Grass Block", maxStack: 64, isBlock: true },
    DIRT: { id: BLOCKS.DIRT, name: "Dirt", maxStack: 64, isBlock: true },
    COBBLESTONE: { id: BLOCKS.COBBLESTONE, name: "Cobblestone", maxStack: 64, isBlock: true },
    OAK_PLANKS: { id: BLOCKS.OAK_PLANKS, name: "Oak Wood Planks", maxStack: 64, isBlock: true },
    BEDROCK: { id: BLOCKS.BEDROCK, name: "Bedrock", maxStack: 64, isBlock: true },
    SAND: { id: BLOCKS.SAND, name: "Sand", maxStack: 64, isBlock: true },
    GRAVEL: { id: BLOCKS.GRAVEL, name: "Gravel", maxStack: 64, isBlock: true },
    GOLD_ORE: { id: BLOCKS.GOLD_ORE, name: "Gold Ore", maxStack: 64, isBlock: true },
    IRON_ORE: { id: BLOCKS.IRON_ORE, name: "Iron Ore", maxStack: 64, isBlock: true },
    COAL_ORE: { id: BLOCKS.COAL_ORE, name: "Coal Ore", maxStack: 64, isBlock: true },
    OAK_LOG: { id: BLOCKS.OAK_LOG, name: "Oak Wood Log", maxStack: 64, isBlock: true },
    OAK_LEAVES: { id: BLOCKS.OAK_LEAVES, name: "Oak Leaves", maxStack: 64, isBlock: true },
    GLASS: { id: BLOCKS.GLASS, name: "Glass", maxStack: 64, isBlock: true },
    SANDSTONE: { id: BLOCKS.SANDSTONE, name: "Sandstone", maxStack: 64, isBlock: true },
    GOLD_BLOCK: { id: BLOCKS.GOLD_BLOCK, name: "Block of Gold", maxStack: 64, isBlock: true },
    IRON_BLOCK: { id: BLOCKS.IRON_BLOCK, name: "Block of Iron", maxStack: 64, isBlock: true },
    BRICKS: { id: BLOCKS.BRICKS, name: "Bricks", maxStack: 64, isBlock: true },
    TNT: { id: BLOCKS.TNT, name: "TNT", maxStack: 64, isBlock: true },
    BOOKSHELF: { id: BLOCKS.BOOKSHELF, name: "Bookshelf", maxStack: 64, isBlock: true },
    OBSIDIAN: { id: BLOCKS.OBSIDIAN, name: "Obsidian", maxStack: 64, isBlock: true },
    TORCH: { id: BLOCKS.TORCH, name: "Torch", maxStack: 64, isBlock: true },
    DIAMOND_ORE: { id: BLOCKS.DIAMOND_ORE, name: "Diamond Ore", maxStack: 64, isBlock: true },
    DIAMOND_BLOCK: { id: BLOCKS.DIAMOND_BLOCK, name: "Block of Diamond", maxStack: 64, isBlock: true },
    CRAFTING_TABLE: { id: BLOCKS.CRAFTING_TABLE, name: "Crafting Table", maxStack: 64, isBlock: true },
    FURNACE: { id: BLOCKS.FURNACE, name: "Furnace", maxStack: 64, isBlock: true },
    LADDER: { id: BLOCKS.LADDER, name: "Ladder", maxStack: 64, isBlock: true },
    REDSTONE_ORE: { id: BLOCKS.REDSTONE_ORE, name: "Redstone Ore", maxStack: 64, isBlock: true },
    REDSTONE_BLOCK: { id: BLOCKS.REDSTONE_BLOCK, name: "Block of Redstone", maxStack: 64, isBlock: true },
    ENCHANTING_TABLE: { id: BLOCKS.ENCHANTING_TABLE, name: "Enchanting Table", maxStack: 64, isBlock: true },
    ANVIL: { id: BLOCKS.ANVIL, name: "Anvil", maxStack: 64, isBlock: true },

    // Minecraft Items & Materials
    COAL: { id: ITEM_IDS.COAL, name: "Coal", maxStack: 64, isBlock: false },
    DIAMOND: { id: ITEM_IDS.DIAMOND, name: "Diamond", maxStack: 64, isBlock: false },
    IRON_INGOT: { id: ITEM_IDS.IRON_INGOT, name: "Iron Ingot", maxStack: 64, isBlock: false },
    GOLD_INGOT: { id: ITEM_IDS.GOLD_INGOT, name: "Gold Ingot", maxStack: 64, isBlock: false },
    STICK: { id: ITEM_IDS.STICK, name: "Stick", maxStack: 64, isBlock: false },
    REDSTONE: { id: ITEM_IDS.REDSTONE, name: "Redstone Dust", maxStack: 64, isBlock: false },
    WHEAT: { id: ITEM_IDS.WHEAT, name: "Wheat", maxStack: 64, isBlock: false },
    BREAD: { id: ITEM_IDS.BREAD, name: "Bread", maxStack: 64, isBlock: false, isFood: true, foodValue: 5, saturation: 6.0 },
    APPLE: { id: ITEM_IDS.APPLE, name: "Apple", maxStack: 64, isBlock: false, isFood: true, foodValue: 4, saturation: 2.4 },
    COOKED_PORKCHOP: { id: ITEM_IDS.COOKED_PORKCHOP, name: "Cooked Porkchop", maxStack: 64, isBlock: false, isFood: true, foodValue: 8, saturation: 12.8 },
    RAW_PORKCHOP: { id: ITEM_IDS.RAW_PORKCHOP, name: "Raw Porkchop", maxStack: 64, isBlock: false, isFood: true, foodValue: 3, saturation: 1.8 },
    GUNPOWDER: { id: ITEM_IDS.GUNPOWDER, name: "Gunpowder", maxStack: 64, isBlock: false },
    BOOK: { id: ITEM_IDS.BOOK, name: "Book", maxStack: 64, isBlock: false },
    ENCHANTED_BOOK: { id: ITEM_IDS.ENCHANTED_BOOK, name: "Enchanted Book", maxStack: 1, isBlock: false },
    BOW: { id: ITEM_IDS.BOW, name: "Bow", maxStack: 1, durability: 384 },
    ARROW: { id: ITEM_IDS.ARROW, name: "Arrow", maxStack: 64, isBlock: false },
    LAPIS_LAZULI: { id: ITEM_IDS.LAPIS_LAZULI, name: "Lapis Lazuli", maxStack: 64, isBlock: false },

    // Armor Items
    IRON_HELMET: { id: ITEM_IDS.IRON_HELMET, name: "Iron Helmet", maxStack: 1, durability: 165 },
    IRON_CHESTPLATE: { id: ITEM_IDS.IRON_CHESTPLATE, name: "Iron Chestplate", maxStack: 1, durability: 240 },
    IRON_LEGGINGS: { id: ITEM_IDS.IRON_LEGGINGS, name: "Iron Leggings", maxStack: 1, durability: 225 },
    IRON_BOOTS: { id: ITEM_IDS.IRON_BOOTS, name: "Iron Boots", maxStack: 1, durability: 195 },

    DIAMOND_HELMET: { id: ITEM_IDS.DIAMOND_HELMET, name: "Diamond Helmet", maxStack: 1, durability: 363 },
    DIAMOND_CHESTPLATE: { id: ITEM_IDS.DIAMOND_CHESTPLATE, name: "Diamond Chestplate", maxStack: 1, durability: 528 },
    DIAMOND_LEGGINGS: { id: ITEM_IDS.DIAMOND_LEGGINGS, name: "Diamond Leggings", maxStack: 1, durability: 495 },
    DIAMOND_BOOTS: { id: ITEM_IDS.DIAMOND_BOOTS, name: "Diamond Boots", maxStack: 1, durability: 429 },

    // Tools & Weapons
    WOODEN_SWORD: { id: ITEM_IDS.WOODEN_SWORD, name: "Wooden Sword", maxStack: 1, durability: 60 },
    WOODEN_SHOVEL: { id: ITEM_IDS.WOODEN_SHOVEL, name: "Wooden Shovel", maxStack: 1, durability: 60 },
    WOODEN_PICKAXE: { id: ITEM_IDS.WOODEN_PICKAXE, name: "Wooden Pickaxe", maxStack: 1, durability: 60 },
    WOODEN_AXE: { id: ITEM_IDS.WOODEN_AXE, name: "Wooden Axe", maxStack: 1, durability: 60 },

    STONE_SWORD: { id: ITEM_IDS.STONE_SWORD, name: "Stone Sword", maxStack: 1, durability: 132 },
    STONE_SHOVEL: { id: ITEM_IDS.STONE_SHOVEL, name: "Stone Shovel", maxStack: 1, durability: 132 },
    STONE_PICKAXE: { id: ITEM_IDS.STONE_PICKAXE, name: "Stone Pickaxe", maxStack: 1, durability: 132 },
    STONE_AXE: { id: ITEM_IDS.STONE_AXE, name: "Stone Axe", maxStack: 1, durability: 132 },

    IRON_SWORD: { id: ITEM_IDS.IRON_SWORD, name: "Iron Sword", maxStack: 1, durability: 251 },
    IRON_SHOVEL: { id: ITEM_IDS.IRON_SHOVEL, name: "Iron Shovel", maxStack: 1, durability: 251 },
    IRON_PICKAXE: { id: ITEM_IDS.IRON_PICKAXE, name: "Iron Pickaxe", maxStack: 1, durability: 251 },
    IRON_AXE: { id: ITEM_IDS.IRON_AXE, name: "Iron Axe", maxStack: 1, durability: 251 },

    DIAMOND_SWORD: { id: ITEM_IDS.DIAMOND_SWORD, name: "Diamond Sword", maxStack: 1, durability: 1562 },
    DIAMOND_SHOVEL: { id: ITEM_IDS.DIAMOND_SHOVEL, name: "Diamond Shovel", maxStack: 1, durability: 1562 },
    DIAMOND_PICKAXE: { id: ITEM_IDS.DIAMOND_PICKAXE, name: "Diamond Pickaxe", maxStack: 1, durability: 1562 },
    DIAMOND_AXE: { id: ITEM_IDS.DIAMOND_AXE, name: "Diamond Axe", maxStack: 1, durability: 1562 },

    GOLDEN_SWORD: { id: ITEM_IDS.GOLDEN_SWORD, name: "Golden Sword", maxStack: 1, durability: 33 },
    GOLDEN_SHOVEL: { id: ITEM_IDS.GOLDEN_SHOVEL, name: "Golden Shovel", maxStack: 1, durability: 33 },
    GOLDEN_PICKAXE: { id: ITEM_IDS.GOLDEN_PICKAXE, name: "Golden Pickaxe", maxStack: 1, durability: 33 },
    GOLDEN_AXE: { id: ITEM_IDS.GOLDEN_AXE, name: "Golden Axe", maxStack: 1, durability: 33 }
});

const ITEM_LOOKUP = new Map();
for (const item of Object.values(ITEM_TYPES)) {
    ITEM_LOOKUP.set(item.id, item);
}

/**
 * Retrieve item definition metadata by ID
 * @param {number} id 
 * @returns {Object}
 */
export function getItemDef(id) {
    const numId = Number(id);
    if (ITEM_LOOKUP.has(numId)) {
        return ITEM_LOOKUP.get(numId);
    }
    return { id: numId, name: `Item #${numId}`, maxStack: 64, isBlock: numId <= 255 };
}

/**
 * Helper to create an ItemStack instance
 * @param {number} id 
 * @param {number} [count=1] 
 * @param {Object} [metadata={}] 
 * @returns {Object|null}
 */
export function createItemStack(id, count = 1, metadata = {}) {
    if (!id || count <= 0) return null;
    const numId = Number(id);
    const def = getItemDef(numId);
    const iconUri = is3DBlock(numId) ? renderBlockIcon(numId) : getItemIconDataUri(numId);
    return {
        ...metadata,
        id: numId,
        name: metadata.name || def.name,
        count: Math.min(count, def.maxStack),
        maxStack: def.maxStack,
        durability: metadata.durability !== undefined ? metadata.durability : def.durability,
        maxDurability: def.durability || 0,
        icon: iconUri
    };
}

// Re-export RECIPES from core/crafting.js
export { RECIPES, CRAFTING_RECIPES };

/**
 * Match a grid of input item stacks (2x2 or 3x3) using craft()
 * @param {Array<Object|null>} inputGrid 
 * @param {number} [gridDimension=2] 
 * @returns {Object|null}
 */
export function matchRecipe(inputGrid, gridDimension = 2) {
    const result = craft(inputGrid);
    if (!result) return null;
    return createItemStack(result.id, result.count);
}

// ==========================================
// 2. INVENTORY GUI STYLES (Minecraft 1.5)
// ==========================================

const INVENTORY_CSS = `
#minecraft-inventory-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: none;
    align-items: center;
    justify-content: center;
    user-select: none;
    font-family: 'Minecraft', monospace, sans-serif;
    image-rendering: pixelated;
    z-index: 500;
}

#inv-panel {
    background: #c6c6c6;
    border: 4px solid #ffffff;
    border-right-color: #555555;
    border-bottom-color: #555555;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), inset 2px 2px 0 #dbdbdb, inset -2px -2px 0 #8b8b8b;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 356px;
}

.inv-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #3f3f3f;
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 2px;
}

.inv-close-btn {
    background: #dbdbdb;
    border: 2px solid #ffffff;
    border-right-color: #555555;
    border-bottom-color: #555555;
    color: #222;
    cursor: pointer;
    padding: 2px 6px;
    font-weight: bold;
}

.inv-close-btn:hover {
    background: #ff5555;
    color: #fff;
}

/* Top Section: Survival Character Preview & 2x2 Crafting Grid */
.inv-top-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #b5b5b5;
    padding: 8px 12px;
    border: 2px solid #373737;
    border-bottom-color: #ffffff;
    border-right-color: #ffffff;
    gap: 16px;
}

.inv-player-box {
    display: flex;
    gap: 8px;
    align-items: center;
}

.inv-armor-column {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.inv-character-preview {
    width: 52px;
    height: 78px;
    background: #8b8b8b;
    border: 2px solid #373737;
    border-bottom-color: #ffffff;
    border-right-color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.inv-character-silhouette {
    width: 36px;
    height: 60px;
    background: #555555;
    border-radius: 2px;
    opacity: 0.6;
}

.inv-crafting-area {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.inv-crafting-label {
    color: #3f3f3f;
    font-size: 12px;
    font-weight: bold;
}

.inv-crafting-row {
    display: flex;
    align-items: center;
    gap: 14px;
}

.inv-grid-2x2 {
    display: grid;
    grid-template-columns: repeat(2, 38px);
    gap: 2px;
}

.inv-grid-3x3 {
    display: grid;
    grid-template-columns: repeat(3, 38px);
    gap: 2px;
}

.inv-craft-arrow {
    font-size: 24px;
    color: #4a4a4a;
    font-weight: bold;
    user-select: none;
}

.inv-section-label {
    color: #3f3f3f;
    font-size: 12px;
    font-weight: bold;
    margin-top: 2px;
    margin-bottom: -4px;
}

.inv-slots-grid-9x3 {
    display: grid;
    grid-template-columns: repeat(9, 38px);
    gap: 2px;
}

.inv-hotbar-grid {
    display: grid;
    grid-template-columns: repeat(9, 38px);
    gap: 2px;
    margin-top: 2px;
}

.inv-slot {
    position: relative;
    width: 38px;
    height: 38px;
    background: #8b8b8b;
    border: 2px solid #373737;
    border-bottom-color: #ffffff;
    border-right-color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-sizing: border-box;
    transition: background 0.05s ease;
}

.inv-slot:hover, .inv-slot.drag-over {
    background: #a0a0a0;
    outline: 1px solid #ffffff;
}

.inv-slot.craft-output {
    width: 44px;
    height: 44px;
    background: #999999;
    border: 2px solid #373737;
    border-bottom-color: #ffffff;
    border-right-color: #ffffff;
}

.inv-slot.craft-output:hover {
    background: #afafaf;
    outline: 2px solid #ffffff;
}

.inv-slot-img {
    width: 28px;
    height: 28px;
    image-rendering: pixelated;
    pointer-events: none;
    user-select: none;
}

.inv-slot-count {
    position: absolute;
    bottom: 1px;
    right: 2px;
    color: #ffffff;
    font-size: 11px;
    font-weight: bold;
    text-shadow: 1px 1px 0 #000000;
    pointer-events: none;
    user-select: none;
}

#inv-cursor-item {
    position: fixed;
    pointer-events: none;
    z-index: 1000;
    display: none;
    transform: translate(-50%, -50%);
}

#inv-cursor-img {
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
}

#inv-cursor-count {
    position: absolute;
    bottom: -2px;
    right: -2px;
    color: #ffffff;
    font-size: 12px;
    font-weight: bold;
    text-shadow: 1px 1px 0 #000000;
}
`;

// ==========================================
// 3. INVENTORY MANAGER CLASS
// ==========================================

export class InventoryManager {
    /**
     * @param {Object} [options]
     * @param {HUD} [options.hud] Attached HUD instance to synchronize hotbar
     * @param {function(Array): void} [options.onInventoryChange]
     */
    constructor(options = {}) {
        this.hud = options.hud || null;
        this.onInventoryChange = options.onInventoryChange || null;

        // 36 Player Slots (0..8: Hotbar, 9..35: Main Inventory)
        this.slots = new Array(36).fill(null);

        // 4 Armor Slots (0: Helmet, 1: Chestplate, 2: Leggings, 3: Boots)
        this.armor = new Array(4).fill(null);

        // Crafting Grids (2x2 for survival inventory, 3x3 for crafting table)
        this.crafting2x2 = new Array(4).fill(null);
        this.crafting3x3 = new Array(9).fill(null);
        this.craftOutput = null;

        // Item stack currently picked up / held by mouse cursor
        this.heldItem = null;

        // Current UI state: 'closed' | 'inventory' | 'crafting_table'
        this.mode = "closed";

        // Detailed drag state tracking for seamless dragging & paint-distribution
        this.dragState = {
            isMouseDown: false,
            button: 0,
            startSlot: null,
            dragType: null, // 'drag_drop' | 'paint_left' | 'paint_right'
            visitedCraftSlots: new Set(),
            visitedInvSlots: new Set()
        };

        this.dom = {};
        this.initDOM();
        this.attachEventListeners();
        this.populateDefaultItems();
    }

    /**
     * Mount GUI modal DOM
     */
    initDOM() {
        if (typeof document === "undefined") return;

        if (!document.getElementById("minecraft-inventory-styles")) {
            const style = document.createElement("style");
            style.id = "minecraft-inventory-styles";
            style.textContent = INVENTORY_CSS;
            document.head.appendChild(style);
        }

        const modal = document.createElement("div");
        modal.id = "minecraft-inventory-modal";

        const panel = document.createElement("div");
        panel.id = "inv-panel";

        // 1. Header
        const header = document.createElement("div");
        header.className = "inv-header";
        const title = document.createElement("span");
        title.id = "inv-title";
        title.textContent = "Crafting";
        const closeBtn = document.createElement("button");
        closeBtn.className = "inv-close-btn";
        closeBtn.textContent = "✕";
        closeBtn.onclick = () => this.close();
        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // 2. Top Section: Armor + Character Preview & 2x2 Crafting Area
        const topSection = document.createElement("div");
        topSection.className = "inv-top-section";
        topSection.id = "inv-top-section";

        // Character + Armor column
        const playerBox = document.createElement("div");
        playerBox.className = "inv-player-box";

        const armorCol = document.createElement("div");
        armorCol.className = "inv-armor-column";
        const armorSlotEls = [];
        for (let i = 0; i < 4; i++) {
            const slotEl = this.createArmorSlotElement(i);
            armorCol.appendChild(slotEl);
            armorSlotEls.push(slotEl);
        }
        playerBox.appendChild(armorCol);

        const charPreview = document.createElement("div");
        charPreview.className = "inv-character-preview";
        const charSilhouette = document.createElement("div");
        charSilhouette.className = "inv-character-silhouette";
        charPreview.appendChild(charSilhouette);
        playerBox.appendChild(charPreview);
        topSection.appendChild(playerBox);

        // Crafting Area (2x2 Grid + Arrow + Output)
        const craftArea = document.createElement("div");
        craftArea.className = "inv-crafting-area";

        const craftLabel = document.createElement("div");
        craftLabel.className = "inv-crafting-label";
        craftLabel.textContent = "Crafting";
        craftArea.appendChild(craftLabel);

        const craftRow = document.createElement("div");
        craftRow.className = "inv-crafting-row";

        const craftGridContainer = document.createElement("div");
        craftGridContainer.id = "inv-craft-grid";
        craftGridContainer.className = "inv-grid-2x2";

        const arrow = document.createElement("div");
        arrow.className = "inv-craft-arrow";
        arrow.textContent = "→";

        const craftOutputSlot = document.createElement("div");
        craftOutputSlot.className = "inv-slot craft-output";
        craftOutputSlot.id = "inv-slot-output";
        craftOutputSlot.innerHTML = `<img class="inv-slot-img" style="display:none;"><span class="inv-slot-count"></span>`;

        craftRow.appendChild(craftGridContainer);
        craftRow.appendChild(arrow);
        craftRow.appendChild(craftOutputSlot);
        craftArea.appendChild(craftRow);
        topSection.appendChild(craftArea);

        panel.appendChild(topSection);

        // 3. Main 27 Inventory Slots (3 rows of 9)
        const mainLabel = document.createElement("div");
        mainLabel.className = "inv-section-label";
        mainLabel.textContent = "Inventory";
        panel.appendChild(mainLabel);

        const mainGrid = document.createElement("div");
        mainGrid.className = "inv-slots-grid-9x3";
        const mainSlotEls = [];

        for (let i = 9; i < 36; i++) {
            const slotEl = this.createSlotElement(i);
            mainGrid.appendChild(slotEl);
            mainSlotEls.push(slotEl);
        }
        panel.appendChild(mainGrid);

        // 4. 9 Hotbar Slots
        const hotbarGrid = document.createElement("div");
        hotbarGrid.className = "inv-hotbar-grid";
        const hotbarSlotEls = [];

        for (let i = 0; i < 9; i++) {
            const slotEl = this.createSlotElement(i);
            hotbarGrid.appendChild(slotEl);
            hotbarSlotEls.push(slotEl);
        }
        panel.appendChild(hotbarGrid);

        modal.appendChild(panel);

        // 5. Floating Cursor Item Stack
        const cursorItem = document.createElement("div");
        cursorItem.id = "inv-cursor-item";
        cursorItem.innerHTML = `<img id="inv-cursor-img"><span id="inv-cursor-count"></span>`;
        document.body.appendChild(cursorItem);

        document.body.appendChild(modal);

        this.dom = {
            modal,
            panel,
            title,
            topSection,
            craftGridContainer,
            craftOutputSlot,
            cursorItem,
            cursorImg: cursorItem.querySelector("#inv-cursor-img"),
            cursorCount: cursorItem.querySelector("#inv-cursor-count"),
            armorSlotEls,
            mainSlotEls,
            hotbarSlotEls
        };
    }

    createSlotElement(slotIndex) {
        const slot = document.createElement("div");
        slot.className = "inv-slot";
        slot.dataset.index = slotIndex;
        slot.draggable = true;
        slot.innerHTML = `<img class="inv-slot-img" style="display:none;"><span class="inv-slot-count"></span>`;

        // Mouse Down (Click / Start Drag)
        slot.onmousedown = (e) => this.handleSlotMouseDown(e, slotIndex);

        // Mouse Enter (Drag Painting)
        slot.onmouseenter = (e) => this.handleSlotMouseEnter(e, slotIndex);

        // Mouse Up (Drop Dragged Item)
        slot.onmouseup = (e) => this.handleSlotMouseUp(e, slotIndex);

        // HTML5 Drag & Drop Support
        slot.ondragstart = (e) => this.handleHTML5DragStart(e, "inventory", slotIndex);
        slot.ondragover = (e) => { e.preventDefault(); slot.classList.add("drag-over"); };
        slot.ondragleave = () => slot.classList.remove("drag-over");
        slot.ondrop = (e) => this.handleHTML5Drop(e, "inventory", slotIndex);

        return slot;
    }

    createArmorSlotElement(armorIndex) {
        const slot = document.createElement("div");
        slot.className = "inv-slot";
        slot.dataset.armorIndex = armorIndex;
        slot.draggable = true;
        slot.innerHTML = `<img class="inv-slot-img" style="display:none;"><span class="inv-slot-count"></span>`;

        slot.onmousedown = (e) => this.handleArmorMouseDown(e, armorIndex);
        slot.onmouseup = (e) => this.handleArmorMouseUp(e, armorIndex);

        slot.ondragstart = (e) => this.handleHTML5DragStart(e, "armor", armorIndex);
        slot.ondragover = (e) => { e.preventDefault(); slot.classList.add("drag-over"); };
        slot.ondragleave = () => slot.classList.remove("drag-over");
        slot.ondrop = (e) => this.handleHTML5Drop(e, "armor", armorIndex);

        return slot;
    }

    attachEventListeners() {
        if (typeof window === "undefined") return;

        // Mousemove to update floating cursor item and handle drag tracking
        window.addEventListener("mousemove", (e) => {
            if (this.heldItem && this.mode !== "closed") {
                this.dom.cursorItem.style.left = `${e.clientX}px`;
                this.dom.cursorItem.style.top = `${e.clientY}px`;
            }
        });

        // Global Mouse Up to end drag painting
        window.addEventListener("mouseup", () => {
            this.dragState.isMouseDown = false;
            this.dragState.dragType = null;
            this.dragState.visitedCraftSlots.clear();
            this.dragState.visitedInvSlots.clear();
        });

        // Keybinds for 'E' and 'Escape' are orchestrated globally in main.js to sync with PointerLockControls.

        // Prevent context menu in modal for smooth right-click splitting/painting
        this.dom.modal.addEventListener("contextmenu", (e) => e.preventDefault());

        // Output Slot Handlers
        this.dom.craftOutputSlot.onmousedown = (e) => this.handleOutputMouseDown(e);
        this.dom.craftOutputSlot.ondragstart = (e) => this.handleHTML5DragStart(e, "output", 0);
    }

    populateDefaultItems() {
        // Starting items for testing (Planks, Cobblestone, Oak Log, Torch, Pickaxe, Apple, Bread, Cooked Porkchop, Wheat)
        this.setSlot(0, createItemStack(BLOCKS.OAK_PLANKS, 64));
        this.setSlot(1, createItemStack(BLOCKS.COBBLESTONE, 32));
        this.setSlot(2, createItemStack(BLOCKS.OAK_LOG, 16));
        this.setSlot(3, createItemStack(BLOCKS.TORCH, 16));
        this.setSlot(4, createItemStack(ITEM_IDS.WOODEN_PICKAXE, 1));
        this.setSlot(5, createItemStack(ITEM_IDS.APPLE, 8));
        this.setSlot(6, createItemStack(ITEM_IDS.BREAD, 12));
        this.setSlot(7, createItemStack(ITEM_IDS.COOKED_PORKCHOP, 6));
        this.setSlot(8, createItemStack(ITEM_IDS.WHEAT, 9));
        this.syncHUD();
    }

    // ==========================================
    // 4. INVENTORY DATA ACCESSORS
    // ==========================================

    getSlot(index) {
        if (index < 0 || index >= 36) return null;
        return this.slots[index];
    }

    /**
     * Consume / decrement item count in a slot.
     * Removes the item stack if count drops to 0.
     * @param {number} index Slot index
     * @param {number} [count=1] Number of items to consume
     * @returns {boolean} True if consumed
     */
    consumeSlot(index, count = 1) {
        if (index < 0 || index >= 36) return false;
        const slot = this.slots[index];
        if (!slot || slot.count <= 0) return false;

        slot.count -= count;
        if (slot.count <= 0) {
            this.slots[index] = null;
        }
        this.updateSlotDOM(index);
        this.syncHUD();
        if (this.onInventoryChange) {
            this.onInventoryChange(this.slots);
        }
        return true;
    }

    setSlot(index, itemStack) {
        if (index < 0 || index >= 36) return;
        this.slots[index] = itemStack ? { ...itemStack } : null;
        this.updateSlotDOM(index);
        this.syncHUD();

        if (this.onInventoryChange) {
            this.onInventoryChange(this.slots);
        }
    }

    addItem(id, count = 1, meta = {}) {
        let remaining = count;
        const def = getItemDef(id);
        const maxStack = def.maxStack;

        // 1. Fill existing matching stacks
        for (let i = 0; i < 36; i++) {
            const slot = this.slots[i];
            if (slot && slot.id === id && slot.count < maxStack) {
                const space = maxStack - slot.count;
                const toAdd = Math.min(space, remaining);
                slot.count += toAdd;
                remaining -= toAdd;
                this.updateSlotDOM(i);
                if (remaining <= 0) break;
            }
        }

        // 2. Fill empty slots
        if (remaining > 0) {
            for (let i = 0; i < 36; i++) {
                if (!this.slots[i]) {
                    const toAdd = Math.min(maxStack, remaining);
                    this.slots[i] = createItemStack(id, toAdd, meta);
                    remaining -= toAdd;
                    this.updateSlotDOM(i);
                    if (remaining <= 0) break;
                }
            }
        }

        this.syncHUD();
        if (this.onInventoryChange) this.onInventoryChange(this.slots);
        return remaining;
    }

    removeItem(id, count = 1) {
        if (this.countItem(id) < count) return false;

        let needed = count;
        for (let i = 35; i >= 0; i--) {
            const slot = this.slots[i];
            if (slot && slot.id === id) {
                if (slot.count <= needed) {
                    needed -= slot.count;
                    this.slots[i] = null;
                } else {
                    slot.count -= needed;
                    needed = 0;
                }
                this.updateSlotDOM(i);
                if (needed <= 0) break;
            }
        }

        this.syncHUD();
        if (this.onInventoryChange) this.onInventoryChange(this.slots);
        return true;
    }

    countItem(id) {
        let total = 0;
        for (let i = 0; i < 36; i++) {
            if (this.slots[i] && this.slots[i].id === id) {
                total += this.slots[i].count;
            }
        }
        return total;
    }

    getHotbar() {
        return this.slots.slice(0, 9);
    }

    getMainInventory() {
        return this.slots.slice(9, 36);
    }

    // ==========================================
    // 5. MODAL & CRAFTING GUI LOGIC
    // ==========================================

    openInventory() {
        this.mode = "inventory";
        this.dom.title.textContent = "Crafting (2x2)";
        this.setupCraftingGrid(2);
        this.dom.modal.style.display = "flex";
        this.renderAllSlots();
        this.updateCraftingOutput();
        if (typeof document !== "undefined" && document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    openCraftingTable() {
        this.mode = "crafting_table";
        this.dom.title.textContent = "Crafting Table (3x3)";
        this.setupCraftingGrid(3);
        this.dom.modal.style.display = "flex";
        this.renderAllSlots();
        this.updateCraftingOutput();
        if (typeof document !== "undefined" && document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    close() {
        if (this.mode === "closed") return;

        // Return crafting items back to player inventory
        const activeGrid = this.mode === "crafting_table" ? this.crafting3x3 : this.crafting2x2;
        for (let i = 0; i < activeGrid.length; i++) {
            if (activeGrid[i]) {
                this.addItem(activeGrid[i].id, activeGrid[i].count, activeGrid[i]);
                activeGrid[i] = null;
            }
        }

        // Return held cursor item back to inventory
        if (this.heldItem) {
            this.addItem(this.heldItem.id, this.heldItem.count, this.heldItem);
            this.setHeldItem(null);
        }

        this.mode = "closed";
        this.craftOutput = null;
        this.dom.modal.style.display = "none";
        this.syncHUD();
    }

    isOpen() {
        return this.mode !== "closed";
    }

    setupCraftingGrid(dimension = 2) {
        this.dom.craftGridContainer.innerHTML = "";
        this.dom.craftGridContainer.className = dimension === 3 ? "inv-grid-3x3" : "inv-grid-2x2";

        const count = dimension * dimension;
        for (let i = 0; i < count; i++) {
            const slot = document.createElement("div");
            slot.className = "inv-slot";
            slot.dataset.craftIndex = i;
            slot.draggable = true;
            slot.innerHTML = `<img class="inv-slot-img" style="display:none;"><span class="inv-slot-count"></span>`;

            slot.onmousedown = (e) => this.handleCraftGridMouseDown(e, i, dimension);
            slot.onmouseenter = (e) => this.handleCraftGridMouseEnter(e, i, dimension);
            slot.onmouseup = (e) => this.handleCraftGridMouseUp(e, i, dimension);

            slot.ondragstart = (e) => this.handleHTML5DragStart(e, "crafting", i);
            slot.ondragover = (e) => { e.preventDefault(); slot.classList.add("drag-over"); };
            slot.ondragleave = () => slot.classList.remove("drag-over");
            slot.ondrop = (e) => this.handleHTML5Drop(e, "crafting", i);

            this.dom.craftGridContainer.appendChild(slot);
        }
        this.renderCraftGrid(dimension);
    }

    updateCraftingOutput() {
        const dimension = this.mode === "crafting_table" ? 3 : 2;
        const grid = dimension === 3 ? this.crafting3x3 : this.crafting2x2;

        const result = craft(grid);
        this.craftOutput = result ? createItemStack(result.id, result.count) : null;

        const img = this.dom.craftOutputSlot.querySelector(".inv-slot-img");
        const count = this.dom.craftOutputSlot.querySelector(".inv-slot-count");

        if (this.craftOutput && this.craftOutput.count > 0) {
            img.src = this.craftOutput.icon || getItemIconDataUri(this.craftOutput.id);
            img.style.display = "block";
            count.textContent = this.craftOutput.count > 1 ? this.craftOutput.count : "";
            this.dom.craftOutputSlot.draggable = true;
        } else {
            img.src = "";
            img.style.display = "none";
            count.textContent = "";
            this.dom.craftOutputSlot.draggable = false;
        }
    }

    // ==========================================
    // 6. MOUSE & DRAG-AND-DROP HANDLERS
    // ==========================================

    handleSlotMouseDown(e, slotIndex) {
        e.preventDefault();
        this.dragState.isMouseDown = true;
        this.dragState.button = e.button;
        this.dragState.startSlot = { type: "inventory", index: slotIndex };
        const currentSlot = this.slots[slotIndex];

        if (e.shiftKey && currentSlot) {
            // Shift-click: Transfer between Hotbar (0..8) and Main Inventory (9..35)
            if (slotIndex < 9) {
                for (let i = 9; i < 36; i++) {
                    if (!this.slots[i]) {
                        this.slots[i] = currentSlot;
                        this.slots[slotIndex] = null;
                        break;
                    }
                }
            } else {
                for (let i = 0; i < 9; i++) {
                    if (!this.slots[i]) {
                        this.slots[i] = currentSlot;
                        this.slots[slotIndex] = null;
                        break;
                    }
                }
            }
            this.renderAllSlots();
            this.syncHUD();
            return;
        }

        if (e.button === 0) { // Left-click
            if (!this.heldItem) {
                if (currentSlot) {
                    this.setHeldItem(currentSlot);
                    this.slots[slotIndex] = null;
                    this.dragState.dragType = "paint_left";
                    this.dragState.visitedInvSlots.add(slotIndex);
                }
            } else if (!currentSlot) {
                this.slots[slotIndex] = this.heldItem;
                this.setHeldItem(null);
            } else if (currentSlot.id === this.heldItem.id) {
                const space = currentSlot.maxStack - currentSlot.count;
                const toAdd = Math.min(space, this.heldItem.count);
                currentSlot.count += toAdd;
                this.heldItem.count -= toAdd;
                if (this.heldItem.count <= 0) this.setHeldItem(null); else this.setHeldItem(this.heldItem);
            } else {
                const temp = currentSlot;
                this.slots[slotIndex] = this.heldItem;
                this.setHeldItem(temp);
            }
        } else if (e.button === 2) { // Right-click
            if (!this.heldItem && currentSlot) {
                const half = Math.ceil(currentSlot.count / 2);
                this.setHeldItem(createItemStack(currentSlot.id, half, currentSlot));
                currentSlot.count -= half;
                if (currentSlot.count <= 0) this.slots[slotIndex] = null;
            } else if (this.heldItem && !currentSlot) {
                this.slots[slotIndex] = createItemStack(this.heldItem.id, 1, this.heldItem);
                this.heldItem.count--;
                if (this.heldItem.count <= 0) this.setHeldItem(null); else this.setHeldItem(this.heldItem);
                this.dragState.dragType = "paint_right";
                this.dragState.visitedInvSlots.add(slotIndex);
            } else if (this.heldItem && currentSlot && currentSlot.id === this.heldItem.id && currentSlot.count < currentSlot.maxStack) {
                currentSlot.count++;
                this.heldItem.count--;
                if (this.heldItem.count <= 0) this.setHeldItem(null); else this.setHeldItem(this.heldItem);
                this.dragState.dragType = "paint_right";
                this.dragState.visitedInvSlots.add(slotIndex);
            }
        }

        this.renderAllSlots();
        this.syncHUD();
    }

    handleSlotMouseEnter(e, slotIndex) {
        if (!this.dragState.isMouseDown || !this.heldItem) return;

        if (this.dragState.dragType === "paint_right" && !this.dragState.visitedInvSlots.has(slotIndex)) {
            this.dragState.visitedInvSlots.add(slotIndex);
            const slot = this.slots[slotIndex];
            if (!slot) {
                this.slots[slotIndex] = createItemStack(this.heldItem.id, 1, this.heldItem);
                this.heldItem.count--;
                if (this.heldItem.count <= 0) this.setHeldItem(null); else this.setHeldItem(this.heldItem);
                this.updateSlotDOM(slotIndex);
                this.syncHUD();
            } else if (slot.id === this.heldItem.id && slot.count < slot.maxStack) {
                slot.count++;
                this.heldItem.count--;
                if (this.heldItem.count <= 0) this.setHeldItem(null); else this.setHeldItem(this.heldItem);
                this.updateSlotDOM(slotIndex);
                this.syncHUD();
            }
        }
    }

    handleSlotMouseUp(e, slotIndex) {
        slotIndex = Number(slotIndex);
        if (e.button === 0 && this.dragState.startSlot && this.dragState.startSlot.type !== "inventory" && this.heldItem) {
            // Drag-and-drop from crafting/armor/output into inventory slot
            const currentSlot = this.slots[slotIndex];
            if (!currentSlot) {
                this.slots[slotIndex] = this.heldItem;
                this.setHeldItem(null);
            } else if (currentSlot.id === this.heldItem.id) {
                const space = currentSlot.maxStack - currentSlot.count;
                const toAdd = Math.min(space, this.heldItem.count);
                currentSlot.count += toAdd;
                this.heldItem.count -= toAdd;
                if (this.heldItem.count <= 0) this.setHeldItem(null); else this.setHeldItem(this.heldItem);
            }
            this.renderAllSlots();
            this.syncHUD();
        }
    }

    handleCraftGridMouseDown(e, craftIndex, dimension) {
        e.preventDefault();
        this.dragState.isMouseDown = true;
        this.dragState.button = e.button;
        this.dragState.startSlot = { type: "crafting", index: craftIndex };

        const grid = dimension === 3 ? this.crafting3x3 : this.crafting2x2;
        const currentSlot = grid[craftIndex];

        if (e.button === 0) { // Left click
            if (!this.heldItem) {
                if (currentSlot) {
                    this.setHeldItem(currentSlot);
                    grid[craftIndex] = null;
                    this.dragState.dragType = "paint_left";
                    this.dragState.visitedCraftSlots.add(craftIndex);
                }
            } else if (!currentSlot) {
                grid[craftIndex] = this.heldItem;
                this.setHeldItem(null);
            } else if (currentSlot.id === this.heldItem.id) {
                const space = currentSlot.maxStack - currentSlot.count;
                const toAdd = Math.min(space, this.heldItem.count);
                currentSlot.count += toAdd;
                this.heldItem.count -= toAdd;
                if (this.heldItem.count <= 0) this.setHeldItem(null); else this.setHeldItem(this.heldItem);
            } else {
                const temp = currentSlot;
                grid[craftIndex] = this.heldItem;
                this.setHeldItem(temp);
            }
        } else if (e.button === 2) { // Right click
            if (!this.heldItem && currentSlot) {
                const half = Math.ceil(currentSlot.count / 2);
                this.setHeldItem(createItemStack(currentSlot.id, half, currentSlot));
                currentSlot.count -= half;
                if (currentSlot.count <= 0) grid[craftIndex] = null;
            } else if (this.heldItem && !currentSlot) {
                grid[craftIndex] = createItemStack(this.heldItem.id, 1, this.heldItem);
                this.heldItem.count--;
                if (this.heldItem.count <= 0) this.setHeldItem(null); else this.setHeldItem(this.heldItem);
                this.dragState.dragType = "paint_right";
                this.dragState.visitedCraftSlots.add(craftIndex);
            } else if (this.heldItem && currentSlot && currentSlot.id === this.heldItem.id && currentSlot.count < currentSlot.maxStack) {
                currentSlot.count++;
                this.heldItem.count--;
                if (this.heldItem.count <= 0) this.setHeldItem(null); else this.setHeldItem(this.heldItem);
                this.dragState.dragType = "paint_right";
                this.dragState.visitedCraftSlots.add(craftIndex);
            }
        }

        this.renderCraftGrid(dimension);
        this.updateCraftingOutput();
    }

    handleCraftGridMouseEnter(e, craftIndex, dimension) {
        if (!this.dragState.isMouseDown || !this.heldItem) return;

        const grid = dimension === 3 ? this.crafting3x3 : this.crafting2x2;

        if (this.dragState.dragType === "paint_right" && !this.dragState.visitedCraftSlots.has(craftIndex)) {
            this.dragState.visitedCraftSlots.add(craftIndex);
            const slot = grid[craftIndex];
            if (!slot) {
                grid[craftIndex] = createItemStack(this.heldItem.id, 1, this.heldItem);
                this.heldItem.count--;
                if (this.heldItem.count <= 0) this.setHeldItem(null); else this.setHeldItem(this.heldItem);
                this.renderCraftGrid(dimension);
                this.updateCraftingOutput();
            } else if (slot.id === this.heldItem.id && slot.count < slot.maxStack) {
                slot.count++;
                this.heldItem.count--;
                if (this.heldItem.count <= 0) this.setHeldItem(null); else this.setHeldItem(this.heldItem);
                this.renderCraftGrid(dimension);
                this.updateCraftingOutput();
            }
        }
    }

    handleCraftGridMouseUp(e, craftIndex, dimension) {
        if (e.button === 0 && this.dragState.startSlot && this.dragState.startSlot.type !== "crafting" && this.heldItem) {
            const grid = dimension === 3 ? this.crafting3x3 : this.crafting2x2;
            const currentSlot = grid[craftIndex];
            if (!currentSlot) {
                grid[craftIndex] = this.heldItem;
                this.setHeldItem(null);
            } else if (currentSlot.id === this.heldItem.id) {
                const space = currentSlot.maxStack - currentSlot.count;
                const toAdd = Math.min(space, this.heldItem.count);
                currentSlot.count += toAdd;
                this.heldItem.count -= toAdd;
                if (this.heldItem.count <= 0) this.setHeldItem(null); else this.setHeldItem(this.heldItem);
            }
            this.renderCraftGrid(dimension);
            this.updateCraftingOutput();
        }
    }

    handleOutputMouseDown(e) {
        e.preventDefault();
        if (!this.craftOutput) return;

        const dimension = this.mode === "crafting_table" ? 3 : 2;
        const grid = dimension === 3 ? this.crafting3x3 : this.crafting2x2;

        if (e.shiftKey) {
            // Shift-click: craft all possible items directly into inventory
            while (this.craftOutput) {
                const leftover = this.addItem(this.craftOutput.id, this.craftOutput.count, this.craftOutput);
                if (leftover > 0) break; // inventory is full

                // Consume 1 ingredient from each crafting slot
                for (let i = 0; i < grid.length; i++) {
                    if (grid[i]) {
                        grid[i].count--;
                        if (grid[i].count <= 0) grid[i] = null;
                    }
                }
                this.updateCraftingOutput();
            }
        } else {
            // Regular click: pick up output stack
            if (!this.heldItem) {
                this.setHeldItem(this.craftOutput);
                for (let i = 0; i < grid.length; i++) {
                    if (grid[i]) {
                        grid[i].count--;
                        if (grid[i].count <= 0) grid[i] = null;
                    }
                }
            } else if (this.heldItem.id === this.craftOutput.id && this.heldItem.count + this.craftOutput.count <= this.heldItem.maxStack) {
                this.heldItem.count += this.craftOutput.count;
                for (let i = 0; i < grid.length; i++) {
                    if (grid[i]) {
                        grid[i].count--;
                        if (grid[i].count <= 0) grid[i] = null;
                    }
                }
            } else {
                return;
            }
        }

        this.renderCraftGrid(dimension);
        this.updateCraftingOutput();
        this.renderAllSlots();
        this.syncHUD();
    }

    handleArmorMouseDown(e, armorIndex) {
        e.preventDefault();
        const currentSlot = this.armor[armorIndex];

        if (e.button === 0) {
            if (!this.heldItem) {
                this.setHeldItem(currentSlot);
                this.armor[armorIndex] = null;
            } else if (!currentSlot) {
                this.armor[armorIndex] = this.heldItem;
                this.setHeldItem(null);
            } else {
                const temp = currentSlot;
                this.armor[armorIndex] = this.heldItem;
                this.setHeldItem(temp);
            }
        }

        this.renderArmorSlots();
    }

    handleArmorMouseUp(e, armorIndex) {
        if (this.heldItem && !this.armor[armorIndex]) {
            this.armor[armorIndex] = this.heldItem;
            this.setHeldItem(null);
            this.renderArmorSlots();
        }
    }

    // ==========================================
    // 7. HTML5 NATIVE DRAG & DROP
    // ==========================================

    handleHTML5DragStart(e, sourceType, index) {
        let item = null;
        if (sourceType === "inventory") item = this.slots[index];
        else if (sourceType === "crafting") {
            const grid = this.mode === "crafting_table" ? this.crafting3x3 : this.crafting2x2;
            item = grid[index];
        } else if (sourceType === "output") item = this.craftOutput;
        else if (sourceType === "armor") item = this.armor[index];

        if (!item) {
            e.preventDefault();
            return;
        }

        e.dataTransfer.setData("application/json", JSON.stringify({ sourceType, index, item }));
        e.dataTransfer.effectAllowed = "move";
    }

    handleHTML5Drop(e, targetType, targetIndex) {
        e.preventDefault();
        const slotEl = e.currentTarget;
        if (slotEl) slotEl.classList.remove("drag-over");

        const dataStr = e.dataTransfer.getData("application/json");
        if (!dataStr) return;

        try {
            const { sourceType, index, item } = JSON.parse(dataStr);
            const dimension = this.mode === "crafting_table" ? 3 : 2;
            const grid = dimension === 3 ? this.crafting3x3 : this.crafting2x2;

            // Remove from source
            if (sourceType === "inventory") this.slots[index] = null;
            else if (sourceType === "crafting") grid[index] = null;
            else if (sourceType === "armor") this.armor[index] = null;
            else if (sourceType === "output") {
                for (let i = 0; i < grid.length; i++) {
                    if (grid[i]) {
                        grid[i].count--;
                        if (grid[i].count <= 0) grid[i] = null;
                    }
                }
            }

            // Place in target
            const itemStack = createItemStack(item.id, item.count, item);
            if (targetType === "inventory") {
                const dest = this.slots[targetIndex];
                if (!dest) this.slots[targetIndex] = itemStack;
                else if (dest.id === itemStack.id) {
                    const space = dest.maxStack - dest.count;
                    const toAdd = Math.min(space, itemStack.count);
                    dest.count += toAdd;
                    if (itemStack.count > toAdd) this.addItem(itemStack.id, itemStack.count - toAdd);
                } else {
                    // swap
                    this.slots[targetIndex] = itemStack;
                    this.addItem(dest.id, dest.count, dest);
                }
            } else if (targetType === "crafting") {
                grid[targetIndex] = itemStack;
            } else if (targetType === "armor") {
                this.armor[targetIndex] = itemStack;
            }

            this.renderAllSlots();
            this.renderCraftGrid(dimension);
            this.renderArmorSlots();
            this.updateCraftingOutput();
            this.syncHUD();
        } catch (err) {
            console.error("HTML5 Drop error:", err);
        }
    }

    // ==========================================
    // 8. RENDERING HELPERS
    // ==========================================

    setHeldItem(item) {
        this.heldItem = item && item.count > 0 ? item : null;
        if (this.heldItem) {
            this.dom.cursorImg.src = this.heldItem.icon || getItemIconDataUri(this.heldItem.id);
            this.dom.cursorCount.textContent = this.heldItem.count > 1 ? this.heldItem.count : "";
            this.dom.cursorItem.style.display = "block";
        } else {
            this.dom.cursorItem.style.display = "none";
        }
    }

    renderCraftGrid(dimension = 2) {
        const grid = dimension === 3 ? this.crafting3x3 : this.crafting2x2;
        const slotEls = this.dom.craftGridContainer.querySelectorAll(".inv-slot");

        slotEls.forEach((slotEl, i) => {
            const item = grid[i];
            const img = slotEl.querySelector(".inv-slot-img");
            const count = slotEl.querySelector(".inv-slot-count");

            if (item && item.id > 0 && item.count > 0) {
                img.src = item.icon || getItemIconDataUri(item.id);
                img.style.display = "block";
                count.textContent = item.count > 1 ? item.count : "";
                slotEl.draggable = true;
            } else {
                img.src = "";
                img.style.display = "none";
                count.textContent = "";
                slotEl.draggable = false;
            }
        });
    }

    renderArmorSlots() {
        if (!this.dom.armorSlotEls) return;
        this.dom.armorSlotEls.forEach((slotEl, i) => {
            const item = this.armor[i];
            const img = slotEl.querySelector(".inv-slot-img");
            const count = slotEl.querySelector(".inv-slot-count");

            if (item && item.id > 0 && item.count > 0) {
                img.src = item.icon || getItemIconDataUri(item.id);
                img.style.display = "block";
                count.textContent = item.count > 1 ? item.count : "";
                slotEl.draggable = true;
            } else {
                img.src = "";
                img.style.display = "none";
                count.textContent = "";
                slotEl.draggable = false;
            }
        });
    }

    updateSlotDOM(index) {
        let slotEl = null;
        if (index < 9 && this.dom.hotbarSlotEls) {
            slotEl = this.dom.hotbarSlotEls[index];
        } else if (index >= 9 && this.dom.mainSlotEls) {
            slotEl = this.dom.mainSlotEls[index - 9];
        }
        if (!slotEl) return;

        const item = this.slots[index];
        const img = slotEl.querySelector(".inv-slot-img");
        const count = slotEl.querySelector(".inv-slot-count");

        if (item && item.id > 0 && item.count > 0) {
            img.src = item.icon || getItemIconDataUri(item.id);
            img.style.display = "block";
            count.textContent = item.count > 1 ? item.count : "";
            slotEl.draggable = true;
        } else {
            img.src = "";
            img.style.display = "none";
            count.textContent = "";
            slotEl.draggable = false;
        }
    }

    renderAllSlots() {
        for (let i = 0; i < 36; i++) {
            this.updateSlotDOM(i);
        }
        this.renderArmorSlots();
    }

    syncHUD() {
        if (this.hud) {
            this.hud.updateHotbar(this.getHotbar());
        }
    }

    // ==========================================
    // 9. SERIALIZATION
    // ==========================================

    serialize() {
        return {
            slots: this.slots.map(s => s ? { id: s.id, count: s.count, durability: s.durability } : null),
            armor: this.armor.map(a => a ? { id: a.id, count: a.count, durability: a.durability } : null)
        };
    }

    deserialize(data) {
        if (!data) return;

        if (Array.isArray(data.slots)) {
            for (let i = 0; i < 36; i++) {
                const s = data.slots[i];
                this.slots[i] = s ? createItemStack(s.id, s.count, { durability: s.durability }) : null;
            }
        }

        if (Array.isArray(data.armor)) {
            for (let i = 0; i < 4; i++) {
                const a = data.armor[i];
                this.armor[i] = a ? createItemStack(a.id, a.count, { durability: a.durability }) : null;
            }
        }

        this.renderAllSlots();
        this.syncHUD();
    }
}
