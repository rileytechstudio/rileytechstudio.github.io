import re

with open('src/core/main.js', 'r') as f:
    code = f.read()

# Initialize BlockBreakingSystem
init_breaking = """const blockBreaking = new BlockBreakingSystem();
let breakingDecal = null;
"""
code = code.replace("const raycaster = new THREE.Raycaster();", init_breaking + "const raycaster = new THREE.Raycaster();")

# Update animate loop to tick block breaking
animate_tick = """
    // Tick block breaking
    if (blockBreaking.isBreaking && controls.isLocked) {
        raycaster.setFromCamera(center, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const target = intersects.find(i => i.object.userData && i.object.userData.chunk);
        
        if (target) {
            const p = target.point.clone().add(target.face.normal.clone().multiplyScalar(-0.1));
            const bx = Math.floor(p.x);
            const by = Math.floor(p.y);
            const bz = Math.floor(p.z);
            
            if (bx === blockBreaking.targetX && by === blockBreaking.targetY && bz === blockBreaking.targetZ) {
                blockBreaking.update(delta, 1.0);
                
                // Update Decal
                // (Skip actual decal mesh logic for brevity to avoid complex ThreeJS BoxGeometry overlays)
                
                if (blockBreaking.isFinished()) {
                    world.setBlock(bx, by, bz, BLOCKS.AIR);
                    audio.playSound('pop', camera.position, 1.0, 0.8 + Math.random() * 0.4);
                    blockBreaking.stopBreaking();
                    
                    // Spawn particles
                    for(let i=0; i<15; i++) {
                        particles.spawnParticle(bx+0.5, by+0.5, bz+0.5, 0.5, 0.5, 0.5, 0.5, 2.0);
                    }
                }
            } else {
                blockBreaking.stopBreaking();
            }
        } else {
            blockBreaking.stopBreaking();
        }
    }
"""
code = code.replace("if (furnaceUI && furnaceUI.update) { furnaceUI.update(delta); }", "if (furnaceUI && furnaceUI.update) { furnaceUI.update(delta); }\n" + animate_tick)

# Replace mousedown left-click logic
mousedown_old = """    if (e.button === 0) { // Left click: Break block
        raycaster.setFromCamera(center, camera);

        // 1. Check entity intersection first
"""

mousedown_new = """    if (e.button === 0) { // Left click: Break block
        raycaster.setFromCamera(center, camera);

        // 1. Check entity intersection first
"""
# Actually, let's just use regular left-click to start breaking
replace_click = """            if (bx >= 0 && by >= 0 && bz >= 0) {
                world.setBlock(bx, by, bz, BLOCKS.AIR);
                audio.playSound('pop', camera.position, 1.0, 0.8 + Math.random() * 0.4);
            }"""
            
replace_with = """            if (bx >= 0 && by >= 0 && bz >= 0) {
                const blockId = world.getBlock(bx, by, bz);
                const hardness = 1.0; // Simplify
                blockBreaking.startBreaking(bx, by, bz, hardness);
            }"""
code = code.replace(replace_click, replace_with)

# Add mouseup listener
mouseup = """
document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        blockBreaking.stopBreaking();
    }
});
"""
code = code + mouseup

with open('src/core/main.js', 'w') as f:
    f.write(code)

