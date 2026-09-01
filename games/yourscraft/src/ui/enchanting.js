

import { BLOCKS } from '../core/chunk.js';
import { getItemDef, createItemStack, ITEM_TYPES } from './inventory.js';
import { getItemIconDataUri } from './hud.js';
import { ITEM_IDS } from '../core/crafting.js';

// ==========================================
// 1. MINECRAFT 1.5 ENCHANTMENT REGISTRY
// ==========================================

export const ENCHANTMENTS = Object.freeze({
    // Weapon Enchantments
    SHARPNESS: { id: "sharpness", name: "Sharpness", maxLevel: 5, type: "weapon", weight: 10, desc: "+1.25 damage per level" },
    SMITE: { id: "smite", name: "Smite", maxLevel: 5, type: "weapon", weight: 5, desc: "+2.5 damage to undead" },
    KNOCKBACK: { id: "knockback", name: "Knockback", maxLevel: 2, type: "weapon", weight: 5, desc: "Increases knockback" },
    FIRE_ASPECT: { id: "fire_aspect", name: "Fire Aspect", maxLevel: 2, type: "weapon", weight: 2, desc: "Sets target on fire" },
    LOOTING: { id: "looting", name: "Looting", maxLevel: 3, type: "weapon", weight: 2, desc: "Increases mob drops" },

    // Tool Enchantments
    EFFICIENCY: { id: "efficiency", name: "Efficiency", maxLevel: 5, type: "tool", weight: 10, desc: "Faster mining speed" },
    UNBREAKING: { id: "unbreaking", name: "Unbreaking", maxLevel: 3, type: "all", weight: 5, desc: "Increases durability" },
    FORTUNE: { id: "fortune", name: "Fortune", maxLevel: 3, type: "tool", weight: 2, desc: "Multiplies block drops" },
    SILK_TOUCH: { id: "silk_touch", name: "Silk Touch", maxLevel: 1, type: "tool", weight: 1, desc: "Drops original block" },

    // Armor Enchantments
    PROTECTION: { id: "protection", name: "Protection", maxLevel: 4, type: "armor", weight: 10, desc: "Reduces all damage" },
    FIRE_PROTECTION: { id: "fire_protection", name: "Fire Protection", maxLevel: 4, type: "armor", weight: 5, desc: "Reduces fire damage" },
    FEATHER_FALLING: { id: "feather_falling", name: "Feather Falling", maxLevel: 4, type: "boots", weight: 5, desc: "Reduces fall damage" },
    BLAST_PROTECTION: { id: "blast_protection", name: "Blast Protection", maxLevel: 4, type: "armor", weight: 2, desc: "Reduces explosion damage" },
    RESPIRATION: { id: "respiration", name: "Respiration", maxLevel: 3, type: "helmet", weight: 2, desc: "Extends underwater breathing" },

    // Bow Enchantments
    POWER: { id: "power", name: "Power", maxLevel: 5, type: "bow", weight: 10, desc: "Increases arrow damage" },
    PUNCH: { id: "punch", name: "Punch", maxLevel: 2, type: "bow", weight: 2, desc: "Increases arrow knockback" },
    FLAME: { id: "flame", name: "Flame", maxLevel: 1, type: "bow", weight: 2, desc: "Arrows set targets on fire" },
    INFINITY: { id: "infinity", name: "Infinity", maxLevel: 1, type: "bow", weight: 1, desc: "Shooting consumes no arrows" }
});

const SGA_RUNES = [
    "ᑑᔑ∷ ᒷꖎᒷᓵℸ ̣ ∷ᔑ",
    "ᚷ ᛞ ᚱ ᚹ ᛗ ᛉ",
    "᛭ ᚠ ᚢ ᚦ ᚬ ᚱ ᚴ",
    "ᓵꖎᔑᓭ⍑ ᒲ╎⊣⍑ℸ ̣",
    "ᒷᒲᒷ∷ᔑꖎ↸ ⎓╎∷ᒷ",
    "ᓭ!¡╎∷╎ℸ ̣ ʖ𝙹⚍リ↸",
    "ᒷℸ ̣ ᒷ∷リᔑꖎ ꖎ╎⊣⍑ℸ ̣",
    "ᔑᑑ⚍ᔑ ᓭℸ ̣ ∷╎ꖌᒷ"
];

const ROMAN_NUMERALS = ["", "I", "II", "III", "IV", "V"];

// ==========================================
// 2. CSS STYLES
// ==========================================

