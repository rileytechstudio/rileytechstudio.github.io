/**
 * Entity system and Mob definitions for Minecraft 1.5 WebGL Engine
 * Includes AABB bounding boxes, Base Entity hierarchy, LivingEntity status effects, and specific mob implementations:
 * - Pig (Passive, 10 HP, 0.9x0.9)
 * - Cow (Passive, 10 HP, 0.9x1.4)
 * - Zombie (Hostile Melee Undead, 20 HP, 0.6x1.95, burns in sun)
 * - Creeper (Hostile Explosive, 20 HP, 0.6x1.7, fuse & detonation)
 * - Skeleton (Hostile Ranged Undead, 20 HP, 0.6x1.95, strafe & bow attack, burns in sun)
 * - Spider (Hostile/Neutral Climber, 16 HP, 1.4x0.9, wall climbing, pounce leap, daytime neutrality)
 * - Enderman (Neutral/Hostile Teleporter, 40 HP, 0.6x2.9, stare aggro, teleportation, water/arrow evasion)
 * - Ghast (Hostile Nether Aerial, 10 HP, 4.0x4.0, 3D hovering flight, explosive fireballs)
 * - ZombiePigman (Neutral Nether Undead, 20 HP, 0.6x1.95, fire immune, herd anger & pack revenge)
 * - WitherSkeleton (Hostile Nether Undead, 20 HP, 0.7x2.4, fire immune, stone sword melee, Wither I effect)
 */

import { BLOCKS } from '../core/chunk.js';
import {
    PathNavigator,
    WanderGoal,
    ChaseTargetGoal,
    MeleeAttackGoal,
    FleeGoal,
    RangedAttackGoal,
    CreeperExplodeGoal,
    SpiderClimbGoal,
    SpiderTargetGoal,
    SpiderLeapGoal,
    EndermanStareGoal,
    EndermanTeleportGoal,
    GhastFlyGoal,
    GhastAttackGoal,
    ZombiePigmanAngerGoal,
    isBlockSolid,
    checkClearance
} from './ai.js';
import {
    MobRenderer,
    createMobRenderer,
    createMobMesh,
    MOB_MODEL_BUILDERS
} from './mobRenderer.js';

let entityIdCounter = 1;

/**
 * Axis-Aligned Bounding Box (AABB) for 3D collision & hitboxes
 */
export class AABB {
    /**
     * @param {number} minX 
     * @param {number} minY 
     * @param {number} minZ 
     * @param {number} maxX 
     * @param {number} maxY 
     * @param {number} maxZ 
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
     * Set bounds from center position (feet at y) and dimensions
     * @param {number} x Center X
     * @param {number} y Feet Y
     * @param {number} z Center Z
     * @param {number} width Total width (X & Z)
     * @param {number} height Total height (Y)
     * @returns {AABB} this
     */
    setFromCenterAndSize(x, y, z, width, height) {
        const halfW = width / 2;
        this.minX = x - halfW;
        this.minY = y;
        this.minZ = z - halfW;
        this.maxX = x + halfW;
        this.maxY = y + height;
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
     * Check if this AABB intersects another AABB
     * @param {AABB} other 
     * @returns {boolean}
     */
    intersects(other) {
        return (
            this.minX < other.maxX && this.maxX > other.minX &&
            this.minY < other.maxY && this.maxY > other.minY &&
            this.minZ < other.maxZ && this.maxZ > other.minZ
        );
    }

    /**
     * Check if point is inside AABB
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
     * Offset bounds by dx, dy, dz
     * @param {number} dx 
     * @param {number} dy 
     * @param {number} dz 
     * @returns {AABB} this
     */
    offset(dx, dy, dz) {
        this.minX += dx;
        this.maxX += dx;
        this.minY += dy;
        this.maxY += dy;
        this.minZ += dz;
        this.maxZ += dz;
        return this;
    }

    /**
     * Expand bounds by dx, dy, dz
     * @param {number} dx 
     * @param {number} dy 
     * @param {number} dz 
     * @returns {AABB} this
     */
    expand(dx, dy, dz) {
        if (dx < 0) this.minX += dx;
        if (dx > 0) this.maxX += dx;
        if (dy < 0) this.minY += dy;
        if (dy > 0) this.maxY += dy;
        if (dz < 0) this.minZ += dz;
        if (dz > 0) this.maxZ += dz;
        return this;
    }
}

/**
 * Base Entity class for all objects in the world
 */
export class Entity {
    /**
     * @param {string} [type='entity']
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(type = 'entity', x = 0, y = 0, z = 0) {
        this.id = entityIdCounter++;
        this.type = type;

        // Position & Previous Position
        this.position = { x, y, z };
        this.prevPosition = { x, y, z };

        // Velocity (blocks per tick/second)
        this.velocity = { x: 0, y: 0, z: 0 };

        // Rotation (yaw: Y axis rotation in radians, pitch: X axis tilt)
        this.rotation = { yaw: 0, pitch: 0 };
        this.headYaw = 0;

        // Hitbox dimensions
        this.width = 0.6;
        this.height = 1.8;
        this.hitbox = new AABB();
        this.updateHitbox();

        // State flags
        this.onGround = false;
        this.inWater = false;
        this.inLava = false;
        this.isCollidedHorizontally = false;
        this.isCollidedVertically = false;
        this.fallDistance = 0;
        this.isDead = false;
        this.removed = false;
        this.ticksLived = 0;

        // Eye height offset from feet
        this.eyeHeight = 1.62;

        // User data container for renderer, physics, etc.
        this.userData = {};
    }

    /**
     * Update internal AABB based on current position and dimensions
     */
    updateHitbox() {
        this.hitbox.setFromCenterAndSize(
            this.position.x,
            this.position.y,
            this.position.z,
            this.width,
            this.height
        );
    }

    /**
     * Set entity position in world
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    setPosition(x, y, z) {
        this.prevPosition.x = this.position.x;
        this.prevPosition.y = this.position.y;
        this.prevPosition.z = this.position.z;

        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
        this.updateHitbox();
    }

    /**
     * Set rotation in radians
     * @param {number} yaw 
     * @param {number} [pitch=0] 
     */
    setRotation(yaw, pitch = 0) {
        this.rotation.yaw = yaw;
        this.rotation.pitch = pitch;
        this.headYaw = yaw;
    }

