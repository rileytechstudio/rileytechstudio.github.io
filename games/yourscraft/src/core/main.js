import { MainMenu } from '../ui/mainMenu.js';
import { PauseMenu } from '../ui/pauseMenu.js';
import { BlockBreakingSystem } from './breaking.js';

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Chunk, BLOCKS, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './chunk.js';
import { createChunkMesh } from './mesher.js';
import { getTextureAtlas, getBlockFaceUV } from './textureManager.js';
import { World } from './world.js';
import { LightingEngine } from './lighting.js';
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
import { createMobRenderer } from '../entity/mobRenderer.js';
import { WeatherSystem, WEATHER_TYPES, PRECIPITATION_TYPES } from '../environment/weather.js';
import { DroppedItem, spawnDroppedItem, spawnBlockDrop, getMobDrop } from '../entity/droppedItem.js';
console.log("Minecraft 1.5 WebGL Engine Initializing Phase 2...");

// Force generate atlas once
getTextureAtlas();

// 1. Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('#99b3ff');
scene.fog = new THREE.Fog('#99b3ff', 20, 6 * 16);
 // Sky blue
scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);

// 1.5 Options & Settings Init
let savedOptions = {};
try {
    const raw = localStorage.getItem('minecraft_options');
    if (raw) savedOptions = JSON.parse(raw);
} catch (e) {
    console.warn("Failed to load options from storage:", e);
}

let baseFov = savedOptions.fov !== undefined ? Number(savedOptions.fov) : 70;
let renderDistance = savedOptions.renderDistance !== undefined ? Number(savedOptions.renderDistance) : 6;
let mouseSensitivity = savedOptions.sensitivity !== undefined ? Number(savedOptions.sensitivity) : 1.0;
let masterVolume = savedOptions.volume !== undefined ? Number(savedOptions.volume) : 1.0;

// 2. Camera Setup
const camera = new THREE.PerspectiveCamera(baseFov, window.innerWidth / window.innerHeight, 0.1, 1000);

// 3. Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: false }); // No antialias for pixel art
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// 4. Pointer Lock Controls
const controls = new PointerLockControls(camera, renderer.domElement);
controls.pointerSpeed = mouseSensitivity;
const uiLayer = document.getElementById('ui-layer');

let pauseMenu;
let world;
let audio;

