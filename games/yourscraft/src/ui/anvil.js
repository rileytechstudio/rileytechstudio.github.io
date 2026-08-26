/**
 * Anvil UI & Repair/Rename System for Minecraft 1.5 WebGL Engine
 * 
 * Features:
 * - Minecraft 1.5 authentic Anvil GUI with 3D beveled stone/metal styling
 * - Item renaming with custom text input and XP cost
 * - Item repairing (combining two damaged items with bonus durability, or using raw materials)
 * - Combining enchantments from sacrifice items or Enchanted Books
 * - Experience level cost calculation & deduction
 * - Full drag-and-drop, shift-click transfer, right-click splitting with player inventory
 * - Return items to inventory on close
 */

import { BLOCKS } from '../core/chunk.js';
import { getItemDef, createItemStack, ITEM_TYPES } from './inventory.js';
import { getItemIconDataUri } from './hud.js';
import { ITEM_IDS } from '../core/crafting.js';

// ==========================================
// 1. ANVIL REPAIR MATERIAL MAPPINGS
// ==========================================

const REPAIR_MATERIALS = {
    // Diamond items repair with diamonds
    [ITEM_IDS.DIAMOND_SWORD]: ITEM_IDS.DIAMOND,
    [ITEM_IDS.DIAMOND_PICKAXE]: ITEM_IDS.DIAMOND,
    [ITEM_IDS.DIAMOND_AXE]: ITEM_IDS.DIAMOND,
    [ITEM_IDS.DIAMOND_SHOVEL]: ITEM_IDS.DIAMOND,
    [ITEM_IDS.DIAMOND_HELMET || 310]: ITEM_IDS.DIAMOND,
    [ITEM_IDS.DIAMOND_CHESTPLATE || 311]: ITEM_IDS.DIAMOND,
    [ITEM_IDS.DIAMOND_LEGGINGS || 312]: ITEM_IDS.DIAMOND,
    [ITEM_IDS.DIAMOND_BOOTS || 313]: ITEM_IDS.DIAMOND,

    // Iron items repair with iron ingots
    [ITEM_IDS.IRON_SWORD]: ITEM_IDS.IRON_INGOT,
    [ITEM_IDS.IRON_PICKAXE]: ITEM_IDS.IRON_INGOT,
    [ITEM_IDS.IRON_AXE]: ITEM_IDS.IRON_INGOT,
    [ITEM_IDS.IRON_SHOVEL]: ITEM_IDS.IRON_INGOT,
    [ITEM_IDS.IRON_HELMET || 306]: ITEM_IDS.IRON_INGOT,
    [ITEM_IDS.IRON_CHESTPLATE || 307]: ITEM_IDS.IRON_INGOT,
    [ITEM_IDS.IRON_LEGGINGS || 308]: ITEM_IDS.IRON_INGOT,
    [ITEM_IDS.IRON_BOOTS || 309]: ITEM_IDS.IRON_INGOT,

    // Gold items repair with gold ingots
    [ITEM_IDS.GOLDEN_SWORD]: ITEM_IDS.GOLD_INGOT,
    [ITEM_IDS.GOLDEN_PICKAXE]: ITEM_IDS.GOLD_INGOT,
    [ITEM_IDS.GOLDEN_AXE]: ITEM_IDS.GOLD_INGOT,
    [ITEM_IDS.GOLDEN_SHOVEL]: ITEM_IDS.GOLD_INGOT,

    // Wood items repair with planks
    [ITEM_IDS.WOODEN_SWORD]: BLOCKS.OAK_PLANKS,
    [ITEM_IDS.WOODEN_PICKAXE]: BLOCKS.OAK_PLANKS,
    [ITEM_IDS.WOODEN_AXE]: BLOCKS.OAK_PLANKS,
    [ITEM_IDS.WOODEN_SHOVEL]: BLOCKS.OAK_PLANKS,

    // Stone items repair with cobblestone
    [ITEM_IDS.STONE_SWORD]: BLOCKS.COBBLESTONE,
    [ITEM_IDS.STONE_PICKAXE]: BLOCKS.COBBLESTONE,
    [ITEM_IDS.STONE_AXE]: BLOCKS.COBBLESTONE,
    [ITEM_IDS.STONE_SHOVEL]: BLOCKS.COBBLESTONE,
};