    /**
     * Look smoothly or directly towards target world coordinates
     * @param {number} targetX 
     * @param {number} targetY 
     * @param {number} targetZ 
     */
    lookAt(targetX, targetY, targetZ) {
        const dx = targetX - this.position.x;
        const dy = targetY - (this.position.y + this.eyeHeight);
        const dz = targetZ - this.position.z;
        const distXZ = Math.hypot(dx, dz);

        this.rotation.yaw = Math.atan2(dx, dz);
        this.rotation.pitch = -Math.atan2(dy, distXZ);
        this.headYaw = this.rotation.yaw;
    }

    /**
     * Get eye position vector
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
     * Distance to another entity
     * @param {Entity} other 
     * @returns {number}
     */
    distanceTo(other) {
        const dx = this.position.x - other.position.x;
        const dy = this.position.y - other.position.y;
        const dz = this.position.z - other.position.z;
        return Math.hypot(dx, dy, dz);
    }

    /**
     * Distance squared to another entity
     * @param {Entity} other 
     * @returns {number}
     */
    distanceSquaredTo(other) {
        const dx = this.position.x - other.position.x;
        const dy = this.position.y - other.position.y;
        const dz = this.position.z - other.position.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Horizontal 2D distance to another entity (ignoring Y)
     * @param {Entity} other 
     * @returns {number}
     */
    horizontalDistanceTo(other) {
        const dx = this.position.x - other.position.x;
        const dz = this.position.z - other.position.z;
        return Math.hypot(dx, dz);
    }

    /**
     * 3D Distance to world coordinate
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {number}
     */
    distanceToPos(x, y, z) {
        const dx = this.position.x - x;
        const dy = this.position.y - y;
        const dz = this.position.z - z;
        return Math.hypot(dx, dy, dz);
    }

    /**
     * Horizontal distance to world coordinate
     * @param {number} x 
     * @param {number} z 
     * @returns {number}
     */
    horizontalDistanceToPos(x, z) {
        const dx = this.position.x - x;
        const dz = this.position.z - z;
        return Math.hypot(dx, dz);
    }

    /**
     * Get or create Three.js hierarchical mesh for this entity
     * @returns {THREE.Group|null}
     */
    getMesh() {
        if (!this.userData.mesh) {
            createMobMesh(this);
        }
        return this.userData.mesh;
    }

    /**
     * Base update loop (dt in seconds)
     * @param {number} dt 
     * @param {Object} [world=null] 
     */
    update(dt = 0.05, world = null) {
        this.ticksLived++;
        this.prevPosition.x = this.position.x;
        this.prevPosition.y = this.position.y;
        this.prevPosition.z = this.position.z;

        // Apply basic velocity
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        this.updateHitbox();

        // Update renderer animation if attached
        if (this.userData && this.userData.mobRenderer) {
            this.userData.mobRenderer.update(dt);
        }
    }
}

/**
 * LivingEntity class: adds health, combat, status effects, and movement mechanics
 */
export class LivingEntity extends Entity {
    /**
     * @param {string} [type='living_entity']
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(type = 'living_entity', x = 0, y = 0, z = 0) {
        super(type, x, y, z);

        // Health attributes (Minecraft 1.5 standard: 20 HP = 10 hearts)
        this.maxHealth = 20;
        this.health = 20;

        // Movement attributes
        this.movementSpeed = 0.25; // Base blocks / tick or speed multiplier
        this.jumpVelocity = 8.5; // Jump upward impulse (approx ~1.1 blocks jump)
        this.gravity = 24.0; // Gravity acceleration (blocks/sec^2)
        this.drag = { horizontal: 0.85, vertical: 0.98 };

        // Combat & Animation timers
        this.hurtTime = 0;
        this.maxHurtTime = 0.4; // seconds
        this.deathTime = 0;
        this.invulnerableTimer = 0;

        // Burning & Fire
        this.fireTicks = 0;
        this.isBurning = false;
        this.isImmuneToFire = false; // Immune to fire/lava damage (Nether mobs)

        // Status Effects (Wither, Poison, etc.)
        this.witherTicks = 0;
        this.statusEffects = new Map();
    }

    /**
     * Apply status effect
     * @param {string} effectName e.g. 'wither'
     * @param {number} durationSeconds Duration in seconds
     * @param {number} [amplifier=1]
     */
    applyStatusEffect(effectName, durationSeconds, amplifier = 1) {
        const ticks = Math.round(durationSeconds * 20);
        if (effectName === 'wither') {
            this.witherTicks = Math.max(this.witherTicks, ticks);
        }
        this.statusEffects.set(effectName, {
            ticksRemaining: ticks,
            duration: durationSeconds,
            amplifier
        });
    }

    /**
     * Clear all status effects
     */
    clearStatusEffects() {
        this.witherTicks = 0;
        this.statusEffects.clear();
    }

    /**
     * Apply damage from a source
     * @param {number} amount 
     * @param {Entity|string|null} [source=null] 
     * @returns {boolean} True if damage was applied
     */
    takeDamage(amount, source = null) {
        if (this.isDead || this.invulnerableTimer > 0) {
            return false;
        }

        // Fire immunity check
        if ((source === 'fire' || source === 'lava') && this.isImmuneToFire) {
            return false;
        }

        this.health = Math.max(0, this.health - amount);
        this.hurtTime = this.maxHurtTime;
        this.invulnerableTimer = 0.2; // 0.2s invulnerability frames

        // Apply slight knockback if source is an Entity
        if (source && source.position) {
            const dx = this.position.x - source.position.x;
            const dz = this.position.z - source.position.z;
            const len = Math.hypot(dx, dz) || 1;
            this.velocity.x += (dx / len) * 4.0;
            this.velocity.y += 3.0;
            this.velocity.z += (dz / len) * 4.0;
        }

        if (this.health <= 0) {
            this.onDeath(source);
        }

        return true;
    }

