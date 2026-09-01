/**
 * Player Entity & Swept AABB Voxel Physics for Minecraft 1.5 WebGL Engine
 *
 * Features:
 * - Player class with position, velocity, dimensions, and orientation
 * - Survival Mechanics (foodLevel 0-20, saturation 0-20, exhaustion, xp/levels, health 0-20)
 * - Hunger depletion on sprinting and jumping (Minecraft 1.5 mechanics)
 * - Health regeneration when foodLevel >= 18
 * - Starvation damage when foodLevel == 0
 * - Right-click food eating / consumption (eat method)
 * - update(delta, world, moveState) method
 * - Exact Swept AABB collision detection against voxel grid
 * - Water physics (AABB intersection, viscous drag, buoyancy on jump, slow sink, fall damage prevention)
 * - Gravity acceleration (32 m/s^2)
 * - Step-up (0.6 blocks) for slabs and steps
 * - Sneaking edge-fall prevention
 * - Ground & air friction, jumping, and creative flight
 * - Multi-provider world support (Chunk, World, Map, function)
 */

import { BLOCKS, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z, Chunk } from '../core/chunk.js';
import { getFoodProperties, isFoodItem, ITEM_IDS } from '../core/crafting.js';

/**
 * Set of block IDs that are non-solid and passable (entities can occupy or walk through).
 */
export const NON_SOLID_BLOCKS = new Set([
    BLOCKS.AIR,            // 0
    BLOCKS.OAK_SAPLING,    // 6
    BLOCKS.WATER_FLOWING,  // 8
    BLOCKS.WATER,          // 9
    BLOCKS.LAVA_FLOWING,   // 10
    BLOCKS.LAVA,           // 11
    BLOCKS.TALL_GRASS,     // 31
    BLOCKS.DEAD_BUSH,      // 32
    BLOCKS.DANDELION,      // 37
    BLOCKS.POPPY,          // 38
    BLOCKS.BROWN_MUSHROOM, // 39
    BLOCKS.RED_MUSHROOM,   // 40
    BLOCKS.TORCH,          // 50
    BLOCKS.FIRE,           // 51
    BLOCKS.WHEAT,          // 59
    BLOCKS.SNOW_LAYER,     // 78
    BLOCKS.SUGAR_CANE      // 83
]);

/**
 * Check if a block ID is solid terrain.
 * @param {number} blockId
 * @returns {boolean}
 */
export function isBlockSolid(blockId) {
    if (blockId === undefined || blockId === null || blockId === BLOCKS.AIR || blockId === 0) {
        return false;
    }
    return !NON_SOLID_BLOCKS.has(blockId);
}

/**
 * Retrieve block ID at integer world coordinates from any supported world provider.
 * Supports:
 * - Function: world(x, y, z)
 * - Object with getBlock(x, y, z)
 * - Chunk instance (world.sizeX, world.x, world.z)
 * - Map of chunks keyed by 'cx,cz'
 * - Object with getChunk(cx, cz)
 *
 * @param {Object|Function|Map} world
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {number} Block ID (0 for AIR / out of bounds)
 */
export function getBlockAt(world, x, y, z) {
    if (!world) return BLOCKS.AIR;
    const maxY = (typeof CHUNK_SIZE_Y === 'number') ? CHUNK_SIZE_Y : 256;
    if (y < 0 || y >= maxY) return BLOCKS.AIR;

    // Direct callback resolver
    if (typeof world === 'function') {
        return world(x, y, z) || BLOCKS.AIR;
    }

    // Chunk instance (converting world coord to local chunk coord)
    if (world instanceof Chunk || ('blocks' in world && 'sizeX' in world && typeof world.getBlock === 'function')) {
        const sizeX = world.sizeX || CHUNK_SIZE_X || 16;
        const sizeZ = world.sizeZ || CHUNK_SIZE_Z || 16;
        const chunkOriginX = (world.x !== undefined ? world.x : (world.cx || 0)) * sizeX;
        const chunkOriginZ = (world.z !== undefined ? world.z : (world.cz || 0)) * sizeZ;
        const lx = x - chunkOriginX;
        const lz = z - chunkOriginZ;

        if (lx >= 0 && lx < sizeX && lz >= 0 && lz < sizeZ && y >= 0 && y < (world.sizeY || maxY)) {
            return world.getBlock(lx, y, lz);
        }
        return BLOCKS.AIR;
    }

    // World object with getBlock method
    if (typeof world.getBlock === 'function') {
        return world.getBlock(x, y, z) || BLOCKS.AIR;
    }

    // Map of chunks
    if (world instanceof Map) {
        const sizeX = CHUNK_SIZE_X || 16;
        const sizeZ = CHUNK_SIZE_Z || 16;
        const cx = Math.floor(x / sizeX);
        const cz = Math.floor(z / sizeZ);
        const chunk = world.get(cx + ',' + cz) || world.get(cx + '_' + cz);
        if (chunk) {
            const lx = ((x % sizeX) + sizeX) % sizeX;
            const lz = ((z % sizeZ) + sizeZ) % sizeZ;
            return chunk.getBlock(lx, y, lz);
        }
        return BLOCKS.AIR;
    }

    // Object with getChunk method
    if (typeof world.getChunk === 'function') {
        const sizeX = CHUNK_SIZE_X || 16;
        const sizeZ = CHUNK_SIZE_Z || 16;
        const cx = Math.floor(x / sizeX);
        const cz = Math.floor(z / sizeZ);
        const chunk = world.getChunk(cx, cz);
        if (chunk) {
            const lx = ((x % sizeX) + sizeX) % sizeX;
            const lz = ((z % sizeZ) + sizeZ) % sizeZ;
            return chunk.getBlock(lx, y, lz);
        }
        return BLOCKS.AIR;
    }

    return BLOCKS.AIR;
}

/**
 * Check if the block at integer world coordinate (x, y, z) is solid.
 * @param {Object|Function|Map} world
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {boolean}
 */
export function isSolidAt(world, x, y, z) {
    if (!world) return false;
    if (typeof world.isSolid === 'function') {
        return world.isSolid(x, y, z);
    }
    if (typeof world.isBlockSolid === 'function') {
        return world.isBlockSolid(x, y, z);
    }
    const blockId = getBlockAt(world, x, y, z);
    return isBlockSolid(blockId);
}

