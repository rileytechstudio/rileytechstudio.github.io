/**
 * Dropped Item Entity for Minecraft 1.5 WebGL Engine
 *
 * Features:
 * - Authentic Minecraft 1.5 dropped items in world-space
 * - Tiny 3D BoxGeometry (0.28x0.28x0.28) textured via procedural atlas for 3D blocks
 * - THREE.Sprite with crisp pixel-art textures for 2D items, tools, weapons, food, and plants
 * - Gravity physics, air drag, terrain collision, and subtle ground bouncing
 * - Aesthetic floating bobbing (sinusoidal) and smooth 360-degree rotation animation
 * - Magnet pickup mechanics: attracts within 1.5 blocks of player, flies towards inventory,
 *   adds to inventory (inventory.addItem), plays 'pop' sound, and removes from scene
 * - Authentic block drop tables (e.g. Stone -> Cobblestone, Grass -> Dirt, Diamond Ore -> Diamond, etc.)
 * - Authentic mob loot drop tables (Pig -> Porkchop, Cow -> Beef/Leather, Skeleton -> Arrow/Bone, etc.)
 */

import * as THREE from 'three';
import { Entity, AABB } from './mob.js';
import { BLOCKS } from '../core/chunk.js';
import { ITEM_IDS, isFoodItem } from '../core/crafting.js';
import { getTextureAtlas, getBlockFaceUV } from '../core/textureManager.js';
import { is3DBlock, SPRITE_BLOCKS } from '../assets/iconRenderer.js';
import { getItemIconDataUri } from '../ui/hud.js';
import { canHarvest } from '../core/mining.js';

// Cache for 2D item sprite textures
const ITEM_TEXTURE_CACHE = new Map();

/**
 * Retrieve or create a THREE.Texture for a given 2D item ID.
 * @param {number|string} itemId
 * @returns {THREE.Texture}
 */
export function getItemTexture(itemId) {
    const id = Number(itemId);
    if (ITEM_TEXTURE_CACHE.has(id)) {
        return ITEM_TEXTURE_CACHE.get(id);
    }

    const dataUri = getItemIconDataUri(id);
    if (!dataUri) {
        const atlas = getTextureAtlas();
        return atlas.texture;
    }

    const loader = new THREE.TextureLoader();
    const texture = loader.load(dataUri);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    ITEM_TEXTURE_CACHE.set(id, texture);
    return texture;
}

/**
 * Helper to set exact Atlas UV coordinates on a face of a THREE.BoxGeometry.
 * @param {THREE.BufferAttribute} uvAttr
 * @param {number} faceIndex 0..5
 * @param {{ uMin: number, vMin: number, uMax: number, vMax: number }} uvInfo
 */
function applyBoxFaceUV(uvAttr, faceIndex, uvInfo) {
    const { uMin, vMin, uMax, vMax } = uvInfo;
    const base = faceIndex * 4;
    // Standard Three.js BoxGeometry face vertices: top-left, top-right, bottom-left, bottom-right
    uvAttr.setXY(base + 0, uMin, vMax);
    uvAttr.setXY(base + 1, uMax, vMax);
    uvAttr.setXY(base + 2, uMin, vMin);
    uvAttr.setXY(base + 3, uMax, vMin);
}

/**
 * Calculate the dropped item result when a block is broken in Minecraft 1.5.
 * Respects tool harvestability rules (canHarvest) and standard Minecraft drops.
 *
 * @param {number} blockId - ID of broken block
 * @param {number|string|Object|null} [toolId=null] - Held tool ID
 * @returns {{ id: number, count: number }|null} Item drop or null if nothing drops
 */