// ==========================================
// 2. CSS STYLES
// ==========================================

const ANVIL_CSS = `
#minecraft-anvil-modal {
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

#anvil-panel {
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

.anvil-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #3f3f3f;
    font-size: 15px;
    font-weight: bold;
    margin-bottom: 2px;
}

.anvil-close-btn {
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

.anvil-close-btn:hover {
    background: #ff5555;
    color: #fff;
}

.anvil-rename-box {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: #b0b0b0;
    padding: 8px 10px;
    border: 2px solid #373737;
    border-bottom-color: #ffffff;
    border-right-color: #ffffff;
}

.anvil-rename-label {
    color: #3f3f3f;
    font-size: 11px;
    font-weight: bold;
}

.anvil-input-wrapper {
    display: flex;
    position: relative;
    background: #373737;
    border: 2px solid #222222;
    border-right-color: #555555;
    border-bottom-color: #555555;
}

.anvil-rename-input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: #ffffff;
    font-family: 'Minecraft', monospace, sans-serif;
    font-size: 14px;
    padding: 5px 8px;
    box-sizing: border-box;
}

.anvil-rename-input:disabled {
    color: #888888;
    cursor: not-allowed;
}

.anvil-slots-area {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #b5b5b5;
    padding: 12px 14px;
    border: 2px solid #373737;
    border-bottom-color: #ffffff;
    border-right-color: #ffffff;
}

.anvil-inputs-group {
    display: flex;
    align-items: center;
    gap: 12px;
}

.anvil-plus-sign {
    color: #4a4a4a;
    font-size: 20px;
    font-weight: bold;
    user-select: none;
}

.anvil-arrow-sign {
    color: #4a4a4a;
    font-size: 24px;
    font-weight: bold;
    user-select: none;
}

.anvil-slot {
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

.anvil-slot:hover {
    background: #a0a0a0;
    outline: 1px solid #ffffff;
}

.anvil-slot.output-slot {
    width: 46px;
    height: 46px;
    background: #969696;
    border: 2px solid #373737;
    border-bottom-color: #ffffff;
    border-right-color: #ffffff;
}

.anvil-slot.output-slot:hover {
    background: #b0b0b0;
    outline: 2px solid #ffff55;
}

.anvil-slot-img {
    width: 28px;
    height: 28px;
    image-rendering: pixelated;
    pointer-events: none;
    user-select: none;
}

.anvil-slot.output-slot .anvil-slot-img {
    width: 32px;
    height: 32px;
}

.anvil-slot-count {
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

.anvil-cost-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 6px;
    min-height: 22px;
}

.anvil-cost-text {
    font-size: 13px;
    font-weight: bold;
    text-shadow: 1px 1px 0 #000000;
}

.anvil-cost-green {
    color: #55ff55;
}

.anvil-cost-red {
    color: #ff5555;
}

.anvil-player-xp {
    color: #55ff55;
    font-size: 12px;
    font-weight: bold;
    text-shadow: 1px 1px 0 #000000;
    display: flex;
    align-items: center;
    gap: 4px;
}

.anvil-section-label {
    color: #3f3f3f;
    font-size: 12px;
    font-weight: bold;
    margin-top: 2px;
    margin-bottom: -4px;
}

.anvil-inv-grid {
    display: grid;
    grid-template-columns: repeat(9, 38px);
    gap: 2px;
}

.anvil-hotbar-grid {
    display: grid;
    grid-template-columns: repeat(9, 38px);
    gap: 2px;
    margin-top: 2px;
}

#anvil-cursor-item {
    position: fixed;
    pointer-events: none;
    z-index: 1200;
    display: none;
    transform: translate(-50%, -50%);
}

#anvil-cursor-img {
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
}

#anvil-cursor-count {
    position: absolute;
    bottom: -2px;
    right: -2px;
    color: #ffffff;
    font-size: 12px;
    font-weight: bold;
    text-shadow: 1px 1px 0 #000000;
}

.anvil-enchant-glint {
    filter: drop-shadow(0 0 4px #b855ff);
}
`;