/**
 * Axis-Aligned Bounding Box (AABB) with swept collision query and offset routines.
 */
export class AABB {
    /**
     * @param {number} [minX=0]
     * @param {number} [minY=0]
     * @param {number} [minZ=0]
     * @param {number} [maxX=0]
     * @param {number} [maxY=0]
     * @param {number} [maxZ=0]
     */
    constructor(minX = 0, minY = 0, minZ = 0, maxX = 0, maxY = 0, maxZ = 0) {
        this.minX = minX;
        this.minY = minY;
        this.minZ = minZ;
        this.maxX = maxX;
        this.maxY = maxY;
        this.maxZ = maxZ;
    }

    /**
     * Set bounds directly
     * @returns {AABB} this
     */
    set(minX, minY, minZ, maxX, maxY, maxZ) {
        this.minX = minX;
        this.minY = minY;
        this.minZ = minZ;
        this.maxX = maxX;
        this.maxY = maxY;
        this.maxZ = maxZ;
        return this;
    }

    /**
     * Set bounds from center position (feet at y) and dimensions
     * @param {number} x - Center X
     * @param {number} y - Bottom Y (feet level)
     * @param {number} z - Center Z
     * @param {number} width - Horizontal extent (width in X and Z)
     * @param {number} height - Vertical extent (height in Y)
     * @returns {AABB} this
     */
    setFromCenterAndSize(x, y, z, width, height) {
        const halfW = width / 2;
        this.minX = x - halfW;
        this.maxX = x + halfW;
        this.minY = y;
        this.maxY = y + height;
        this.minZ = z - halfW;
        this.maxZ = z + halfW;
        return this;
    }

    /**
     * Clone this AABB
     * @returns {AABB}
     */
    clone() {
        return new AABB(this.minX, this.minY, this.minZ, this.maxX, this.maxY, this.maxZ);
    }

    /**
     * Copy bounds from another AABB
     * @param {AABB} other
     * @returns {AABB} this
     */
    copy(other) {
        this.minX = other.minX;
        this.minY = other.minY;
        this.minZ = other.minZ;
        this.maxX = other.maxX;
        this.maxY = other.maxY;
        this.maxZ = other.maxZ;
        return this;
    }

    /**
     * Offset / Translate this AABB
     * @param {number} dx
     * @param {number} dy
     * @param {number} dz
     * @returns {AABB} this
     */
    move(dx, dy, dz) {
        this.minX += dx;
        this.minY += dy;
        this.minZ += dz;
        this.maxX += dx;
        this.maxY += dy;
        this.maxZ += dz;
        return this;
    }

    /**
     * Offset / Translate this AABB (alias for move)
     * @param {number} dx
     * @param {number} dy
     * @param {number} dz
     * @returns {AABB} this
     */
    offset(dx, dy, dz) {
        return this.move(dx, dy, dz);
    }

    /**
     * Return a new AABB expanded to enclose the swept displacement (dx, dy, dz)
     * @param {number} dx
     * @param {number} dy
     * @param {number} dz
     * @returns {AABB}
     */
    expand(dx, dy, dz) {
        let minX = this.minX;
        let minY = this.minY;
        let minZ = this.minZ;
        let maxX = this.maxX;
        let maxY = this.maxY;
        let maxZ = this.maxZ;

        if (dx < 0) minX += dx;
        if (dx > 0) maxX += dx;
        if (dy < 0) minY += dy;
        if (dy > 0) maxY += dy;
        if (dz < 0) minZ += dz;
        if (dz > 0) maxZ += dz;

        return new AABB(minX, minY, minZ, maxX, maxY, maxZ);
    }

    /**
     * Check if this AABB intersects another AABB
     * @param {AABB} other
     * @returns {boolean}
     */
    intersects(other) {
        return (
            this.maxX > other.minX && this.minX < other.maxX &&
            this.maxY > other.minY && this.minY < other.maxY &&
            this.maxZ > other.minZ && this.minZ < other.maxZ
        );
    }

    /**
     * Check if a 3D point is inside this AABB
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {boolean}
     */
    containsPoint(x, y, z) {
        return (
            x >= this.minX && x <= this.maxX &&
            y >= this.minY && y <= this.maxY &&
            z >= this.minZ && z <= this.maxZ
        );
    }

    /**
     * Calculate allowable swept X offset before colliding with other
     * @param {AABB} other - Moving entity AABB
     * @param {number} dx - Requested X displacement
     * @returns {number} Clamped X displacement
     */
    calculateXOffset(other, dx) {
        if (other.maxY <= this.minY || other.minY >= this.maxY) return dx;
        if (other.maxZ <= this.minZ || other.minZ >= this.maxZ) return dx;

        if (dx > 0 && other.maxX <= this.minX) {
            const maxOffset = this.minX - other.maxX;
            if (maxOffset < dx) dx = maxOffset;
        } else if (dx < 0 && other.minX >= this.maxX) {
            const maxOffset = this.maxX - other.minX;
            if (maxOffset > dx) dx = maxOffset;
        }
        return dx;
    }

    /**
     * Calculate allowable swept Y offset before colliding with other
     * @param {AABB} other - Moving entity AABB
     * @param {number} dy - Requested Y displacement
     * @returns {number} Clamped Y displacement
     */
    calculateYOffset(other, dy) {
        if (other.maxX <= this.minX || other.minX >= this.maxX) return dy;
        if (other.maxZ <= this.minZ || other.minZ >= this.maxZ) return dy;

        if (dy > 0 && other.maxY <= this.minY) {
            const maxOffset = this.minY - other.maxY;
            if (maxOffset < dy) dy = maxOffset;
        } else if (dy < 0 && other.minY >= this.maxY) {
            const maxOffset = this.maxY - other.minY;
            if (maxOffset > dy) dy = maxOffset;
        }
        return dy;
    }