export function getBlockDrop(blockId, toolId = null) {
    if (
        blockId === BLOCKS.AIR ||
        blockId === BLOCKS.BEDROCK ||
        blockId === BLOCKS.WATER ||
        blockId === BLOCKS.WATER_FLOWING ||
        blockId === BLOCKS.LAVA ||
        blockId === BLOCKS.LAVA_FLOWING
    ) {
        return null;
    }

    // Check if harvest requires tool and tool is capable
    if (!canHarvest(blockId, toolId)) {
        return null;
    }

    switch (blockId) {
        case BLOCKS.STONE:
            return { id: BLOCKS.COBBLESTONE, count: 1 };
        case BLOCKS.GRASS:
            return { id: BLOCKS.DIRT, count: 1 };
        case BLOCKS.COAL_ORE:
            return { id: ITEM_IDS.COAL, count: 1 };
        case BLOCKS.DIAMOND_ORE:
            return { id: ITEM_IDS.DIAMOND, count: 1 };
        case BLOCKS.REDSTONE_ORE:
            return { id: ITEM_IDS.REDSTONE, count: 4 + Math.floor(Math.random() * 2) };
        case BLOCKS.LAPIS_ORE:
            return { id: ITEM_IDS.LAPIS_LAZULI, count: 4 + Math.floor(Math.random() * 5) };
        case BLOCKS.QUARTZ_ORE:
            return { id: ITEM_IDS.QUARTZ, count: 1 };
        case BLOCKS.BOOKSHELF:
            return { id: ITEM_IDS.BOOK, count: 3 };
        case BLOCKS.OAK_LEAVES: {
            const r = Math.random();
            if (r < 0.10) return { id: BLOCKS.OAK_SAPLING, count: 1 };
            if (r < 0.12) return { id: ITEM_IDS.APPLE, count: 1 };
            return null;
        }
        case BLOCKS.GLASS:
            return null; // Glass shatters without silk touch
        case BLOCKS.TALL_GRASS:
            return Math.random() < 0.12 ? { id: ITEM_IDS.WHEAT, count: 1 } : null;
        case BLOCKS.DEAD_BUSH:
            return { id: ITEM_IDS.STICK, count: Math.floor(Math.random() * 3) };
        case BLOCKS.GRAVEL:
            return Math.random() < 0.10 ? { id: ITEM_IDS.STICK, count: 1 } : { id: BLOCKS.GRAVEL, count: 1 };
        default:
            return { id: blockId, count: 1 };
    }
}

/**
 * Calculate mob loot drop upon death.
 * @param {string} mobType
 * @returns {Array<{ id: number, count: number }>}
 */
export function getMobDrop(mobType) {
    const type = (mobType || '').toLowerCase().trim();
    switch (type) {
        case 'pig':
            return [{ id: ITEM_IDS.RAW_PORKCHOP, count: 1 + Math.floor(Math.random() * 2) }];
        case 'cow':
            return [
                { id: ITEM_IDS.RAW_BEEF, count: 1 + Math.floor(Math.random() * 3) },
                { id: ITEM_IDS.LEATHER, count: Math.floor(Math.random() * 2) }
            ];
        case 'sheep':
            return [{ id: BLOCKS.WOOL, count: 1 }];
        case 'zombie':
            return [{ id: ITEM_IDS.RAW_BEEF, count: 1 }];
        case 'skeleton':
            return [
                { id: ITEM_IDS.ARROW, count: Math.floor(Math.random() * 3) },
                { id: ITEM_IDS.STICK, count: Math.floor(Math.random() * 2) }
            ];
        case 'creeper':
            return [{ id: ITEM_IDS.GUNPOWDER, count: 1 + Math.floor(Math.random() * 2) }];
        case 'spider':
            return [{ id: ITEM_IDS.STICK, count: 1 + Math.floor(Math.random() * 2) }];
        default:
            return [];
    }
}

/**
 * DroppedItem Entity Class representing an item floating in the voxel world.
 */