// ==========================================
// 3. ANVIL UI CLASS
// ==========================================

export class AnvilUI {
    /**
     * @param {Object} [options]
     * @param {InventoryManager} [options.inventory]
     * @param {HUD} [options.hud]
     * @param {SoundManager} [options.audio]
     * @param {ParticleSystem} [options.particles]
     */
    constructor(options = {}) {
        this.inventory = options.inventory || null;
        this.hud = options.hud || (options.inventory ? options.inventory.hud : null);
        this.audio = options.audio || null;
        this.particles = options.particles || null;

        // Anvil 3 working slots: [0]: Base Item, [1]: Sacrifice / Material, [2]: Output Result
        this.baseItem = null;
        this.materialItem = null;
        this.outputItem = null;

        // Cost in XP levels
        this.cost = 0;
        this.customName = "";

        // Cursor held item
        this.heldItem = null;

        this._isOpen = false;
        this.dom = {};

        this.initDOM();
        this.attachEventListeners();
    }

    initDOM() {
        if (typeof document === "undefined") return;

        if (!document.getElementById("minecraft-anvil-styles")) {
            const style = document.createElement("style");
            style.id = "minecraft-anvil-styles";
            style.textContent = ANVIL_CSS;
            document.head.appendChild(style);
        }

        const modal = document.createElement("div");
        modal.id = "minecraft-anvil-modal";

        const panel = document.createElement("div");
        panel.id = "anvil-panel";

        // 1. Header
        const header = document.createElement("div");
        header.className = "anvil-header";
        const title = document.createElement("span");
        title.textContent = "Repair & Name";
        const closeBtn = document.createElement("button");
        closeBtn.className = "anvil-close-btn";
        closeBtn.textContent = "✕";
        closeBtn.onclick = () => this.close();
        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // 2. Rename Box
        const renameBox = document.createElement("div");
        renameBox.className = "anvil-rename-box";
        const renameLabel = document.createElement("div");
        renameLabel.className = "anvil-rename-label";
        renameLabel.textContent = "Item Name:";
        const inputWrapper = document.createElement("div");
        inputWrapper.className = "anvil-input-wrapper";
        const renameInput = document.createElement("input");
        renameInput.className = "anvil-rename-input";
        renameInput.type = "text";
        renameInput.maxLength = 32;
        renameInput.placeholder = "Insert an item to rename...";
        renameInput.disabled = true;
        renameInput.oninput = (e) => this.handleNameChange(e.target.value);
        inputWrapper.appendChild(renameInput);
        renameBox.appendChild(renameLabel);
        renameBox.appendChild(inputWrapper);
        panel.appendChild(renameBox);

        // 3. Slots Area (Slot 0 + Slot 1 -> Slot 2)
        const slotsArea = document.createElement("div");
        slotsArea.className = "anvil-slots-area";

        const inputsGroup = document.createElement("div");
        inputsGroup.className = "anvil-inputs-group";

        const baseSlot = this.createAnvilSlotElement("base");
        const plusSign = document.createElement("span");
        plusSign.className = "anvil-plus-sign";
        plusSign.textContent = "+";
        const materialSlot = this.createAnvilSlotElement("material");

        inputsGroup.appendChild(baseSlot);
        inputsGroup.appendChild(plusSign);
        inputsGroup.appendChild(materialSlot);

        const arrowSign = document.createElement("span");
        arrowSign.className = "anvil-arrow-sign";
        arrowSign.textContent = "➔";

        const outputSlot = this.createAnvilSlotElement("output");
        outputSlot.classList.add("output-slot");

        slotsArea.appendChild(inputsGroup);
        slotsArea.appendChild(arrowSign);
        slotsArea.appendChild(outputSlot);
        panel.appendChild(slotsArea);

        // 4. Cost and XP Indicator Bar
        const costBar = document.createElement("div");
        costBar.className = "anvil-cost-bar";
        const costText = document.createElement("div");
        costText.className = "anvil-cost-text";
        costText.textContent = "";
        const playerXp = document.createElement("div");
        playerXp.className = "anvil-player-xp";
        playerXp.innerHTML = `<span>XP Level:</span> <span id="anvil-xp-val">0</span>`;

        costBar.appendChild(costText);
        costBar.appendChild(playerXp);
        panel.appendChild(costBar);

        // 5. Player Inventory Grid (27 slots)
        const mainLabel = document.createElement("div");
        mainLabel.className = "anvil-section-label";
        mainLabel.textContent = "Inventory";
        panel.appendChild(mainLabel);

        const mainGrid = document.createElement("div");
        mainGrid.className = "anvil-inv-grid";
        const mainSlotEls = [];
        for (let i = 9; i < 36; i++) {
            const slotEl = this.createPlayerSlotElement(i);
            mainGrid.appendChild(slotEl);
            mainSlotEls.push(slotEl);
        }
        panel.appendChild(mainGrid);

        // 6. Player Hotbar Grid (9 slots)
        const hotbarGrid = document.createElement("div");
        hotbarGrid.className = "anvil-hotbar-grid";
        const hotbarSlotEls = [];
        for (let i = 0; i < 9; i++) {
            const slotEl = this.createPlayerSlotElement(i);
            hotbarGrid.appendChild(slotEl);
            hotbarSlotEls.push(slotEl);
        }
        panel.appendChild(hotbarGrid);

        modal.appendChild(panel);

        // 7. Floating Cursor Item
        const cursorItem = document.createElement("div");
        cursorItem.id = "anvil-cursor-item";
        cursorItem.innerHTML = `<img id="anvil-cursor-img"><span id="anvil-cursor-count"></span>`;
        document.body.appendChild(cursorItem);

        document.body.appendChild(modal);

        this.dom = {
            modal,
            panel,
            renameInput,
            baseSlot,
            materialSlot,
            outputSlot,
            costText,
            playerXpVal: playerXp.querySelector("#anvil-xp-val"),
            mainSlotEls,
            hotbarSlotEls,
            cursorItem,
            cursorImg: cursorItem.querySelector("#anvil-cursor-img"),
            cursorCount: cursorItem.querySelector("#anvil-cursor-count")
        };
    }

