with open('src/core/main.js', 'r') as f:
    code = f.read()

# Remove them from the top
code = code.replace("const anvilUI = new AnvilUI({ inventory, hud, audio, particles });\n", "")
code = code.replace("const enchantingUI = new EnchantingUI({ inventory, hud, audio, particles, world });\n", "")

# Add them after inventory
inv_str = """const inventory = new InventoryManager({ hud });
const anvilUI = new AnvilUI({ inventory, hud, audio, particles });
const enchantingUI = new EnchantingUI({ inventory, hud, audio, particles, world });"""
code = code.replace("const inventory = new InventoryManager({ hud });", inv_str)

with open('src/core/main.js', 'w') as f:
    f.write(code)