export class DroppedItem extends Entity {
    /**
     * @param {number|Object} itemIdOrOptions - Item/Block ID or Options object
     * @param {number} [count=1] - Stack count
     * @param {number} [x=0] - World X
     * @param {number} [y=0] - World Y
     * @param {number} [z=0] - World Z
     * @param {Object} [options={}] - Extra parameters (velocity, pickupDelay, metadata, maxAge, etc.)
     */
    constructor(itemIdOrOptions, count = 1, x = 0, y = 0, z = 0, options = {}) {
        let itemId = itemIdOrOptions;
        let opts = options;

        if (typeof itemIdOrOptions === 'object' && itemIdOrOptions !== null) {
            opts = itemIdOrOptions;
            itemId = opts.itemId !== undefined ? opts.itemId : (opts.id !== undefined ? opts.id : 1);
            count = opts.count !== undefined ? opts.count : 1;
            x = opts.x !== undefined ? opts.x : 0;
            y = opts.y !== undefined ? opts.y : 0;
            z = opts.z !== undefined ? opts.z : 0;
        }

        super('item', x, y, z);

        this.itemId = Number(itemId);
        this.count = Number(count) || 1;
        this.isBlock = is3DBlock(this.itemId);
        this.item = {
            id: this.itemId,
            count: this.count,
            isBlock: this.isBlock,
            maxStack: 64
        };
        this.metadata = opts.metadata || {};

        // Hitbox dimensions
        this.width = 0.3;
        this.height = 0.3;
        this.eyeHeight = 0.15;
        this.updateHitbox();

        // Physics properties
        this.gravity = opts.gravity !== undefined ? opts.gravity : 18.0;
        this.bounce = opts.bounce !== undefined ? opts.bounce : 0.30;
        this.dragAir = 0.98;
        this.frictionGround = 0.60;
        this.onGround = false;

        // Lifetime & Pickup Delay
        this.age = 0;
        this.maxAge = opts.maxAge || 300.0; // 5 minutes standard MC despawn
        this.pickupDelay = opts.pickupDelay !== undefined ? opts.pickupDelay : 0.5; // 0.5s pickup cooldown

        // Animation parameters
        this.bobOffset = Math.random() * Math.PI * 2;
        this.rotationSpeed = 1.8 + Math.random() * 0.6; // ~2 rad/sec rotation

        // Initial toss velocity / pop impulse
        if (opts.velocity) {
            this.velocity.x = opts.velocity.x || 0;
            this.velocity.y = opts.velocity.y || 0;
            this.velocity.z = opts.velocity.z || 0;
        } else {
            const angle = Math.random() * Math.PI * 2;
            const horizSpeed = 0.6 + Math.random() * 0.8;
            this.velocity.x = Math.cos(angle) * horizSpeed;
            this.velocity.y = 2.4 + Math.random() * 1.2;
            this.velocity.z = Math.sin(angle) * horizSpeed;
        }

        // Three.js visual hierarchy
        this.mesh = this.createVisualMesh();
        this.mesh.position.set(x, y, z);
        this.mesh.userData.entity = this;
        this.mesh.userData.droppedItem = this;
        this.mesh.userData.item = this.item;
    }

