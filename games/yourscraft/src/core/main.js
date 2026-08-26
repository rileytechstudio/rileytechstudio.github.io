import { MainMenu } from '../ui/mainMenu.js';
import { PauseMenu } from '../ui/pauseMenu.js';
import { BlockBreakingSystem } from './breaking.js';

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Chunk, BLOCKS, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './chunk.js';
import { createChunkMesh } from './mesher.js';
import { getTextureAtlas } from './textureManager.js';
import { World } from './world.js';
import { Player } from '../physics/player.js';
import { RedstoneSimulator } from '../redstone/simulator.js';
import { HUD } from '../ui/hud.js';
import { ScoreboardManager } from './scoreboard.js';
import { DayNightCycle } from './environment.js';
import { getMiningTime } from './mining.js';
import { InventoryManager } from '../ui/inventory.js';
import { AnvilUI } from '../ui/anvil.js';
import { EnchantingUI } from '../ui/enchanting.js';
import { FurnaceUI } from '../ui/furnace.js';

import { isFoodItem, getFoodProperties, ITEM_IDS } from './crafting.js';
import { SoundManager } from './audio.js';
import { ParticleSystem } from './particles.js';
import { Arrow } from '../entity/arrow.js';
import { createMob } from '../entity/mob.js';



console.log("Minecraft 1.5 WebGL Engine Initializing Phase 2...");

// Force generate atlas once
getTextureAtlas();

// 1. Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('#99b3ff');
scene.fog = new THREE.Fog('#99b3ff', 20, 6 * 16);
 // Sky blue
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

const mainMenu = new MainMenu(
    () => { controls.lock(); },
    () => {},
    () => {}
);
mainMenu.element.style.pointerEvents = 'auto';
uiLayer.appendChild(mainMenu.element);

const pauseMenu = new PauseMenu(
    () => { controls.lock(); },
    () => {},
    () => {},
    () => {},
    () => { location.reload(); }
);
pauseMenu.element.style.display = 'none';
pauseMenu.element.style.pointerEvents = 'auto';
uiLayer.appendChild(pauseMenu.element);

let isFirstLock = true;
controls.addEventListener('lock', () => {
    if (isFirstLock) {
        mainMenu.element.style.display = 'none';
        isFirstLock = false;
    }
    pauseMenu.element.style.display = 'none';
    document.getElementById('minecraft-hud').style.display = 'block';
});

controls.addEventListener('unlock', () => {
    // Only show pause menu if we are already playing and no other UI is open
    if (!isFirstLock && !inventory.isOpen() && !(anvilUI && anvilUI.isOpen()) && !(enchantingUI && enchantingUI.isOpen()) && !(furnaceUI && furnaceUI.isOpen())) {
        pauseMenu.element.style.display = 'flex';
    }
    document.getElementById('minecraft-hud').style.display = 'none';
});

scene.add(controls.getObject());

// 5. Lighting Setup
const ambientLight = new THREE.AmbientLight(0xe8f0ff, 0.55);
scene.add(ambientLight);

// Dynamic Torch Lighting Pool
const MAX_TORCH_LIGHTS = 4;
const torchLights = [];
for (let i = 0; i < MAX_TORCH_LIGHTS; i++) {
    const light = new THREE.PointLight(0xffddaa, 0, 15);
    light.position.set(0, 0, 0);
    scene.add(light);
    torchLights.push(light);
}
let torchUpdateTick = 0;

const sunLight = new THREE.DirectionalLight(0xfffbe8, 0.95);
sunLight.position.set(40, 70, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);


const fillLight = new THREE.DirectionalLight(0x8090b0, 0.3);
fillLight.position.set(-20, -10, -20);
scene.add(fillLight);

// 6. Subsystems Init
const dayNightCycle = new DayNightCycle(scene, ambientLight, sunLight, fillLight);
const audio = new SoundManager(camera);
const particles = new ParticleSystem(scene);


const world = new World({ seed: 12345, autoMesh: false, scene, dayNightCycle });
world.scene = scene;
world.dayNightCycle = dayNightCycle;
const player = new Player(8, 150, 8); // spawn high up, gravity will pull down
const redstone = new RedstoneSimulator(world);

const scoreboard = new ScoreboardManager();
const hud = new HUD({ container: uiLayer, scoreboard });

window.scoreboard = scoreboard;
window.hud = hud;
document.getElementById('minecraft-hud').style.display = 'none';
const inventory = new InventoryManager({ hud });
const anvilUI = new AnvilUI({ inventory, hud, audio, particles });
const enchantingUI = new EnchantingUI({ inventory, hud, audio, particles, world });
const furnaceUI = new FurnaceUI({ inventory, hud, audio, particles, world, player });