const mainMenu = new MainMenu(
    () => { controls.lock(); }, // onStartGame
    () => {
        // onLoadGame
        const savedData = localStorage.getItem('minecraft_save');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                if (data.player && window.player && window.inventory) {
                    if (data.player.position) {
                        window.player.position.set(data.player.position.x, data.player.position.y, data.player.position.z);
                    }
                    if (data.player.inventory) {
                        window.inventory.deserialize(data.player.inventory);
                    }
                }
                if (data.chunks && window.world) {
                    data.chunks.forEach(chunkData => {
                        const chunk = window.world.chunks.get(chunkData.key);
                        if (chunk) {
                            chunk.blocks = new Uint8Array(chunkData.blocks);
                            chunk.isModified = true;
                            chunk.isDirty = true;
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to load save:", e);
            }
        }
        controls.lock(); 
    },
    () => {
        // onOptions from Main Menu
        if (pauseMenu) {
            mainMenu.element.style.display = 'none';
            pauseMenu.showOptionsMenu();
            pauseMenu.element.style.display = 'flex';
        }
    },
    () => {}  // onQuit
);
mainMenu.element.style.pointerEvents = 'auto';
uiLayer.appendChild(mainMenu.element);

pauseMenu = new PauseMenu(
    () => { controls.lock(); },
    () => {},
    () => {},
    null,
    () => { location.reload(); },
    {
        initialFov: baseFov,
        initialRenderDistance: renderDistance,
        initialSensitivity: mouseSensitivity,
        initialVolume: masterVolume,
        onFovChange: (newFov) => {
            baseFov = newFov;
            if (!isChargingBow) {
                camera.fov = baseFov;
                camera.updateProjectionMatrix();
            }
        },
        onRenderDistanceChange: (newDist) => {
            renderDistance = newDist;
            if (world) world.loadRadius = renderDistance;
            if (scene.fog && scene.fog.far !== undefined) {
                scene.fog.far = renderDistance * 16;
                scene.fog.near = Math.max(10, (renderDistance - 2) * 16);
            }
        },
        onSensitivityChange: (newSens) => {
            mouseSensitivity = newSens;
            controls.pointerSpeed = newSens;
        },
        onVolumeChange: (newVol) => {
            masterVolume = newVol;
            if (audio && typeof audio.setMasterVolume === 'function') {
                audio.setMasterVolume(masterVolume);
            }
        },
        onDone: () => {
            if (isFirstLock) {
                pauseMenu.element.style.display = 'none';
                mainMenu.element.style.display = 'flex';
            } else {
                pauseMenu.showMainMenu();
            }
        }
    }
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
    isHoldingLeftClick = false;
    if (blockBreaking.isBreaking) {
        blockBreaking.stopBreaking();
    }
    breakingBlockPos = null;
    if (breakingDecal) breakingDecal.visible = false;
    // Only show pause menu if we are already playing and no other UI is open
    if (!isFirstLock && !inventory.isOpen() && !(anvilUI && anvilUI.isOpen()) && !(enchantingUI && enchantingUI.isOpen()) && !(furnaceUI && furnaceUI.isOpen())) {
        pauseMenu.showMainMenu();
        pauseMenu.element.style.display = 'flex';
    }
    document.getElementById('minecraft-hud').style.display = 'none';
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


const fillLight = new THREE.DirectionalLight(0x8090b0, 0.3);
fillLight.position.set(-20, -10, -20);
scene.add(fillLight);

// 6. Subsystems Init
const dayNightCycle = new DayNightCycle(scene, ambientLight, sunLight, fillLight);
audio = new SoundManager(camera);
if (audio && typeof audio.setMasterVolume === 'function') {
    audio.setMasterVolume(masterVolume);
}
const particles = new ParticleSystem(scene);
world = new World({ seed: 12345, autoMesh: false, scene, dayNightCycle });
const weather = new WeatherSystem(scene, camera, world, { dayNightCycle, audio });
const lightingEngine = new LightingEngine(world);

world.on('chunkLoad', (chunk) => {
    lightingEngine.initializeChunkLighting(chunk);
});
world.on('blockChange', (e) => {
    if (e.newBlock === 0) lightingEngine.onBlockRemoved(e.x, e.y, e.z);
    else lightingEngine.onBlockPlaced(e.x, e.y, e.z, e.newBlock);
});

world.scene = scene;
world.dayNightCycle = dayNightCycle;
world.spawnMobs = function(player, delta) {
    if (!this.lastMobSpawn) this.lastMobSpawn = 0;
    this.lastMobSpawn += delta;
    if (this.lastMobSpawn > 5.0) {
        this.lastMobSpawn = 0;
        if (this.entities.size < 10) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 15 + Math.random() * 10;
            const tx = player.position.x + Math.cos(angle) * dist;
            const tz = player.position.z + Math.sin(angle) * dist;
            for (let ty = 200; ty > 10; ty--) {
                const b = this.getBlock(Math.floor(tx), ty, Math.floor(tz));
                if (b !== 0 && b !== BLOCKS.WATER && b !== BLOCKS.WATER_FLOWING) {
                    const mobType = Math.random() < 0.5 ? 'zombie' : 'pig';
                    const mob = createMob(mobType, tx, ty + 1, tz);
                    const renderer = createMobRenderer(mob);
                    mob.mesh = renderer.group;
                    this.addEntity(mob);
                    break;
                }
            }
        }
    }
};
const player = new Player(8, 150, 8); // spawn high up, gravity will pull down
const redstone = new RedstoneSimulator(world);

const scoreboard = new ScoreboardManager();
const hud = new HUD({ container: uiLayer, scoreboard });

window.scoreboard = scoreboard;
window.hud = hud;
window.world = world;
window.player = player;
document.getElementById('minecraft-hud').style.display = 'none';
const inventory = new InventoryManager({ hud });
window.inventory = inventory;
window.weather = weather;
window.dayNightCycle = dayNightCycle;
window.setWeather = (type, duration) => weather.setWeather(type, duration);
window.toggleWeather = () => weather.toggleWeather();

// KeyP weather toggle shortcut
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' && !inventory.isOpen() && !(anvilUI && anvilUI.isOpen()) && !(enchantingUI && enchantingUI.isOpen()) && !(furnaceUI && furnaceUI.isOpen())) {
        const next = weather.toggleWeather();
        console.log('[Weather] Toggled to: ' + next);
    }
});