    /**
     * Calculate allowable swept Z offset before colliding with other
     * @param {AABB} other - Moving entity AABB
     * @param {number} dz - Requested Z displacement
     * @returns {number} Clamped Z displacement
     */
    calculateZOffset(other, dz) {
        if (other.maxX <= this.minX || other.minX >= this.maxX) return dz;
        if (other.maxY <= this.minY || other.minY >= this.maxY) return dz;

        if (dz > 0 && other.maxZ <= this.minZ) {
            const maxOffset = this.minZ - other.maxZ;
            if (maxOffset < dz) dz = maxOffset;
        } else if (dz < 0 && other.minZ >= this.maxZ) {
            const maxOffset = this.maxZ - other.minZ;
            if (maxOffset > dz) dz = maxOffset;
        }
        return dz;
    }
}

/**
 * Find all solid voxel bounding boxes overlapping the expanded query AABB.
 * @param {Object|Function|Map} world
 * @param {AABB} expandedAABB
 * @returns {AABB[]}
 */
export function getCollidingBoxes(world, expandedAABB) {
    if (!world) return [];
    const boxes = [];
    const minX = Math.floor(expandedAABB.minX);
    const maxX = Math.floor(expandedAABB.maxX + 1);
    const minY = Math.max(0, Math.floor(expandedAABB.minY));
    const maxY = Math.min((typeof CHUNK_SIZE_Y === 'number') ? CHUNK_SIZE_Y : 256, Math.floor(expandedAABB.maxY + 1));
    const minZ = Math.floor(expandedAABB.minZ);
    const maxZ = Math.floor(expandedAABB.maxZ + 1);

    for (let y = minY; y < maxY; y++) {
        for (let z = minZ; z < maxZ; z++) {
            for (let x = minX; x < maxX; x++) {
                if (isSolidAt(world, x, y, z)) {
                    boxes.push(new AABB(x, y, z, x + 1, y + 1, z + 1));
                }
            }
        }
    }
    return boxes;
}

/**
 * Check if solid ground exists underneath the horizontal footprint.
 * Used for sneaking edge-fall protection.
 * @param {Object|Function|Map} world
 * @param {number} minX
 * @param {number} maxX
 * @param {number} minY
 * @param {number} minZ
 * @param {number} maxZ
 * @returns {boolean}
 */