const ENCHANTING_CSS = `
#minecraft-enchanting-modal {
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

#enchanting-panel {
    background: #c6c6c6;
    border: 4px solid #ffffff;
    border-right-color: #555555;
    border-bottom-color: #555555;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), inset 2px 2px 0 #dbdbdb, inset -2px -2px 0 #8b8b8b;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 400px;
}

.enchant-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #3f3f3f;
    font-size: 15px;
    font-weight: bold;
    margin-bottom: 2px;
}

.enchant-close-btn {
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

.enchant-close-btn:hover {
    background: #ff5555;
    color: #fff;
}

.enchant-top-area {
    display: flex;
    background: #b5b5b5;
    padding: 12px;
    border: 2px solid #373737;
    border-bottom-color: #ffffff;
    border-right-color: #ffffff;
    gap: 14px;
    align-items: center;
}

.enchant-book-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 70px;
}

.enchant-book-icon {
    width: 48px;
    height: 48px;
    background: #4a2869;
    border: 2px solid #373737;
    border-bottom-color: #ffffff;
    border-right-color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    border-radius: 4px;
    box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
}

.enchant-slots-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.enchant-slot {
    position: relative;
    width: 40px;
    height: 40px;
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

.enchant-slot:hover {
    background: #a0a0a0;
    outline: 1px solid #ffffff;
}

.enchant-slot-img {
    width: 28px;
    height: 28px;
    image-rendering: pixelated;
    pointer-events: none;
    user-select: none;
}

.enchant-slot-count {
    position: absolute;
    bottom: 1px;
    right: 2px;
    color: #ffffff;
    font-size: 11px;
    font-weight: bold;
    text-shadow: 1px 1px 0 #000000;
    pointer-events: none;
}

.enchant-offers-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
}

.enchant-offer-btn {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #735987;
    border: 2px solid #ffffff;
    border-right-color: #372545;
    border-bottom-color: #372545;
    padding: 6px 10px;
    cursor: pointer;
    transition: background 0.1s ease;
    min-height: 32px;
    box-sizing: border-box;
}

.enchant-offer-btn:hover:not(.disabled) {
    background: #8e6fa6;
    outline: 1px solid #ffffff;
}

.enchant-offer-btn.disabled {
    background: #473e4f;
    border-color: #635b6b;
    border-right-color: #2b2530;
    border-bottom-color: #2b2530;
    opacity: 0.7;
    cursor: not-allowed;
}

.enchant-offer-runes {
    color: #ffd700;
    font-size: 12px;
    letter-spacing: 1px;
    text-shadow: 1px 1px 0 #332200;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    max-width: 170px;
}

.enchant-offer-btn.disabled .enchant-offer-runes {
    color: #8c8294;
}

.enchant-offer-level {
    color: #55ff55;
    font-size: 14px;
    font-weight: bold;
    text-shadow: 1px 1px 0 #003300;
    background: rgba(0, 0, 0, 0.4);
    padding: 2px 6px;
    border-radius: 2px;
}

.enchant-offer-btn.disabled .enchant-offer-level {
    color: #ff5555;
    text-shadow: 1px 1px 0 #330000;
}

.enchant-offer-hint {
    position: absolute;
    bottom: -24px;
    left: 10px;
    background: rgba(16, 12, 28, 0.95);
    color: #ffaa00;
    border: 1px solid #7744aa;
    padding: 2px 6px;
    font-size: 11px;
    white-space: nowrap;
    z-index: 100;
    display: none;
    pointer-events: none;
    box-shadow: 0 4px 8px rgba(0,0,0,0.6);
}

.enchant-offer-btn:hover .enchant-offer-hint {
    display: block;
}

.enchant-xp-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 4px;
    color: #55ff55;
    font-size: 12px;
    font-weight: bold;
    text-shadow: 1px 1px 0 #000000;
}

.enchant-section-label {
    color: #3f3f3f;
    font-size: 12px;
    font-weight: bold;
    margin-top: 2px;
    margin-bottom: -4px;
}

.enchant-inv-grid {
    display: grid;
    grid-template-columns: repeat(9, 38px);
    gap: 2px;
}

.enchant-hotbar-grid {
    display: grid;
    grid-template-columns: repeat(9, 38px);
    gap: 2px;
    margin-top: 2px;
}

#enchant-cursor-item {
    position: fixed;
    pointer-events: none;
    z-index: 1200;
    display: none;
    transform: translate(-50%, -50%);
}

#enchant-cursor-img {
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
}

#enchant-cursor-count {
    position: absolute;
    bottom: -2px;
    right: -2px;
    color: #ffffff;
    font-size: 12px;
    font-weight: bold;
    text-shadow: 1px 1px 0 #000000;
}

.enchant-glow {
    filter: drop-shadow(0 0 5px #ff55ff);
}
`;