    /**
     * Heal entity by amount
     * @param {number} amount 
     */
    heal(amount) {
        if (this.isDead) return;
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    /**
     * Trigger entity death
     * @param {Entity|string|null} [source=null] 
     */
    onDeath(source = null) {
        this.isDead = true;
        this.deathTime = 0;
    }

    /**
     * Check if entity is alive
     * @returns {boolean}
     */
    isAlive() {
        return !this.isDead && this.health > 0;
    }

    /**
     * Trigger a jump action
     */
    jump() {
        if (this.onGround || this.inWater) {
            this.velocity.y = this.jumpVelocity;
            this.onGround = false;
        }
    }

    /**
     * Apply relative directional movement (forward, strafe)
     * @param {number} forward Forward (+1) / Backward (-1)
     * @param {number} strafe Right (+1) / Left (-1)
     * @param {number} speed Movement speed
     */
    moveRelative(forward, strafe, speed) {
        let dist = forward * forward + strafe * strafe;
        if (dist < 0.0001) return;

        dist = Math.sqrt(dist);
        const fwd = (forward / dist) * speed;
        const str = (strafe / dist) * speed;

        const sinYaw = Math.sin(this.rotation.yaw);
        const cosYaw = Math.cos(this.rotation.yaw);

        this.velocity.x += str * cosYaw + fwd * sinYaw;
        this.velocity.z += fwd * cosYaw - str * sinYaw;
    }

    /**
     * Update physics, timers, status effects
     * @param {number} dt 
     * @param {Object} [world=null] 
     */
    update(dt = 0.05, world = null) {
        super.update(dt, world);

        // Update hurt and invulnerable timers
        if (this.hurtTime > 0) {
            this.hurtTime = Math.max(0, this.hurtTime - dt);
        }
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
        }

        // Death progression
        if (this.isDead) {
            this.deathTime += dt;
            if (this.deathTime > 1.0) {
                this.removed = true;
            }
            return;
        }

        // Fire & Burning update
        if (this.isImmuneToFire) {
            this.fireTicks = 0;
            this.isBurning = false;
        } else if (this.fireTicks > 0) {
            this.fireTicks -= Math.round(dt * 20);
            this.isBurning = this.fireTicks > 0;
            if (this.ticksLived % 20 === 0 && this.isBurning) {
                this.takeDamage(1, 'fire');
            }
        }

        // Wither effect update: deals 1 damage every 2 seconds (40 ticks), can kill
        if (this.witherTicks > 0) {
            this.witherTicks -= Math.round(dt * 20);
            if (this.ticksLived % 40 === 0 && this.witherTicks > 0) {
                this.takeDamage(1, 'wither');
            }
        }
    }
}

/**
 * Mob class: LivingEntity with AI goals, navigation, and hostility behaviors
 */
export class Mob extends LivingEntity {
    /**
     * @param {string} [type='mob']
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(type = 'mob', x = 0, y = 0, z = 0) {
        super(type, x, y, z);

        // AI & Navigation
        this.target = null;
        this.aiGoals = [];
        this.pathNavigator = null; // Attached PathNavigator
        this.followRange = 16.0; // Standard Minecraft follow range in blocks

        // Hostility & Combat
        this.isHostile = false;
        this.isPassive = true;
        this.isUndead = false;
        this.attackDamage = 2.0;
        this.attackRange = 1.8;
        this.attackCooldown = 0;
        this.attackCooldownMax = 1.0; // 1s cooldown between attacks

        // Behavior States
        this.state = 'IDLE'; // IDLE, WANDER, CHASE, ATTACK, FLEE, STARE
        this.idleTimer = 0;
        this.panicTimer = 0; // When passive mob is attacked
        this.isHostileToTarget = false;

        // Initialize default subclass AI goals
        this.initDefaultAI();
    }

    /**
     * Initialize default AI goals for this mob type
     */
    initDefaultAI() {
        // Base Mob has standard wander behavior
        this.aiGoals = [
            new WanderGoal(this, 8, 5)
        ];
    }

    /**
     * Set target entity to follow or attack
     * @param {Entity|null} target 
     */
    setTarget(target) {
        this.target = target;
        if (target) {
            this.isHostileToTarget = true;
        } else {
            this.isHostileToTarget = false;
        }
    }

    /**
     * Get current target
     * @returns {Entity|null}
     */
    getTarget() {
        return this.target;
    }

    /**
     * Handle taking damage (Passive mobs panic, Hostile mobs target attacker)
     * @param {number} amount 
     * @param {Entity|string|null} [source=null] 
     * @returns {boolean}
     */
    takeDamage(amount, source = null) {
        const result = super.takeDamage(amount, source);
        if (result && source instanceof Entity) {
            if (this.isPassive) {
                this.panicTimer = 5.0; // Panic run for 5 seconds
                this.state = 'FLEE';
            } else if (this.isHostile && !this.target) {
                this.setTarget(source);
                this.state = 'CHASE';
            }
        }
        return result;
    }

    /**
     * Check if mob burns in direct sunlight (e.g. Zombies & Skeletons)
     * @param {Object} [world=null]
     * @param {boolean} [isDay=true]
     * @returns {boolean}
     */
    checkDaylightBurn(world = null, isDay = true) {
        if (!this.isUndead || !isDay || this.inWater || this.isDead || this.isImmuneToFire) {
            return false;
        }

        // If world is provided, check if blocks above are transparent to sky
        if (world && typeof world.getBlock === 'function') {
            const bx = Math.floor(this.position.x);
            const by = Math.floor(this.position.y + this.height);
            const bz = Math.floor(this.position.z);

            for (let y = by; y < 256; y++) {
                const block = world.getBlock(bx, y, bz);
                if (block !== BLOCKS.AIR && block !== BLOCKS.GLASS) {
                    return false; // Shaded by block
                }
            }
        }

        // Ignite mob
        this.fireTicks = 160; // 8 seconds of fire
        this.isBurning = true;
        return true;
    }