// Unlock pointer when inventory opens
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' || e.code === 'Escape') {
        if (furnaceUI && furnaceUI.isOpen()) {
            furnaceUI.close();
            controls.lock();
            return;
        }
        if (anvilUI && anvilUI.isOpen()) {
            anvilUI.close();
            controls.lock();
            return;
        }
        if (enchantingUI && enchantingUI.isOpen()) {
            enchantingUI.close();
            controls.lock();
            return;
        }
        if (inventory.isOpen()) {
            inventory.close();
            controls.lock();
            return;
        } else if (e.code === 'KeyE') {
            inventory.openInventory();
            controls.unlock();
            return;
        }
    }
});


let activeBlock = BLOCKS.COBBLESTONE; // Default place block
hud.onSelectSlot = (slotIndex) => {
    const item = inventory.getSlot(slotIndex);
    activeBlock = item ? item.id : BLOCKS.AIR;
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
    // 1. Rebuild the modified chunk
    const { cx, cz } = world.worldToChunkCoords ? world.worldToChunkCoords(data.x, data.z) : { cx: Math.floor(data.x / CHUNK_SIZE_X), cz: Math.floor(data.z / CHUNK_SIZE_Z) };
    const chunk = world.getChunk(cx, cz);
    if (chunk) {
        if (chunk.userData && chunk.userData.mesh) {
             scene.remove(chunk.userData.mesh);
             chunk.userData.mesh.geometry.dispose();
        }
        chunk.userData.mesh = createChunkMesh(chunk);
        scene.add(chunk.userData.mesh);
        redstone.updateBlock && redstone.updateBlock(data.x, data.y, data.z);
        chunk.isDirty = false;
    }
    
    // 2. Rebuild neighbor chunks if they were marked dirty (edge modification)
    world.chunks.forEach((c) => {
        if (c.isDirty && c.userData && c.userData.mesh) {
            scene.remove(c.userData.mesh);
            c.userData.mesh.geometry.dispose();
            c.userData.mesh = createChunkMesh(c);
            scene.add(c.userData.mesh);
            c.isDirty = false;
        }
    });
});


// 7. Raycaster Input & Combat
const blockBreaking = new BlockBreakingSystem();
let breakingDecal = null;
const raycaster = new THREE.Raycaster();
raycaster.far = 5; 
const center = new THREE.Vector2(0, 0);

let breakTimer = 0;
let breakingBlockPos = null;
let isBreaking = false;

// Bow charging state
let isChargingBow = false;
let bowChargeStartTime = 0;

function getMeshes() {
    const meshes = [];
    world.chunks.forEach(c => {
        if (c.userData && c.userData.mesh) meshes.push(c.userData.mesh);
    });
    return meshes;
}

/**
 * Intersect with mob hitboxes or meshes using THREE.Raycaster within maxDist (default 4 blocks)
 * @param {number} [maxDist=4.0]
 * @returns {{ mob: Object|null, distance: number }}
 */
function findTargetMob(maxDist = 4.0) {
    raycaster.setFromCamera(center, camera);
    const ray = raycaster.ray;
    let closestMob = null;
    let closestDist = maxDist;

    // 1. Direct 3D Hitbox (AABB) Ray-Box Intersection
    if (world && typeof world.getEntities === 'function') {
        for (const entity of world.getEntities()) {
            if (!entity || entity === player || entity.isDead || entity.removed) continue;
            if (entity.type === 'arrow') continue;

            const width = entity.width || 0.6;
            const height = entity.height || 1.8;
            const pos = entity.position;
            if (!pos) continue;

            const box = new THREE.Box3(
                new THREE.Vector3(pos.x - width / 2, pos.y, pos.z - width / 2),
                new THREE.Vector3(pos.x + width / 2, pos.y + height, pos.z + width / 2)
            );

            const hitPoint = new THREE.Vector3();
            if (ray.intersectBox(box, hitPoint)) {
                const dist = ray.origin.distanceTo(hitPoint);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestMob = entity;
                }
            }
        }
    }

    // 2. Direct Three.js Mesh Intersect Check
    const mobMeshes = [];
    if (world && typeof world.getEntities === 'function') {
        for (const entity of world.getEntities()) {
            if (entity.type === 'arrow' || entity === player || entity.isDead) continue;
            if (entity.mesh) mobMeshes.push(entity.mesh);
            if (entity.userData && entity.userData.mesh) mobMeshes.push(entity.userData.mesh);
        }
    }

    if (mobMeshes.length > 0) {
        const meshHits = raycaster.intersectObjects(mobMeshes, true);
        if (meshHits.length > 0) {
            const firstHit = meshHits[0];
            if (firstHit.distance < closestDist) {
                let curr = firstHit.object;
                let foundMob = null;
                while (curr) {
                    if (curr.userData && (curr.userData.mob || curr.userData.entity)) {
                        foundMob = curr.userData.mob || curr.userData.entity;
                        break;
                    }
                    curr = curr.parent;
                }
                if (foundMob && !foundMob.isDead && foundMob !== player) {
                    closestDist = firstHit.distance;
                    closestMob = foundMob;
                }
            }
        }
    }

    return { mob: closestMob, distance: closestDist };
}