    createAnvilSlotElement(type) {
        const slot = document.createElement("div");
        slot.className = "anvil-slot";
        slot.dataset.slotType = type;
        slot.innerHTML = `<img class="anvil-slot-img" style="display:none;"><span class="anvil-slot-count"></span>`;
        slot.onmousedown = (e) => this.handleAnvilSlotClick(e, type);
        return slot;
    }

    createPlayerSlotElement(index) {
        const slot = document.createElement("div");
        slot.className = "anvil-slot";
        slot.dataset.index = index;
        slot.innerHTML = `<img class="anvil-slot-img" style="display:none;"><span class="anvil-slot-count"></span>`;
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
    // 4. OPEN & CLOSE
    // ==========================================

    open() {
        this._isOpen = true;
        this.baseItem = null;
        this.materialItem = null;
        this.outputItem = null;
        this.cost = 0;
        this.customName = "";
        this.heldItem = null;

        if (this.inventory && this.inventory.isOpen()) {
            this.inventory.close();
        }

        this.dom.modal.style.display = "flex";
        this.dom.renameInput.value = "";
        this.dom.renameInput.disabled = true;

        this.renderAll();

        if (typeof document !== "undefined" && document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    close() {
        if (!this._isOpen) return;

        // Return base & material items to player inventory
        if (this.baseItem) {
            this.giveToPlayerInventory(this.baseItem);
            this.baseItem = null;
        }
        if (this.materialItem) {
            this.giveToPlayerInventory(this.materialItem);
            this.materialItem = null;
        }
        if (this.heldItem) {
            this.giveToPlayerInventory(this.heldItem);
            this.heldItem = null;
        }

        this.outputItem = null;
        this.cost = 0;
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

    getPlayerLevel() {
        if (this.hud && typeof this.hud.level === "number") {
            return this.hud.level;
        }
        if (this.inventory && this.inventory.hud && typeof this.inventory.hud.level === "number") {
            return this.inventory.hud.level;
        }
        return 0;
    }

    deductPlayerLevel(levels) {
        if (levels <= 0) return;
        const targetHud = this.hud || (this.inventory ? this.inventory.hud : null);
        if (targetHud) {
            const cur = targetHud.level || 0;
            const newLvl = Math.max(0, cur - levels);
            if (typeof targetHud.setLevel === "function") {
                targetHud.setLevel(newLvl);
            } else {
                targetHud.level = newLvl;
            }
        }
    }

    // ==========================================
    // 5. ANVIL REPAIR & RENAME LOGIC
    // ==========================================

    handleNameChange(name) {
        this.customName = name.trim();
        this.calculateResult();
        this.renderSlots();
    }

    calculateResult() {
        if (!this.baseItem) {
            this.outputItem = null;
            this.cost = 0;
            this.dom.renameInput.disabled = true;
            this.dom.renameInput.value = "";
            return;
        }

        this.dom.renameInput.disabled = false;

        const baseDef = getItemDef(this.baseItem.id);
        const originalName = baseDef.name;
        const isRenamed = this.customName.length > 0 && this.customName !== (this.baseItem.customName || originalName);

        let resultStack = { ...this.baseItem };
        let calculatedCost = 0;
        let validOperation = false;

        // 1. Check Renaming
        if (isRenamed) {
            resultStack.customName = this.customName;
            resultStack.name = this.customName;
            calculatedCost += 1;
            validOperation = true;
        }

        // 2. Check Combining / Repairing
        if (this.materialItem) {
            const isSameItem = this.baseItem.id === this.materialItem.id;
            const repairMaterialId = REPAIR_MATERIALS[this.baseItem.id];
            const isMatchingMaterial = repairMaterialId && this.materialItem.id === repairMaterialId;
            const hasDamage = (this.baseItem.durability !== undefined && this.baseItem.maxDurability && this.baseItem.durability < this.baseItem.maxDurability);

            if (isSameItem) {
                // Combination repair: durability1 + durability2 + 12% bonus
                const maxDur = this.baseItem.maxDurability || 100;
                const bonus = Math.floor(maxDur * 0.12);
                const combinedDur = Math.min(maxDur, (this.baseItem.durability || 0) + (this.materialItem.durability || 0) + bonus);
                
                resultStack.durability = combinedDur;
                
                // Combine enchantments
                const baseEnchants = Array.isArray(this.baseItem.enchantments) ? [...this.baseItem.enchantments] : [];
                const matEnchants = Array.isArray(this.materialItem.enchantments) ? [...this.materialItem.enchantments] : [];
                
                const mergedEnchants = this.combineEnchantments(baseEnchants, matEnchants);
                if (mergedEnchants.length > 0) {
                    resultStack.enchantments = mergedEnchants;
                }

                calculatedCost += 2;
                validOperation = true;
            } else if (isMatchingMaterial && hasDamage) {
                // Material repair: each ingot/gem repairs 25% of max durability
                const maxDur = this.baseItem.maxDurability || 100;
                const repairPerUnit = Math.floor(maxDur * 0.25);
                const missingDur = maxDur - (this.baseItem.durability || 0);
                const unitsNeeded = Math.min(this.materialItem.count, Math.ceil(missingDur / Math.max(1, repairPerUnit)));
                
                resultStack.durability = Math.min(maxDur, (this.baseItem.durability || 0) + (unitsNeeded * repairPerUnit));
                calculatedCost += unitsNeeded;
                this._materialsUsed = unitsNeeded;
                validOperation = true;
            } else if (this.materialItem.id === (ITEM_IDS.ENCHANTED_BOOK || 403) && Array.isArray(this.materialItem.enchantments)) {
                // Enchanted Book application
                const baseEnchants = Array.isArray(this.baseItem.enchantments) ? [...this.baseItem.enchantments] : [];
                const bookEnchants = this.materialItem.enchantments;
                
                const mergedEnchants = this.combineEnchantments(baseEnchants, bookEnchants);
                resultStack.enchantments = mergedEnchants;
                calculatedCost += Math.max(1, bookEnchants.length * 2);
                validOperation = true;
            }
        }

        if (validOperation) {
            this.outputItem = resultStack;
            this.cost = Math.max(1, calculatedCost);
        } else {
            this.outputItem = null;
            this.cost = 0;
        }
    }

    combineEnchantments(listA, listB) {
        const map = new Map();
        listA.forEach(e => map.set(e.name, { ...e }));
        listB.forEach(e => {
            if (map.has(e.name)) {
                const existing = map.get(e.name);
                if (existing.level === e.level) {
                    existing.level = Math.min(5, existing.level + 1);
                } else {
                    existing.level = Math.max(existing.level, e.level);
                }
            } else {
                map.set(e.name, { ...e });
            }
        });
        return Array.from(map.values());
    }

    // ==========================================
    // 6. INTERACTION & CLICK HANDLERS
    // ==========================================

    handleAnvilSlotClick(e, type) {
        e.preventDefault();
        const isRightClick = e.button === 2;

        if (type === "output") {
            this.handleTakeOutput();
            return;
        }

        let slotItem = type === "base" ? this.baseItem : this.materialItem;

        if (!this.heldItem) {
            // Pick up from slot
            if (slotItem) {
                if (isRightClick && slotItem.count > 1) {
                    const take = Math.ceil(slotItem.count / 2);
                    this.heldItem = { ...slotItem, count: take };
                    slotItem.count -= take;
                } else {
                    this.heldItem = slotItem;
                    if (type === "base") this.baseItem = null;
                    else this.materialItem = null;
                }
            }
        } else {
            // Drop onto slot
            if (!slotItem) {
                if (isRightClick && this.heldItem.count > 1) {
                    const drop = { ...this.heldItem, count: 1 };
                    this.heldItem.count -= 1;
                    if (type === "base") this.baseItem = drop;
                    else this.materialItem = drop;
                } else {
                    if (type === "base") this.baseItem = this.heldItem;
                    else this.materialItem = this.heldItem;
                    this.heldItem = null;
                }
            } else if (slotItem.id === this.heldItem.id) {
                // Stack items
                const maxStack = slotItem.maxStack || 64;
                if (isRightClick) {
                    if (slotItem.count < maxStack) {
                        slotItem.count += 1;
                        this.heldItem.count -= 1;
                        if (this.heldItem.count <= 0) this.heldItem = null;
                    }
                } else {
                    const space = maxStack - slotItem.count;
                    const move = Math.min(space, this.heldItem.count);
                    slotItem.count += move;
                    this.heldItem.count -= move;
                    if (this.heldItem.count <= 0) this.heldItem = null;
                }
            } else {
                // Swap items
                const temp = slotItem;
                if (type === "base") this.baseItem = this.heldItem;
                else this.materialItem = this.heldItem;
                this.heldItem = temp;
            }
        }

        if (type === "base" && this.baseItem) {
            this.dom.renameInput.value = this.baseItem.customName || this.baseItem.name;
            this.customName = this.dom.renameInput.value;
        }

        this.calculateResult();
        this.renderAll();
    }

    handleTakeOutput() {
        if (!this.outputItem) return;

        const playerLvl = this.getPlayerLevel();
        if (playerLvl < this.cost) {
            // Not enough XP levels!
            this.playEffect("error");
            return;
        }

        // Deduct XP
        this.deductPlayerLevel(this.cost);

        // Put result on cursor or into inventory
        const result = { ...this.outputItem };
        if (!this.heldItem) {
            this.heldItem = result;
        } else {
            this.giveToPlayerInventory(result);
        }

        // Consume inputs
        this.baseItem = null;
        if (this.materialItem) {
            const used = this._materialsUsed || 1;
            if (this.materialItem.count > used) {
                this.materialItem.count -= used;
            } else {
                this.materialItem = null;
            }
        }
        this._materialsUsed = 0;

        this.playEffect("anvil");

        this.customName = "";
        this.dom.renameInput.value = "";
        this.calculateResult();
        this.renderAll();
    }

    handlePlayerSlotClick(e, slotIndex) {
        e.preventDefault();
        if (!this.inventory) return;

        const isRightClick = e.button === 2;
        const isShiftClick = e.shiftKey;
        const slotItem = this.inventory.getSlot(slotIndex);

        if (isShiftClick && slotItem) {
            // Quick shift-click into anvil slots
            if (!this.baseItem) {
                this.baseItem = slotItem;
                this.inventory.setSlot(slotIndex, null);
                this.dom.renameInput.value = this.baseItem.customName || this.baseItem.name;
                this.customName = this.dom.renameInput.value;
            } else if (!this.materialItem) {
                this.materialItem = slotItem;
                this.inventory.setSlot(slotIndex, null);
            }
            this.calculateResult();
            this.renderAll();
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
            } else if (slotItem.id === this.heldItem.id) {
                const maxStack = slotItem.maxStack || 64;
                if (isRightClick) {
                    if (slotItem.count < maxStack) {
                        slotItem.count += 1;
                        this.heldItem.count -= 1;
                        if (this.heldItem.count <= 0) this.heldItem = null;
                        this.inventory.setSlot(slotIndex, slotItem);
                    }
                } else {
                    const space = maxStack - slotItem.count;
                    const move = Math.min(space, this.heldItem.count);
                    slotItem.count += move;
                    this.heldItem.count -= move;
                    if (this.heldItem.count <= 0) this.heldItem = null;
                    this.inventory.setSlot(slotIndex, slotItem);
                }
            } else {
                const temp = slotItem;
                this.inventory.setSlot(slotIndex, this.heldItem);
                this.heldItem = temp;
            }
        }

        this.renderAll();
    }

    playEffect(type) {
        if (this.audio && typeof this.audio.play === "function") {
            if (type === "anvil") {
                this.audio.play("pop");
            } else {
                this.audio.play("click");
            }
        }
    }

    // ==========================================
    // 7. RENDERING
    // ==========================================

    renderAll() {
        this.renderSlots();
        this.renderPlayerSlots();
        this.renderCostAndXP();
        this.renderHeldCursor();
    }

    renderSlots() {
        this.renderSingleSlot(this.dom.baseSlot, this.baseItem);
        this.renderSingleSlot(this.dom.materialSlot, this.materialItem);
        this.renderSingleSlot(this.dom.outputSlot, this.outputItem);
    }

    renderSingleSlot(slotEl, item) {
        const img = slotEl.querySelector(".anvil-slot-img");
        const count = slotEl.querySelector(".anvil-slot-count");

        if (item && item.count > 0) {
            img.src = item.icon || getItemIconDataUri(item.id);
            img.style.display = "block";
            if (item.enchantments && item.enchantments.length > 0) {
                img.classList.add("anvil-enchant-glint");
            } else {
                img.classList.remove("anvil-enchant-glint");
            }
            count.textContent = item.count > 1 ? item.count : "";
        } else {
            img.src = "";
            img.style.display = "none";
            img.classList.remove("anvil-enchant-glint");
            count.textContent = "";
        }
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

    renderCostAndXP() {
        const playerLvl = this.getPlayerLevel();
        this.dom.playerXpVal.textContent = playerLvl;

        if (this.outputItem && this.cost > 0) {
            const canAfford = playerLvl >= this.cost;
            this.dom.costText.textContent = `Enchantment Cost: ${this.cost}`;
            this.dom.costText.className = `anvil-cost-text ${canAfford ? "anvil-cost-green" : "anvil-cost-red"}`;
        } else {
            this.dom.costText.textContent = "";
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