    /**
     * Update AI Goals & Behaviors
     * @param {number} dt 
     * @param {Object} [world=null] 
     */
    updateAI(dt = 0.05, world = null) {
        if (this.isDead) return;

        // Decrement attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        }

        // Decrement panic timer
        if (this.panicTimer > 0) {
            this.panicTimer = Math.max(0, this.panicTimer - dt);
            if (this.panicTimer === 0 && this.isPassive) {
                this.state = 'IDLE';
            }
        }

        // Execute active AI goals
        for (let i = 0; i < this.aiGoals.length; i++) {
            const goal = this.aiGoals[i];
            if (goal.canStart && goal.canStart()) {
                if (goal.tick) goal.tick(dt, world);
            }
        }

        // Update path navigation if present
        if (this.pathNavigator && this.pathNavigator.update) {
            this.pathNavigator.update(dt, world);
        }
    }

    /**
     * Main update tick
     * @param {number} dt 
     * @param {Object} [world=null] 
     */
    update(dt = 0.05, world = null) {
        this.updateAI(dt, world);
        super.update(dt, world);
    }
}

/* ========================================================================= */
/* SPECIFIC MOB IMPLEMENTATIONS                                              */
/* ========================================================================= */

/**
 * Pig Entity (Minecraft 1.5)
 * - Type: Passive
 * - Health: 10 HP (5 hearts)
 * - Hitbox: 0.9 Width x 0.9 Height
 * - Movement Speed: 0.25 (wandering 0.2)
 */
export class Pig extends Mob {
    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(x = 0, y = 0, z = 0) {
        super('pig', x, y, z);

        this.maxHealth = 10;
        this.health = 10;
        this.width = 0.9;
        this.height = 0.9;
        this.eyeHeight = 0.72;
        this.movementSpeed = 0.25;

        this.isHostile = false;
        this.isPassive = true;
        this.isSaddled = false;

        this.updateHitbox();
    }

    initDefaultAI() {
        this.aiGoals = [
            new FleeGoal(this),
            new WanderGoal(this, 8, 4)
        ];
    }
}

/**
 * Cow Entity (Minecraft 1.5)
 * - Type: Passive
 * - Health: 10 HP (5 hearts)
 * - Hitbox: 0.9 Width x 1.4 Height
 * - Movement Speed: 0.20
 */
export class Cow extends Mob {
    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(x = 0, y = 0, z = 0) {
        super('cow', x, y, z);

        this.maxHealth = 10;
        this.health = 10;
        this.width = 0.9;
        this.height = 1.4;
        this.eyeHeight = 1.2;
        this.movementSpeed = 0.20;

        this.isHostile = false;
        this.isPassive = true;

        this.updateHitbox();
    }

    initDefaultAI() {
        this.aiGoals = [
            new FleeGoal(this),
            new WanderGoal(this, 8, 5)
        ];
    }
}

/**
 * Zombie Entity (Minecraft 1.5)
 * - Type: Hostile (Undead Melee)
 * - Health: 20 HP (10 hearts)
 * - Hitbox: 0.6 Width x 1.95 Height
 * - Movement Speed: 0.23 (Chase speed 0.28)
 * - Attack Damage: 4 HP (2 hearts)
 * - Follow Range: 16 blocks
 * - Trait: Burns in daylight
 */
export class Zombie extends Mob {
    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(x = 0, y = 0, z = 0) {
        super('zombie', x, y, z);

        this.maxHealth = 20;
        this.health = 20;
        this.width = 0.6;
        this.height = 1.95;
        this.eyeHeight = 1.74;
        this.movementSpeed = 0.23;

        this.isHostile = true;
        this.isPassive = false;
        this.isUndead = true;

        this.attackDamage = 4.0;
        this.attackRange = 1.5;
        this.attackCooldownMax = 1.0;
        this.followRange = 16.0;

        this.isBaby = false;
        this.isVillager = false;

        this.updateHitbox();
    }

    initDefaultAI() {
        this.aiGoals = [
            new MeleeAttackGoal(this),
            new ChaseTargetGoal(this),
            new WanderGoal(this, 8, 5)
        ];
    }

    /**
     * Attempt melee strike against target entity
     * @param {LivingEntity} target 
     * @returns {boolean} True if attack landed
     */
    attackEntity(target) {
        if (!target || !target.isAlive() || this.attackCooldown > 0) {
            return false;
        }

        const reach = this.attackRange + (target.width / 2);
        if (this.distanceTo(target) <= reach) {
            target.takeDamage(this.attackDamage, this);
            this.attackCooldown = this.attackCooldownMax;
            return true;
        }

        return false;
    }
}

/**
 * Creeper Entity (Minecraft 1.5)
 * - Type: Hostile (Kamikaze / Explosive)
 * - Health: 20 HP (10 hearts)
 * - Hitbox: 0.6 Width x 1.7 Height
 * - Movement Speed: 0.25
 * - Explosion: Radius 3 blocks, fuse time 30 ticks (1.5s)
 * - Trait: Hisses when close, defuses if player backs away
 */
export class Creeper extends Mob {
    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(x = 0, y = 0, z = 0) {
        super('creeper', x, y, z);

        this.maxHealth = 20;
        this.health = 20;
        this.width = 0.6;
        this.height = 1.7;
        this.eyeHeight = 1.5;
        this.movementSpeed = 0.25;

        this.isHostile = true;
        this.isPassive = false;
        this.followRange = 16.0;

        // Explosion & Fuse mechanics
        this.fuseTime = 30; // 30 ticks = 1.5 seconds
        this.fuseTimer = 0;
        this.fuseState = -1; // -1: Defusing / Idle, 1: Hissing / Charging
        this.explosionRadius = 3;
        this.isCharged = false; // Powered Creeper
        this.hasExploded = false;

        // Callback hook for world explosion handler
        this.onExplodeCallback = null;

        this.updateHitbox();
    }

    initDefaultAI() {
        this.aiGoals = [
            new CreeperExplodeGoal(this),
            new ChaseTargetGoal(this),
            new WanderGoal(this, 8, 5)
        ];
    }

    /**
     * Set fuse state (-1 defuse, 1 charging)
     * @param {number} state 
     */
    setFuseState(state) {
        this.fuseState = state;
    }

    /**
     * Get fuse charge progress (0.0 to 1.0)
     * @returns {number}
     */
    getFuseProgress() {
        return Math.min(1.0, this.fuseTimer / this.fuseTime);
    }

