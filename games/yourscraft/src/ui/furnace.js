

import { BLOCKS } from '../core/chunk.js';
import { getItemDef, createItemStack, ITEM_TYPES } from './inventory.js';
import { getItemIconDataUri } from './hud.js';
import { ITEM_IDS, SMELTING_RECIPES as CORE_SMELTING_RECIPES } from '../core/crafting.js';

// ==========================================
// 1. FUEL & SMELTING REGISTRIES (Minecraft 1.5)
// ==========================================

export const FURNACE_FUELS = Object.freeze({
    // Standard Coal & Charcoal (80s = 8 items)
    [ITEM_IDS.COAL || 263]: 80.0,
    [BLOCKS.COAL_ORE || 16]: 80.0,

    // Wood Logs & Planks (15s = 1.5 items)
    [BLOCKS.OAK_LOG || 17]: 15.0,
    [BLOCKS.OAK_PLANKS || 5]: 15.0,
    [BLOCKS.BOOKSHELF || 47]: 15.0,
    [BLOCKS.CRAFTING_TABLE || 58]: 15.0,
    [BLOCKS.FURNACE || 61]: 15.0,
    [BLOCKS.LADDER || 65]: 15.0,
    [BLOCKS.FENCE || 85]: 15.0,

    // Saplings & Sticks (5s = 0.5 items)
    [BLOCKS.OAK_SAPLING || 6]: 5.0,
    [ITEM_IDS.STICK || 280]: 5.0,

    // Wooden Tools (10s = 1 item)
    [ITEM_IDS.WOODEN_SWORD || 268]: 10.0,
    [ITEM_IDS.WOODEN_SHOVEL || 269]: 10.0,
    [ITEM_IDS.WOODEN_PICKAXE || 270]: 10.0,
    [ITEM_IDS.WOODEN_AXE || 271]: 10.0,
    [ITEM_IDS.BOW || 261]: 15.0
});

export const FURNACE_SMELTING_RECIPES = Object.freeze({
    [ITEM_IDS.RAW_PORKCHOP || 319]: { resultId: ITEM_IDS.COOKED_PORKCHOP || 320, count: 1, xp: 0.35, name: "Cooked Porkchop" },
    [ITEM_IDS.RAW_BEEF || 363]: { resultId: ITEM_IDS.COOKED_BEEF || 364, count: 1, xp: 0.35, name: "Steak" },
    [BLOCKS.COBBLESTONE || 4]: { resultId: BLOCKS.STONE || 1, count: 1, xp: 0.1, name: "Stone" },
    [BLOCKS.IRON_ORE || 15]: { resultId: ITEM_IDS.IRON_INGOT || 265, count: 1, xp: 0.7, name: "Iron Ingot" },
    [BLOCKS.GOLD_ORE || 14]: { resultId: ITEM_IDS.GOLD_INGOT || 266, count: 1, xp: 1.0, name: "Gold Ingot" },
    [BLOCKS.SAND || 12]: { resultId: BLOCKS.GLASS || 20, count: 1, xp: 0.1, name: "Glass" },
    [BLOCKS.OAK_LOG || 17]: { resultId: ITEM_IDS.COAL || 263, count: 1, xp: 0.15, name: "Charcoal" },
    [BLOCKS.REDSTONE_ORE || 73]: { resultId: ITEM_IDS.REDSTONE || 331, count: 1, xp: 0.7, name: "Redstone Dust" },
    [BLOCKS.DIAMOND_ORE || 56]: { resultId: ITEM_IDS.DIAMOND || 264, count: 1, xp: 1.0, name: "Diamond" },
    [BLOCKS.CLAY || 82]: { resultId: BLOCKS.BRICKS || 45, count: 1, xp: 0.3, name: "Bricks" },
    [BLOCKS.NETHERRACK || 87]: { resultId: BLOCKS.BRICKS || 45, count: 1, xp: 0.1, name: "Nether Brick" },
    [BLOCKS.QUARTZ_ORE || 153]: { resultId: ITEM_IDS.QUARTZ || 406, count: 1, xp: 0.2, name: "Nether Quartz" }
});

export function isFuel(itemId) {
    const id = Number(itemId);
    return Boolean(FURNACE_FUELS[id]);
}

export function getFuelBurnDuration(itemId) {
    const id = Number(itemId);
    return FURNACE_FUELS[id] || 0;
}

export function isSmeltable(itemId) {
    const id = Number(itemId);
    return Boolean(FURNACE_SMELTING_RECIPES[id]);
}

