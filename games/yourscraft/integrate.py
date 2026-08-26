import re

with open('src/core/main.js', 'r') as f:
    code = f.read()

# Add imports
imports = """import { DayNightCycle } from './environment.js';
import { getMiningTime } from './mining.js';
import { InventoryManager } from '../ui/inventory.js';
"""
code = code.replace("import { HUD } from '../ui/hud.js';", "import { HUD } from '../ui/hud.js';\n" + imports)

# Setup Environment
setup_env = """
// 6. Subsystems Init
const dayNightCycle = new DayNightCycle(scene, ambientLight, sunLight, fillLight);
"""
code = code.replace("// 6. Subsystems Init", setup_env)

# Setup Inventory
setup_inv = """
const hud = new HUD({ container: uiLayer });
const inventory = new InventoryManager({ hud });

// Unlock pointer when inventory opens
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
        if (inventory.isOpen()) {
            inventory.close();
            controls.lock();
        } else {
            inventory.openInventory();
            controls.unlock();
        }
    }
});
"""
code = code.replace("const hud = new HUD({ container: uiLayer });", setup_inv)

# Update animation loop
animate_update = """
    // Process chunk streaming and terrain generation
    world.update(camera.position.x, camera.position.z, 2);
    
    // Process environment
    dayNightCycle.update(delta);
"""
code = code.replace("world.update(camera.position.x, camera.position.z, 2); // 2 chunk radius for performance initially", animate_update)

# Update Raycaster block breaking logic to use mining time
raycaster_update = """
// 7. Raycaster Input
const raycaster = new THREE.Raycaster();
raycaster.far = 5; 
const center = new THREE.Vector2(0, 0);

let breakTimer = 0;
let breakingBlockPos = null;
let isBreaking = false;

function getMeshes() {
    const meshes = [];
    world.chunks.forEach(c => {
        if (c.userData && c.userData.mesh) meshes.push(c.userData.mesh);
    });
    return meshes;
}

document.addEventListener('mousedown', (event) => {
    if (!controls.isLocked || inventory.isOpen()) return;
    
    if (event.button === 0) { // Left click: Start breaking
        isBreaking = true;
        breakTimer = 0;
    } else if (event.button === 2) { // Right click: Place
        raycaster.setFromCamera(center, camera);
        const intersects = raycaster.intersectObjects(getMeshes(), false);
        if (intersects.length > 0) {
            const hit = intersects[0];
            const placePt = hit.point.clone().addScaledVector(hit.face.normal, 0.01);
            const px = Math.floor(placePt.x);
            const py = Math.floor(placePt.y);
            const pz = Math.floor(placePt.z);
            if (world.getBlock(px, py, pz) === BLOCKS.AIR) {
                world.setBlock(px, py, pz, activeBlock, true);
            }
        }
    }
});

document.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
        isBreaking = false;
        breakTimer = 0;
        breakingBlockPos = null;
    }
});

function handleMining(delta) {
    if (!isBreaking || !controls.isLocked) return;

    raycaster.setFromCamera(center, camera);
    const intersects = raycaster.intersectObjects(getMeshes(), false);
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        const breakPt = hit.point.clone().addScaledVector(hit.face.normal, -0.01);
        const bx = Math.floor(breakPt.x);
        const by = Math.floor(breakPt.y);
        const bz = Math.floor(breakPt.z);
        
        if (world.getBlock(bx, by, bz) !== BLOCKS.AIR && world.getBlock(bx, by, bz) !== BLOCKS.BEDROCK) {
            if (!breakingBlockPos || breakingBlockPos.x !== bx || breakingBlockPos.y !== by || breakingBlockPos.z !== bz) {
                breakingBlockPos = { x: bx, y: by, z: bz };
                breakTimer = 0;
            }
            
            breakTimer += delta;
            const requiredTime = getMiningTime(world.getBlock(bx, by, bz), activeBlock); // Assuming activeBlock is toolId for now
            if (breakTimer >= requiredTime) {
                world.setBlock(bx, by, bz, BLOCKS.AIR, true);
                isBreaking = false;
                breakTimer = 0;
                breakingBlockPos = null;
            }
        }
    } else {
        breakTimer = 0;
        breakingBlockPos = null;
    }
}
"""

# Replace the old document.addEventListener('mousedown'...) block with the new raycaster_update
# We need to remove the old mousedown listener.
old_raycaster = """// 7. Raycaster Input
const raycaster = new THREE.Raycaster();
raycaster.far = 5; 
const center = new THREE.Vector2(0, 0);

// For determining intersecting chunk meshes efficiently, we could put them in an array
function getMeshes() {
    const meshes = [];
    world.chunks.forEach(c => {
        if (c.userData && c.userData.mesh) meshes.push(c.userData.mesh);
    });
    return meshes;
}

document.addEventListener('mousedown', (event) => {
    if (!controls.isLocked) return;
    raycaster.setFromCamera(center, camera);
    const intersects = raycaster.intersectObjects(getMeshes(), false);
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        const breakPt = hit.point.clone().addScaledVector(hit.face.normal, -0.01);
        const bx = Math.floor(breakPt.x);
        const by = Math.floor(breakPt.y);
        const bz = Math.floor(breakPt.z);

        if (event.button === 0) { // Left click: Break
            if (world.getBlock(bx, by, bz) !== BLOCKS.AIR && world.getBlock(bx, by, bz) !== BLOCKS.BEDROCK) {
                world.setBlock(bx, by, bz, BLOCKS.AIR, true);
            }
        } else if (event.button === 2) { // Right click: Place
            const placePt = hit.point.clone().addScaledVector(hit.face.normal, 0.01);
            const px = Math.floor(placePt.x);
            const py = Math.floor(placePt.y);
            const pz = Math.floor(placePt.z);
            if (world.getBlock(px, py, pz) === BLOCKS.AIR) {
                world.setBlock(px, py, pz, activeBlock, true);
            }
        }
    }
});"""
code = code.replace(old_raycaster, raycaster_update)

# Add handleMining to animate loop
animate_mining = """
        player.update(delta, world, moveState);
        camera.position.set(player.position.x, player.position.y + player.eyeHeight, player.position.z);
        handleMining(delta);
"""
code = code.replace("        player.update(delta, world, moveState);\n        camera.position.set(player.position.x, player.position.y + player.eyeHeight, player.position.z);", animate_mining)

with open('src/core/main.js', 'w') as f:
    f.write(code)

print("Integration complete")