    /**
     * Trigger detonation
     * @param {Object} [world=null]
     */
    explode(world = null) {
        if (this.hasExploded || this.isDead) return;

        this.hasExploded = true;
        this.health = 0;
        this.isDead = true;

        const power = this.isCharged ? this.explosionRadius * 2 : this.explosionRadius;

        if (typeof this.onExplodeCallback === 'function') {
            this.onExplodeCallback({
                x: this.position.x,
                y: this.position.y,
                z: this.position.z,
                power: power,
                creeper: this
            });
        }
    }

    /**
     * Update Creeper fuse and check for explosion
     * @param {number} dt 
     * @param {Object} [world=null] 
     */
    update(dt = 0.05, world = null) {
        super.update(dt, world);

        if (this.isDead || this.hasExploded) return;

        // Handle fuse progression
        if (this.fuseState > 0) {
            this.fuseTimer += Math.round(dt * 20);
            if (this.fuseTimer >= this.fuseTime) {
                this.explode(world);
            }
        } else {
            if (this.fuseTimer > 0) {
                this.fuseTimer = Math.max(0, this.fuseTimer - Math.round(dt * 20));
            }
        }
    }
}

/**
 * Skeleton Entity (Minecraft 1.5)
 * - Type: Hostile (Undead Ranged)
 * - Health: 20 HP (10 hearts)
 * - Hitbox: 0.6 Width x 1.95 Height
 * - Movement Speed: 0.25
 * - Attack: Bow & Arrow (Cooldown ~2s, optimal strafe distance 10 blocks)
 * - Trait: Burns in daylight, strafes while shooting
 */
export class Skeleton extends Mob {
    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(x = 0, y = 0, z = 0) {
        super('skeleton', x, y, z);

        this.maxHealth = 20;
        this.health = 20;
        this.width = 0.6;
        this.height = 1.95;
        this.eyeHeight = 1.74;
        this.movementSpeed = 0.25;

        this.isHostile = true;
        this.isPassive = false;
        this.isUndead = true;

        this.followRange = 16.0;
        this.attackRange = 15.0; // Bow range
        this.preferredCombatDistance = 10.0; // Optimal strafe distance
        this.bowAttackInterval = 2.0; // 2 seconds between shots
        this.bowAttackTimer = 0;

        // Strafing behavior
        this.isStrafing = false;
        this.strafeDirection = 1; // 1 = right, -1 = left
        this.strafeClock = 0;

        // Callback hook for projectile spawn
        this.onShootArrowCallback = null;

        this.updateHitbox();
    }

    initDefaultAI() {
        this.aiGoals = [
            new RangedAttackGoal(this),
            new WanderGoal(this, 8, 5)
        ];
    }

    /**
     * Shoot an arrow towards target
     * @param {LivingEntity} target 
     * @param {Object} [world=null]
     * @returns {boolean}
     */
    shootArrow(target, world = null) {
        if (!target || !target.isAlive() || this.bowAttackTimer > 0) {
            return false;
        }

        this.bowAttackTimer = this.bowAttackInterval;

        const eyePos = this.getEyePosition();
        const targetPos = target.getEyePosition ? target.getEyePosition() : target.position;

        // Compute trajectory vector with slight arc
        const dx = targetPos.x - eyePos.x;
        const dy = (targetPos.y - 0.2) - eyePos.y;
        const dz = targetPos.z - eyePos.z;
        const distXZ = Math.hypot(dx, dz);

        const arrowSpeed = 24.0; // blocks per second
        const vx = (dx / distXZ) * arrowSpeed;
        const vy = (dy / distXZ) * arrowSpeed + (distXZ * 0.15); // ballistic compensation
        const vz = (dz / distXZ) * arrowSpeed;

        if (typeof this.onShootArrowCallback === 'function') {
            this.onShootArrowCallback({
                shooter: this,
                origin: eyePos,
                velocity: { x: vx, y: vy, z: vz },
                damage: 3.0 + Math.random() * 2.0 // 3-5 damage
            });
        }

        return true;
    }

    /**
     * Update Skeleton bow cooldown & strafing
     * @param {number} dt 
     * @param {Object} [world=null] 
     */
    update(dt = 0.05, world = null) {
        super.update(dt, world);

        if (this.isDead) return;

        if (this.bowAttackTimer > 0) {
            this.bowAttackTimer = Math.max(0, this.bowAttackTimer - dt);
        }

        this.strafeClock += dt;
        if (this.strafeClock > 2.5) {
            this.strafeClock = 0;
            this.strafeDirection = Math.random() < 0.5 ? 1 : -1;
        }
    }
}

/**
 * Spider Entity (Minecraft 1.5)
 * - Type: Hostile / Neutral (Climber)
 * - Health: 16 HP (8 hearts)
 * - Hitbox: 1.4 Width x 0.9 Height (Wide & Low)
 * - Movement Speed: 0.30 (Fast)
 * - Attack Damage: 2.0 - 3.0 HP
 * - Abilities: Wall Climbing (scales vertical blocks), Leap Pounce Attack (jumps at target), Daylight Neutrality
 */
export class Spider extends Mob {
    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(x = 0, y = 0, z = 0) {
        super('spider', x, y, z);

        // Minecraft 1.5 specifications
        this.maxHealth = 16;
        this.health = 16;
        this.width = 1.4;
        this.height = 0.9;
        this.eyeHeight = 0.65;
        this.movementSpeed = 0.30;

        this.isHostile = false; // Neutral in daytime, hostile in dark
        this.isPassive = false;
        this.isUndead = false;

        this.attackDamage = 2.5;
        this.attackRange = 2.0;
        this.attackCooldownMax = 1.0;
        this.followRange = 16.0;

        // Climbing & Leaping abilities
        this.isClimbing = false;
        this.climbSpeed = 3.5;
        this.leapCooldown = 0;

        this.updateHitbox();
    }

    initDefaultAI() {
        this.aiGoals = [
            new SpiderClimbGoal(this),
            new SpiderTargetGoal(this),
            new SpiderLeapGoal(this),
            new MeleeAttackGoal(this),
            new ChaseTargetGoal(this),
            new WanderGoal(this, 8, 4)
        ];
    }