// KeyQ item drop shortcut
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ' && controls.isLocked && !inventory.isOpen() && !(anvilUI && anvilUI.isOpen()) && !(enchantingUI && enchantingUI.isOpen()) && !(furnaceUI && furnaceUI.isOpen())) {
        const slotItem = inventory.getSlot(hud.selectedSlot);
        if (slotItem && slotItem.count > 0) {
            const dropId = slotItem.id;
            inventory.consumeSlot(hud.selectedSlot, 1);
            syncActiveItem();

            const dir = new THREE.Vector3();
            camera.getWorldDirection(dir);

            const spawnX = camera.position.x + dir.x * 0.4;
            const spawnY = camera.position.y - 0.2 + dir.y * 0.4;
            const spawnZ = camera.position.z + dir.z * 0.4;

            spawnDroppedItem(dropId, 1, spawnX, spawnY, spawnZ, world, scene, {
                velocity: {
                    x: dir.x * 5.0 + (Math.random() - 0.5) * 0.5,
                    y: dir.y * 5.0 + 1.5,
                    z: dir.z * 5.0 + (Math.random() - 0.5) * 0.5
                },
                pickupDelay: 1.0
            });
            audio.play('pop', new THREE.Vector3(spawnX, spawnY, spawnZ));
        }
    }
});
const anvilUI = new AnvilUI({ inventory, hud, audio, particles });
const enchantingUI = new EnchantingUI({ inventory, hud, audio, particles, world });
const furnaceUI = new FurnaceUI({ inventory, hud, audio, particles, world, player });