    /**
     * Create the 3D BoxGeometry mesh or 2D Sprite visual.
     * @returns {THREE.Group} Root visual group
     */
    createVisualMesh() {
        const rootGroup = new THREE.Group();
        const innerGroup = new THREE.Group();
        innerGroup.name = 'innerVisual';

        if (this.isBlock) {
            // 3D Mini Voxel Cube (0.28m on each side)
            const boxGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
            const uvAttr = boxGeo.attributes.uv;

            // Map authentic UVs for all 6 faces from texture atlas
            const eastUV = getBlockFaceUV(this.itemId, 'side', 'east');
            const westUV = getBlockFaceUV(this.itemId, 'side', 'west');
            const topUV = getBlockFaceUV(this.itemId, 'top', 'top');
            const bottomUV = getBlockFaceUV(this.itemId, 'bottom', 'bottom');
            const southUV = getBlockFaceUV(this.itemId, 'side', 'south');
            const northUV = getBlockFaceUV(this.itemId, 'side', 'north');

            applyBoxFaceUV(uvAttr, 0, eastUV);
            applyBoxFaceUV(uvAttr, 1, westUV);
            applyBoxFaceUV(uvAttr, 2, topUV);
            applyBoxFaceUV(uvAttr, 3, bottomUV);
            applyBoxFaceUV(uvAttr, 4, southUV);
            applyBoxFaceUV(uvAttr, 5, northUV);
            uvAttr.needsUpdate = true;

            const atlas = getTextureAtlas();
            const mat = new THREE.MeshLambertMaterial({
                map: atlas.texture,
                transparent: true,
                alphaTest: 0.1
            });
            const cube = new THREE.Mesh(boxGeo, mat);
            cube.castShadow = true;
            cube.receiveShadow = true;
            innerGroup.add(cube);
        } else {
            // 2D Pixel-art Sprite
            const texture = getItemTexture(this.itemId);
            const spriteMat = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.1
            });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.scale.set(0.35, 0.35, 0.35);
            innerGroup.add(sprite);
        }

        rootGroup.add(innerGroup);
        return rootGroup;
    }

    /**
     * Physics, magnet attraction, and bobbing/rotation update tick.
     * @param {number} delta - Frame delta time in seconds
     * @param {World|null} [world=null]
     * @param {Player|null} [player=null]
     * @param {InventoryManager|null} [inventory=null]
     * @param {SoundManager|null} [audio=null]
     */
    update(delta = 0.05, world = null, player = null, inventory = null, audio = null) {
        if (this.removed || this.isDead) return;

        this.age += delta;
        this.ticksLived++;

        // Despawn check
        if (this.age >= this.maxAge) {
            this.remove(world);
            return;
        }

        // Decrement pickup cooldown
        if (this.pickupDelay > 0) {
            this.pickupDelay = Math.max(0, this.pickupDelay - delta);
        }

        // Resolve active player, inventory, audio from global context if omitted
        const activePlayer = player || (typeof window !== 'undefined' ? window.player : null);
        const activeInventory = inventory || (typeof window !== 'undefined' ? window.inventory : null);
        const activeAudio = audio || (typeof window !== 'undefined' && window.MinecraftEngine ? window.MinecraftEngine.audio : null);

        // ==========================================
        // 1. MAGNET PICKUP MECHANICS
        // ==========================================
        if (activePlayer && this.pickupDelay <= 0) {
            const pPos = activePlayer.position;
            const targetY = pPos.y + (activePlayer.eyeHeight ? activePlayer.eyeHeight * 0.5 : 0.8);
            const dx = pPos.x - this.position.x;
            const dy = targetY - this.position.y;
            const dz = pPos.z - this.position.z;
            const dist = Math.hypot(dx, dy, dz);

            // Within 1.5 blocks magnet radius: fly rapidly towards player
            if (dist <= 1.5) {
                const flySpeed = Math.min(18.0, 6.0 + (1.5 - dist) * 12.0);
                if (dist > 0.001) {
                    this.velocity.x = (dx / dist) * flySpeed;
                    this.velocity.y = (dy / dist) * flySpeed;
                    this.velocity.z = (dz / dist) * flySpeed;
                }
                this.onGround = false;

                // Close enough for inventory collection (0.45 blocks)
                if (dist <= 0.45) {
                    if (activeInventory && typeof activeInventory.addItem === 'function') {
                        const remaining = activeInventory.addItem(this.itemId, this.count, this.metadata);
                        const collectedCount = this.count - remaining;

                        if (collectedCount > 0) {
                            // Play pop sound upon pickup
                            if (activeAudio) {
                                if (typeof activeAudio.play === 'function') {
                                    activeAudio.play('pop', new THREE.Vector3(this.position.x, this.position.y, this.position.z));
                                } else if (typeof activeAudio.playSound === 'function') {
                                    activeAudio.playSound('pop', this.position);
                                }
                            } else if (typeof window !== 'undefined' && window.audio && typeof window.audio.play === 'function') {
                                window.audio.play('pop', new THREE.Vector3(this.position.x, this.position.y, this.position.z));
                            }

                            if (remaining <= 0) {
                                this.remove(world);
                                return;
                            } else {
                                this.count = remaining;
                                this.item.count = remaining;
                            }
                        }
                    }
                }
            }
        }

        // ==========================================
        // 2. GRAVITY & VELOCITY PHYSICS
        // ==========================================
        if (!this.onGround) {
            this.velocity.y -= this.gravity * delta;
            this.velocity.x *= Math.pow(this.dragAir, delta * 20);
            this.velocity.z *= Math.pow(this.dragAir, delta * 20);
        } else {
            this.velocity.x *= Math.pow(this.frictionGround, delta * 20);
            this.velocity.z *= Math.pow(this.frictionGround, delta * 20);
            this.velocity.y = 0;
        }

        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;

        // ==========================================
        // 3. TERRAIN VOXEL COLLISION & BOUNCE
        // ==========================================
        const activeWorld = world || (typeof window !== 'undefined' ? window.world : null);
        if (activeWorld && typeof activeWorld.isSolid === 'function') {
            const bx = Math.floor(this.position.x);
            const bz = Math.floor(this.position.z);
            const footY = Math.floor(this.position.y);
            const checkBelowY = Math.floor(this.position.y - 0.05);

            // Ground floor contact
            if (activeWorld.isSolid(bx, checkBelowY, bz) && this.velocity.y <= 0) {
                const groundY = checkBelowY + 1.0;
                if (this.position.y - groundY < 0.35) {
                    this.position.y = groundY;
                    if (Math.abs(this.velocity.y) > 2.0) {
                        this.velocity.y = -this.velocity.y * this.bounce; // Bounce slightly
                    } else {
                        this.velocity.y = 0;
                        this.onGround = true;
                    }
                }
            } else {
                // If block underneath became air, resume falling
                if (!activeWorld.isSolid(bx, footY - 1, bz) && this.position.y <= footY) {
                    this.onGround = false;
                }
            }

            // Embedded in solid block -> push upwards to top of block
            if (activeWorld.isSolid(bx, Math.floor(this.position.y), bz)) {
                this.position.y = Math.floor(this.position.y) + 1.0;
                this.velocity.y = 0;
                this.onGround = true;
            }
        }

        this.updateHitbox();

        // ==========================================
        // 4. AESTHETIC BOBBING & ROTATING ANIMATION
        // ==========================================
        this.rotation.yaw += this.rotationSpeed * delta;
        const bob = Math.sin(this.age * 3.0 + this.bobOffset) * 0.05 + 0.12;

        if (this.mesh) {
            this.mesh.position.set(this.position.x, this.position.y, this.position.z);
            const inner = this.mesh.getObjectByName('innerVisual');
            if (inner) {
                inner.position.y = bob;
                inner.rotation.y = this.rotation.yaw;
            }
        }
    }

    /**
     * Remove dropped item entity from scene and world.
     * @param {World|null} [world=null]
     */
    remove(world = null) {
        this.removed = true;
        this.isDead = true;

        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
            this.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
        }

        const activeWorld = world || (typeof window !== 'undefined' ? window.world : null);
        if (activeWorld && typeof activeWorld.removeEntity === 'function') {
            activeWorld.removeEntity(this);
        }
    }
}