    /**
     * Leap / pounce at target with forward & vertical impulse
     * @param {LivingEntity} target 
     * @returns {boolean}
     */
    leapAtTarget(target) {
        if (!target || !this.onGround) return false;

        const dx = target.position.x - this.position.x;
        const dz = target.position.z - this.position.z;
        const dist = Math.hypot(dx, dz) || 1;

        this.velocity.x += (dx / dist) * 7.0;
        this.velocity.y = 5.0;
        this.velocity.z += (dz / dist) * 7.0;
        this.onGround = false;
        return true;
    }

    /**
     * Attempt melee strike against target entity
     * @param {LivingEntity} target 
     * @returns {boolean}
     */
    attackEntity(target) {
        if (!target || !target.isAlive() || this.attackCooldown > 0) {
            return false;
        }

        const reach = this.attackRange + (target.width / 2);
        if (this.distanceTo(target) <= reach) {
            target.takeDamage(this.attackDamage, this);
            this.attackCooldown = this.attackCooldownMax;
            return true;
        }

        return false;
    }

    /**
     * Update Spider wall climbing physics and leap cooldown
     * @param {number} dt 
     * @param {Object} [world=null] 
     */
    update(dt = 0.05, world = null) {
        super.update(dt, world);

        if (this.isDead) return;

        // Wall climbing: when climbing, negate gravity and climb upward
        if (this.isClimbing) {
            this.fallDistance = 0;
        }
    }
}

/**
 * Enderman Entity (Minecraft 1.5)
 * - Type: Neutral until provoked (Teleporter)
 * - Health: 40 HP (20 hearts)
 * - Hitbox: 0.6 Width x 2.9 Height (3 blocks high)
 * - Movement Speed: 0.30 (Calm) / 0.45 (Enraged sprint)
 * - Attack Damage: 7.0 HP (3.5 hearts)
 * - Abilities:
 *   - Stare Aggro: Angers when crosshair looks at head/eyes
 *   - Teleportation: Teleports when damaged, in water/rain, projectile evasion, or combat ambushes
 *   - Projectile Immunity: Evades arrows and projectiles by teleporting instantly
 */
export class Enderman extends Mob {
    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(x = 0, y = 0, z = 0) {
        super('enderman', x, y, z);

        // Minecraft 1.5 specifications
        this.maxHealth = 40;
        this.health = 40;
        this.width = 0.6;
        this.height = 2.9;
        this.eyeHeight = 2.6;
        this.movementSpeed = 0.30;

        this.isHostile = false; // Neutral until stared at or attacked
        this.isPassive = false;
        this.isUndead = false;

        this.attackDamage = 7.0;
        this.attackRange = 2.0;
        this.attackCooldownMax = 1.0;
        this.followRange = 64.0; // Long stare sight range

        // Enderman states
        this.isAggro = false;
        this.isStaring = false;
        this.isScreaming = false;
        this.carriedBlock = null; // Can hold a block ID
        this.teleportCooldown = 0;

        // Callback hook for teleport effects (particles, sound)
        this.onTeleportCallback = null;

        this.updateHitbox();
    }

    initDefaultAI() {
        this.aiGoals = [
            new EndermanTeleportGoal(this),
            new EndermanStareGoal(this),
            new MeleeAttackGoal(this),
            new ChaseTargetGoal(this),
            new WanderGoal(this, 10, 5)
        ];
    }

    /**
     * Teleport to specific world coordinates
     * @param {Object} world 
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {boolean} True if teleport succeeded
     */
    teleportTo(world, x, y, z) {
        const targetX = Math.floor(x) + 0.5;
        const targetZ = Math.floor(z) + 0.5;
        let targetY = Math.floor(y);

        // Check vertical clearance for 3 blocks high
        if (world && typeof world.getBlock === 'function') {
            // Snap down to ground
            for (let dy = 0; dy <= 5; dy++) {
                const checkY = targetY - dy;
                if (checkY < 0) break;
                if (checkClearance(world, Math.floor(targetX), checkY, Math.floor(targetZ), this.width, this.height)) {
                    targetY = checkY;
                    break;
                }
            }
            if (!checkClearance(world, Math.floor(targetX), targetY, Math.floor(targetZ), this.width, this.height)) {
                return false;
            }
        }

        const oldPos = { ...this.position };
        this.setPosition(targetX, targetY, targetZ);
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.velocity.z = 0;

        if (this.pathNavigator) {
            this.pathNavigator.clearPath();
        }

        if (typeof this.onTeleportCallback === 'function') {
            this.onTeleportCallback({
                entity: this,
                from: oldPos,
                to: { x: targetX, y: targetY, z: targetZ }
            });
        }

        return true;
    }

