import re

with open('src/core/main.js', 'r') as f:
    code = f.read()

# Make menus clickable
code = code.replace("uiLayer.appendChild(mainMenu.element);", "mainMenu.element.style.pointerEvents = 'auto';\nuiLayer.appendChild(mainMenu.element);")
code = code.replace("uiLayer.appendChild(pauseMenu.element);", "pauseMenu.element.style.pointerEvents = 'auto';\nuiLayer.appendChild(pauseMenu.element);")

# Hide HUD initially
init_hud = """window.hud = hud;
document.getElementById('minecraft-hud').style.display = 'none';
"""
code = code.replace("window.hud = hud;\n", init_hud)

# Toggle HUD on lock/unlock
lock_logic = """    if (isFirstLock) {
        mainMenu.element.style.display = 'none';
        isFirstLock = false;
    }
    pauseMenu.element.style.display = 'none';
    document.getElementById('minecraft-hud').style.display = 'block';"""

unlock_logic = """    if (!isFirstLock && !inventory.isOpen() && !(anvilUI && anvilUI.isOpen()) && !(enchantingUI && enchantingUI.isOpen()) && !(furnaceUI && furnaceUI.isOpen())) {
        pauseMenu.element.style.display = 'flex';
    }
    document.getElementById('minecraft-hud').style.display = 'none';"""

code = code.replace("""    if (isFirstLock) {
        mainMenu.element.style.display = 'none';
        isFirstLock = false;
    }
    pauseMenu.element.style.display = 'none';""", lock_logic)

code = code.replace("""    if (!isFirstLock && !inventory.isOpen() && !(anvilUI && anvilUI.isOpen()) && !(enchantingUI && enchantingUI.isOpen()) && !(furnaceUI && furnaceUI.isOpen())) {
        pauseMenu.element.style.display = 'flex';
    }""", unlock_logic)

with open('src/core/main.js', 'w') as f:
    f.write(code)

