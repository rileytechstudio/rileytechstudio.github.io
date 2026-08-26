import re

with open('src/core/main.js', 'r') as f:
    code = f.read()

# Add imports
if "AnvilUI" not in code:
    imports = """import { AnvilUI } from '../ui/anvil.js';
import { EnchantingUI } from '../ui/enchanting.js';
"""
    code = code.replace("import { InventoryManager } from '../ui/inventory.js';", "import { InventoryManager } from '../ui/inventory.js';\n" + imports)

# Init UI
if "anvilUI =" not in code:
    init_str = """const scoreboard = new ScoreboardManager();
const hud = new HUD({ container: uiLayer, scoreboard });
const anvilUI = new AnvilUI({ inventory, hud, audio, particles });
const enchantingUI = new EnchantingUI({ inventory, hud, audio, particles, world });
"""
    code = code.replace("const scoreboard = new ScoreboardManager();\nconst hud = new HUD({ container: uiLayer, scoreboard });", init_str)

# Update right click mousedown
if "BLOCKS.ANVIL" not in code:
    right_click = """            if (clickedBlock === BLOCKS.CRAFTING_TABLE) {
                inventory.openCraftingTable();
                controls.unlock();
                return;
            } else if (clickedBlock === BLOCKS.ANVIL) {
                anvilUI.open();
                controls.unlock();
                return;
            } else if (clickedBlock === BLOCKS.ENCHANTING_TABLE) {
                enchantingUI.open();
                controls.unlock();
                return;
            }"""
    code = code.replace("""            if (clickedBlock === BLOCKS.CRAFTING_TABLE) {
                inventory.openCraftingTable();
                controls.unlock();
                return;
            }""", right_click)

# Update KeyE / Escape
if "anvilUI.isOpen()" not in code:
    escape = """    if (e.code === 'KeyE' || e.code === 'Escape') {
        if (anvilUI.isOpen()) {
            anvilUI.close();
            controls.lock();
            return;
        }
        if (enchantingUI.isOpen()) {
            enchantingUI.close();
            controls.lock();
            return;
        }"""
    code = code.replace("    if (e.code === 'KeyE' || e.code === 'Escape') {", escape)

with open('src/core/main.js', 'w') as f:
    f.write(code)

print("Phase 6 UI integration complete")
