

import { BLOCKS } from '../core/chunk.js';
import { Entity, AABB } from './mob.js';

export function isRailBlock(blockId) {
    return blockId === BLOCKS.RAIL ||
           blockId === BLOCKS.POWERED_RAIL ||
           blockId === BLOCKS.DETECTOR_RAIL ||
           blockId === BLOCKS.ACTIVATOR_RAIL;
}

export function isActivatorRail(blockId) {
    return blockId === BLOCKS.ACTIVATOR_RAIL;
}

export class Minecart extends Entity {
    
    constructor(type = 'minecart', x = 0, y = 0, z = 0) {
        super(type, x, y, z);

        // Minecraft 1.5 Minecart dimensions
        this.width = 0.98;
        this.height = 0.7;
        this.eyeHeight = 0.35;

        // Health & Damage
        this.maxHealth = 2;
        this.health = 2;
        this.damage = 0;

        // Movement & Physics
        this.maxSpeed = 0.4; // Max speed (blocks per tick) or 8.0 blocks/sec
        this.gravity = 20.0;
        this.dragRail = 0.96;    // Momentum retention on track
        this.dragGround = 0.50;  // High friction off track
        this.dragAir = 0.95;     // Air resistance

        // Rail tracking
        this.onRail = false;
        this.currentRail = null;

        // Passenger support
        this.passenger = null;

        this.updateHitbox();
    }

    mount(entity) {
        if (!entity || this.passenger || this.isDead) return false;
        this.passenger = entity;
        if (typeof entity.setRiding === 'function') {
            entity.setRiding(this);
        }
        this.updatePassengerPosition();
        return true;
    }

    dismount() {
        const p = this.passenger;
        if (p) {
            if (typeof p.setRiding === 'function') {
                p.setRiding(null);
            }
            this.passenger = null;
        }
        return p;
    }

    hasPassenger() {
        return Boolean(this.passenger);
    }

    updatePassengerPosition() {
        if (!this.passenger) return;
        const passengerY = this.position.y + 0.35;
        if (typeof this.passenger.setPosition === 'function') {
            this.passenger.setPosition(this.position.x, passengerY, this.position.z);
        } else if (this.passenger.position) {
            this.passenger.position.x = this.position.x;
            this.passenger.position.y = passengerY;
            this.passenger.position.z = this.position.z;
        }
    }

    getCurrentRail(world = null) {
        if (!world || typeof world.getBlock !== 'function') return null;

        const bx = Math.floor(this.position.x);
        const by = Math.floor(this.position.y);
        const bz = Math.floor(this.position.z);

        // Check at current voxel
        let blockId = world.getBlock(bx, by, bz);
        if (isRailBlock(blockId)) {
            return { x: bx, y: by, z: bz, blockId };
        }

        // Check 1 block below if cart is resting slightly above track
        const byBelow = Math.floor(this.position.y - 0.2);
        if (byBelow !== by) {
            blockId = world.getBlock(bx, byBelow, bz);
            if (isRailBlock(blockId)) {
                return { x: bx, y: byBelow, z: bz, blockId };
            }
        }

        return null;
    }