document.addEventListener('mousedown', (event) => {
    if (!controls.isLocked || inventory.isOpen()) return;
    
    if (event.button === 0) { // Left click: Attack mob OR Start breaking block
        const target = findTargetMob(4.0);
        if (target && target.mob) {
            const mob = target.mob;
            const heldItem = inventory.getSlot(hud.selectedSlot);
            player.heldItem = heldItem;
            const attackDmg = player.getAttackDamage ? player.getAttackDamage(heldItem) : 1;

            // 1. Call mob.damage(player.getAttackDamage())
            if (typeof mob.damage === 'function') {
                mob.damage(attackDmg, player);
            } else if (typeof mob.takeDamage === 'function') {
                mob.takeDamage(attackDmg, player);
            }

            // 2. Apply Knockback away from player
            const dx = mob.position.x - player.position.x;
            const dz = mob.position.z - player.position.z;
            const len = Math.hypot(dx, dz) || 1;
            const knockbackStrength = 6.0;
            mob.velocity.x += (dx / len) * knockbackStrength;
            mob.velocity.y = Math.max(mob.velocity.y, 4.0);
            mob.velocity.z += (dz / len) * knockbackStrength;

            // Sound & particles
            audio.play('hurt', mob.position);
            if (particles && particles.emitBlockDebris) {
                particles.emitBlockDebris(mob.position.x, mob.position.y + 1, mob.position.z, BLOCKS.REDSTONE_BLOCK, 12);
            }

            // Flash red on hurt
            if (mob.mesh) {
                mob.mesh.traverse(child => {
                    if (child.isMesh && child.material && !child.userData.origColor) {
                        child.userData.origColor = child.material.color.getHex();
                        child.material.color.setHex(0xFF4444);
                        setTimeout(() => {
                            if (child.material && child.userData.origColor !== undefined) {
                                child.material.color.setHex(child.userData.origColor);
                                delete child.userData.origColor;
                            }
                        }, 160);
                    }
                });
            }

            isBreaking = false;
            breakTimer = 0;
            return;
        }

        isBreaking = true;
        breakTimer = 0;
    } else if (event.button === 2) { // Right click: Bow charge OR Eat food OR Place block
        const heldItem = inventory.getSlot(hud.selectedSlot);

        // 1. Check if holding Bow (ITEM_IDS.BOW = 261) -> Start charging
        if (heldItem && (heldItem.id === ITEM_IDS.BOW || heldItem.id === 261)) {
            isChargingBow = true;
            bowChargeStartTime = performance.now();
            return;
        }

        // 2. Check if holding edible food item (Apple, Bread, Cooked Porkchop, etc.)
        if (heldItem && isFoodItem(heldItem.id)) {
            const eatResult = player.eat(heldItem);
            if (eatResult && eatResult.eaten) {
                inventory.consumeSlot(hud.selectedSlot, 1);
                audio.play('crunch');
                hud.setHunger(player.foodLevel);
                hud.setHealth(player.health);
                return;
            }
        }

        // 3. Otherwise place block if holding placeable block or activeBlock
        const blockIdToPlace = (heldItem && heldItem.id > 0 && heldItem.id <= 255) ? heldItem.id : activeBlock;
        if (blockIdToPlace > 0 && blockIdToPlace <= 255) {
            raycaster.setFromCamera(center, camera);
            const intersects = raycaster.intersectObjects(getMeshes(), false);
            if (intersects.length > 0) {
                const hit = intersects[0];
                const placePt = hit.point.clone().addScaledVector(hit.face.normal, 0.01);
                const px = Math.floor(placePt.x);
                const py = Math.floor(placePt.y);
                const pz = Math.floor(placePt.z);
                if (world.getBlock(px, py, pz) === BLOCKS.AIR) {
                    world.setBlock(px, py, pz, blockIdToPlace, true);
                    if (heldItem) {
                        inventory.consumeSlot(hud.selectedSlot, 1);
                    }
                    audio.play('pop', placePt);
                }
            }
        }
    }
});

