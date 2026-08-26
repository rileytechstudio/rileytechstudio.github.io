import re

with open('src/core/main.js', 'r') as f:
    code = f.read()

init_lights = """// Dynamic Torch Lighting Pool
const MAX_TORCH_LIGHTS = 16;
const torchLights = [];
for (let i = 0; i < MAX_TORCH_LIGHTS; i++) {
    const light = new THREE.PointLight(0xffddaa, 0, 15);
    light.position.set(0, 0, 0);
    scene.add(light);
    torchLights.push(light);
}
let torchUpdateTick = 0;
"""

code = code.replace("const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);", init_lights + "\nconst sunLight = new THREE.DirectionalLight(0xffffff, 1.0);")

animate_torch = """
    // Torch Lighting Manager
    torchUpdateTick++;
    if (torchUpdateTick >= 30) {
        torchUpdateTick = 0;
        const allTorches = [];
        world.chunks.forEach(c => {
            if (c.userData && c.userData.mesh && c.userData.mesh.userData.torches) {
                allTorches.push(...c.userData.mesh.userData.torches);
            }
        });
        
        // Sort by distance to player
        const px = player.position.x;
        const py = player.position.y;
        const pz = player.position.z;
        
        allTorches.forEach(t => {
            const dx = t.x - px;
            const dy = t.y - py;
            const dz = t.z - pz;
            t.distSq = dx*dx + dy*dy + dz*dz;
        });
        allTorches.sort((a, b) => a.distSq - b.distSq);
        
        for (let i = 0; i < MAX_TORCH_LIGHTS; i++) {
            if (i < allTorches.length && allTorches[i].distSq < 400) { // 20 blocks max light range
                const t = allTorches[i];
                torchLights[i].position.set(t.x + 0.5, t.y + 0.5, t.z + 0.5);
                torchLights[i].intensity = 1.5; // Classic bright torch
            } else {
                torchLights[i].intensity = 0; // Hide
            }
        }
    }
"""

code = code.replace("if (furnaceUI && furnaceUI.update) { furnaceUI.update(delta); }", "if (furnaceUI && furnaceUI.update) { furnaceUI.update(delta); }\n" + animate_torch)

with open('src/core/main.js', 'w') as f:
    f.write(code)