    isRailPowered(railX, railY, railZ, world = null, simulator = null) {
        // 1. Check simulator power if available
        if (simulator) {
            if (typeof simulator.isBlockPowered === 'function') {
                if (simulator.isBlockPowered(railX, railY, railZ)) return true;
            }
            if (typeof simulator.getData === 'function') {
                const data = simulator.getData(railX, railY, railZ);
                if (data && (data.powered || data.power > 0)) return true;
            }
        }

        // 2. Check world metadata or power method
        if (world) {
            if (typeof world.isBlockPowered === 'function' && world.isBlockPowered(railX, railY, railZ)) {
                return true;
            }
            if (typeof world.getBlockData === 'function') {
                const data = world.getBlockData(railX, railY, railZ);
                if (data && (data.powered || data.power > 0)) return true;
            }

            // 3. Check directly adjacent power source blocks (e.g. Redstone Block or Torch)
            if (typeof world.getBlock === 'function') {
                const offsets = [
                    { dx: 0, dy: -1, dz: 0 },
                    { dx: 0, dy: 1, dz: 0 },
                    { dx: 1, dy: 0, dz: 0 },
                    { dx: -1, dy: 0, dz: 0 },
                    { dx: 0, dy: 0, dz: 1 },
                    { dx: 0, dy: 0, dz: -1 }
                ];
                for (const off of offsets) {
                    const adjId = world.getBlock(railX + off.dx, railY + off.dy, railZ + off.dz);
                    if (adjId === BLOCKS.REDSTONE_BLOCK || adjId === 76 ) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    takeDamage(amount, source = null) {
        if (this.isDead) return false;
        this.health = Math.max(0, this.health - amount);
        this.damage += amount;

        if (this.health <= 0 || this.damage >= this.maxHealth) {
            this.destroy(source);
        }
        return true;
    }

    destroy(source = null) {
        this.isDead = true;
        this.removed = true;
        this.dismount();
    }

    push(dx, dz, force = 1.0) {
        const len = Math.hypot(dx, dz);
        if (len > 0.001) {
            this.velocity.x += (dx / len) * force;
            this.velocity.z += (dz / len) * force;
        }
    }

    updatePhysics(dt = 0.05, world = null, simulator = null) {
        this.currentRail = this.getCurrentRail(world);
        this.onRail = Boolean(this.currentRail);

        if (this.onRail) {
            // Apply rail friction
            this.velocity.x *= this.dragRail;
            this.velocity.z *= this.dragRail;

            // Handle Powered Rail acceleration or braking
            if (this.currentRail.blockId === BLOCKS.POWERED_RAIL) {
                const powered = this.isRailPowered(this.currentRail.x, this.currentRail.y, this.currentRail.z, world, simulator);
                if (powered) {
                    const speed = Math.hypot(this.velocity.x, this.velocity.z);
                    if (speed > 0.01) {
                        this.velocity.x += (this.velocity.x / speed) * 0.06;
                        this.velocity.z += (this.velocity.z / speed) * 0.06;
                    }
                } else {
                    // Unpowered booster rail acts as brake
                    this.velocity.x *= 0.5;
                    this.velocity.z *= 0.5;
                }
            }

            // Snap Y coordinate smoothly onto rail surface
            const railTopY = this.currentRail.y;
            this.position.y = railTopY;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            // Off-track: apply standard gravity and ground/air friction
            this.velocity.y -= this.gravity * dt;
            const drag = this.onGround ? this.dragGround : this.dragAir;
            this.velocity.x *= drag;
            this.velocity.z *= drag;
        }

        // Clamp horizontal velocity to maxSpeed
        const currentSpeed = Math.hypot(this.velocity.x, this.velocity.z);
        const maxSpeedUnits = this.maxSpeed * 20; // Convert blocks/tick to blocks/sec
        if (currentSpeed > maxSpeedUnits) {
            const factor = maxSpeedUnits / currentSpeed;
            this.velocity.x *= factor;
            this.velocity.z *= factor;
        }

        // Apply velocity to position
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        // Ground collision check if falling off tracks
        if (!this.onRail && world && typeof world.getBlock === 'function') {
            const bx = Math.floor(this.position.x);
            const by = Math.floor(this.position.y);
            const bz = Math.floor(this.position.z);
            const blockBelow = world.getBlock(bx, by - 1, bz);
            if (blockBelow !== BLOCKS.AIR && this.velocity.y <= 0) {
                this.position.y = by;
                this.velocity.y = 0;
                this.onGround = true;
            } else {
                this.onGround = false;
            }
        }

        this.updatePassengerPosition();
    }

    update(dt = 0.05, world = null, simulator = null) {
        this.ticksLived++;
        this.prevPosition.x = this.position.x;
        this.prevPosition.y = this.position.y;
        this.prevPosition.z = this.position.z;

        this.updatePhysics(dt, world, simulator);
        this.updateHitbox();
    }
}

export class MinecartTNT extends Minecart {
    
    constructor(x = 0, y = 0, z = 0) {
        super('minecart_tnt', x, y, z);

        // Fuse mechanics
        this.fuse = -1; // -1: Unlit / Idle; >= 0: Active countdown ticks
        this.defaultFuse = 80; // 80 ticks = 4.0 seconds
        this.isPrimed = false;
        this.hasExploded = false;
        this.explosionRadius = 4.0; // Standard TNT explosion power

        // Explosion event callback hook
        this.onExplodeCallback = null;

        this.updateHitbox();
    }

    prime(fuseTicks = 80) {
        this.isPrimed = true;
        this.fuse = fuseTicks;
    }

    ignite(fuseTicks = 80) {
        this.prime(fuseTicks);
    }

    explode(world = null) {
        if (this.hasExploded || this.isDead) return;

        this.hasExploded = true;
        this.isDead = true;
        this.removed = true;
        this.health = 0;

        // TNT Minecart explosion power scales slightly with velocity
        const speed = Math.hypot(this.velocity.x, this.velocity.z);
        const power = Math.min(7.0, this.explosionRadius + speed * 0.5);

        if (typeof this.onExplodeCallback === 'function') {
            this.onExplodeCallback({
                x: this.position.x,
                y: this.position.y,
                z: this.position.z,
                power: power,
                cart: this
            });
        }

        if (world && typeof world.createExplosion === 'function') {
            world.createExplosion(this.position.x, this.position.y, this.position.z, power);
        }
    }

    update(dt = 0.05, world = null, simulator = null) {
        super.update(dt, world, simulator);

        if (this.isDead || this.hasExploded) return;

        // 1. Check if passing over a powered Activator Rail -> Immediate detonation
        if (this.currentRail && this.currentRail.blockId === BLOCKS.ACTIVATOR_RAIL) {
            const isPowered = this.isRailPowered(
                this.currentRail.x,
                this.currentRail.y,
                this.currentRail.z,
                world,
                simulator
            );
            if (isPowered) {
                this.explode(world);
                return;
            }
        }

        // 2. Handle active fuse countdown
        if (this.isPrimed) {
            const elapsedTicks = Math.max(1, Math.round(dt * 20));
            this.fuse -= elapsedTicks;
            if (this.fuse <= 0) {
                this.explode(world);
            }
        }
    }
}

export class MinecartHopper extends Minecart {
    
    constructor(x = 0, y = 0, z = 0) {
        super('minecart_hopper', x, y, z);

        // 5-slot Container Inventory matching Minecraft 1.5 Hopper
        this.inventory = {
            numSlots: 5,
            slots: new Array(5).fill(null)
        };

        // Transfer cooldown (Minecraft hopper rate: 1 item every 4 redstone ticks = 0.2s)
        this.transferCooldown = 0;
        this.transferCooldownMax = 0.2;

        // Activator rail locking state
        this.locked = false;
        this.enabled = true;

        // Callback hook for item pulled event
        this.onItemPulledCallback = null;

        this.updateHitbox();
    }

    getInventory() {
        return this.inventory;
    }

    getSlots() {
        return this.inventory.slots;
    }

    getSlot(index) {
        if (index < 0 || index >= this.inventory.numSlots) return null;
        return this.inventory.slots[index];
    }

    setSlot(index, item) {
        if (index >= 0 && index < this.inventory.numSlots) {
            this.inventory.slots[index] = item;
        }
    }

    addItem(item) {
        if (!item || item.count <= 0) return 0;
        const maxStack = item.maxStack || 64;
        let remaining = item.count;

        // 1. Try to merge into existing matching slots
        for (let i = 0; i < this.inventory.numSlots; i++) {
            const slot = this.inventory.slots[i];
            if (slot && slot.id === item.id && slot.count < (slot.maxStack || maxStack)) {
                const space = (slot.maxStack || maxStack) - slot.count;
                const toAdd = Math.min(space, remaining);
                slot.count += toAdd;
                remaining -= toAdd;
                if (remaining <= 0) return 0;
            }
        }

        // 2. Put remainder into first empty slot
        for (let i = 0; i < this.inventory.numSlots; i++) {
            const slot = this.inventory.slots[i];
            if (!slot || slot.count <= 0) {
                const toAdd = Math.min(maxStack, remaining);
                this.inventory.slots[i] = {
                    id: item.id,
                    count: toAdd,
                    maxStack: maxStack,
                    isBlock: Boolean(item.isBlock)
                };
                remaining -= toAdd;
                if (remaining <= 0) return 0;
            }
        }

        return remaining;
    }

    isFull() {
        for (let i = 0; i < this.inventory.numSlots; i++) {
            const slot = this.inventory.slots[i];
            if (!slot || slot.count < (slot.maxStack || 64)) {
                return false;
            }
        }
        return true;
    }

    isEmpty() {
        for (let i = 0; i < this.inventory.numSlots; i++) {
            const slot = this.inventory.slots[i];
            if (slot && slot.count > 0) {
                return false;
            }
        }
        return true;
    }

    clearInventory() {
        for (let i = 0; i < this.inventory.numSlots; i++) {
            this.inventory.slots[i] = null;
        }
    }

    pullItemsFromAbove(world = null, simulator = null) {
        if (this.locked || !this.enabled || this.isFull()) return false;

        const aboveX = Math.floor(this.position.x);
        const aboveY = Math.floor(this.position.y + 1);
        const aboveZ = Math.floor(this.position.z);

        // 1. Pull from container block directly above
        let sourceInv = null;

        if (simulator) {
            if (typeof simulator.getContainer === 'function') {
                sourceInv = simulator.getContainer(aboveX, aboveY, aboveZ);
            }
            if (!sourceInv && typeof simulator.getData === 'function') {
                const data = simulator.getData(aboveX, aboveY, aboveZ);
                sourceInv = data ? data.inventory : null;
            }
        }

        if (!sourceInv && world) {
            if (typeof world.getContainer === 'function') {
                sourceInv = world.getContainer(aboveX, aboveY, aboveZ);
            } else if (typeof world.getBlockData === 'function') {
                const data = world.getBlockData(aboveX, aboveY, aboveZ);
                sourceInv = data ? data.inventory : null;
            }
        }

        if (sourceInv) {
            const sourceSlots = Array.isArray(sourceInv) ? sourceInv : (sourceInv.slots || []);
            for (let i = 0; i < sourceSlots.length; i++) {
                const srcItem = sourceSlots[i];
                if (srcItem && srcItem.count > 0) {
                    const itemToPull = {
                        id: srcItem.id,
                        count: 1,
                        maxStack: srcItem.maxStack || 64,
                        isBlock: Boolean(srcItem.isBlock)
                    };

                    const unadded = this.addItem(itemToPull);
                    if (unadded === 0) {
                        srcItem.count--;
                        if (srcItem.count <= 0) {
                            sourceSlots[i] = null;
                        }
                        this.transferCooldown = this.transferCooldownMax;

                        if (simulator && typeof simulator.notifyNeighbors === 'function') {
                            simulator.notifyNeighbors(aboveX, aboveY, aboveZ);
                        }

                        if (typeof this.onItemPulledCallback === 'function') {
                            this.onItemPulledCallback({
                                from: { x: aboveX, y: aboveY, z: aboveZ },
                                item: { id: srcItem.id, count: 1 }
                            });
                        }

                        return true;
                    }
                }
            }
        }

        // 2. Pull from dropped item entities above / inside minecart
        if (world && world.entities) {
            const entities = world.entities instanceof Set ? Array.from(world.entities) : world.entities;
            for (const entity of entities) {
                if (!entity || entity.isDead || entity.removed) continue;
                if (entity.type === 'item' || entity.item) {
                    const itemObj = entity.item || entity;
                    const dx = Math.abs(entity.position.x - this.position.x);
                    const dy = entity.position.y - this.position.y;
                    const dz = Math.abs(entity.position.z - this.position.z);

                    if (dx <= 0.75 && dz <= 0.75 && dy >= -0.2 && dy <= 1.5) {
                        const unadded = this.addItem({
                            id: itemObj.id,
                            count: 1,
                            maxStack: itemObj.maxStack || 64,
                            isBlock: Boolean(itemObj.isBlock)
                        });

                        if (unadded === 0) {
                            if (itemObj.count !== undefined) {
                                itemObj.count--;
                                if (itemObj.count <= 0) {
                                    entity.isDead = true;
                                    entity.removed = true;
                                }
                            } else {
                                entity.isDead = true;
                                entity.removed = true;
                            }

                            this.transferCooldown = this.transferCooldownMax;

                            if (typeof this.onItemPulledCallback === 'function') {
                                this.onItemPulledCallback({
                                    from: entity,
                                    item: { id: itemObj.id, count: 1 }
                                });
                            }

                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    update(dt = 0.05, world = null, simulator = null) {
        super.update(dt, world, simulator);

        if (this.isDead) return;

        // Check if passing over a powered Activator Rail -> Lock / disable hopper
        if (this.currentRail && this.currentRail.blockId === BLOCKS.ACTIVATOR_RAIL) {
            const isPowered = this.isRailPowered(
                this.currentRail.x,
                this.currentRail.y,
                this.currentRail.z,
                world,
                simulator
            );
            this.locked = isPowered;
            this.enabled = !isPowered;
        } else {
            this.locked = false;
            this.enabled = true;
        }

        // Decrement transfer cooldown
        if (this.transferCooldown > 0) {
            this.transferCooldown = Math.max(0, this.transferCooldown - dt);
        }

        // Attempt item pull if ready and not locked
        if (this.transferCooldown === 0 && !this.locked && this.enabled) {
            this.pullItemsFromAbove(world, simulator);
        }
    }
}

export const MINECART_REGISTRY = Object.freeze({
    minecart: Minecart,
    minecart_tnt: MinecartTNT,
    tnt: MinecartTNT,
    minecart_hopper: MinecartHopper,
    hopper: MinecartHopper
});

export function createMinecart(type, x = 0, y = 0, z = 0) {
    const CartClass = MINECART_REGISTRY[type.toLowerCase()];
    if (!CartClass) {
        throw new Error(`Unknown minecart type: "${type}". Available types: ${Object.keys(MINECART_REGISTRY).join(', ')}`);
    }
    return new CartClass(x, y, z);
}