export function getSmeltingRecipe(itemId) {
    const id = Number(itemId);
    return FURNACE_SMELTING_RECIPES[id] || null;
}

// ==========================================
// 2. PROCEDURAL PIXEL ART SVGS
// ==========================================

function createSvgDataUri(svgContent) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
}

const SVGS = {
    // 14x14 Dark unlit flame outline
    flame_unlit: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges">
            <path d="M5,1 h4 v1 h-4 z M3,2 h2 v1 h-2 z M9,2 h2 v1 h-2 z M2,3 h2 v2 h-2 z M10,3 h2 v2 h-2 z M1,5 h2 v5 h-2 z M11,5 h2 v5 h-2 z M2,10 h2 v2 h-2 z M10,10 h2 v2 h-2 z M3,12 h2 v1 h-2 z M9,12 h2 v1 h-2 z M5,13 h4 v1 h-4 z" fill="#373737"/>
            <path d="M4,3 h6 v2 h-6 z M3,5 h8 v5 h-8 z M4,10 h6 v2 h-6 z M5,12 h4 v1 h-4 z" fill="#505050"/>
        </svg>
    `),

    // 14x14 Lit burning fiery pixel art flame
    flame_lit: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges">
            <!-- Red fire edge -->
            <path d="M6,0 h2 v1 h1 v1 h1 v2 h1 v3 h-1 v3 h-1 v2 h-1 v1 h-1 v1 h-2 v-1 h-1 v-1 h-1 v-2 h-1 v-3 h1 v-3 h1 v-2 h1 v-1 h1 v-1 z" fill="#c02200"/>
            <!-- Orange flame body -->
            <path d="M6,2 h2 v1 h1 v2 h1 v3 h-1 v2 h-1 v1 h-2 v-1 h-1 v-2 h-1 v-3 h1 v-2 h1 v-1 z" fill="#ff7700"/>
            <!-- Yellow core -->
            <path d="M6,4 h2 v2 h1 v2 h-1 v2 h-2 v-2 h-1 v-2 h1 v-2 z" fill="#ffee00"/>
            <!-- White highlight center -->
            <path d="M6,6 h2 v2 h-2 z" fill="#ffffff"/>
        </svg>
    `),

    // 24x17 Dark unlit progress arrow background
    arrow_unlit: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="17" viewBox="0 0 24 17" shape-rendering="crispEdges">
            <path d="M0,5 h15 v-5 h2 v1 h1 v1 h1 v1 h1 v1 h1 v1 h1 v1 h1 v1 h1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-2 v-5 h-15 z" fill="#373737"/>
            <path d="M1,6 h14 v-4 h1 v1 h1 v1 h1 v1 h1 v1 h1 v1 h1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v-4 h-14 z" fill="#7a7a7a"/>
        </svg>
    `),

    // 24x17 Smooth white progress arrow fill
    arrow_lit: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="17" viewBox="0 0 24 17" shape-rendering="crispEdges">
            <path d="M0,5 h15 v-5 h2 v1 h1 v1 h1 v1 h1 v1 h1 v1 h1 v1 h1 v1 h1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-2 v-5 h-15 z" fill="#ffffff"/>
            <path d="M1,6 h14 v-4 h1 v1 h1 v1 h1 v1 h1 v1 h1 v1 h1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v-4 h-14 z" fill="#eaeaea"/>
        </svg>
    `)
};

// ==========================================
// 3. CSS STYLES
// ==========================================