// ==========================================
// 3. ENCHANTING UI CLASS
// ==========================================

export class EnchantingUI {
    
    constructor(options = {}) {
        this.inventory = options.inventory || null;
        this.hud = options.hud || (options.inventory ? options.inventory.hud : null);
        this.audio = options.audio || null;
        this.particles = options.particles || null;
        this.world = options.world || null;

        // Target item stack in the enchantment table slot
        this.targetItem = null;
        this.offers = [];

        // Cursor held item
        this.heldItem = null;

        this._isOpen = false;
        this.dom = {};

        this.initDOM();
        this.attachEventListeners();
    }

    initDOM() {
        if (typeof document === "undefined") return;

        if (!document.getElementById("minecraft-enchanting-styles")) {
            const style = document.createElement("style");
            style.id = "minecraft-enchanting-styles";
            style.textContent = ENCHANTING_CSS;
            document.head.appendChild(style);
        }

        const modal = document.createElement("div");
        modal.id = "minecraft-enchanting-modal";

        const panel = document.createElement("div");
        panel.id = "enchanting-panel";

        // 1. Header
        const header = document.createElement("div");
        header.className = "enchant-header";
        const title = document.createElement("span");
        title.textContent = "Enchant";
        const closeBtn = document.createElement("button");
        closeBtn.className = "enchant-close-btn";
        closeBtn.textContent = "✕";
        closeBtn.onclick = () => this.close();
        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // 2. Top Area: Book + Target Slot + 3 Offer Buttons
        const topArea = document.createElement("div");
        topArea.className = "enchant-top-area";

        // Book aesthetic
        const bookDisplay = document.createElement("div");
        bookDisplay.className = "enchant-book-display";
        const bookIcon = document.createElement("div");
        bookIcon.className = "enchant-book-icon";
        bookIcon.textContent = "📖";
        const targetSlot = document.createElement("div");
        targetSlot.className = "enchant-slot";
        targetSlot.id = "enchant-target-slot";
        targetSlot.innerHTML = `<img class="enchant-slot-img" style="display:none;"><span class="enchant-slot-count"></span>`;
        targetSlot.onmousedown = (e) => this.handleTargetSlotClick(e);

        bookDisplay.appendChild(bookIcon);
        bookDisplay.appendChild(targetSlot);
        topArea.appendChild(bookDisplay);

        // 3 Offer Buttons
        const offersList = document.createElement("div");
        offersList.className = "enchant-offers-list";
        const offerBtns = [];

        for (let i = 0; i < 3; i++) {
            const btn = document.createElement("div");
            btn.className = "enchant-offer-btn disabled";
            btn.dataset.offerIndex = i;

            const runes = document.createElement("span");
            runes.className = "enchant-offer-runes";
            runes.textContent = "...";

            const level = document.createElement("span");
            level.className = "enchant-offer-level";
            level.textContent = "-";

            const hint = document.createElement("div");
            hint.className = "enchant-offer-hint";
            hint.textContent = "";

            btn.appendChild(runes);
            btn.appendChild(level);
            btn.appendChild(hint);

            btn.onclick = () => this.handleEnchantClick(i);
            offersList.appendChild(btn);
            offerBtns.push(btn);
        }

        topArea.appendChild(offersList);
        panel.appendChild(topArea);

        // 3. XP Indicator Bar
        const xpBar = document.createElement("div");
        xpBar.className = "enchant-xp-bar";
        xpBar.innerHTML = `<span>Enchantment Levels</span> <span>Your Level: <span id="enchant-xp-val">0</span></span>`;
        panel.appendChild(xpBar);

        // 4. Player Inventory Grid (27 slots)
        const mainLabel = document.createElement("div");
        mainLabel.className = "enchant-section-label";
        mainLabel.textContent = "Inventory";
        panel.appendChild(mainLabel);

        const mainGrid = document.createElement("div");
        mainGrid.className = "enchant-inv-grid";
        const mainSlotEls = [];
        for (let i = 9; i < 36; i++) {
            const slotEl = this.createPlayerSlotElement(i);
            mainGrid.appendChild(slotEl);
            mainSlotEls.push(slotEl);
        }
        panel.appendChild(mainGrid);

        // 5. Player Hotbar Grid (9 slots)
        const hotbarGrid = document.createElement("div");
        hotbarGrid.className = "enchant-hotbar-grid";
        const hotbarSlotEls = [];
        for (let i = 0; i < 9; i++) {
            const slotEl = this.createPlayerSlotElement(i);
            hotbarGrid.appendChild(slotEl);
            hotbarSlotEls.push(slotEl);
        }
        panel.appendChild(hotbarGrid);

        modal.appendChild(panel);

        // 6. Floating Cursor Item
        const cursorItem = document.createElement("div");
        cursorItem.id = "enchant-cursor-item";
        cursorItem.innerHTML = `<img id="enchant-cursor-img"><span id="enchant-cursor-count"></span>`;
        document.body.appendChild(cursorItem);

        document.body.appendChild(modal);

        this.dom = {
            modal,
            panel,
            targetSlot,
            offerBtns,
            playerXpVal: xpBar.querySelector("#enchant-xp-val"),
            mainSlotEls,
            hotbarSlotEls,
            cursorItem,
            cursorImg: cursorItem.querySelector("#enchant-cursor-img"),
            cursorCount: cursorItem.querySelector("#enchant-cursor-count")
        };
    }

