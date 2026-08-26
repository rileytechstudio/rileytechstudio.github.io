import re

with open('src/core/main.js', 'r') as f:
    code = f.read()

# Add imports
imports = """import { MainMenu } from '../ui/mainMenu.js';
import { PauseMenu } from '../ui/pauseMenu.js';
import { BlockBreakingSystem } from './breaking.js';
"""
code = imports + code

# Replace UI overlay logic
old_ui_logic = """const instructions = document.createElement('div');
instructions.style.position = 'absolute';
instructions.style.top = '50%';
instructions.style.width = '100%';
instructions.style.textAlign = 'center';
instructions.style.color = 'white';
instructions.style.fontFamily = 'sans-serif';
instructions.style.fontSize = '24px';
instructions.innerHTML = 'Click to Play<br>(W, A, S, D to move, Space to jump, Shift to sneak)<br>Left Click to Break, Right Click to Place';
uiLayer.appendChild(instructions);

document.addEventListener('click', () => {
    controls.lock();
});

controls.addEventListener('lock', () => {
    instructions.style.display = 'none';
});

controls.addEventListener('unlock', () => {
    instructions.style.display = 'block';
});"""

new_ui_logic = """const mainMenu = new MainMenu(
    () => { controls.lock(); },
    () => {},
    () => {}
);
uiLayer.appendChild(mainMenu.element);

const pauseMenu = new PauseMenu(
    () => { controls.lock(); },
    () => {},
    () => {},
    () => {},
    () => { location.reload(); }
);
pauseMenu.element.style.display = 'none';
uiLayer.appendChild(pauseMenu.element);

let isFirstLock = true;
controls.addEventListener('lock', () => {
    if (isFirstLock) {
        mainMenu.element.style.display = 'none';
        isFirstLock = false;
    }
    pauseMenu.element.style.display = 'none';
});

controls.addEventListener('unlock', () => {
    // Only show pause menu if we are already playing and no other UI is open
    if (!isFirstLock && !inventory.isOpen() && !(anvilUI && anvilUI.isOpen()) && !(enchantingUI && enchantingUI.isOpen()) && !(furnaceUI && furnaceUI.isOpen())) {
        pauseMenu.element.style.display = 'flex';
    }
});"""

code = code.replace(old_ui_logic, new_ui_logic)

with open('src/core/main.js', 'w') as f:
    f.write(code)