const FURNACE_CSS = `
#minecraft-furnace-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.75);
    display: none;
    align-items: center;
    justify-content: center;
    user-select: none;
    font-family: 'Minecraft', monospace, sans-serif;
    image-rendering: pixelated;
    z-index: 550;
}

#furnace-panel {
    background: #c6c6c6;
    border: 4px solid #ffffff;
    border-right-color: #555555;
    border-bottom-color: #555555;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), inset 2px 2px 0 #dbdbdb, inset -2px -2px 0 #8b8b8b;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 380px;
}

.furnace-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #3f3f3f;
    font-size: 15px;
    font-weight: bold;
    margin-bottom: 2px;
}

.furnace-close-btn {
    background: #dbdbdb;
    border: 2px solid #ffffff;
    border-right-color: #555555;
    border-bottom-color: #555555;
    color: #222;
    cursor: pointer;
    padding: 2px 8px;
    font-weight: bold;
    font-size: 12px;
}

.furnace-close-btn:hover {
    background: #ff5555;
    color: #fff;
}

.furnace-work-area {
    display: flex;
    justify-content: space-around;
    align-items: center;
    background: #b5b5b5;
    padding: 16px 20px;
    border: 2px solid #373737;
    border-bottom-color: #ffffff;
    border-right-color: #ffffff;
    min-height: 120px;
}

.furnace-left-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
}

.furnace-flame-container {
    position: relative;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.furnace-flame-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 28px;
    height: 28px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
}

.furnace-flame-lit {
    position: absolute;
    top: 0;
    left: 0;
    width: 28px;
    height: 28px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    transition: clip-path 0.05s linear;
}

.furnace-flame-burning {
    animation: furnace-fire-flicker 0.35s infinite alternate ease-in-out;
}

@keyframes furnace-fire-flicker {
    0% {
        filter: drop-shadow(0 0 3px #ff7700) brightness(1.0);
    }
    100% {
        filter: drop-shadow(0 0 7px #ff3300) brightness(1.2);
    }
}

.furnace-center-col {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 14px;
}

.furnace-arrow-container {
    position: relative;
    width: 36px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.furnace-arrow-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 36px;
    height: 26px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
}

.furnace-arrow-progress {
    position: absolute;
    top: 0;
    left: 0;
    width: 36px;
    height: 26px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    transition: clip-path 0.05s linear;
}

.furnace-right-col {
    display: flex;
    align-items: center;
    justify-content: center;
}

.furnace-slot {
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
}

.furnace-slot:hover {
    background: #a0a0a0;
    outline: 1px solid #ffffff;
}

.furnace-slot.output-slot {
    width: 50px;
    height: 50px;
    background: #969696;
}

.furnace-slot.output-slot:hover {
    background: #b0b0b0;
    outline: 2px solid #ffff55;
}

.furnace-slot-img {
    width: 28px;
    height: 28px;
    image-rendering: pixelated;
    pointer-events: none;
    user-select: none;
}

.furnace-slot.output-slot .furnace-slot-img {
    width: 36px;
    height: 36px;
}

.furnace-slot-count {
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

.furnace-section-label {
    color: #3f3f3f;
    font-size: 12px;
    font-weight: bold;
    margin-top: 2px;
    margin-bottom: -4px;
}

.furnace-inv-grid {
    display: grid;
    grid-template-columns: repeat(9, 38px);
    gap: 2px;
}

.furnace-hotbar-grid {
    display: grid;
    grid-template-columns: repeat(9, 38px);
    gap: 2px;
    margin-top: 2px;
}

#furnace-cursor-item {
    position: fixed;
    pointer-events: none;
    z-index: 1200;
    display: none;
    transform: translate(-50%, -50%);
}

#furnace-cursor-img {
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
}

#furnace-cursor-count {
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
// 4. FURNACE TILE ENTITY
// ==========================================

export class FurnaceTileEntity {
    
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;

        // Slots
        this.inputItem = null;
        this.fuelItem = null;
        this.outputItem = null;

        // Burning & Cooking state
        this.burnTime = 0.0;     // Seconds of fuel burning remaining
        this.maxBurnTime = 0.0;  // Initial duration of consumed fuel
        this.cookTime = 0.0;     // Seconds elapsed cooking current item
        this.maxCookTime = 10.0; // Standard 10s (200 ticks) per item
        this.xpStored = 0.0;     // Experience stored in furnace

        this.isDirty = false;
    }

    isBurning() {
        return this.burnTime > 0.0;
    }

    canSmelt() {
        if (!this.inputItem || this.inputItem.count <= 0) return false;
        const recipe = getSmeltingRecipe(this.inputItem.id);
        if (!recipe) return false;

        if (!this.outputItem) return true;
        if (this.outputItem.id !== recipe.resultId) return false;

        const maxStack = this.outputItem.maxStack || 64;
        return (this.outputItem.count + recipe.count) <= maxStack;
    }

    tick(delta) {
        let changed = false;
        const wasBurning = this.isBurning();

        // 1. Decrement fuel burn time
        if (this.burnTime > 0.0) {
            this.burnTime = Math.max(0.0, this.burnTime - delta);
            changed = true;
        }

        const canSmeltItem = this.canSmelt();

        // 2. Consume fuel if needed and possible
        if (this.burnTime <= 0.0 && canSmeltItem) {
            if (this.fuelItem && this.fuelItem.count > 0 && isFuel(this.fuelItem.id)) {
                const duration = getFuelBurnDuration(this.fuelItem.id);
                if (duration > 0) {
                    this.burnTime = duration;
                    this.maxBurnTime = duration;
                    this.fuelItem.count -= 1;
                    if (this.fuelItem.count <= 0) {
                        this.fuelItem = null;
                    }
                    changed = true;
                }
            }
        }

        // 3. Cook progress
        if (this.isBurning() && canSmeltItem) {
            this.cookTime += delta;
            changed = true;

            if (this.cookTime >= this.maxCookTime) {
                this.smeltItem();
                this.cookTime = 0.0;
                changed = true;
            }
        } else {
            // Cook progress decays if not burning or cannot smelt
            if (this.cookTime > 0.0) {
                this.cookTime = Math.max(0.0, this.cookTime - delta * 2.0);
                changed = true;
            }
        }

        if (wasBurning !== this.isBurning()) {
            changed = true;
        }

        return changed;
    }

    smeltItem() {
        if (!this.inputItem) return;
        const recipe = getSmeltingRecipe(this.inputItem.id);
        if (!recipe) return;

        // Produce output
        if (!this.outputItem) {
            this.outputItem = createItemStack(recipe.resultId, recipe.count);
        } else if (this.outputItem.id === recipe.resultId) {
            this.outputItem.count += recipe.count;
        }

        // Store XP
        this.xpStored += (recipe.xp || 0.1) * recipe.count;

        // Consume 1 input item
        this.inputItem.count -= 1;
        if (this.inputItem.count <= 0) {
            this.inputItem = null;
        }
    }
}

// ==========================================
// 5. FURNACE UI CLASS
// ==========================================

export class FurnaceUI {
    
    constructor(options = {}) {
        this.inventory = options.inventory || null;
        this.hud = options.hud || (options.inventory ? options.inventory.hud : null);
        this.audio = options.audio || null;
        this.particles = options.particles || null;
        this.world = options.world || null;
        this.player = options.player || null;

        // Multi-furnace tile entities Map: "x,y,z" -> FurnaceTileEntity
        this.furnaces = new Map();

        this.activeFurnace = null;

        // Held cursor item stack
        this.heldItem = null;

        this._isOpen = false;
        this.dom = {};

        this.initDOM();
        this.attachEventListeners();
    }

    initDOM() {
        if (typeof document === "undefined") return;

        if (!document.getElementById("minecraft-furnace-styles")) {
            const style = document.createElement("style");
            style.id = "minecraft-furnace-styles";
            style.textContent = FURNACE_CSS;
            document.head.appendChild(style);
        }

        const modal = document.createElement("div");
        modal.id = "minecraft-furnace-modal";

        const panel = document.createElement("div");
        panel.id = "furnace-panel";

        // 1. Header
        const header = document.createElement("div");
        header.className = "furnace-header";
        const title = document.createElement("span");
        title.textContent = "Furnace";
        const closeBtn = document.createElement("button");
        closeBtn.className = "furnace-close-btn";
        closeBtn.textContent = "✕";
        closeBtn.onclick = () => this.close();
        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // 2. Work Area (Inputs, Flame, Arrow, Output)
        const workArea = document.createElement("div");
        workArea.className = "furnace-work-area";

        // Left Col: Input Slot + Fire + Fuel Slot
        const leftCol = document.createElement("div");
        leftCol.className = "furnace-left-col";

        const inputSlot = this.createFurnaceSlotElement("input");
        
        const flameContainer = document.createElement("div");
        flameContainer.className = "furnace-flame-container";
        const flameBg = document.createElement("div");
        flameBg.className = "furnace-flame-bg";
        flameBg.style.backgroundImage = `url("${SVGS.flame_unlit}")`;
        const flameLit = document.createElement("div");
        flameLit.className = "furnace-flame-lit";
        flameLit.style.backgroundImage = `url("${SVGS.flame_lit}")`;
        flameLit.style.clipPath = "inset(100% 0 0 0)";
        flameContainer.appendChild(flameBg);
        flameContainer.appendChild(flameLit);

        const fuelSlot = this.createFurnaceSlotElement("fuel");

        leftCol.appendChild(inputSlot);
        leftCol.appendChild(flameContainer);
        leftCol.appendChild(fuelSlot);

        // Center Col: Progress Arrow
        const centerCol = document.createElement("div");
        centerCol.className = "furnace-center-col";

        const arrowContainer = document.createElement("div");
        arrowContainer.className = "furnace-arrow-container";
        const arrowBg = document.createElement("div");
        arrowBg.className = "furnace-arrow-bg";
        arrowBg.style.backgroundImage = `url("${SVGS.arrow_unlit}")`;
        const arrowProgress = document.createElement("div");
        arrowProgress.className = "furnace-arrow-progress";
        arrowProgress.style.backgroundImage = `url("${SVGS.arrow_lit}")`;
        arrowProgress.style.clipPath = "inset(0 100% 0 0)";
        arrowContainer.appendChild(arrowBg);
        arrowContainer.appendChild(arrowProgress);

        centerCol.appendChild(arrowContainer);

        // Right Col: Output Slot
        const rightCol = document.createElement("div");
        rightCol.className = "furnace-right-col";
        const outputSlot = this.createFurnaceSlotElement("output");
        outputSlot.classList.add("output-slot");
        rightCol.appendChild(outputSlot);

        workArea.appendChild(leftCol);
        workArea.appendChild(centerCol);
        workArea.appendChild(rightCol);
        panel.appendChild(workArea);

        // 3. Player Inventory Section
        const invLabel = document.createElement("div");
        invLabel.className = "furnace-section-label";
        invLabel.textContent = "Inventory";
        panel.appendChild(invLabel);

        const mainGrid = document.createElement("div");
        mainGrid.className = "furnace-inv-grid";
        const mainSlotEls = [];
        for (let i = 9; i < 36; i++) {
            const slotEl = this.createPlayerSlotElement(i);
            mainGrid.appendChild(slotEl);
            mainSlotEls.push(slotEl);
        }
        panel.appendChild(mainGrid);

        // 4. Player Hotbar Section
        const hotbarGrid = document.createElement("div");
        hotbarGrid.className = "furnace-hotbar-grid";
        const hotbarSlotEls = [];
        for (let i = 0; i < 9; i++) {
            const slotEl = this.createPlayerSlotElement(i);
            hotbarGrid.appendChild(slotEl);
            hotbarSlotEls.push(slotEl);
        }
        panel.appendChild(hotbarGrid);

        modal.appendChild(panel);

        // 5. Floating Cursor Item
        const cursorItem = document.createElement("div");
        cursorItem.id = "furnace-cursor-item";
        cursorItem.innerHTML = `<img id="furnace-cursor-img"><span id="furnace-cursor-count"></span>`;
        document.body.appendChild(cursorItem);

        document.body.appendChild(modal);

        this.dom = {
            modal,
            panel,
            inputSlot,
            fuelSlot,
            outputSlot,
            flameLit,
            arrowProgress,
            mainSlotEls,
            hotbarSlotEls,
            cursorItem,
            cursorImg: cursorItem.querySelector("#furnace-cursor-img"),
            cursorCount: cursorItem.querySelector("#furnace-cursor-count")
        };
    }

    createFurnaceSlotElement(type) {
        const slot = document.createElement("div");
        slot.className = "furnace-slot";
        slot.dataset.slotType = type;
        slot.innerHTML = `<img class="furnace-slot-img" style="display:none;"><span class="furnace-slot-count"></span>`;
        slot.onmousedown = (e) => this.handleFurnaceSlotClick(e, type);
        return slot;
    }

    createPlayerSlotElement(index) {
        const slot = document.createElement("div");
        slot.className = "furnace-slot";
        slot.dataset.index = index;
        slot.innerHTML = `<img class="furnace-slot-img" style="display:none;"><span class="furnace-slot-count"></span>`;
        slot.onmousedown = (e) => this.handlePlayerSlotClick(e, index);
        return slot;
    }

    attachEventListeners() {
        if (typeof window === "undefined") return;

        window.addEventListener("mousemove", (e) => {
            if (this._isOpen && this.heldItem) {
                this.dom.cursorItem.style.left = `${e.clientX}px`;
                this.dom.cursorItem.style.top = `${e.clientY}px`;
            }
        });

        this.dom.modal.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    // ==========================================
    // 6. OPEN / CLOSE & TILE ENTITY RETRIEVAL
    // ==========================================

    open(x, y, z) {
        let posX = 0, posY = 0, posZ = 0;
        if (typeof x === "object" && x !== null) {
            posX = x.x || 0;
            posY = x.y || 0;
            posZ = x.z || 0;
        } else if (typeof x === "number") {
            posX = x;
            posY = y || 0;
            posZ = z || 0;
        }

        const key = `${posX},${posY},${posZ}`;
        if (!this.furnaces.has(key)) {
            this.furnaces.set(key, new FurnaceTileEntity(posX, posY, posZ));
        }
        this.activeFurnace = this.furnaces.get(key);

        this._isOpen = true;
        this.heldItem = null;

        if (this.inventory && this.inventory.isOpen()) {
            this.inventory.close();
        }

        this.dom.modal.style.display = "flex";
        this.renderAll();

        if (typeof document !== "undefined" && document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    close() {
        if (!this._isOpen) return;

        // Return held cursor item back to player inventory
        if (this.heldItem) {
            this.giveToPlayerInventory(this.heldItem);
            this.heldItem = null;
        }

        this._isOpen = false;
        this.dom.modal.style.display = "none";
        this.dom.cursorItem.style.display = "none";

        if (this.inventory) {
            this.inventory.syncHUD();
        }
    }

    isOpen() {
        return this._isOpen;
    }

    giveToPlayerInventory(item) {
        if (!item) return;
        if (this.inventory) {
            this.inventory.addItem(item.id, item.count, item);
        }
    }

    // ==========================================
    // 7. TICK SIMULATION & REAL-TIME UPDATE
    // ==========================================

    update(delta) {
        // 1. Tick all registered furnaces
        for (const [key, furnace] of this.furnaces.entries()) {
            furnace.tick(delta);

            // Optional: emit burning particle at furnace position if particle system available
            if (furnace.isBurning() && this.particles && Math.random() < 0.15) {
                if (typeof this.particles.emitFlame === "function") {
                    this.particles.emitFlame(furnace.x + 0.5, furnace.y + 0.6, furnace.z + 0.5);
                }
            }
        }

        // 2. If UI is open, update progress bars and slot contents
        if (this._isOpen && this.activeFurnace) {
            this.renderFurnaceProgress();
            this.renderSlots();
        }
    }

    // ==========================================
    // 8. INTERACTION & CLICK HANDLERS
    // ==========================================

    handleFurnaceSlotClick(e, type) {
        e.preventDefault();
        if (!this.activeFurnace) return;

        const isRightClick = e.button === 2;
        const isShiftClick = e.shiftKey;

        if (type === "output") {
            this.handleTakeOutput(isShiftClick);
            return;
        }

        let slotItem = type === "input" ? this.activeFurnace.inputItem : this.activeFurnace.fuelItem;

        if (isShiftClick && slotItem) {
            // Quick shift-click back to inventory
            this.giveToPlayerInventory(slotItem);
            if (type === "input") this.activeFurnace.inputItem = null;
            else this.activeFurnace.fuelItem = null;
            this.playEffect("pop");
            this.renderAll();
            return;
        }

        if (!this.heldItem) {
            // Pick up from slot
            if (slotItem) {
                if (isRightClick && slotItem.count > 1) {
                    const take = Math.ceil(slotItem.count / 2);
                    this.heldItem = { ...slotItem, count: take };
                    slotItem.count -= take;
                } else {
                    this.heldItem = slotItem;
                    if (type === "input") this.activeFurnace.inputItem = null;
                    else this.activeFurnace.fuelItem = null;
                }
                this.playEffect("pop");
            }
        } else {
            // Place / drop into slot
            // Validate slot requirements if strict
            if (type === "fuel" && !isFuel(this.heldItem.id)) {
                // Not valid fuel
                return;
            }

            if (!slotItem) {
                if (isRightClick && this.heldItem.count > 1) {
                    const drop = { ...this.heldItem, count: 1 };
                    this.heldItem.count -= 1;
                    if (type === "input") this.activeFurnace.inputItem = drop;
                    else this.activeFurnace.fuelItem = drop;
                } else {
                    if (type === "input") this.activeFurnace.inputItem = this.heldItem;
                    else this.activeFurnace.fuelItem = this.heldItem;
                    this.heldItem = null;
                }
                this.playEffect("pop");
            } else if (slotItem.id === this.heldItem.id) {
                const maxStack = slotItem.maxStack || 64;
                if (isRightClick) {
                    if (slotItem.count < maxStack) {
                        slotItem.count += 1;
                        this.heldItem.count -= 1;
                        if (this.heldItem.count <= 0) this.heldItem = null;
                        this.playEffect("pop");
                    }
                } else {
                    const space = maxStack - slotItem.count;
                    const move = Math.min(space, this.heldItem.count);
                    slotItem.count += move;
                    this.heldItem.count -= move;
                    if (this.heldItem.count <= 0) this.heldItem = null;
                    this.playEffect("pop");
                }
            } else {
                // Swap items
                const temp = slotItem;
                if (type === "input") this.activeFurnace.inputItem = this.heldItem;
                else this.activeFurnace.fuelItem = this.heldItem;
                this.heldItem = temp;
                this.playEffect("pop");
            }
        }

        this.renderAll();
    }

    handleTakeOutput(isShiftClick = false) {
        if (!this.activeFurnace || !this.activeFurnace.outputItem) return;

        const output = this.activeFurnace.outputItem;

        // Claim XP
        if (this.activeFurnace.xpStored > 0) {
            const xpGained = Math.round(this.activeFurnace.xpStored);
            if (this.player && typeof this.player.addExperience === "function") {
                this.player.addExperience(xpGained);
            } else if (this.hud && typeof this.hud.addExp === "function") {
                this.hud.addExp(xpGained);
            }
            this.activeFurnace.xpStored = 0;
        }

        this.playEffect("pop");

        if (isShiftClick) {
            // Shift-click quick move to inventory
            this.giveToPlayerInventory(output);
            this.activeFurnace.outputItem = null;
        } else {
            // Left-click pickup
            if (!this.heldItem) {
                this.heldItem = output;
                this.activeFurnace.outputItem = null;
            } else if (this.heldItem.id === output.id) {
                const maxStack = this.heldItem.maxStack || 64;
                const space = maxStack - this.heldItem.count;
                const move = Math.min(space, output.count);
                this.heldItem.count += move;
                output.count -= move;
                if (output.count <= 0) {
                    this.activeFurnace.outputItem = null;
                }
            }
        }

        this.renderAll();
    }

    handlePlayerSlotClick(e, slotIndex) {
        e.preventDefault();
        if (!this.inventory || !this.activeFurnace) return;

        const isRightClick = e.button === 2;
        const isShiftClick = e.shiftKey;
        const slotItem = this.inventory.getSlot(slotIndex);

        if (isShiftClick && slotItem) {
            // Shift-click auto routing:
            // 1. If smeltable and input slot is empty or matching -> move to input
            // 2. If fuel and fuel slot is empty or matching -> move to fuel
            let moved = false;

            if (isSmeltable(slotItem.id)) {
                if (!this.activeFurnace.inputItem) {
                    this.activeFurnace.inputItem = slotItem;
                    this.inventory.setSlot(slotIndex, null);
                    moved = true;
                } else if (this.activeFurnace.inputItem.id === slotItem.id) {
                    const max = this.activeFurnace.inputItem.maxStack || 64;
                    const space = max - this.activeFurnace.inputItem.count;
                    const transfer = Math.min(space, slotItem.count);
                    if (transfer > 0) {
                        this.activeFurnace.inputItem.count += transfer;
                        slotItem.count -= transfer;
                        if (slotItem.count <= 0) this.inventory.setSlot(slotIndex, null);
                        moved = true;
                    }
                }
            }

            if (!moved && isFuel(slotItem.id)) {
                if (!this.activeFurnace.fuelItem) {
                    this.activeFurnace.fuelItem = slotItem;
                    this.inventory.setSlot(slotIndex, null);
                    moved = true;
                } else if (this.activeFurnace.fuelItem.id === slotItem.id) {
                    const max = this.activeFurnace.fuelItem.maxStack || 64;
                    const space = max - this.activeFurnace.fuelItem.count;
                    const transfer = Math.min(space, slotItem.count);
                    if (transfer > 0) {
                        this.activeFurnace.fuelItem.count += transfer;
                        slotItem.count -= transfer;
                        if (slotItem.count <= 0) this.inventory.setSlot(slotIndex, null);
                        moved = true;
                    }
                }
            }

            if (moved) {
                this.playEffect("pop");
                this.renderAll();
            }
            return;
        }

        if (!this.heldItem) {
            if (slotItem) {
                if (isRightClick && slotItem.count > 1) {
                    const take = Math.ceil(slotItem.count / 2);
                    this.heldItem = { ...slotItem, count: take };
                    slotItem.count -= take;
                    this.inventory.setSlot(slotIndex, slotItem);
                } else {
                    this.heldItem = slotItem;
                    this.inventory.setSlot(slotIndex, null);
                }
                this.playEffect("pop");
            }
        } else {
            if (!slotItem) {
                if (isRightClick && this.heldItem.count > 1) {
                    const drop = { ...this.heldItem, count: 1 };
                    this.heldItem.count -= 1;
                    this.inventory.setSlot(slotIndex, drop);
                } else {
                    this.inventory.setSlot(slotIndex, this.heldItem);
                    this.heldItem = null;
                }
                this.playEffect("pop");
            } else if (slotItem.id === this.heldItem.id) {
                const maxStack = slotItem.maxStack || 64;
                if (isRightClick) {
                    if (slotItem.count < maxStack) {
                        slotItem.count += 1;
                        this.heldItem.count -= 1;
                        if (this.heldItem.count <= 0) this.heldItem = null;
                        this.inventory.setSlot(slotIndex, slotItem);
                        this.playEffect("pop");
                    }
                } else {
                    const space = maxStack - slotItem.count;
                    const move = Math.min(space, this.heldItem.count);
                    slotItem.count += move;
                    this.heldItem.count -= move;
                    if (this.heldItem.count <= 0) this.heldItem = null;
                    this.inventory.setSlot(slotIndex, slotItem);
                    this.playEffect("pop");
                }
            } else {
                const temp = slotItem;
                this.inventory.setSlot(slotIndex, this.heldItem);
                this.heldItem = temp;
                this.playEffect("pop");
            }
        }

        this.renderAll();
    }

    playEffect(type) {
        if (this.audio && typeof this.audio.play === "function") {
            this.audio.play(type === "pop" ? "pop" : "click");
        }
    }

    // ==========================================
    // 9. RENDERING & PROGRESS ANIMATION
    // ==========================================

    renderAll() {
        this.renderSlots();
        this.renderFurnaceProgress();
        this.renderPlayerSlots();
        this.renderHeldCursor();
    }

    renderSlots() {
        if (!this.activeFurnace) return;
        this.renderSingleSlot(this.dom.inputSlot, this.activeFurnace.inputItem);
        this.renderSingleSlot(this.dom.fuelSlot, this.activeFurnace.fuelItem);
        this.renderSingleSlot(this.dom.outputSlot, this.activeFurnace.outputItem);
    }

    renderSingleSlot(slotEl, item) {
        if (!slotEl) return;
        const img = slotEl.querySelector(".furnace-slot-img");
        const count = slotEl.querySelector(".furnace-slot-count");

        if (item && item.count > 0) {
            img.src = item.icon || getItemIconDataUri(item.id);
            img.style.display = "block";
            count.textContent = item.count > 1 ? item.count : "";
        } else {
            img.src = "";
            img.style.display = "none";
            count.textContent = "";
        }
    }

    renderFurnaceProgress() {
        if (!this.activeFurnace) return;

        // 1. Flame progress (drains top-to-bottom as fuel burns out)
        const isBurning = this.activeFurnace.isBurning();
        const burnRatio = (isBurning && this.activeFurnace.maxBurnTime > 0)
            ? (this.activeFurnace.burnTime / this.activeFurnace.maxBurnTime)
            : 0.0;

        const flamePercent = Math.max(0.0, Math.min(1.0, burnRatio));
        const flameClipTop = (1.0 - flamePercent) * 100;
        this.dom.flameLit.style.clipPath = `inset(${flameClipTop}% 0 0 0)`;

        if (isBurning) {
            this.dom.flameLit.classList.add("furnace-flame-burning");
        } else {
            this.dom.flameLit.classList.remove("furnace-flame-burning");
        }

        // 2. Arrow progress (fills left-to-right as cooking progresses)
        const cookRatio = this.activeFurnace.maxCookTime > 0
            ? (this.activeFurnace.cookTime / this.activeFurnace.maxCookTime)
            : 0.0;

        const cookPercent = Math.max(0.0, Math.min(1.0, cookRatio));
        const arrowClipRight = (1.0 - cookPercent) * 100;
        this.dom.arrowProgress.style.clipPath = `inset(0 ${arrowClipRight}% 0 0)`;
    }

    renderPlayerSlots() {
        if (!this.inventory) return;

        for (let i = 0; i < 36; i++) {
            const item = this.inventory.getSlot(i);
            const slotEl = i < 9 ? this.dom.hotbarSlotEls[i] : this.dom.mainSlotEls[i - 9];
            if (slotEl) {
                this.renderSingleSlot(slotEl, item);
            }
        }
    }

    renderHeldCursor() {
        if (this.heldItem && this.heldItem.count > 0) {
            this.dom.cursorImg.src = this.heldItem.icon || getItemIconDataUri(this.heldItem.id);
            this.dom.cursorCount.textContent = this.heldItem.count > 1 ? this.heldItem.count : "";
            this.dom.cursorItem.style.display = "block";
        } else {
            this.dom.cursorItem.style.display = "none";
        }
    }
}