document.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
        isBreaking = false;
        breakTimer = 0;
        breakingBlockPos = null;
    } else if (event.button === 2) {
        // Bow Release & Arrow Spawn
        if (isChargingBow) {
            isChargingBow = false;
            camera.fov = 65;
            camera.updateProjectionMatrix();

            const chargeTime = (performance.now() - bowChargeStartTime) / 1000;
            // Only fire if charged for at least 0.1s
            if (chargeTime >= 0.1) {
                const charge = Math.min(1.0, Math.max(0.1, chargeTime / 1.0)); // 1.0s = full charge

                // Consume 1 arrow from inventory if available
                let hasArrow = false;
                for (let i = 0; i < 36; i++) {
                    const slotItem = inventory.getSlot(i);
                    if (slotItem && (slotItem.id === ITEM_IDS.ARROW || slotItem.id === 262) && slotItem.count > 0) {
                        inventory.consumeSlot(i, 1);
                        hasArrow = true;
                        break;
                    }
                }

                // Compute launch parameters along camera direction
                const dir = new THREE.Vector3();
                camera.getWorldDirection(dir);

                const speed = charge * 30 + 6; // 9 m/s to 36 m/s
                const damage = Math.max(2, Math.round(charge * 9));
                const isCritical = charge >= 0.95;

                const arrow = new Arrow({
                    x: camera.position.x + dir.x * 0.5,
                    y: camera.position.y + dir.y * 0.5,
                    z: camera.position.z + dir.z * 0.5,
                    direction: dir,
                    speed: speed,
                    damage: isCritical ? damage + 2 : damage,
                    isCritical: isCritical,
                    shooter: player,
                    scene: scene,
                    world: world
                });

                world.addEntity(arrow);
                if (arrow.mesh && !arrow.mesh.parent) {
                    scene.add(arrow.mesh);
                }

                audio.play('bow');

                // Bow durability consumption
                const heldItem = inventory.getSlot(hud.selectedSlot);
                if (heldItem && heldItem.durability !== undefined) {
                    heldItem.durability--;
                    if (heldItem.durability <= 0) {
                        inventory.setSlot(hud.selectedSlot, null);
                        audio.play('crunch');
                    }
                }
            }
        }
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
                const oldBlockId = world.getBlock(bx, by, bz);
                world.setBlock(bx, by, bz, BLOCKS.AIR, true);
                audio.play('crunch', breakPt);
                particles.emitBlockDebris(bx, by, bz, oldBlockId, 15);
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
        

        // Sync held item
        player.heldItem = inventory.getSlot(hud.selectedSlot);

        player.update(delta, world, moveState);
        camera.position.set(player.position.x, player.position.y + player.eyeHeight, player.position.z);
        handleMining(delta);

        // Bow Zoom FOV update
        if (isChargingBow) {
            const chargeTime = (time - bowChargeStartTime) / 1000;
            const charge = Math.min(1.0, chargeTime / 1.0);
            camera.fov = 65 - charge * 6.0;
            camera.updateProjectionMatrix();
        }

        // Sync player survival state to HUD
        hud.setHealth(player.health, player.maxHealth);
        hud.setHunger(player.foodLevel, 20);
        hud.setExp(player.getXpProgress ? player.getXpProgress() : 0, player.getXpLevel ? player.getXpLevel() : 0);

    }
    
    // Process chunk streaming and terrain generation
    world.update(camera.position.x, camera.position.z, 6);
    
    // Process mob spawning and entity updates
    if (typeof world.spawnMobs === 'function') {
        world.spawnMobs(player, delta);
    }
    if (typeof world.updateEntities === 'function') {
        world.updateEntities(delta);
    }

    // Synchronize entity meshes in scene
    if (typeof world.getEntities === 'function') {
        for (const entity of world.getEntities()) {
            if (entity.mesh) {
                if (!entity.mesh.parent && scene) {
                    scene.add(entity.mesh);
                }
                entity.mesh.position.set(entity.position.x, entity.position.y, entity.position.z);
                if (entity.rotation && entity.type !== 'arrow') {
                    entity.mesh.rotation.y = entity.rotation.yaw || 0;
                }
            }
        }
    }
    
    // Process environment
    dayNightCycle.update(delta);
    particles.update(delta);
    if (furnaceUI && furnaceUI.update) {
        furnaceUI.update(delta);
    }

    
    // Process redstone simulation
    if (redstone.step) {
        redstone.step(delta);
    }
    
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

document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        blockBreaking.stopBreaking();
    }
});