    createPlayerSlotElement(index) {
        const slot = document.createElement("div");
        slot.className = "enchant-slot";
        slot.dataset.index = index;
        slot.innerHTML = `<img class="enchant-slot-img" style="display:none;"><span class="enchant-slot-count"></span>`;
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
        this.targetItem = null;
        this.offers = [];
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

        // Return target item to player inventory
        if (this.targetItem) {
            this.giveToPlayerInventory(this.targetItem);
            this.targetItem = null;
        }
        if (this.heldItem) {
            this.giveToPlayerInventory(this.heldItem);
            this.heldItem = null;
        }

        this.offers = [];
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
    // 5. ENCHANTMENT OFFERS GENERATION
    // ==========================================

    generateOffers() {
        if (!this.targetItem) {
            this.offers = [];
            return;
        }

        const itemType = this.getItemCategory(this.targetItem.id);
        if (!itemType) {
            this.offers = [];
            return;
        }

        // Generate 3 tier offers: Tier 1 (1-8), Tier 2 (9-18), Tier 3 (19-30)
        const tiers = [
            { minLvl: 1, maxLvl: 8 },
            { minLvl: 9, maxLvl: 18 },
            { minLvl: 19, maxLvl: 30 }
        ];

        this.offers = tiers.map((tier, index) => {
            const levelCost = Math.floor(Math.random() * (tier.maxLvl - tier.minLvl + 1)) + tier.minLvl;
            const enchantments = this.pickEnchantments(itemType, levelCost);
            const primary = enchantments[0] || { name: "Unbreaking", level: 1 };
            const hintText = `${primary.name} ${ROMAN_NUMERALS[primary.level] || primary.level} ... ?`;
            const runeText = SGA_RUNES[(index * 2 + Math.floor(Math.random() * 2)) % SGA_RUNES.length];

            return {
                levelCost,
                enchantments,
                hintText,
                runeText
            };
        });
    }

    getItemCategory(id) {
        const num = Number(id);
        // Swords
        if ([ITEM_IDS.WOODEN_SWORD, ITEM_IDS.STONE_SWORD, ITEM_IDS.IRON_SWORD, ITEM_IDS.DIAMOND_SWORD, ITEM_IDS.GOLDEN_SWORD].includes(num)) return "weapon";
        // Tools
        if ([
            ITEM_IDS.WOODEN_PICKAXE, ITEM_IDS.STONE_PICKAXE, ITEM_IDS.IRON_PICKAXE, ITEM_IDS.DIAMOND_PICKAXE, ITEM_IDS.GOLDEN_PICKAXE,
            ITEM_IDS.WOODEN_AXE, ITEM_IDS.STONE_AXE, ITEM_IDS.IRON_AXE, ITEM_IDS.DIAMOND_AXE, ITEM_IDS.GOLDEN_AXE,
            ITEM_IDS.WOODEN_SHOVEL, ITEM_IDS.STONE_SHOVEL, ITEM_IDS.IRON_SHOVEL, ITEM_IDS.DIAMOND_SHOVEL, ITEM_IDS.GOLDEN_SHOVEL
        ].includes(num)) return "tool";
        // Armor
        if ([
            ITEM_IDS.IRON_HELMET || 306, ITEM_IDS.DIAMOND_HELMET || 310, ITEM_IDS.GOLDEN_HELMET || 314,
            ITEM_IDS.IRON_CHESTPLATE || 307, ITEM_IDS.DIAMOND_CHESTPLATE || 311, ITEM_IDS.GOLDEN_CHESTPLATE || 315,
            ITEM_IDS.IRON_LEGGINGS || 308, ITEM_IDS.DIAMOND_LEGGINGS || 312, ITEM_IDS.GOLDEN_LEGGINGS || 316,
            ITEM_IDS.IRON_BOOTS || 309, ITEM_IDS.DIAMOND_BOOTS || 313, ITEM_IDS.GOLDEN_BOOTS || 317
        ].includes(num)) return "armor";
        // Bow
        if (num === (ITEM_IDS.BOW || 261)) return "bow";
        // Book
        if (num === (ITEM_IDS.BOOK || 340)) return "book";

        return null;
    }

    pickEnchantments(category, levelCost) {
        const pool = [];
        for (const ench of Object.values(ENCHANTMENTS)) {
            if (category === "book" || ench.type === "all" || ench.type === category) {
                pool.push(ench);
            }
        }

        if (pool.length === 0) pool.push(ENCHANTMENTS.UNBREAKING);

        // Pick primary enchantment
        const primaryDef = pool[Math.floor(Math.random() * pool.length)];
        let powerLevel = 1;
        if (levelCost >= 25 && primaryDef.maxLevel >= 4) powerLevel = Math.min(primaryDef.maxLevel, 4 + (Math.random() > 0.6 ? 1 : 0));
        else if (levelCost >= 16 && primaryDef.maxLevel >= 3) powerLevel = Math.min(primaryDef.maxLevel, 3);
        else if (levelCost >= 8 && primaryDef.maxLevel >= 2) powerLevel = Math.min(primaryDef.maxLevel, 2);

        const results = [{ name: primaryDef.name, level: powerLevel, desc: primaryDef.desc }];

        // High levels can add a secondary enchantment
        if (levelCost >= 20 && Math.random() > 0.4 && pool.length > 1) {
            const secondaryPool = pool.filter(e => e.name !== primaryDef.name);
            if (secondaryPool.length > 0) {
                const secDef = secondaryPool[Math.floor(Math.random() * secondaryPool.length)];
                const secLvl = Math.min(secDef.maxLevel, Math.max(1, Math.floor(powerLevel * 0.8)));
                results.push({ name: secDef.name, level: secLvl, desc: secDef.desc });
            }
        }

        return results;
    }

    // ==========================================
    // 6. INTERACTION & ENCHANTING HANDLERS
    // ==========================================

    handleTargetSlotClick(e) {
        e.preventDefault();
        const isRightClick = e.button === 2;

        if (!this.heldItem) {
            if (this.targetItem) {
                if (isRightClick && this.targetItem.count > 1) {
                    const take = Math.ceil(this.targetItem.count / 2);
                    this.heldItem = { ...this.targetItem, count: take };
                    this.targetItem.count -= take;
                } else {
                    this.heldItem = this.targetItem;
                    this.targetItem = null;
                }
            }
        } else {
            if (!this.targetItem) {
                if (isRightClick && this.heldItem.count > 1) {
                    this.targetItem = { ...this.heldItem, count: 1 };
                    this.heldItem.count -= 1;
                } else {
                    this.targetItem = this.heldItem;
                    this.heldItem = null;
                }
            } else if (this.targetItem.id === this.heldItem.id) {
                const maxStack = this.targetItem.maxStack || 64;
                const space = maxStack - this.targetItem.count;
                const move = Math.min(space, this.heldItem.count);
                this.targetItem.count += move;
                this.heldItem.count -= move;
                if (this.heldItem.count <= 0) this.heldItem = null;
            } else {
                const temp = this.targetItem;
                this.targetItem = this.heldItem;
                this.heldItem = temp;
            }
        }

        this.generateOffers();
        this.renderAll();
    }

    handleEnchantClick(offerIndex) {
        if (!this.targetItem || !this.offers[offerIndex]) return;

        const offer = this.offers[offerIndex];
        const playerLvl = this.getPlayerLevel();

        if (playerLvl < offer.levelCost) {
            // Can't afford
            this.playEffect("error");
            return;
        }

        // Deduct XP levels
        this.deductPlayerLevel(offer.levelCost);

        // Apply Enchantments
        if (this.targetItem.id === (ITEM_IDS.BOOK || 340)) {
            // Book converts into Enchanted Book
            this.targetItem.id = ITEM_IDS.ENCHANTED_BOOK || 403;
            this.targetItem.name = "Enchanted Book";
            this.targetItem.maxStack = 1;
        }

        const existing = Array.isArray(this.targetItem.enchantments) ? this.targetItem.enchantments : [];
        const merged = [...existing];

        offer.enchantments.forEach(newEnch => {
            const found = merged.find(e => e.name === newEnch.name);
            if (found) {
                found.level = Math.max(found.level, newEnch.level);
            } else {
                merged.push(newEnch);
            }
        });

        this.targetItem.enchantments = merged;
        this.playEffect("enchant");

        // Re-roll offers or clear
        this.generateOffers();
        this.renderAll();
    }

    handlePlayerSlotClick(e, slotIndex) {
        e.preventDefault();
        if (!this.inventory) return;

        const isRightClick = e.button === 2;
        const isShiftClick = e.shiftKey;
        const slotItem = this.inventory.getSlot(slotIndex);

        if (isShiftClick && slotItem) {
            if (!this.targetItem) {
                this.targetItem = slotItem;
                this.inventory.setSlot(slotIndex, null);
                this.generateOffers();
                this.renderAll();
                return;
            }
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
            if (type === "enchant") {
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
        this.renderTargetSlot();
        this.renderOffers();
        this.renderPlayerSlots();
        this.renderXP();
        this.renderHeldCursor();
    }

    renderTargetSlot() {
        const img = this.dom.targetSlot.querySelector(".enchant-slot-img");
        const count = this.dom.targetSlot.querySelector(".enchant-slot-count");

        if (this.targetItem && this.targetItem.count > 0) {
            img.src = this.targetItem.icon || getItemIconDataUri(this.targetItem.id);
            img.style.display = "block";
            if (this.targetItem.enchantments && this.targetItem.enchantments.length > 0) {
                img.classList.add("enchant-glow");
            } else {
                img.classList.remove("enchant-glow");
            }
            count.textContent = this.targetItem.count > 1 ? this.targetItem.count : "";
        } else {
            img.src = "";
            img.style.display = "none";
            img.classList.remove("enchant-glow");
            count.textContent = "";
        }
    }

    renderOffers() {
        const playerLvl = this.getPlayerLevel();

        for (let i = 0; i < 3; i++) {
            const btn = this.dom.offerBtns[i];
            const offer = this.offers[i];

            if (offer && this.targetItem) {
                const canAfford = playerLvl >= offer.levelCost;
                btn.className = `enchant-offer-btn ${canAfford ? "" : "disabled"}`;
                btn.querySelector(".enchant-offer-runes").textContent = offer.runeText;
                btn.querySelector(".enchant-offer-level").textContent = offer.levelCost;
                btn.querySelector(".enchant-offer-hint").textContent = offer.hintText;
            } else {
                btn.className = "enchant-offer-btn disabled";
                btn.querySelector(".enchant-offer-runes").textContent = "...";
                btn.querySelector(".enchant-offer-level").textContent = "-";
                btn.querySelector(".enchant-offer-hint").textContent = "";
            }
        }
    }

    renderPlayerSlots() {
        if (!this.inventory) return;

        for (let i = 0; i < 36; i++) {
            const item = this.inventory.getSlot(i);
            const slotEl = i < 9 ? this.dom.hotbarSlotEls[i] : this.dom.mainSlotEls[i - 9];
            if (slotEl) {
                const img = slotEl.querySelector(".enchant-slot-img");
                const count = slotEl.querySelector(".enchant-slot-count");
                if (item && item.count > 0) {
                    img.src = item.icon || getItemIconDataUri(item.id);
                    img.style.display = "block";
                    if (item.enchantments && item.enchantments.length > 0) {
                        img.classList.add("enchant-glow");
                    } else {
                        img.classList.remove("enchant-glow");
                    }
                    count.textContent = item.count > 1 ? item.count : "";
                } else {
                    img.src = "";
                    img.style.display = "none";
                    img.classList.remove("enchant-glow");
                    count.textContent = "";
                }
            }
        }
    }

    renderXP() {
        const playerLvl = this.getPlayerLevel();
        this.dom.playerXpVal.textContent = playerLvl;
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
