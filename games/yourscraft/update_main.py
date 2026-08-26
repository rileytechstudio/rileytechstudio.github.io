import os

code = """
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Chunk, BLOCKS, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './chunk.js';
import { createChunkMesh } from './mesher.js';
import { getTextureAtlas } from './textureManager.js';
import { World } from './world.js';
import { Player } from '../physics/player.js';
import { RedstoneSimulator } from '../redstone/simulator.js';
import { HUD } from '../ui/hud.js';

console.log("Minecraft 1.5 WebGL Engine Initializing Phase 2...");

// Force generate atlas once
getTextureAtlas();

// 1. Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue
scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);

// 2. Camera Setup
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);

// 3. Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: false }); // No antialias for pixel art
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// 4. Pointer Lock Controls
const controls = new PointerLockControls(camera, renderer.domElement);
const uiLayer = document.getElementById('ui-layer');

const instructions = document.createElement('div');
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
});

scene.add(controls.getObject());

// 5. Lighting Setup
const ambientLight = new THREE.AmbientLight(0xe8f0ff, 0.55);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffbe8, 0.95);
sunLight.position.set(40, 70, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

// 6. Subsystems Init
const world = new World({ seed: 12345 });
const player = new Player(8, 150, 8); // spawn high up, gravity will pull down
const redstone = new RedstoneSimulator(world);
const hud = new HUD({ container: uiLayer });

let activeBlock = BLOCKS.COBBLESTONE; // Default place block
hud.onSelectSlot = (slotIndex) => {
    // Just a mock hotbar mapping for testing
    const hotbarMap = [BLOCKS.STONE, BLOCKS.DIRT, BLOCKS.COBBLESTONE, BLOCKS.OAK_LOG, BLOCKS.OAK_PLANKS, BLOCKS.GLASS, BLOCKS.REDSTONE_WIRE, BLOCKS.REDSTONE_TORCH_ON, BLOCKS.TNT];
    activeBlock = hotbarMap[slotIndex] || BLOCKS.COBBLESTONE;
};

// Handle chunk mesh rendering
world.on('chunkLoad', (chunk) => {
    if (!chunk.userData) chunk.userData = {};
    if (chunk.userData.mesh) return; // already meshed
    const mesh = createChunkMesh(chunk);
    chunk.userData.mesh = mesh;
    scene.add(mesh);
});

world.on('chunkUnload', (chunk) => {
    if (chunk.userData && chunk.userData.mesh) {
        scene.remove(chunk.userData.mesh);
        chunk.userData.mesh.geometry.dispose();
        chunk.userData.mesh = null;
    }
});

world.on('blockChange', (data) => {
    const chunk = world.getChunk(data.cx, data.cz);
    if (chunk) {
        if (chunk.userData && chunk.userData.mesh) {
             scene.remove(chunk.userData.mesh);
             chunk.userData.mesh.geometry.dispose();
        }
        chunk.userData.mesh = createChunkMesh(chunk);
        scene.add(chunk.userData.mesh);
        redstone.scheduleBlockUpdate(data.worldX, data.worldY, data.worldZ, 1);
    }
});

// 7. Raycaster Input
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
});

// 8. Player Movement Input
const moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false, sprint: false, yaw: 0, pitch: 0 };
document.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyW': moveState.forward = true; break;
        case 'KeyA': moveState.left = true; break;
        case 'KeyS': moveState.backward = true; break;
        case 'KeyD': moveState.right = true; break;
        case 'Space': moveState.up = true; break;
        case 'ShiftLeft': moveState.down = true; break;
        case 'ControlLeft': moveState.sprint = true; break;
    }
});
document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW': moveState.forward = false; break;
        case 'KeyA': moveState.left = false; break;
        case 'KeyS': moveState.backward = false; break;
        case 'KeyD': moveState.right = false; break;
        case 'Space': moveState.up = false; break;
        case 'ShiftLeft': moveState.down = false; break;
        case 'ControlLeft': moveState.sprint = false; break;
    }
});

let prevTime = performance.now();

// 9. Animation Loop
function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now();
    const delta = Math.min((time - prevTime) / 1000, 0.1); // cap delta to avoid physics explosions
    
    if (controls.isLocked) {
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(camera.quaternion);
        moveState.yaw = euler.y;
        moveState.pitch = euler.x;
        
        player.update(delta, world, moveState);
        camera.position.set(player.position.x, player.position.y + player.eyeHeight, player.position.z);
    }
    
    // Process chunk streaming and terrain generation
    world.update(camera.position.x, camera.position.z, 2); // 2 chunk radius for performance initially
    
    // Process redstone simulation
    redstone.update ? redstone.update(delta) : (redstone.tickAccumulator ? redstone.update(delta) : null);
    
    prevTime = time;
    renderer.render(scene, camera);
}
animate();

// 10. Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.MinecraftEngine = { scene, camera, renderer, world, player, redstone, hud, BLOCKS };
"""

with open("src/core/main.js", "w") as f:
    f.write(code)

print("Updated main.js with full system integration!")