export function hasBlockBelow(world, minX, maxX, minY, minZ, maxZ) {
    if (!world) return true;
    const checkY = Math.floor(minY - 0.01);
    if (checkY < 0) return false;

    const startX = Math.floor(minX + 0.001);
    const endX = Math.floor(maxX - 0.001);
    const startZ = Math.floor(minZ + 0.001);
    const endZ = Math.floor(maxZ - 0.001);

    for (let x = startX; x <= endX; x++) {
        for (let z = startZ; z <= endZ; z++) {
            if (isSolidAt(world, x, checkY, z)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * 3D Vector helper with basic vector arithmetic.
 */
export class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    multiplyScalar(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    length() {
        return Math.hypot(this.x, this.y, this.z);
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    normalize() {
        const len = this.length();
        if (len > 0.00001) {
            this.x /= len;
            this.y /= len;
            this.z /= len;
        }
        return this;
    }
}

/**
 * Player class for Minecraft 1.5 WebGL Engine.
 * Encapsulates position, velocity, swept AABB physics, water physics, gravity, and survival mechanics.
 */
export class Player {
    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     * @param {Object} [options={}]
     */
    constructor(x = 0, y = 0, z = 0, options = {}) {
        // Position and Previous Position (feet at y)
        this.position = new Vector3(x, y, z);
        this.prevPosition = new Vector3(x, y, z);

        // Velocity (meters or blocks per second)
        this.velocity = new Vector3(0, 0, 0);

        // Rotation in radians (yaw: Y axis rotation, pitch: X axis tilt)
        this.rotation = { yaw: options.yaw || 0, pitch: options.pitch || 0 };

        // Dimensions (Minecraft standard: 0.6m wide, 1.8m high)
        this.width = options.width !== undefined ? options.width : 0.6;
        this.height = options.height !== undefined ? options.height : 1.8;
        this.eyeHeight = options.eyeHeight !== undefined ? options.eyeHeight : 1.62;

        // Kinematic & Physical Constants
        this.gravity = options.gravity !== undefined ? options.gravity : 32.0;
        this.terminalVelocity = options.terminalVelocity !== undefined ? options.terminalVelocity : 78.4;
        this.jumpSpeed = options.jumpSpeed !== undefined ? options.jumpSpeed : 9.0;
        this.walkSpeed = options.walkSpeed !== undefined ? options.walkSpeed : 4.317;
        this.sprintSpeed = options.sprintSpeed !== undefined ? options.sprintSpeed : 6.8;
        this.sneakSpeed = options.sneakSpeed !== undefined ? options.sneakSpeed : 1.3;
        this.flySpeed = options.flySpeed !== undefined ? options.flySpeed : 11.0;
        this.stepHeight = options.stepHeight !== undefined ? options.stepHeight : 0.6;

        // State Flags
        this.onGround = false;
        this.inWater = false;
        this.wasInWater = false;
        this.isCollidedHorizontally = false;
        this.isCollidedVertically = false;
        this.flying = Boolean(options.flying);
        this.isSneaking = false;
        this.isSprinting = false;

        // Survival & Health Mechanics (Minecraft 1.5 Standard: 20 HP, 20 Food, 20 Saturation)
        this.maxHealth = options.maxHealth !== undefined ? options.maxHealth : 20;
        this.health = options.health !== undefined ? Math.max(0, Math.min(this.maxHealth, options.health)) : 20;
        this.foodLevel = options.foodLevel !== undefined ? Math.max(0, Math.min(20, options.foodLevel)) : (options.hunger !== undefined ? Math.max(0, Math.min(20, options.hunger)) : 20);
        this.saturation = options.saturation !== undefined ? Math.max(0, Math.min(this.foodLevel, options.saturation)) : 5.0;
        this.exhaustion = options.exhaustion !== undefined ? Number(options.exhaustion) || 0.0 : 0.0;
        this.xp = options.xp !== undefined ? Math.max(0, Number(options.xp) || 0) : 0;

        // Survival Internal Timers
        this.healTimer = 0;
        this.starveTimer = 0;
        this.isDead = this.health <= 0;

        // Water Physics Parameters
        this.waterSwimSpeed = options.waterSwimSpeed !== undefined ? options.waterSwimSpeed : 2.5;
        this.waterSinkSpeed = options.waterSinkSpeed !== undefined ? options.waterSinkSpeed : 1.2;
        this.waterUpwardSpeed = options.waterUpwardSpeed !== undefined ? options.waterUpwardSpeed : 3.5;
        this.waterDrag = options.waterDrag !== undefined ? options.waterDrag : 0.8;

        // Optional attached Camera / Scene Object
        this.camera = options.camera || null;

        // Bounding Box
        this.aabb = new AABB();
        this.updateHitbox();
    }

    // ==========================================
    // SURVIVAL GETTERS, SETTERS & METHODS
    // ==========================================

    get hunger() {
        return this.foodLevel;
    }

    set hunger(val) {
        this.setFoodLevel(val);
    }

    /**
     * Get current food / hunger level (0 - 20)
     * @returns {number}
     */
    getFoodLevel() {
        return this.foodLevel;
    }

    /**
     * Set food level clamped between 0 and 20.
     * Also clamps saturation to new food level.
     * @param {number} level
     * @returns {number}
     */
    setFoodLevel(level) {
        this.foodLevel = Math.max(0, Math.min(20, Number(level) || 0));
        if (this.saturation > this.foodLevel) {
            this.saturation = this.foodLevel;
        }
        return this.foodLevel;
    }

    /**
     * Get current saturation level (0 - 20)
     * @returns {number}
     */
    getSaturation() {
        return this.saturation;
    }

    /**
     * Set saturation level clamped between 0 and foodLevel
     * @param {number} sat
     * @returns {number}
     */
    setSaturation(sat) {
        this.saturation = Math.max(0, Math.min(this.foodLevel, Math.min(20, Number(sat) || 0)));
        return this.saturation;
    }

    /**
     * Get current health (0 - 20)
     * @returns {number}
     */
    getHealth() {
        return this.health;
    }

    /**
     * Set health clamped between 0 and maxHealth
     * @param {number} hp
     * @returns {number}
     */
    setHealth(hp) {
        this.health = Math.max(0, Math.min(this.maxHealth, Number(hp) || 0));
        this.isDead = this.health <= 0;
        return this.health;
    }

    /**
     * Heal player by a specified amount
     * @param {number} amount
     * @returns {number} Actual health restored
     */
    heal(amount) {
        if (this.isDead || amount <= 0) return 0;
        const prev = this.health;
        this.setHealth(this.health + amount);
        return this.health - prev;
    }

    /**
     * Damage player by a specified amount
     * @param {number} amount
     * @param {string} [source='generic']
     * @returns {number} Actual damage taken
     */
    damage(amount, source = 'generic') {
        if (this.isDead || amount <= 0) return 0;
        const prev = this.health;
        this.setHealth(this.health - amount);
        this.addExhaustion(0.3);
        return prev - this.health;
    }

    /**
     * Add exhaustion points. When exhaustion reaches 4.0, depletes 1 saturation (or 1 foodLevel).
     * @param {number} amount
     */
    addExhaustion(amount) {
        if (amount <= 0 || isNaN(amount)) return;
        this.exhaustion += amount;
        while (this.exhaustion >= 4.0) {
            this.exhaustion -= 4.0;
            if (this.saturation > 0) {
                this.saturation = Math.max(0, this.saturation - 1.0);
            } else if (this.foodLevel > 0) {
                this.foodLevel = Math.max(0, this.foodLevel - 1);
            }
        }
    }

    /**
     * Consume food item to restore hunger and saturation.
     * @param {Object|number} foodItem ItemStack, item definition, or item ID
     * @param {number} [foodPoints=null] Optional explicit food points override
     * @param {number} [saturationPoints=null] Optional explicit saturation override
     * @returns {{ eaten: boolean, foodRestored: number, saturationRestored: number, foodLevel: number, saturation: number }|boolean}
     */
    eat(foodItem, foodPoints = null, saturationPoints = null) {
        let value = 0;
        let sat = 0;
        let canAlwaysEat = false;

        if (typeof foodItem === 'object' && foodItem !== null) {
            value = foodItem.foodValue !== undefined ? foodItem.foodValue : (foodPoints || 0);
            sat = foodItem.saturation !== undefined ? foodItem.saturation : (saturationPoints || 0);
            canAlwaysEat = Boolean(foodItem.canAlwaysEat);
            if (!value && foodItem.id) {
                const props = getFoodProperties(foodItem.id);
                if (props) {
                    value = props.foodValue;
                    sat = props.saturation;
                    canAlwaysEat = Boolean(props.canAlwaysEat);
                }
            }
        } else if (typeof foodItem === 'number') {
            const props = getFoodProperties(foodItem);
            if (props) {
                value = props.foodValue;
                sat = props.saturation;
                canAlwaysEat = Boolean(props.canAlwaysEat);
            } else {
                value = foodPoints || 0;
                sat = saturationPoints || 0;
            }
        }

        // If not edible or hunger is already full (and food not marked canAlwaysEat)
        if (value <= 0 && !canAlwaysEat) {
            return false;
        }
        if (this.foodLevel >= 20 && !canAlwaysEat) {
            return false;
        }

        const prevFood = this.foodLevel;
        const prevSat = this.saturation;

        this.foodLevel = Math.min(20, this.foodLevel + value);
        this.saturation = Math.min(this.foodLevel, this.saturation + sat);

        return {
            eaten: true,
            foodRestored: this.foodLevel - prevFood,
            saturationRestored: this.saturation - prevSat,
            foodLevel: this.foodLevel,
            saturation: this.saturation
        };
    }

    /**
     * Add experience points
     * @param {number} amount
     * @returns {number} Total XP
     */
    addExperience(amount) {
        if (amount <= 0 || isNaN(amount)) return this.xp;
        this.xp += amount;
        return this.xp;
    }

    /**
     * Alias for addExperience
     * @param {number} amount
     * @returns {number}
     */
    addXp(amount) {
        return this.addExperience(amount);
    }

    /**
     * Set experience points directly
     * @param {number} amount
     * @returns {number}
     */
    setExperience(amount) {
        this.xp = Math.max(0, Number(amount) || 0);
        return this.xp;
    }

    /**
     * Set XP directly (alias)
     * @param {number} amount
     * @returns {number}
     */
    setXp(amount) {
        return this.setExperience(amount);
    }

    /**
     * Calculate current XP Level based on standard Minecraft 1.5 formula
     * @returns {number} Integer level (0, 1, 2, ...)
     */
    getXpLevel() {
        let level = 0;
        let remaining = this.xp;
        while (true) {
            const required = this.getXpRequiredForLevel(level);
            if (remaining >= required) {
                remaining -= required;
                level++;
            } else {
                break;
            }
        }
        return level;
    }

    /**
     * Calculate progress towards next level [0.0 - 1.0)
     * @returns {number} Float in range [0, 1)
     */
    getXpProgress() {
        let level = 0;
        let remaining = this.xp;
        while (true) {
            const required = this.getXpRequiredForLevel(level);
            if (remaining >= required) {
                remaining -= required;
                level++;
            } else {
                return required > 0 ? (remaining / required) : 0;
            }
        }
    }

    /**
     * XP required to transition from level to level + 1 (Minecraft 1.5)
     * @param {number} level
     * @returns {number}
     */
    getXpRequiredForLevel(level) {
        if (level < 16) return 17;
        if (level < 30) return 3 * level - 28;
        return 7 * level - 148;
    }

    // ==========================================
    // HITBOX & ORIENTATION
    // ==========================================

    /**
     * Update the player's AABB based on current position and dimensions.
     */
    updateHitbox() {
        this.aabb.setFromCenterAndSize(
            this.position.x,
            this.position.y,
            this.position.z,
            this.width,
            this.height
        );
    }

    /**
     * Get the current player bounding box
     * @returns {AABB}
     */
    getAABB() {
        return this.aabb;
    }

    /**
     * Check if the player is currently submerged or intersecting WATER or WATER_FLOWING blocks.
     * Checks multiple key sample points (feet, waist, center, chest, eyes) and full AABB voxel intersections.
     * @param {Object|Function|Map} world
     * @returns {boolean}
     */
    checkInWater(world) {
        if (!world) return false;

        // 1. Check multiple key sample points along player's vertical axis
        const cx = this.position.x;
        const cz = this.position.z;
        const pts = [
            { x: cx, y: this.position.y + 0.1, z: cz },
            { x: cx, y: this.position.y + this.height * 0.4, z: cz },
            { x: cx, y: this.position.y + this.height * 0.5, z: cz },
            { x: cx, y: this.position.y + this.height * 0.75, z: cz },
            { x: cx, y: this.position.y + this.eyeHeight, z: cz }
        ];

        for (let i = 0; i < pts.length; i++) {
            const block = getBlockAt(world, Math.floor(pts[i].x), Math.floor(pts[i].y), Math.floor(pts[i].z));
            if (block === BLOCKS.WATER || block === BLOCKS.WATER_FLOWING) {
                return true;
            }
        }

        // 2. Check full AABB bounding box voxel overlap
        const minX = Math.floor(this.aabb.minX);
        const maxX = Math.floor(this.aabb.maxX - 0.0001);
        const minY = Math.max(0, Math.floor(this.aabb.minY));
        const maxY = Math.min((typeof CHUNK_SIZE_Y === 'number' ? CHUNK_SIZE_Y : 256) - 1, Math.floor(this.aabb.maxY - 0.0001));
        const minZ = Math.floor(this.aabb.minZ);
        const maxZ = Math.floor(this.aabb.maxZ - 0.0001);

        for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {
                for (let x = minX; x <= maxX; x++) {
                    if (this.aabb.maxX > x && this.aabb.minX < x + 1 &&
                        this.aabb.maxY > y && this.aabb.minY < y + 1 &&
                        this.aabb.maxZ > z && this.aabb.minZ < z + 1) {
                        const block = getBlockAt(world, x, y, z);
                        if (block === BLOCKS.WATER || block === BLOCKS.WATER_FLOWING) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    /**
     * Check if player is currently in water (with optional world recheck)
     * @param {Object|Function|Map} [world=null]
     * @returns {boolean}
     */
    isInWater(world = null) {
        if (world) {
            this.inWater = this.checkInWater(world);
        }
        return this.inWater;
    }

    /**
     * Set the player's world position directly
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setPosition(x, y, z) {
        this.prevPosition.set(this.position.x, this.position.y, this.position.z);
        this.position.set(x, y, z);
        this.updateHitbox();
        this.syncCamera();
    }

    /**
     * Teleport the player and reset velocity
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    teleport(x, y, z) {
        this.velocity.set(0, 0, 0);
        this.setPosition(x, y, z);
    }

    /**
     * Set player orientation
     * @param {number} yaw
     * @param {number} [pitch=0]
     */
    setRotation(yaw, pitch = 0) {
        this.rotation.yaw = yaw;
        this.rotation.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
    }

    /**
     * Get eye level position in world coordinates
     * @returns {{x: number, y: number, z: number}}
     */
    getEyePosition() {
        return {
            x: this.position.x,
            y: this.position.y + this.eyeHeight,
            z: this.position.z
        };
    }

    /**
     * Get 3D forward unit vector from orientation (yaw, pitch)
     * @returns {{x: number, y: number, z: number}}
     */
    getDirection() {
        const yaw = this.rotation.yaw;
        const pitch = this.rotation.pitch;
        return {
            x: -Math.sin(yaw) * Math.cos(pitch),
            y: Math.sin(pitch),
            z: -Math.cos(yaw) * Math.cos(pitch)
        };
    }

    /**
     * Attach a Three.js Camera to sync position and orientation
     * @param {Object} camera
     */
    attachCamera(camera) {
        this.camera = camera;
        this.syncCamera();
    }

    /**
     * Sync attached camera position with eye position
     */
    syncCamera() {
        if (this.camera && this.camera.position) {
            this.camera.position.set(
                this.position.x,
                this.position.y + this.eyeHeight,
                this.position.z
            );
        }
    }

    /**
     * Perform jump if player is on ground or in water
     * @returns {boolean} True if jump succeeded
     */
    jump() {
        if (this.onGround || this.flying || this.inWater) {
            this.velocity.y = this.inWater ? this.waterUpwardSpeed : this.jumpSpeed;
            this.onGround = false;
            // Add exhaustion when jumping (sprinting jump = 0.2, normal = 0.05)
            this.addExhaustion(this.isSprinting ? 0.2 : 0.05);
            return true;
        }
        return false;
    }

    /**
     * Perform AABB swept movement along (dx, dy, dz) against world voxels.
     * Implements Minecraft 1.5 multi-axis resolution, step-up, and ground detection.
     *
     * @param {number} dx - Desired X movement
     * @param {number} dy - Desired Y movement
     * @param {number} dz - Desired Z movement
     * @param {Object|Function|Map} world - World voxel provider
     * @param {boolean} [isSneaking=false] - Whether sneak edge protection is active
     * @returns {{x: number, y: number, z: number}} Actually allowed displacement
     */
    moveWithCollision(dx, dy, dz, world, isSneaking = false) {
        if (!world) {
            this.position.x += dx;
            this.position.y += dy;
            this.position.z += dz;
            this.updateHitbox();
            return { x: dx, y: dy, z: dz };
        }

        const initialAABB = this.aabb.clone();

        // 1. Sneaking Edge-Fall Prevention (when on ground)
        if (isSneaking && this.onGround) {
            const stepCheck = 0.05;
            while (dx !== 0 && !hasBlockBelow(world, this.aabb.minX + dx, this.aabb.maxX + dx, this.aabb.minY, this.aabb.minZ, this.aabb.maxZ)) {
                if (dx < stepCheck && dx >= -stepCheck) dx = 0;
                else if (dx > 0) dx -= stepCheck;
                else dx += stepCheck;
            }
            while (dz !== 0 && !hasBlockBelow(world, this.aabb.minX, this.aabb.maxX, this.aabb.minY, this.aabb.minZ + dz, this.aabb.maxZ + dz)) {
                if (dz < stepCheck && dz >= -stepCheck) dz = 0;
                else if (dz > 0) dz -= stepCheck;
                else dz += stepCheck;
            }
            while (dx !== 0 && dz !== 0 && !hasBlockBelow(world, this.aabb.minX + dx, this.aabb.maxX + dx, this.aabb.minY, this.aabb.minZ + dz, this.aabb.maxZ + dz)) {
                if (dx < stepCheck && dx >= -stepCheck) dx = 0;
                else if (dx > 0) dx -= stepCheck;
                else dx += stepCheck;
                if (dz < stepCheck && dz >= -stepCheck) dz = 0;
                else if (dz > 0) dz -= stepCheck;
                else dz += stepCheck;
            }
        }

        const intendedDx = dx;
        const intendedDy = dy;
        const intendedDz = dz;

        // 2. Query potential colliding voxels in expanded swept AABB
        const expanded = this.aabb.expand(dx, dy, dz);
        if (this.onGround && this.stepHeight > 0) {
            expanded.maxY += this.stepHeight;
        }
        const collidingBoxes = getCollidingBoxes(world, expanded);

        // 3. Standard Non-Stepped Swept Resolution (Y, then X, then Z)
        const standardAABB = this.aabb.clone();
        let standardDy = dy;
        for (let i = 0; i < collidingBoxes.length; i++) {
            standardDy = collidingBoxes[i].calculateYOffset(standardAABB, standardDy);
        }
        standardAABB.move(0, standardDy, 0);

        let standardDx = dx;
        for (let i = 0; i < collidingBoxes.length; i++) {
            standardDx = collidingBoxes[i].calculateXOffset(standardAABB, standardDx);
        }
        standardAABB.move(standardDx, 0, 0);

        let standardDz = dz;
        for (let i = 0; i < collidingBoxes.length; i++) {
            standardDz = collidingBoxes[i].calculateZOffset(standardAABB, standardDz);
        }
        standardAABB.move(0, 0, standardDz);

        // 4. Step-Up Evaluation (if grounded and horizontal progress was obstructed)
        let finalAABB = standardAABB;
        let finalDx = standardDx;
        let finalDy = standardDy;
        let finalDz = standardDz;

        const isHorizontallyBlocked = (standardDx !== intendedDx || standardDz !== intendedDz);
        if (this.onGround && this.stepHeight > 0 && isHorizontallyBlocked) {
            const stepAABB = initialAABB.clone();

            // Step Up along Y
            let stepUpDy = this.stepHeight;
            for (let i = 0; i < collidingBoxes.length; i++) {
                stepUpDy = collidingBoxes[i].calculateYOffset(stepAABB, stepUpDy);
            }
            stepAABB.move(0, stepUpDy, 0);

            // Move X along stepped plane
            let stepDx = intendedDx;
            for (let i = 0; i < collidingBoxes.length; i++) {
                stepDx = collidingBoxes[i].calculateXOffset(stepAABB, stepDx);
            }
            stepAABB.move(stepDx, 0, 0);

            // Move Z along stepped plane
            let stepDz = intendedDz;
            for (let i = 0; i < collidingBoxes.length; i++) {
                stepDz = collidingBoxes[i].calculateZOffset(stepAABB, stepDz);
            }
            stepAABB.move(0, 0, stepDz);

            // Step back down to ground
            let stepDownDy = -stepUpDy;
            for (let i = 0; i < collidingBoxes.length; i++) {
                stepDownDy = collidingBoxes[i].calculateYOffset(stepAABB, stepDownDy);
            }
            stepAABB.move(0, stepDownDy, 0);

            // Compare horizontal distance squared
            const standardDistSq = standardDx * standardDx + standardDz * standardDz;
            const stepDistSq = stepDx * stepDx + stepDz * stepDz;

            if (stepDistSq > standardDistSq) {
                finalAABB = stepAABB;
                finalDx = stepDx;
                finalDy = stepAABB.minY - initialAABB.minY;
                finalDz = stepDz;
            }
        }

        // 5. Update Collision Flags
        const wasOnGround = this.onGround;
        if (intendedDy < 0 && finalDy > intendedDy) {
            this.onGround = true; // Landed on floor
            this.velocity.y = 0;
            this.isCollidedVertically = true;
        } else if (intendedDy > 0 && finalDy < intendedDy) {
            this.onGround = false;
            this.velocity.y = 0; // Hit ceiling
            this.isCollidedVertically = true;
        } else {
            this.isCollidedVertically = false;
            // Check if there is still ground directly under feet when stationary vertically
            if (wasOnGround && intendedDy <= 0) {
                this.onGround = hasBlockBelow(world, finalAABB.minX, finalAABB.maxX, finalAABB.minY, finalAABB.minZ, finalAABB.maxZ);
            } else {
                this.onGround = false;
            }
        }

        if (finalDx !== intendedDx) {
            this.velocity.x = 0;
            this.isCollidedHorizontally = true;
        } else if (finalDz !== intendedDz) {
            this.velocity.z = 0;
            this.isCollidedHorizontally = true;
        } else {
            this.isCollidedHorizontally = false;
        }

        // 6. Apply Final Resolved Position
        this.aabb.copy(finalAABB);
        this.position.x = (finalAABB.minX + finalAABB.maxX) / 2;
        this.position.y = finalAABB.minY;
        this.position.z = (finalAABB.minZ + finalAABB.maxZ) / 2;

        return { x: finalDx, y: finalDy, z: finalDz };
    }

    /**
     * Update player physics, controls, gravity, swept AABB collisions, and survival stats.
     *
     * @param {number} delta - Delta time in seconds
     * @param {Object|Function|Map} [world=null] - World voxel provider
     * @param {Object} [moveState={}] - Movement input flags (forward, backward, left, right, up, down, jump, sneak, sprint, yaw, pitch)
     */
    update(delta, world = null, moveState = {}) {
        if (!delta || delta <= 0 || isNaN(delta)) {
            delta = 1 / 60;
        }

        // Sub-step large deltas for physics stability (prevents tunneling during frame drops)
        const maxSubStep = 0.02;
        if (delta > maxSubStep) {
            const steps = Math.min(5, Math.ceil(delta / maxSubStep));
            const subDelta = delta / steps;
            for (let s = 0; s < steps; s++) {
                this.updateStep(subDelta, world, moveState);
            }
            return;
        }

        this.updateStep(delta, world, moveState);
    }

    /**
     * Single internal physics and survival simulation step
     * @private
     */
    updateStep(dt, world, moveState = {}) {
        this.prevPosition.set(this.position.x, this.position.y, this.position.z);

        // 1. Process Input Controls
        const input = moveState || {};
        
        // Handle Riding an Entity (e.g., Minecart, Pig)
        if (this.riding) {
            if (this.riding.removed || this.riding.isDead) {
                this.riding.dismount();
                this.riding = null;
            } else {
                // Sync position to vehicle
                this.position.set(this.riding.position.x, this.riding.position.y + 0.5, this.riding.position.z);
                this.velocity.set(0, 0, 0);
                if (input.yaw !== undefined) this.rotation.yaw = input.yaw;
                if (input.pitch !== undefined) this.rotation.pitch = input.pitch;
                
                // Allow dismounting via shift
                if (input.down) {
                    this.riding.dismount();
                    this.riding = null;
                    // Pop player up slightly so they don't clip inside the cart immediately
                    this.position.y += 1.0; 
                }
                return; // Skip standard physics
            }
        }
        if (input.yaw !== undefined) this.rotation.yaw = input.yaw;
        if (input.pitch !== undefined) this.rotation.pitch = input.pitch;

        // If camera is attached and no explicit yaw was passed, synchronize from camera
        if (this.camera && input.yaw === undefined && this.camera.rotation) {
            this.rotation.yaw = this.camera.rotation.y;
            this.rotation.pitch = this.camera.rotation.x;
        }

        const forward = Boolean(input.forward);
        const backward = Boolean(input.backward);
        const left = Boolean(input.left);
        const right = Boolean(input.right);
        const jump = Boolean(input.up || input.jump || input.space);
        const sneak = Boolean(input.down || input.sneak || input.ctrl || input.ControlLeft);
        const sprint = Boolean(input.sprint || input.shift || input.ShiftLeft);

        this.isSneaking = sneak;
        // In Minecraft: cannot sprint if foodLevel <= 6
        this.isSprinting = sprint && !sneak && (this.foodLevel > 6);

        const moveX = (right ? 1 : 0) - (left ? 1 : 0) + (input.moveX || input.strafe || 0);
        // In Three.js, -Z is forward. So forward should give -1, backward +1.
        const moveZ = (backward ? 1 : 0) - (forward ? 1 : 0) + (input.moveZ || input.forwardBackward || 0);

        // 2. Flight Mode Physics (Creative Mode)
        if (this.flying) {
            const flySpeed = this.flySpeed * (sprint ? 1.5 : 1.0);
            const yaw = this.rotation.yaw;
            const cos = Math.cos(yaw);
            const sin = Math.sin(yaw);

            let targetVx = 0;
            let targetVz = 0;
            const len = Math.hypot(moveX, moveZ);
            if (len > 0.0001) {
                const normX = moveX / len;
                const normZ = moveZ / len;
                // Correct 3D rotation for Three.js (yaw positive is CCW)
                targetVx = (normX * cos + normZ * sin) * flySpeed;
                targetVz = (-normX * sin + normZ * cos) * flySpeed;
            }

            const targetVy = (jump ? flySpeed : 0) - (sneak ? flySpeed : 0);

            // Responsive flight acceleration & damping
            this.velocity.x += (targetVx - this.velocity.x) * Math.min(1, 15 * dt);
            this.velocity.y += (targetVy - this.velocity.y) * Math.min(1, 15 * dt);
            this.velocity.z += (targetVz - this.velocity.z) * Math.min(1, 15 * dt);

            this.moveWithCollision(this.velocity.x * dt, this.velocity.y * dt, this.velocity.z * dt, world, false);
            this.syncCamera();
            return;
        }

        // 3. Water Detection & State Transitions
        const wasInWater = this.inWater;
        const inWater = this.checkInWater(world);

        // Prevent fall damage: reset / cushion vertical velocity when entering water
        if (inWater && !wasInWater) {
            if (this.velocity.y < 0) {
                this.velocity.y = 0;
            }
        }
        this.wasInWater = wasInWater;
        this.inWater = inWater;

        // 4. Movement Kinematics (Water vs Standard Ground/Air)
        if (inWater) {
            // In Water: Strong viscous drag, slow sink speed, buoyancy when jumping
            const waterSwimSpeed = this.isSprinting
                ? this.waterSwimSpeed * 1.4
                : (this.isSneaking ? this.waterSwimSpeed * 0.6 : this.waterSwimSpeed);

            const yaw = this.rotation.yaw;
            const cos = Math.cos(yaw);
            const sin = Math.sin(yaw);

            let targetVx = 0;
            let targetVz = 0;
            const len = Math.hypot(moveX, moveZ);
            if (len > 0.0001) {
                const normX = moveX / len;
                const normZ = moveZ / len;
                targetVx = (normX * cos + normZ * sin) * waterSwimSpeed;
                targetVz = (-normX * sin + normZ * cos) * waterSwimSpeed;
            }

            // Strong viscous drag (nominal 0.8 per 60Hz frame)
            const viscousDrag = Math.pow(this.waterDrag, dt * 60);

            if (len > 0.0001) {
                const waterAccel = Math.min(1, 8 * dt);
                this.velocity.x += (targetVx - this.velocity.x) * waterAccel;
                this.velocity.z += (targetVz - this.velocity.z) * waterAccel;

                // Swimming exhaustion
                if (this.isSprinting) {
                    this.addExhaustion(0.4 * dt);
                }
            } else {
                this.velocity.x *= viscousDrag;
                this.velocity.z *= viscousDrag;
                if (Math.abs(this.velocity.x) < 0.001) this.velocity.x = 0;
                if (Math.abs(this.velocity.z) < 0.001) this.velocity.z = 0;
            }

            // Vertical movement: buoyancy when holding jump, dive when sneak, slow sink otherwise
            if (jump) {
                // Buoyancy / swim upward
                const upwardTarget = this.waterUpwardSpeed;
                this.velocity.y += (upwardTarget - this.velocity.y) * Math.min(1, 10 * dt);
                this.onGround = false;
            } else if (sneak) {
                // Downward dive
                const diveTarget = -this.waterUpwardSpeed * 0.8;
                this.velocity.y += (diveTarget - this.velocity.y) * Math.min(1, 10 * dt);
            } else {
                // Disable standard gravity and apply proper sink speed
                const sinkTarget = -3.5;
                this.velocity.y += (sinkTarget - this.velocity.y) * Math.min(1, 6 * dt);
            }
        } else {
            // Standard Ground & Air Kinematics
            const speed = this.isSprinting
                ? this.sprintSpeed
                : (this.isSneaking ? this.sneakSpeed : this.walkSpeed);

            const yaw = this.rotation.yaw;
            const cos = Math.cos(yaw);
            const sin = Math.sin(yaw);

            let targetVx = 0;
            let targetVz = 0;
            const len = Math.hypot(moveX, moveZ);
            if (len > 0.0001) {
                const normX = moveX / len;
                const normZ = moveZ / len;
                // Correct 3D rotation for Three.js (yaw positive is CCW)
                targetVx = (normX * cos + normZ * sin) * speed;
                targetVz = (-normX * sin + normZ * cos) * speed;
            }

            // Ground acceleration vs Air momentum
            if (this.onGround) {
                if (len > 0.0001) {
                    this.velocity.x = targetVx;
                    this.velocity.z = targetVz;

                    // Deplete hunger / saturation when sprinting
                    if (this.isSprinting) {
                        this.addExhaustion(0.6 * dt);
                    }
                } else {
                    // Ground friction deceleration
                    const friction = Math.max(0, 1 - 12 * dt);
                    this.velocity.x *= friction;
                    this.velocity.z *= friction;
                    if (Math.abs(this.velocity.x) < 0.001) this.velocity.x = 0;
                    if (Math.abs(this.velocity.z) < 0.001) this.velocity.z = 0;
                }

                // Jump trigger
                if (jump) {
                    this.velocity.y = this.jumpSpeed;
                    this.onGround = false;
                    // Jump exhaustion
                    this.addExhaustion(this.isSprinting ? 0.2 : 0.05);
                }
            } else {
                // Air control & drag
                if (len > 0.0001) {
                    const airAccel = Math.min(1, 8 * dt);
                    this.velocity.x += (targetVx - this.velocity.x) * airAccel;
                    this.velocity.z += (targetVz - this.velocity.z) * airAccel;
                } else {
                    const airDrag = Math.max(0, 1 - 1.5 * dt);
                    this.velocity.x *= airDrag;
                    this.velocity.z *= airDrag;
                }

                // Apply Gravity (32 m/s^2)
                this.velocity.y -= this.gravity * dt;
                if (this.velocity.y < -this.terminalVelocity) {
                    this.velocity.y = -this.terminalVelocity;
                }
            }
        }

        // 5. Swept AABB Collision Resolution against World Voxels
        const motionX = this.velocity.x * dt;
        const motionY = this.velocity.y * dt;
        const motionZ = this.velocity.z * dt;

        this.moveWithCollision(motionX, motionY, motionZ, world, this.isSneaking);

        // 6. Survival Health Regeneration & Starvation
        if (!this.isDead) {
            // Health Regeneration when foodLevel >= 18 and player is hurt
            if (this.foodLevel >= 18 && this.health < this.maxHealth) {
                this.healTimer += dt;
                if (this.healTimer >= 4.0) { // Every 4.0 seconds (80 ticks) in Minecraft standard
                    this.healTimer = 0;
                    this.heal(1);
                    this.addExhaustion(3.0); // Natural regeneration causes 3.0 exhaustion
                }
            } else {
                this.healTimer = 0;
            }

            // Starvation Damage when foodLevel <= 0
            if (this.foodLevel <= 0) {
                this.starveTimer += dt;
                if (this.starveTimer >= 4.0) {
                    this.starveTimer = 0;
                    if (this.health > 1) { // Keep alive on easy/normal or deal 1 damage
                        this.damage(1, 'starvation');
                    }
                }
            } else {
                this.starveTimer = 0;
            }
        }

        // 7. Camera Synchronization
        this.syncCamera();
    }
}