/**
 * Factory helper to spawn a DroppedItem in the world and scene.
 *
 * @param {number} itemId - Block or Item ID
 * @param {number} [count=1] - Number of items
 * @param {number} [x=0] - World X
 * @param {number} [y=0] - World Y
 * @param {number} [z=0] - World Z
 * @param {World|null} [world=null] - World instance
 * @param {THREE.Scene|null} [scene=null] - Scene instance
 * @param {Object} [options={}] - Additional spawn options
 * @returns {DroppedItem}
 */
export function spawnDroppedItem(itemId, count = 1, x = 0, y = 0, z = 0, world = null, scene = null, options = {}) {
    const item = new DroppedItem(itemId, count, x, y, z, options);

    const activeWorld = world || (typeof window !== 'undefined' ? window.world : null);
    if (activeWorld && typeof activeWorld.addEntity === 'function') {
        activeWorld.addEntity(item);
    }

    const activeScene = scene || (activeWorld ? activeWorld.scene : null) || (typeof window !== 'undefined' && window.MinecraftEngine ? window.MinecraftEngine.scene : null);
    if (activeScene && item.mesh && !item.mesh.parent) {
        activeScene.add(item.mesh);
    }

    return item;
}

/**
 * Calculate drop and spawn a dropped item when a block is destroyed.
 *
 * @param {number} blockId - Broken Block ID
 * @param {number|string|Object|null} [toolId=null] - Tool used to break block
 * @param {number} x - Block X coordinate
 * @param {number} y - Block Y coordinate
 * @param {number} z - Block Z coordinate
 * @param {World|null} [world=null] - World instance
 * @param {THREE.Scene|null} [scene=null] - Scene instance
 * @param {Object} [options={}] - Extra spawn options
 * @returns {DroppedItem|null}
 */
export function spawnBlockDrop(blockId, toolId = null, x = 0, y = 0, z = 0, world = null, scene = null, options = {}) {
    const drop = getBlockDrop(blockId, toolId);
    if (!drop || !drop.id || drop.count <= 0) return null;

    const spawnX = Math.floor(x) + 0.5;
    const spawnY = Math.floor(y) + 0.2;
    const spawnZ = Math.floor(z) + 0.5;

    return spawnDroppedItem(drop.id, drop.count, spawnX, spawnY, spawnZ, world, scene, options);
}

export default {
    DroppedItem,
    getItemTexture,
    getBlockDrop,
    getMobDrop,
    spawnDroppedItem,
    spawnBlockDrop
};