// Unlock pointer when inventory opens
document.addEventListener('keydown', (e) => {
    // Release pointer lock on Mac OS screenshot shortcuts (Cmd+Shift+3/4/5)
    if (e.metaKey && e.shiftKey && (e.code === 'Digit3' || e.code === 'Digit4' || e.code === 'Digit5')) {
        controls.unlock();
        return;
    }

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


let activeBlock = BLOCKS.AIR;
function syncActiveItem() {
    const item = inventory.getSlot(hud.selectedSlot);
    activeBlock = item ? item.id : BLOCKS.AIR;
    if (window.player) {
        window.player.heldItem = item;
    }
}

hud.onSelectSlot = (slotIndex) => {
    syncActiveItem();
};

inventory.onInventoryChange = () => {
    syncActiveItem();
};

syncActiveItem();

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
        if (chunk.userData.mesh.type === 'Group') {
            chunk.userData.mesh.children.forEach(c => c.geometry && c.geometry.dispose());
        } else if (chunk.userData.mesh.geometry) {
            chunk.userData.mesh.geometry.dispose();
        }
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
             if (chunk.userData.mesh.type === 'Group') {
                 chunk.userData.mesh.children.forEach(c => c.geometry && c.geometry.dispose());
             } else if (chunk.userData.mesh.geometry) {
                 chunk.userData.mesh.geometry.dispose();
             }
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
            if (c.userData.mesh.type === 'Group') {
                c.userData.mesh.children.forEach(child => child.geometry && child.geometry.dispose());
            } else if (c.userData.mesh.geometry) {
                c.userData.mesh.geometry.dispose();
            }
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
let isHoldingLeftClick = false;

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
        isHoldingLeftClick = true;
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
            if (mob.isDead && !mob.userData.lootDropped) {
                mob.userData.lootDropped = true;
                const drops = getMobDrop(mob.type);
                for (const d of drops) {
                    if (d && d.count > 0) {
                        spawnDroppedItem(d.id, d.count, mob.position.x, mob.position.y + 0.5, mob.position.z, world, scene);
                    }
                }
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

            breakTimer = 0;
            return;
        }

        breakTimer = 0;
    } else if (event.button === 2) { // Right click: Interactive blocks OR Bow charge OR Eat food OR Place block
        const heldItem = inventory.getSlot(hud.selectedSlot);

        // Raycast to check for targeted block first
        raycaster.setFromCamera(center, camera);
        const intersects = raycaster.intersectObjects(getMeshes(), true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const hitX = Math.floor(hit.point.x - hit.face.normal.x * 0.01);
            const hitY = Math.floor(hit.point.y - hit.face.normal.y * 0.01);
            const hitZ = Math.floor(hit.point.z - hit.face.normal.z * 0.01);
            const clickedBlock = world.getBlock(hitX, hitY, hitZ);

            // If player is not sneaking, interactive blocks open their UIs
            if (!moveState.down) {
                if (clickedBlock === BLOCKS.CRAFTING_TABLE) {
                    inventory.openCraftingTable();
                    controls.unlock();
                    return;
                }
                if (clickedBlock === BLOCKS.FURNACE) {
                    furnaceUI.open(hitX, hitY, hitZ);
                    controls.unlock();
                    return;
                }
                if (clickedBlock === BLOCKS.ANVIL && anvilUI) {
                    anvilUI.open();
                    controls.unlock();
                    return;
                }
                if (clickedBlock === BLOCKS.ENCHANTING_TABLE && enchantingUI) {
                    enchantingUI.open();
                    controls.unlock();
                    return;
                }
            }
        }

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

        // 3. Otherwise place block if holding placeable block
        if (heldItem && heldItem.id > 0 && heldItem.id <= 255 && heldItem.count > 0) {
            const blockIdToPlace = heldItem.id;
            raycaster.setFromCamera(center, camera);
            const intersects = raycaster.intersectObjects(getMeshes(), true);
            if (intersects.length > 0) {
                const hit = intersects[0];
                const placePt = hit.point.clone().addScaledVector(hit.face.normal, 0.01);
                let px = Math.floor(placePt.x);
                let py = Math.floor(placePt.y);
                let pz = Math.floor(placePt.z);
                
                // If the block we clicked ON is a snow layer, replace the snow layer instead of placing above it
                const hitX = Math.floor(hit.point.x - hit.face.normal.x * 0.01);
                const hitY = Math.floor(hit.point.y - hit.face.normal.y * 0.01);
                const hitZ = Math.floor(hit.point.z - hit.face.normal.z * 0.01);
                if (world.getBlock(hitX, hitY, hitZ) === 78) { // 78 = SNOW_LAYER
                    px = hitX; py = hitY; pz = hitZ;
                }
                
                // Prevent placing block inside player's body
                const pAABB = player.getAABB();
                const intersectsPlayer = (
                    pAABB.minX < px + 1 && pAABB.maxX > px &&
                    pAABB.minY < py + 1 && pAABB.maxY > py &&
                    pAABB.minZ < pz + 1 && pAABB.maxZ > pz
                );
                
                const targetBlock = world.getBlock(px, py, pz);
                if ((targetBlock === BLOCKS.AIR || targetBlock === 78 || targetBlock === 9 || targetBlock === 8 || targetBlock === 31) && !intersectsPlayer) {
                    world.setBlock(px, py, pz, blockIdToPlace, true);
                    
                    // Furnace Directional Metadata
                    if (blockIdToPlace === 61 || blockIdToPlace === 62) {
                        // Calculate standard MC direction (2=North, 3=South, 4=West, 5=East)
                        // Player yaw: 0 = South, PI/2 = West, PI = North, -PI/2 = East
                        let dir = 3; // South default
                        let normYaw = player.yaw;
                        while (normYaw < 0) normYaw += Math.PI * 2;
                        normYaw = normYaw % (Math.PI * 2);
                        
                        if (normYaw >= Math.PI * 0.25 && normYaw < Math.PI * 0.75) dir = 4; // West
                        else if (normYaw >= Math.PI * 0.75 && normYaw < Math.PI * 1.25) dir = 2; // North
                        else if (normYaw >= Math.PI * 1.25 && normYaw < Math.PI * 1.75) dir = 5; // East
                        
                        world.setMetadata(px, py, pz, dir);
                    }
                    
                    inventory.consumeSlot(hud.selectedSlot, 1);
                    syncActiveItem();
                    audio.play('pop', new THREE.Vector3(px, py, pz));
                }
            }
        }
    }
});