    /**
     * Teleport randomly within radius
     * @param {Object} world 
     * @param {number} [radius=16] 
     * @returns {boolean}
     */
    teleportRandomly(world, radius = 16) {
        for (let attempt = 0; attempt < 16; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 4 + Math.random() * radius;
            const tx = this.position.x + Math.sin(angle) * dist;
            const tz = this.position.z + Math.cos(angle) * dist;
            const ty = this.position.y + (Math.random() * 6 - 3);

            if (this.teleportTo(world, tx, ty, tz)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Pick up a block
     * @param {number} blockId 
     */
    pickUpBlock(blockId) {
        this.carriedBlock = blockId;
    }

    /**
     * Place carried block
     * @param {Object} world 
     * @returns {number|null} Placed block ID
     */
    placeBlock(world = null) {
        const placed = this.carriedBlock;
        this.carriedBlock = null;
        return placed;
    }

    /**
     * Handle taking damage with projectile evasion & water vulnerability
     * @param {number} amount 
     * @param {Entity|string|null} [source=null] 
     * @returns {boolean}
     */
    takeDamage(amount, source = null) {
        // Projectile immunity: teleports away without taking damage
        if (source === 'arrow' || source === 'projectile' || (source && source.type === 'arrow') || (source && source.isProjectile)) {
            this.teleportRandomly(null, 16);
            return false;
        }

        const result = super.takeDamage(amount, source);
        if (result) {
            // Enrage if attacked by entity
            if (source instanceof Entity) {
                this.setTarget(source);
                this.isAggro = true;
                this.isHostile = true;
                this.movementSpeed = 0.45;
                this.state = 'CHASE';
            }
            // 50% chance to teleport upon receiving melee damage
            if (Math.random() < 0.5) {
                this.teleportRandomly(null, 16);
            }
        }
        return result;
    }

    /**
     * Attempt melee strike against target entity
     * @param {LivingEntity} target 
     * @returns {boolean}
     */
    attackEntity(target) {
        if (!target || !target.isAlive() || this.attackCooldown > 0) {
            return false;
        }

        const reach = this.attackRange + (target.width / 2);
        if (this.distanceTo(target) <= reach) {
            target.takeDamage(this.attackDamage, this);
            this.attackCooldown = this.attackCooldownMax;
            return true;
        }

        return false;
    }

    /**
     * Update Enderman water check and animations
     * @param {number} dt 
     * @param {Object} [world=null] 
     */
    update(dt = 0.05, world = null) {
        super.update(dt, world);

        if (this.isDead) return;

        // Water damage & teleport
        if (this.inWater) {
            this.takeDamage(1, 'water');
            this.teleportRandomly(world, 16);
        }
    }
}

/**
 * Ghast Entity (Minecraft 1.5)
 * - Type: Hostile Nether Aerial
 * - Health: 10 HP (5 hearts)
 * - Hitbox: 4.0 Width x 4.0 Height (Giant floating jellyfish)
 * - Movement Speed: 0.15 (Flying float)
 * - Attack: Explosive Fireballs (Shoot range up to 64 blocks, 1s charge)
 * - Traits: Immune to fire/lava, immune to gravity (flies freely in 3D air)
 */
export class Ghast extends Mob {
    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(x = 0, y = 0, z = 0) {
        super('ghast', x, y, z);

        // Minecraft 1.5 specifications
        this.maxHealth = 10;
        this.health = 10;
        this.width = 4.0;
        this.height = 4.0;
        this.eyeHeight = 2.0;
        this.movementSpeed = 0.15;
        this.gravity = 0; // Ignores gravity, flies in 3D air

        this.isHostile = true;
        this.isPassive = false;
        this.isUndead = false;
        this.isImmuneToFire = true; // Nether fire immunity

        this.followRange = 64.0;
        this.attackRange = 64.0; // Long sight & fireball range
        this.chargeDuration = 1.0; // 1s charge before shot
        this.shootInterval = 3.0; // 3s between fireballs
        this.isCharging = false;
        this.chargeTimer = 0;

        // Callback hook for fireball projectile spawn
        this.onShootFireballCallback = null;

        this.updateHitbox();
    }

    initDefaultAI() {
        this.aiGoals = [
            new GhastAttackGoal(this),
            new GhastFlyGoal(this)
        ];
    }

    /**
     * Shoot an explosive fireball projectile towards target
     * @param {LivingEntity} target 
     * @param {Object} [world=null] 
     * @returns {boolean}
     */
    shootFireball(target, world = null) {
        if (!target || this.isDead) return false;

        const origin = this.getEyePosition();
        const targetPos = target.getEyePosition ? target.getEyePosition() : target.position;

        const dx = targetPos.x - origin.x;
        const dy = targetPos.y - origin.y;
        const dz = targetPos.z - origin.z;
        const dist = Math.hypot(dx, dy, dz) || 1;

        const speed = 20.0; // Fireball velocity (blocks/sec)
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        const vz = (dz / dist) * speed;

        if (typeof this.onShootFireballCallback === 'function') {
            this.onShootFireballCallback({
                shooter: this,
                origin: origin,
                velocity: { x: vx, y: vy, z: vz },
                explosionRadius: 1,
                damage: 6.0
            });
        }

        return true;
    }

    /**
     * Update Ghast 3D flight & charging
     * @param {number} dt 
     * @param {Object} [world=null] 
     */
    update(dt = 0.05, world = null) {
        super.update(dt, world);

        if (this.isDead) return;

        // Smooth flight velocity integration (air drag)
        this.velocity.x *= 0.98;
        this.velocity.y *= 0.98;
        this.velocity.z *= 0.98;
    }
}

/**
 * ZombiePigman Entity (Minecraft 1.5)
 * - Type: Neutral Nether Undead
 * - Health: 20 HP (10 hearts)
 * - Hitbox: 0.6 Width x 1.95 Height
 * - Movement Speed: 0.23 (Calm) / 0.38 (Enraged sprint)
 * - Attack Damage: 5.0 HP (2.5 hearts + golden sword)
 * - Traits: Immune to fire/lava, does NOT burn in sunlight, herd aggression (anger alerts all nearby pigmen)
 */
export class ZombiePigman extends Mob {
    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(x = 0, y = 0, z = 0) {
        super('zombie_pigman', x, y, z);

        // Minecraft 1.5 specifications
        this.maxHealth = 20;
        this.health = 20;
        this.width = 0.6;
        this.height = 1.95;
        this.eyeHeight = 1.74;
        this.movementSpeed = 0.23;

        this.isHostile = false; // Neutral by default
        this.isPassive = false;
        this.isUndead = true;
        this.isImmuneToFire = true; // Nether fire immunity

        this.attackDamage = 5.0;
        this.attackRange = 1.5;
        this.attackCooldownMax = 1.0;
        this.followRange = 32.0;

        // Anger & Pack Aggression
        this.angerLevel = 0; // seconds of remaining rage
        this.angerTarget = null;
        this.heldItem = 'golden_sword';

        this.updateHitbox();
    }

    initDefaultAI() {
        this.aiGoals = [
            new ZombiePigmanAngerGoal(this),
            new MeleeAttackGoal(this),
            new ChaseTargetGoal(this),
            new WanderGoal(this, 8, 5)
        ];
    }

    /**
     * Enrage this ZombiePigman and broadcast pack anger to all nearby ZombiePigmen in world
     * @param {LivingEntity} target 
     * @param {Object} [world=null] 
     */
    anger(target, world = null) {
        if (!target || !target.isAlive || !target.isAlive()) return;

        this.angerLevel = 25.0; // 25 seconds of rage (500 ticks)
        this.angerTarget = target;
        this.setTarget(target);
        this.isHostile = true;
        this.movementSpeed = 0.38;
        this.state = 'CHASE';

        // Herd mentality: alert nearby ZombiePigmen in world within 32 blocks
        if (world && world.entities) {
            for (const entity of world.entities) {
                if (entity instanceof ZombiePigman && entity !== this && entity.isAlive()) {
                    const dist = this.distanceTo(entity);
                    if (dist <= 32.0 && entity.angerLevel <= 0) {
                        entity.angerLevel = 25.0;
                        entity.angerTarget = target;
                        entity.setTarget(target);
                        entity.isHostile = true;
                        entity.movementSpeed = 0.38;
                        entity.state = 'CHASE';
                    }
                }
            }
        }
    }

    /**
     * Handle taking damage (triggers herd anger)
     * @param {number} amount 
     * @param {Entity|string|null} [source=null] 
     * @returns {boolean}
     */
    takeDamage(amount, source = null) {
        const result = super.takeDamage(amount, source);
        if (result && source instanceof Entity) {
            this.anger(source, null);
        }
        return result;
    }

    /**
     * Attempt melee strike against target entity
     * @param {LivingEntity} target 
     * @returns {boolean}
     */
    attackEntity(target) {
        if (!target || !target.isAlive() || this.attackCooldown > 0) {
            return false;
        }

        const reach = this.attackRange + (target.width / 2);
        if (this.distanceTo(target) <= reach) {
            target.takeDamage(this.attackDamage, this);
            this.attackCooldown = this.attackCooldownMax;
            return true;
        }

        return false;
    }

    /**
     * Zombie Pigmen do NOT burn in sunlight
     * @returns {boolean}
     */
    checkDaylightBurn(world = null, isDay = true) {
        return false;
    }
}

/**
 * WitherSkeleton Entity (Minecraft 1.5)
 * - Type: Hostile Nether Undead
 * - Health: 20 HP (10 hearts)
 * - Hitbox: 0.7 Width x 2.4 Height (Taller than regular Skeleton)
 * - Movement Speed: 0.25 (Sprint 0.30)
 * - Attack Damage: 5.0 HP (2.5 hearts + stone sword)
 * - Ability: Inflicts Wither I status effect on hit (deals damage over time and turns hearts black)
 * - Traits: Immune to fire/lava, does NOT burn in sunlight
 */
export class WitherSkeleton extends Mob {
    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [z=0]
     */
    constructor(x = 0, y = 0, z = 0) {
        super('wither_skeleton', x, y, z);

        // Minecraft 1.5 specifications
        this.maxHealth = 20;
        this.health = 20;
        this.width = 0.7;
        this.height = 2.4; // Tall skeleton
        this.eyeHeight = 2.1;
        this.movementSpeed = 0.25;

        this.isHostile = true;
        this.isPassive = false;
        this.isUndead = true;
        this.isImmuneToFire = true; // Nether fire immunity

        this.attackDamage = 5.0;
        this.attackRange = 1.8;
        this.attackCooldownMax = 1.0;
        this.followRange = 16.0;

        this.heldItem = 'stone_sword';
        this.witherEffectDuration = 10.0; // 10 seconds of Wither I effect

        // Callback hook for inflicting wither effect
        this.onInflictWitherCallback = null;

        this.updateHitbox();
    }

    initDefaultAI() {
        this.aiGoals = [
            new MeleeAttackGoal(this),
            new ChaseTargetGoal(this),
            new WanderGoal(this, 8, 5)
        ];
    }

    /**
     * Attack target with Stone Sword and inflict Wither I effect
     * @param {LivingEntity} target 
     * @returns {boolean}
     */
    attackEntity(target) {
        if (!target || !target.isAlive() || this.attackCooldown > 0) {
            return false;
        }

        const reach = this.attackRange + (target.width / 2);
        if (this.distanceTo(target) <= reach) {
            const damageSuccess = target.takeDamage(this.attackDamage, this);
            if (damageSuccess) {
                // Inflict Wither effect for 10 seconds (200 ticks)
                if (typeof target.applyStatusEffect === 'function') {
                    target.applyStatusEffect('wither', this.witherEffectDuration, 1);
                } else {
                    target.witherTicks = Math.round(this.witherEffectDuration * 20);
                }

                if (typeof this.onInflictWitherCallback === 'function') {
                    this.onInflictWitherCallback({
                        attacker: this,
                        target: target,
                        duration: this.witherEffectDuration
                    });
                }
            }
            this.attackCooldown = this.attackCooldownMax;
            return true;
        }

        return false;
    }

    /**
     * Wither Skeletons do NOT burn in sunlight
     * @returns {boolean}
     */
    checkDaylightBurn(world = null, isDay = true) {
        return false;
    }
}

/**
 * Mob Registry mapping type names to classes
 */
export const MOB_REGISTRY = Object.freeze({
    pig: Pig,
    cow: Cow,
    zombie: Zombie,
    creeper: Creeper,
    skeleton: Skeleton,
    spider: Spider,
    enderman: Enderman,
    ghast: Ghast,
    zombie_pigman: ZombiePigman,
    zombiepigman: ZombiePigman,
    wither_skeleton: WitherSkeleton,
    witherskeleton: WitherSkeleton
});

/**
 * Factory helper to instantiate mobs by type string
 * @param {string} type 
 * @param {number} [x=0] 
 * @param {number} [y=0] 
 * @param {number} [z=0] 
 * @returns {Mob}
 */
export function createMob(type, x = 0, y = 0, z = 0) {
    const key = (type || '').toLowerCase().trim();
    const MobClass = MOB_REGISTRY[key];
    if (!MobClass) {
        throw new Error();
    }
    return new MobClass(x, y, z);
}

// Re-export MobRenderer and helpers
export {
    MobRenderer,
    createMobRenderer,
    createMobMesh,
    MOB_MODEL_BUILDERS
};