document.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
        isHoldingLeftClick = false;
        breakTimer = 0;
        breakingBlockPos = null;
        if (blockBreaking.isBreaking) {
            blockBreaking.stopBreaking();
        }
        if (breakingDecal) {
            breakingDecal.visible = false;
        }
    } else if (event.button === 2) {
        // Bow Release & Arrow Spawn
        if (isChargingBow) {
            isChargingBow = false;
            camera.fov = baseFov;
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
    if (!isHoldingLeftClick || !controls.isLocked || inventory.isOpen()) {
        if (blockBreaking.isBreaking) {
            blockBreaking.stopBreaking();
        }
        breakingBlockPos = null;
        if (breakingDecal) breakingDecal.visible = false;
        return;
    }

    raycaster.setFromCamera(center, camera);
    const intersects = raycaster.intersectObjects(getMeshes(), true);
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        const breakPt = hit.point.clone().addScaledVector(hit.face.normal, -0.01);
        const bx = Math.floor(breakPt.x);
        const by = Math.floor(breakPt.y);
        const bz = Math.floor(breakPt.z);
        const targetBlock = world.getBlock(bx, by, bz);
        
        if (targetBlock !== BLOCKS.AIR && targetBlock !== BLOCKS.BEDROCK) {
            if (!breakingBlockPos || breakingBlockPos.x !== bx || breakingBlockPos.y !== by || breakingBlockPos.z !== bz) {
                breakingBlockPos = { x: bx, y: by, z: bz };
                blockBreaking.startBreaking(bx, by, bz, getMiningTime(targetBlock, activeBlock));
            }
            
            blockBreaking.update(delta, 1.0);
            
            if (blockBreaking.isBreaking && blockBreaking.stage >= 0 && blockBreaking.stage <= 9) {
                if (!breakingDecal) {
                    const decalGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
                    const decalMat = new THREE.MeshBasicMaterial({ 
                        map: getTextureAtlas().texture, 
                        transparent: true, 
                        alphaTest: 0.1, 
                        depthWrite: false 
                    });
                    breakingDecal = new THREE.Mesh(decalGeo, decalMat);
                    breakingDecal.userData.origUvs = new Float32Array(decalGeo.attributes.uv.array);
                    scene.add(breakingDecal);
                }
                breakingDecal.visible = true;
                breakingDecal.position.set(bx + 0.5, by + 0.5, bz + 0.5);
                const uvInfo = getBlockFaceUV(-1, 'side', `destroy_stage_${blockBreaking.stage}`);
                const uvs = breakingDecal.geometry.attributes.uv.array;
                const origUvs = breakingDecal.userData.origUvs;
                for (let i = 0; i < uvs.length; i += 2) {
                    const origU = origUvs[i] > 0.5 ? 1 : 0;
                    const origV = origUvs[i+1] > 0.5 ? 1 : 0;
                    uvs[i] = uvInfo.uMin + origU * (uvInfo.uMax - uvInfo.uMin);
                    uvs[i+1] = uvInfo.vMin + origV * (uvInfo.vMax - uvInfo.vMin);
                }
                breakingDecal.geometry.attributes.uv.needsUpdate = true;
            } else if (breakingDecal) {
                breakingDecal.visible = false;
            }
            
            if (blockBreaking.isFinished()) {
                const oldBlockId = world.getBlock(bx, by, bz);
                world.setBlock(bx, by, bz, BLOCKS.AIR, true);
                audio.play('crunch', breakPt);
                particles.emitBlockDebris(bx, by, bz, oldBlockId, 15);
                spawnBlockDrop(oldBlockId, activeBlock, bx, by, bz, world, scene);
                blockBreaking.stopBreaking();
                breakingBlockPos = null;
                if (breakingDecal) breakingDecal.visible = false;
            }
        } else {
            blockBreaking.stopBreaking();
            breakingBlockPos = null;
            if (breakingDecal) breakingDecal.visible = false;
        }
    } else {
        blockBreaking.stopBreaking();
        breakingBlockPos = null;
        if (breakingDecal) breakingDecal.visible = false;
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
        
        // Underwater Visuals
        const headBlock = world.getBlock(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z));
        const waterOverlay = document.getElementById('water-overlay');
        if (headBlock === BLOCKS.WATER || headBlock === BLOCKS.WATER_FLOWING) {
            if (waterOverlay) waterOverlay.style.display = 'block';
            scene.fog.color.setHex(0x1133aa);
            scene.fog.density = 0.1;
        } else {
            if (waterOverlay) waterOverlay.style.display = 'none';
        }

        if (isHoldingLeftClick) {
            handleMining(delta);
        } else {
            if (blockBreaking.isBreaking) {
                blockBreaking.stopBreaking();
            }
            breakingBlockPos = null;
            if (breakingDecal && breakingDecal.visible) {
                breakingDecal.visible = false;
            }
        }

        // Bow Zoom FOV update
        if (isChargingBow) {
            const chargeTime = (time - bowChargeStartTime) / 1000;
            const charge = Math.min(1.0, chargeTime / 1.0);
            camera.fov = baseFov - charge * 6.0;
            camera.updateProjectionMatrix();
        }

        // Sync player survival state to HUD
        hud.setHealth(player.health, player.maxHealth);
        hud.setHunger(player.foodLevel, 20);
        hud.setExp(player.getXpProgress ? player.getXpProgress() : 0, player.getXpLevel ? player.getXpLevel() : 0);

    }
    
    // Process chunk streaming and terrain generation
    world.update(camera.position.x, camera.position.z, renderDistance);
    
    // Process mob spawning and entity updates
    if (typeof world.spawnMobs === 'function') {
        world.spawnMobs(player, delta);
    }
    if (typeof world.updateEntities === 'function') {
        world.updateEntities(delta, player, inventory, audio);
    }

    // Synchronize entity meshes in scene
    if (typeof world.getEntities === 'function') {
        for (const entity of world.getEntities()) {
            if (entity.mesh) {
                if (!entity.mesh.parent && scene) {
                    scene.add(entity.mesh);
                }
                entity.mesh.position.set(entity.position.x, entity.position.y, entity.position.z);
                if (entity.rotation && entity.type !== 'arrow' && entity.type !== 'item') {
                    entity.mesh.rotation.y = entity.rotation.yaw || 0;
                }
            }
        }
    }
    
    // Process environment
    dayNightCycle.update(delta, camera.position);
    weather.update(delta, player, camera);
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

window.MinecraftEngine = { scene, camera, renderer, world, player, redstone, hud, BLOCKS, weather, dayNightCycle, audio, inventory, DroppedItem, spawnDroppedItem, spawnBlockDrop, getMobDrop };


