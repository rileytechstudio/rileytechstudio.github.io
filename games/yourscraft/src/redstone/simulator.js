/**
 * Minecraft 1.5 Redstone & Logic Simulator
 * 
 * Features:
 * - Block update system with scheduled tick queue (Redstone Ticks / Game Ticks)
 * - Redstone Wire power propagation (0-15 signal strength) with 3D step traversal
 * - Redstone Torch logic (inversion, attached block detection, burnout mechanics)
 * - Redstone Repeater logic (1-4 tick delays, 15-strength output, diode, locking mechanism)
 * - Redstone Comparator logic (Compare Mode, Subtraction Mode, Container fullness reading, reading through solid blocks)
 * - Strong vs Weak solid block powering rules
 * - Levers, Buttons, Pressure Plates, Redstone Blocks, Redstone Lamps, Daylight Detectors
 */

import { BLOCKS } from '../core/chunk.js';

// --- BLOCK IDS & CONSTANTS ---
export const REDSTONE_BLOCKS = Object.freeze({
    AIR: 0,
    STONE: 1,
    GRASS: 2,
    DIRT: 3,
    COBBLESTONE: 4,
    OAK_PLANKS: 5,
    BEDROCK: 7,
    GLASS: 20,
    DISPENSER: 23,
    PISTON_STICKY: 29,
    PISTON: 33,
    PISTON_HEAD: 34,
    WOOL: 35,
    GOLD_BLOCK: 41,
    IRON_BLOCK: 42,
    DOUBLE_STONE_SLAB: 43,
    STONE_SLAB: 44,
    BRICKS: 45,
    TNT: 46,
    BOOKSHELF: 47,
    MOSSY_COBBLESTONE: 48,
    OBSIDIAN: 49,
    TORCH: 50,
    REDSTONE_WIRE: 55,
    DIAMOND_BLOCK: 57,
    CHEST: 54,
    FURNACE: 61,
    LEVER: 69,
    STONE_PRESSURE_PLATE: 70,
    WOODEN_PRESSURE_PLATE: 72,
    REDSTONE_ORE: 73,
    REDSTONE_TORCH_OFF: 75,
    REDSTONE_TORCH_ON: 76,
    STONE_BUTTON: 77,
    GLOWSTONE: 89,
    UNPOWERED_REPEATER: 93,
    POWERED_REPEATER: 94,
    REDSTONE_LAMP_OFF: 123,
    REDSTONE_LAMP_ON: 124,
    TRIPWIRE_HOOK: 131,
    TRIPWIRE: 132,
    WOODEN_BUTTON: 143,
    TRAPPED_CHEST: 146,
    WEIGHTED_PRESSURE_PLATE_LIGHT: 147,
    WEIGHTED_PRESSURE_PLATE_HEAVY: 148,
    UNPOWERED_COMPARATOR: 149,
    POWERED_COMPARATOR: 150,
    DAYLIGHT_DETECTOR: 151,
    DAYLIGHT_SENSOR: 151,
    REDSTONE_BLOCK: 152,
    HOPPER: 154,
    ACTIVATOR_RAIL: 157,
    DROPPER: 158
});

// --- CARDINAL & 3D DIRECTIONS ---
export const DIRECTIONS = Object.freeze({
    DOWN: { id: 0, name: 'down', dx: 0, dy: -1, dz: 0, opposite: 1 },
    UP: { id: 1, name: 'up', dx: 0, dy: 1, dz: 0, opposite: 0 },
    NORTH: { id: 2, name: 'north', dx: 0, dy: 0, dz: -1, opposite: 3, flag: 1 }, // -Z
    SOUTH: { id: 3, name: 'south', dx: 0, dy: 0, dz: 1, opposite: 2, flag: 2 },  // +Z
    WEST: { id: 4, name: 'west', dx: -1, dy: 0, dz: 0, opposite: 5, flag: 4 },   // -X
    EAST: { id: 5, name: 'east', dx: 1, dy: 0, dz: 0, opposite: 4, flag: 8 }    // +X
});

export const ALL_DIRECTIONS = Object.freeze([
    DIRECTIONS.DOWN,
    DIRECTIONS.UP,
    DIRECTIONS.NORTH,
    DIRECTIONS.SOUTH,
    DIRECTIONS.WEST,
    DIRECTIONS.EAST
]);

export const HORIZONTAL_DIRECTIONS = Object.freeze([
    DIRECTIONS.NORTH,
    DIRECTIONS.SOUTH,
    DIRECTIONS.WEST,
    DIRECTIONS.EAST
]);

// Minecraft standard 2-bit horizontal rotation index (0: South, 1: West, 2: North, 3: East)
export const FACING_TO_DIR = Object.freeze([
    DIRECTIONS.SOUTH, // 0: +Z
    DIRECTIONS.WEST,  // 1: -X
    DIRECTIONS.NORTH, // 2: -Z
    DIRECTIONS.EAST   // 3: +X
]);

/**
 * Convert 2-bit facing index (0: South, 1: West, 2: North, 3: East) to Direction object.
 * @param {number} facing 
 * @returns {typeof DIRECTIONS.SOUTH}
 */
export function getDirectionFromFacing(facing) {
    return FACING_TO_DIR[facing & 3] || DIRECTIONS.SOUTH;
}

/**
 * Get opposite direction of a Direction object.
 * @param {Object} dir 
 * @returns {Object}
 */
export function getOppositeDirection(dir) {
    return ALL_DIRECTIONS[dir.opposite];
}

/**
 * Get Left perpendicular horizontal direction relative to a forward direction.
 * @param {Object} dir 
 * @returns {Object}
 */
export function getLeftDirection(dir) {
    // Left when facing South (+Z) is East (+X)
    // Left when facing West (-X) is South (+Z)
    // Left when facing North (-Z) is West (-X)
    // Left when facing East (+X) is North (-Z)
    if (dir === DIRECTIONS.SOUTH) return DIRECTIONS.EAST;
    if (dir === DIRECTIONS.WEST) return DIRECTIONS.SOUTH;
    if (dir === DIRECTIONS.NORTH) return DIRECTIONS.WEST;
    if (dir === DIRECTIONS.EAST) return DIRECTIONS.NORTH;
    return DIRECTIONS.EAST;
}

/**
 * Get Right perpendicular horizontal direction relative to a forward direction.
 * @param {Object} dir 
 * @returns {Object}
 */
export function getRightDirection(dir) {
    return getOppositeDirection(getLeftDirection(dir));
}

/**
 * Convert any facing representation (Direction object, number 0-5, 2-bit horizontal, or string) to a Direction object.
 * @param {Object|number|string} facing 
 * @param {Object} [defaultDir=DIRECTIONS.SOUTH]
 * @returns {Object} Direction object from DIRECTIONS
 */
export function parseDirection(facing, defaultDir = DIRECTIONS.SOUTH) {
    if (!facing && facing !== 0) return defaultDir;
    if (typeof facing === 'object' && facing.dx !== undefined && facing.dy !== undefined && facing.dz !== undefined) {
        return facing;
    }
    if (typeof facing === 'number') {
        if (facing >= 0 && facing < ALL_DIRECTIONS.length) {
            return ALL_DIRECTIONS[facing];
        }
        return FACING_TO_DIR[facing & 3] || defaultDir;
    }
    if (typeof facing === 'string') {
        const key = facing.toUpperCase();
        if (DIRECTIONS[key]) return DIRECTIONS[key];
    }
    return defaultDir;
}

// --- BLOCK CLASSIFICATION HELPERS ---

/**
 * Check if a block ID is a solid opaque cube that conducts redstone power.
 * @param {number} blockId 
 * @returns {boolean}
 */
export function isSolidOpaqueBlock(blockId) {
    if (blockId === 0) return false;
    // Transparent / non-conductive blocks
    if (
        blockId === REDSTONE_BLOCKS.AIR ||
        blockId === REDSTONE_BLOCKS.GLASS ||
        blockId === REDSTONE_BLOCKS.GLOWSTONE ||
        blockId === REDSTONE_BLOCKS.REDSTONE_WIRE ||
        blockId === REDSTONE_BLOCKS.REDSTONE_TORCH_ON ||
        blockId === REDSTONE_BLOCKS.REDSTONE_TORCH_OFF ||
        blockId === REDSTONE_BLOCKS.TORCH ||
        blockId === REDSTONE_BLOCKS.UNPOWERED_REPEATER ||
        blockId === REDSTONE_BLOCKS.POWERED_REPEATER ||
        blockId === REDSTONE_BLOCKS.UNPOWERED_COMPARATOR ||
        blockId === REDSTONE_BLOCKS.POWERED_COMPARATOR ||
        blockId === REDSTONE_BLOCKS.LEVER ||
        blockId === REDSTONE_BLOCKS.STONE_BUTTON ||
        blockId === REDSTONE_BLOCKS.WOODEN_BUTTON ||
        blockId === REDSTONE_BLOCKS.STONE_PRESSURE_PLATE ||
        blockId === REDSTONE_BLOCKS.WOODEN_PRESSURE_PLATE ||
        blockId === REDSTONE_BLOCKS.WEIGHTED_PRESSURE_PLATE_LIGHT ||
        blockId === REDSTONE_BLOCKS.WEIGHTED_PRESSURE_PLATE_HEAVY ||
        blockId === REDSTONE_BLOCKS.TRIPWIRE_HOOK ||
        blockId === REDSTONE_BLOCKS.TRIPWIRE ||
        blockId === REDSTONE_BLOCKS.PISTON_HEAD ||
        blockId === REDSTONE_BLOCKS.HOPPER ||
        blockId === REDSTONE_BLOCKS.CHEST ||
        blockId === REDSTONE_BLOCKS.TRAPPED_CHEST ||
        blockId === REDSTONE_BLOCKS.DAYLIGHT_DETECTOR ||
        blockId === 8 || // Water flowing
        blockId === 9 || // Water still
        blockId === 10 || // Lava flowing
        blockId === 11 || // Lava still
        blockId === 18 || // Leaves
        blockId === 44 || // Slabs
        blockId === 85    // Fence
    ) {
        return false;
    }
    return true;
}

export function isWire(blockId) {
    return blockId === REDSTONE_BLOCKS.REDSTONE_WIRE;
}

export function isTorch(blockId) {
    return blockId === REDSTONE_BLOCKS.REDSTONE_TORCH_ON || blockId === REDSTONE_BLOCKS.REDSTONE_TORCH_OFF;
}

export function isRepeater(blockId) {
    return blockId === REDSTONE_BLOCKS.UNPOWERED_REPEATER || blockId === REDSTONE_BLOCKS.POWERED_REPEATER;
}

export function isComparator(blockId) {
    return blockId === REDSTONE_BLOCKS.UNPOWERED_COMPARATOR || blockId === REDSTONE_BLOCKS.POWERED_COMPARATOR;
}

export function isLamp(blockId) {
    return blockId === REDSTONE_BLOCKS.REDSTONE_LAMP_OFF || blockId === REDSTONE_BLOCKS.REDSTONE_LAMP_ON;
}

export function isContainer(blockId) {
    return (
        blockId === REDSTONE_BLOCKS.CHEST ||
        blockId === REDSTONE_BLOCKS.TRAPPED_CHEST ||
        blockId === REDSTONE_BLOCKS.FURNACE ||
        blockId === REDSTONE_BLOCKS.DISPENSER ||
        blockId === REDSTONE_BLOCKS.DROPPER ||
        blockId === REDSTONE_BLOCKS.HOPPER
    );
}

export function isPiston(blockId) {
    return blockId === REDSTONE_BLOCKS.PISTON || blockId === REDSTONE_BLOCKS.PISTON_STICKY;
}

export function isHopper(blockId) {
    return blockId === REDSTONE_BLOCKS.HOPPER;
}

export function isDropper(blockId) {
    return blockId === REDSTONE_BLOCKS.DROPPER;
}

export function isTrappedChest(blockId) {
    return blockId === REDSTONE_BLOCKS.TRAPPED_CHEST;
}

export function isDaylightSensor(blockId) {
    return blockId === REDSTONE_BLOCKS.DAYLIGHT_DETECTOR || blockId === REDSTONE_BLOCKS.DAYLIGHT_SENSOR || blockId === 151;
}

// --- SCHEDULED TICK QUEUE ---
export class TickQueue {
    constructor() {
        /** @type {Map<number, Array<{x: number, y: number, z: number, blockId: number, priority: number, id: number}>>} */
        this.buckets = new Map();
        /** @type {Set<string>} Deduplication key: `${x},${y},${z},${blockId},${targetTick}` */
        this.scheduledKeys = new Set();
        this.nextEntryId = 1;
    }

    /**
     * Schedule a block update at `currentTick + delayTicks`.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} blockId
     * @param {number} delayTicks
     * @param {number} [priority=0] Higher executes first
     * @param {number} [currentTick=0]
     * @returns {boolean} True if successfully scheduled
     */
    schedule(x, y, z, blockId, delayTicks, priority = 0, currentTick = 0) {
        const targetTick = currentTick + Math.max(1, delayTicks);
        const key = `${x},${y},${z},${blockId},${targetTick}`;

        if (this.scheduledKeys.has(key)) {
            return false; // Prevent duplicate identical scheduled updates
        }

        this.scheduledKeys.add(key);
        if (!this.buckets.has(targetTick)) {
            this.buckets.set(targetTick, []);
        }

        this.buckets.get(targetTick).push({
            x,
            y,
            z,
            blockId,
            priority,
            id: this.nextEntryId++,
            targetTick,
            key
        });

        return true;
    }

    /**
     * Retrieve and remove all scheduled updates for target tick, sorted by priority.
     * @param {number} tickNumber 
     * @returns {Array<{x: number, y: number, z: number, blockId: number, priority: number}>}
     */
    pop(tickNumber) {
        const entries = this.buckets.get(tickNumber);
        if (!entries || entries.length === 0) {
            this.buckets.delete(tickNumber);
            return [];
        }

        this.buckets.delete(tickNumber);
        for (const entry of entries) {
            this.scheduledKeys.delete(entry.key);
        }

        // Sort higher priority first
        entries.sort((a, b) => b.priority - a.priority || a.id - b.id);
        return entries;
    }

    /**
     * Cancel pending scheduled ticks at specific coordinate.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    cancel(x, y, z) {
        for (const [tick, list] of this.buckets.entries()) {
            const filtered = [];
            for (const item of list) {
                if (item.x === x && item.y === y && item.z === z) {
                    this.scheduledKeys.delete(item.key);
                } else {
                    filtered.push(item);
                }
            }
            if (filtered.length === 0) {
                this.buckets.delete(tick);
            } else {
                this.buckets.set(tick, filtered);
            }
        }
    }

    /**
     * Check if a block has pending scheduled ticks.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {boolean}
     */
    hasPending(x, y, z) {
        for (const list of this.buckets.values()) {
            for (const item of list) {
                if (item.x === x && item.y === y && item.z === z) {
                    return true;
                }
            }
        }
        return false;
    }

    clear() {
        this.buckets.clear();
        this.scheduledKeys.clear();
    }
}

// --- CONTAINER SIGNAL CALCULATOR ---

/**
 * Calculates comparator signal strength (0-15) based on inventory contents.
 * Exact Minecraft 1.5 formula: signal = floor(1 + (sum(count/maxStack) / numSlots) * 14) when sum > 0
 * @param {Array<{count: number, maxStack?: number}>|Object} inventory
 * @param {number} [totalSlots=27]
 * @returns {number} Signal strength 0-15
 */
export function calculateContainerSignal(inventory, totalSlots = 27) {
    if (!inventory) return 0;

    let slots = Array.isArray(inventory) ? inventory : inventory.slots || [];
    const numSlots = inventory.numSlots || totalSlots || Math.max(1, slots.length);

    if (numSlots <= 0) return 0;

    let fullnessSum = 0;
    let itemCount = 0;

    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot && slot.count > 0) {
            const maxStack = slot.maxStack || 64;
            fullnessSum += Math.min(1.0, slot.count / maxStack);
            itemCount += slot.count;
        }
    }

    if (itemCount === 0 || fullnessSum <= 0) return 0;

    const fullnessFraction = fullnessSum / numSlots;
    return Math.min(15, Math.floor(1 + fullnessFraction * 14));
}

// --- REDSTONE SIMULATOR ---

export class RedstoneSimulator {
    /**
     * @param {Object} [world=null] Optional Chunk, World, or voxel accessor
     * @param {Object} [options={}]
     */
    constructor(world = null, options = {}) {
        this.world = world;
        this.options = Object.assign({
            redstoneTickRate: 10, // 10 redstone ticks per second (100ms interval)
            maxUpdateCascade: 1000,
            torchBurnoutThreshold: 8,
            torchBurnoutWindow: 60, // 60 redstone ticks (~6 seconds)
            torchBurnoutCooldown: 60
        }, options);

        this.currentTick = 0;
        this.tickAccumulator = 0;
        this.tickQueue = new TickQueue();

        /** @type {Map<string, Object>} Block metadata store keyed by `${x},${y},${z}` */
        this.metadataStore = new Map();

        /** @type {Map<string, Object>} Container inventories keyed by `${x},${y},${z}` */
        this.containerStore = new Map();

        /** @type {Map<string, number>} Fallback standalone block storage if world is null */
        this.fallbackBlocks = new Map();

        /** @type {Array<function(string, number, number, number, any): void>} Event listeners */
        this.listeners = [];

        this._isUpdating = false;
        this._pendingWireUpdates = new Set();
    }

    // --- COORDINATE KEY HELPER ---
    key(x, y, z) {
        return `${x},${y},${z}`;
    }

    // --- EVENT LISTENER REGISTRATION ---
    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        const idx = this.listeners.indexOf(callback);
        if (idx !== -1) this.listeners.splice(idx, 1);
    }

    emit(event, x, y, z, data) {
        for (let i = 0; i < this.listeners.length; i++) {
            this.listeners[i](event, x, y, z, data);
        }
    }

    // --- WORLD BLOCK & METADATA GETTERS / SETTERS ---

    /**
     * Get Block ID at (x, y, z).
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {number} Block ID
     */
    getBlock(x, y, z) {
        if (this.world) {
            if (typeof this.world.getBlock === 'function') {
                return this.world.getBlock(x, y, z);
            }
            if (typeof this.world.getBlockId === 'function') {
                return this.world.getBlockId(x, y, z);
            }
        }
        return this.fallbackBlocks.get(this.key(x, y, z)) || REDSTONE_BLOCKS.AIR;
    }

    /**
     * Set Block ID at (x, y, z).
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} blockId
     * @param {boolean} [triggerUpdate=true]
     */
    setBlock(x, y, z, blockId, triggerUpdate = true) {
        const oldBlock = this.getBlock(x, y, z);
        if (oldBlock === blockId && !triggerUpdate) return;

        if (this.world) {
            if (typeof this.world.setBlock === 'function') {
                this.world.setBlock(x, y, z, blockId);
            } else if (typeof this.world.setBlockId === 'function') {
                this.world.setBlockId(x, y, z, blockId);
            }
        } else {
            if (blockId === REDSTONE_BLOCKS.AIR) {
                this.fallbackBlocks.delete(this.key(x, y, z));
            } else {
                this.fallbackBlocks.set(this.key(x, y, z), blockId);
            }
        }

        this.emit('blockChange', x, y, z, { oldBlock, newBlock: blockId });

        if (triggerUpdate) {
            this.onBlockChanged(x, y, z, oldBlock, blockId);
        }
    }

    /**
     * Get metadata object for block at (x, y, z).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {Object}
     */
    getData(x, y, z) {
        const k = this.key(x, y, z);
        let data = this.metadataStore.get(k);
        if (!data) {
            data = {};
            this.metadataStore.set(k, data);
        }
        return data;
    }

    /**
     * Set/merge metadata for block at (x, y, z).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {Object} data 
     */
    setData(x, y, z, data) {
        const k = this.key(x, y, z);
        const current = this.getData(x, y, z);
        Object.assign(current, data);
        this.emit('dataChange', x, y, z, current);
    }

    /**
     * Remove metadata when block is broken/replaced.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    clearData(x, y, z) {
        this.metadataStore.delete(this.key(x, y, z));
        this.containerStore.delete(this.key(x, y, z));
        this.tickQueue.cancel(x, y, z);
    }

    /**
     * Register container inventory for comparators.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {Array|Object} inventory 
     */
    setContainer(x, y, z, inventory) {
        this.containerStore.set(this.key(x, y, z), inventory);
        this.notifyNeighbors(x, y, z);
    }

    getContainer(x, y, z) {
        let inv = this.containerStore.get(this.key(x, y, z));
        if (!inv) {
            const blockId = this.getBlock(x, y, z);
            if (blockId === REDSTONE_BLOCKS.HOPPER) {
                return this.getHopperInventory(x, y, z);
            }
            if (blockId === REDSTONE_BLOCKS.DROPPER) {
                return this.getDropperInventory(x, y, z);
            }
        }
        return inv || null;
    }

    // --- TIME & TICKING LOOP ---

    /**
     * Advance simulation by 1 Redstone Tick.
     */
    tick() {
        this.currentTick++;

        // 1. Process scheduled tick queue
        const scheduledUpdates = this.tickQueue.pop(this.currentTick);
        for (const item of scheduledUpdates) {
            const currentBlockId = this.getBlock(item.x, item.y, item.z);
            // Verify block has not been destroyed or replaced
            if (
                currentBlockId === item.blockId ||
                (isRepeater(currentBlockId) && isRepeater(item.blockId)) ||
                (isComparator(currentBlockId) && isComparator(item.blockId)) ||
                (isTorch(currentBlockId) && isTorch(item.blockId)) ||
                (isLamp(currentBlockId) && isLamp(item.blockId)) ||
                (isPiston(currentBlockId) && isPiston(item.blockId)) ||
                (isHopper(currentBlockId) && isHopper(item.blockId)) ||
                (isDropper(currentBlockId) && isDropper(item.blockId))
            ) {
                this.executeScheduledUpdate(item.x, item.y, item.z, currentBlockId);
            }
        }

        // 2. Process any pending wire propagation cascades
        this.flushPendingWireUpdates();

        this.emit('tick', 0, 0, 0, { tick: this.currentTick });
    }

    /**
     * Step simulation by delta time (in seconds), running ticks as needed.
     * @param {number} dt Delta time in seconds
     */
    step(dt) {
        const tickInterval = 1.0 / this.options.redstoneTickRate;
        this.tickAccumulator += dt;

        let maxTicksPerFrame = 10;
        while (this.tickAccumulator >= tickInterval && maxTicksPerFrame > 0) {
            this.tick();
            this.tickAccumulator -= tickInterval;
            maxTicksPerFrame--;
        }
    }

    /**
     * Execute a scheduled block update.
     */
    executeScheduledUpdate(x, y, z, blockId) {
        if (isTorch(blockId)) {
            this.processTorchTick(x, y, z);
        } else if (isRepeater(blockId)) {
            this.processRepeaterTick(x, y, z);
        } else if (isComparator(blockId)) {
            this.processComparatorTick(x, y, z);
        } else if (isLamp(blockId)) {
            this.processLampTick(x, y, z);
        } else if (blockId === REDSTONE_BLOCKS.STONE_BUTTON || blockId === REDSTONE_BLOCKS.WOODEN_BUTTON) {
            this.processButtonTick(x, y, z);
        } else if (isPiston(blockId)) {
            this.processPistonTick(x, y, z);
        } else if (isHopper(blockId)) {
            this.processHopperTick(x, y, z);
        } else if (isDropper(blockId)) {
            this.processDropperTick(x, y, z);
        }
    }

    // --- NEIGHBOR UPDATES & NOTIFICATION CASCADE ---

    /**
     * Notify all 6 direct neighbors of a block change.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    notifyNeighbors(x, y, z) {
        for (let i = 0; i < ALL_DIRECTIONS.length; i++) {
            const dir = ALL_DIRECTIONS[i];
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            const nz = z + dir.dz;
            this.updateBlock(nx, ny, nz);

            // If neighbor is a solid block, notify components attached to or resting on it
            const neighborId = this.getBlock(nx, ny, nz);
            if (isSolidOpaqueBlock(neighborId)) {
                for (let j = 0; j < ALL_DIRECTIONS.length; j++) {
                    const sDir = ALL_DIRECTIONS[j];
                    const sx = nx + sDir.dx;
                    const sy = ny + sDir.dy;
                    const sz = nz + sDir.dz;
                    if (sx === x && sy === y && sz === z) continue;
                    this.updateBlock(sx, sy, sz);
                }
            }
        }

        // Also check for wires that might connect up or down steps diagonally
        for (let i = 0; i < HORIZONTAL_DIRECTIONS.length; i++) {
            const dir = HORIZONTAL_DIRECTIONS[i];
            const nx = x + dir.dx;
            const nz = z + dir.dz;
            this.updateBlock(nx, y + 1, nz);
            this.updateBlock(nx, y - 1, nz);
        }
    }

    /**
     * Notify neighbors when a solid block's power state changes.
     */
    notifyBlockAndNeighbors(x, y, z) {
        this.updateBlock(x, y, z);
        this.notifyNeighbors(x, y, z);
    }

    /**
     * Dispatch block-specific redstone update handler.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    updateBlock(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (blockId === REDSTONE_BLOCKS.AIR) return;

        if (isWire(blockId)) {
            this.queueWireUpdate(x, y, z);
        } else if (isTorch(blockId)) {
            this.updateTorch(x, y, z);
        } else if (isRepeater(blockId)) {
            this.updateRepeater(x, y, z);
        } else if (isComparator(blockId)) {
            this.updateComparator(x, y, z);
        } else if (isLamp(blockId)) {
            this.updateLamp(x, y, z);
        } else if (isPiston(blockId)) {
            this.updatePiston(x, y, z);
        } else if (isHopper(blockId)) {
            this.updateHopper(x, y, z);
        } else if (isDropper(blockId)) {
            this.updateDropper(x, y, z);
        } else if (isDaylightSensor(blockId)) {
            if (this.timeOfDay !== undefined) {
                this.updateDaylightSensor(x, y, z, this.timeOfDay);
            }
        }
    }

    /**
     * Handler when a block is placed, removed, or changed.
     */
    onBlockChanged(x, y, z, oldBlock, newBlock) {
        if (oldBlock !== newBlock) {
            this.clearData(x, y, z);
        }

        if (isWire(newBlock)) {
            this.queueWireUpdate(x, y, z);
        } else if (isTorch(newBlock)) {
            this.updateTorch(x, y, z);
        } else if (isRepeater(newBlock)) {
            this.updateRepeater(x, y, z);
        } else if (isComparator(newBlock)) {
            this.updateComparator(x, y, z);
        } else if (isLamp(newBlock)) {
            this.updateLamp(x, y, z);
        } else if (isPiston(newBlock)) {
            this.updatePiston(x, y, z);
        } else if (isHopper(newBlock)) {
            this.updateHopper(x, y, z);
        } else if (isDropper(newBlock)) {
            this.updateDropper(x, y, z);
        } else if (isDaylightSensor(newBlock)) {
            this.updateDaylightSensor(x, y, z, this.timeOfDay !== undefined ? this.timeOfDay : 6000);
        } else if (isTrappedChest(newBlock)) {
            this.notifyBlockAndNeighbors(x, y - 1, z);
            this.notifyNeighbors(x, y, z);
        } else if (newBlock === REDSTONE_BLOCKS.REDSTONE_BLOCK) {
            this.notifyNeighbors(x, y, z);
        } else {
            // Non-redstone block or air
            this.notifyNeighbors(x, y, z);
        }

        // If old block was a power source or wire, notify neighbors to drop power
        if (
            oldBlock === REDSTONE_BLOCKS.REDSTONE_WIRE ||
            oldBlock === REDSTONE_BLOCKS.REDSTONE_BLOCK ||
            oldBlock === REDSTONE_BLOCKS.TRAPPED_CHEST ||
            oldBlock === REDSTONE_BLOCKS.DAYLIGHT_DETECTOR ||
            oldBlock === REDSTONE_BLOCKS.DAYLIGHT_SENSOR ||
            isTorch(oldBlock) ||
            isRepeater(oldBlock) ||
            isComparator(oldBlock) ||
            isPiston(oldBlock) ||
            isHopper(oldBlock) ||
            isDropper(oldBlock)
        ) {
            this.notifyNeighbors(x, y, z);
            if (oldBlock === REDSTONE_BLOCKS.TRAPPED_CHEST) {
                this.notifyBlockAndNeighbors(x, y - 1, z);
            }
        }
    }

    // --- SOLID BLOCK POWERING (STRONG VS WEAK) ---

    /**
     * Calculates strong redstone power emitted TO (x, y, z) FROM neighbor in direction `fromDir`.
     * Strong power is emitted by:
     * - Powered repeater or comparator facing into (x, y, z)
     * - Redstone torch directly beneath (x, y, z) (at y-1 pointing UP)
     * - Active lever / button attached to (x, y, z)
     * - Active pressure plate on top of (x, y, z) (at y+1)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {Object} fromDir Direction from (x, y, z) towards neighbor
     * @returns {number} Power 0-15
     */
    getStrongPowerFrom(x, y, z, fromDir) {
        const nx = x + fromDir.dx;
        const ny = y + fromDir.dy;
        const nz = z + fromDir.dz;
        const neighborId = this.getBlock(nx, ny, nz);

        if (neighborId === REDSTONE_BLOCKS.AIR) return 0;

        // 1. Redstone Torch directly underneath (fromDir === DOWN)
        if (fromDir === DIRECTIONS.DOWN && neighborId === REDSTONE_BLOCKS.REDSTONE_TORCH_ON) {
            return 15;
        }

        // 2. Powered Repeater facing into this block
        if (neighborId === REDSTONE_BLOCKS.POWERED_REPEATER) {
            const data = this.getData(nx, ny, nz);
            const facingDir = getDirectionFromFacing(data.facing !== undefined ? data.facing : 0);
            // Repeater is facing towards this block if its facing direction matches the vector from neighbor to this block (-fromDir)
            if (facingDir.dx === -fromDir.dx && facingDir.dz === -fromDir.dz) {
                return 15;
            }
        }

        // 3. Powered Comparator facing into this block
        if (neighborId === REDSTONE_BLOCKS.POWERED_COMPARATOR) {
            const data = this.getData(nx, ny, nz);
            const facingDir = getDirectionFromFacing(data.facing !== undefined ? data.facing : 0);
            if (facingDir.dx === -fromDir.dx && facingDir.dz === -fromDir.dz) {
                return data.outputSignal || 15;
            }
        }

        // 4. Active Lever attached to this block
        if (neighborId === REDSTONE_BLOCKS.LEVER) {
            const data = this.getData(nx, ny, nz);
            if (data.powered) {
                const attachDir = data.attachDir || DIRECTIONS.DOWN;
                if (attachDir === getOppositeDirection(fromDir)) {
                    return 15;
                }
            }
        }

        // 5. Active Button attached to this block
        if (neighborId === REDSTONE_BLOCKS.STONE_BUTTON || neighborId === REDSTONE_BLOCKS.WOODEN_BUTTON) {
            const data = this.getData(nx, ny, nz);
            if (data.powered) {
                const attachDir = data.attachDir || DIRECTIONS.DOWN;
                if (attachDir === getOppositeDirection(fromDir)) {
                    return 15;
                }
            }
        }

        // 6. Active Pressure Plate on top of this block (fromDir === UP)
        if (fromDir === DIRECTIONS.UP) {
            if (
                neighborId === REDSTONE_BLOCKS.STONE_PRESSURE_PLATE ||
                neighborId === REDSTONE_BLOCKS.WOODEN_PRESSURE_PLATE ||
                neighborId === REDSTONE_BLOCKS.WEIGHTED_PRESSURE_PLATE_LIGHT ||
                neighborId === REDSTONE_BLOCKS.WEIGHTED_PRESSURE_PLATE_HEAVY
            ) {
                const data = this.getData(nx, ny, nz);
                if (data.powered) {
                    return data.power || 15;
                }
            }
        }

        // 7. Active Trapped Chest directly above this block (strongly powers the block underneath)
        if (fromDir === DIRECTIONS.UP && neighborId === REDSTONE_BLOCKS.TRAPPED_CHEST) {
            const data = this.getData(nx, ny, nz);
            if (data.open || (data.playersLooking && data.playersLooking > 0)) {
                return Math.min(15, data.playersLooking !== undefined ? data.playersLooking : (data.open ? 1 : 0));
            }
        }

        // 8. Daylight Detector (emits strong power 0-15)
        if (neighborId === REDSTONE_BLOCKS.DAYLIGHT_DETECTOR || neighborId === REDSTONE_BLOCKS.DAYLIGHT_SENSOR) {
            const data = this.getData(nx, ny, nz);
            return data.power !== undefined ? data.power : 0;
        }

        return 0;
    }

    /**
     * Calculates weak (or strong) redstone power emitted TO (x, y, z) FROM neighbor in direction `fromDir`.
     * Includes all strong power sources PLUS:
     * - Redstone Block (power 15 in all 6 directions)
     * - Redstone Wire pointing into or on top of this block
     * - Redstone Torch ON (power 15 to adjacent blocks except attached base)
     * - Daylight Detector, Lever, etc.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {Object} fromDir
     * @returns {number} Power 0-15
     */
    getWeakPowerFrom(x, y, z, fromDir) {
        // Strong power is also weak power
        const strong = this.getStrongPowerFrom(x, y, z, fromDir);
        if (strong >= 15) return 15;

        const nx = x + fromDir.dx;
        const ny = y + fromDir.dy;
        const nz = z + fromDir.dz;
        const neighborId = this.getBlock(nx, ny, nz);

        if (neighborId === REDSTONE_BLOCKS.AIR) return strong;

        // 1. Redstone Block (emits 15 in all directions)
        if (neighborId === REDSTONE_BLOCKS.REDSTONE_BLOCK) {
            return 15;
        }

        // 2. Redstone Torch ON (emits weak power to 4 sides and bottom, unless it is the attached block)
        if (neighborId === REDSTONE_BLOCKS.REDSTONE_TORCH_ON) {
            const torchData = this.getData(nx, ny, nz);
            const attachedDir = torchData.attachedDir || DIRECTIONS.DOWN;
            // Torch does not power the block it is attached to
            if (getOppositeDirection(fromDir) !== attachedDir) {
                return 15;
            }
        }

        // 3. Redstone Wire
        if (neighborId === REDSTONE_BLOCKS.REDSTONE_WIRE) {
            const wirePower = this.getWirePower(nx, ny, nz);
            if (wirePower > 0) {
                // If wire is directly on top of this block (fromDir === UP)
                if (fromDir === DIRECTIONS.UP) {
                    return Math.max(strong, wirePower);
                }
                // If wire is horizontally adjacent and pointing into this block
                if (fromDir !== DIRECTIONS.DOWN && fromDir !== DIRECTIONS.UP) {
                    return Math.max(strong, wirePower);
                }
            }
        }

        // 4. Daylight Detector
        if (neighborId === REDSTONE_BLOCKS.DAYLIGHT_DETECTOR || neighborId === REDSTONE_BLOCKS.DAYLIGHT_SENSOR) {
            const data = this.getData(nx, ny, nz);
            const p = data.power !== undefined ? data.power : 0;
            return Math.max(strong, p);
        }

        // 5. Active Trapped Chest (weakly powers adjacent blocks in all directions)
        if (neighborId === REDSTONE_BLOCKS.TRAPPED_CHEST) {
            const data = this.getData(nx, ny, nz);
            if (data.open || (data.playersLooking && data.playersLooking > 0)) {
                const p = Math.min(15, data.playersLooking !== undefined ? data.playersLooking : (data.open ? 1 : 0));
                return Math.max(strong, p);
            }
        }

        // 6. Active Lever / Button / Pressure Plate adjacent (weakly powers adjacent blocks)
        if (neighborId === REDSTONE_BLOCKS.LEVER || neighborId === REDSTONE_BLOCKS.STONE_BUTTON || neighborId === REDSTONE_BLOCKS.WOODEN_BUTTON) {
            const data = this.getData(nx, ny, nz);
            if (data.powered) return 15;
        }

        // 7. Strongly powered solid block emits power to adjacent components
        if (isSolidOpaqueBlock(neighborId)) {
            const solidStrong = this.getMaxStrongPower(nx, ny, nz);
            if (solidStrong > strong) return solidStrong;
        }

        return strong;
    }

    /**
     * Get maximum strong power received by block at (x, y, z) from all 6 directions.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {number} Power 0-15
     */
    getMaxStrongPower(x, y, z) {
        let maxPower = 0;
        for (let i = 0; i < ALL_DIRECTIONS.length; i++) {
            const p = this.getStrongPowerFrom(x, y, z, ALL_DIRECTIONS[i]);
            if (p > maxPower) maxPower = p;
            if (maxPower >= 15) return 15;
        }
        return maxPower;
    }

    /**
     * Get maximum weak or strong power received by block at (x, y, z) from all 6 directions.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {number} Power 0-15
     */
    getMaxWeakPower(x, y, z) {
        let maxPower = 0;
        for (let i = 0; i < ALL_DIRECTIONS.length; i++) {
            const p = this.getWeakPowerFrom(x, y, z, ALL_DIRECTIONS[i]);
            if (p > maxPower) maxPower = p;
            if (maxPower >= 15) return 15;
        }
        return maxPower;
    }

    /**
     * Check if a block at (x, y, z) is powered (strongly or weakly).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {boolean}
     */
    isBlockPowered(x, y, z) {
        return this.getMaxWeakPower(x, y, z) > 0;
    }

    // --- REDSTONE WIRE PROPAGATION ENGINE ---

    /**
     * Get stored power level of redstone wire at (x, y, z).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {number} 0-15
     */
    getWirePower(x, y, z) {
        const data = this.metadataStore.get(this.key(x, y, z));
        return (data && data.power !== undefined) ? data.power : 0;
    }

    /**
     * Set wire power level.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} power 
     */
    setWirePower(x, y, z, power) {
        const clamped = Math.max(0, Math.min(15, power));
        const current = this.getWirePower(x, y, z);
        if (current !== clamped) {
            this.setData(x, y, z, { power: clamped });
            this.emit('powerChange', x, y, z, { oldPower: current, newPower: clamped });
            this.notifyNeighbors(x, y, z);
        }
    }

    /**
     * Queue a wire coordinate for network update.
     */
    queueWireUpdate(x, y, z) {
        this._pendingWireUpdates.add(this.key(x, y, z));
        if (!this._isUpdating) {
            this.flushPendingWireUpdates();
        }
    }

    /**
     * Flush and solve all queued wire networks.
     */
    flushPendingWireUpdates() {
        if (this._isUpdating) return;
        this._isUpdating = true;

        while (this._pendingWireUpdates.size > 0) {
            const key = this._pendingWireUpdates.values().next().value;
            this._pendingWireUpdates.delete(key);

            const [x, y, z] = key.split(',').map(Number);
            if (this.getBlock(x, y, z) === REDSTONE_BLOCKS.REDSTONE_WIRE) {
                this.updateWireNetwork(x, y, z);
            }
        }

        this._isUpdating = false;
    }

    /**
     * Calculate direct external power (from adjacent blocks, repeaters, redstone blocks, torches, etc.)
     * powering wire at (x, y, z).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {number} Direct power 0-15
     */
    getDirectWirePower(x, y, z) {
        let maxDirect = 0;

        for (let i = 0; i < ALL_DIRECTIONS.length; i++) {
            const dir = ALL_DIRECTIONS[i];
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            const nz = z + dir.dz;
            const neighborId = this.getBlock(nx, ny, nz);

            if (neighborId === REDSTONE_BLOCKS.AIR) continue;

            // 1. Redstone Block
            if (neighborId === REDSTONE_BLOCKS.REDSTONE_BLOCK) {
                return 15;
            }

            // 2. Redstone Torch ON (if adjacent, but not if torch is above wire pointing up)
            if (neighborId === REDSTONE_BLOCKS.REDSTONE_TORCH_ON) {
                return 15;
            }

            // 3. Powered Repeater pointing into this wire
            if (neighborId === REDSTONE_BLOCKS.POWERED_REPEATER) {
                const repData = this.getData(nx, ny, nz);
                const facingDir = getDirectionFromFacing(repData.facing !== undefined ? repData.facing : 0);
                if (facingDir.dx === -dir.dx && facingDir.dz === -dir.dz) {
                    return 15;
                }
            }

            // 4. Powered Comparator pointing into this wire
            if (neighborId === REDSTONE_BLOCKS.POWERED_COMPARATOR) {
                const compData = this.getData(nx, ny, nz);
                const facingDir = getDirectionFromFacing(compData.facing !== undefined ? compData.facing : 0);
                if (facingDir.dx === -dir.dx && facingDir.dz === -dir.dz) {
                    const out = compData.outputSignal || 15;
                    if (out > maxDirect) maxDirect = out;
                }
            }

            // 5. Strongly powered solid block adjacent to wire
            if (isSolidOpaqueBlock(neighborId)) {
                const strongPower = this.getMaxStrongPower(nx, ny, nz);
                if (strongPower > maxDirect) {
                    maxDirect = strongPower;
                }
            }

            // 6. Active Lever, Button, Pressure Plate, Daylight Detector, Trapped Chest
            if (neighborId === REDSTONE_BLOCKS.LEVER || neighborId === REDSTONE_BLOCKS.STONE_BUTTON || neighborId === REDSTONE_BLOCKS.WOODEN_BUTTON) {
                const data = this.getData(nx, ny, nz);
                if (data.powered && 15 > maxDirect) maxDirect = 15;
            } else if (neighborId === REDSTONE_BLOCKS.DAYLIGHT_DETECTOR || neighborId === REDSTONE_BLOCKS.DAYLIGHT_SENSOR) {
                const data = this.getData(nx, ny, nz);
                const p = data.power !== undefined ? data.power : 0;
                if (p > maxDirect) maxDirect = p;
            } else if (neighborId === REDSTONE_BLOCKS.TRAPPED_CHEST) {
                const data = this.getData(nx, ny, nz);
                if (data.open || (data.playersLooking && data.playersLooking > 0)) {
                    const p = Math.min(15, data.playersLooking !== undefined ? data.playersLooking : (data.open ? 1 : 0));
                    if (p > maxDirect) maxDirect = p;
                }
            }
        }

        return maxDirect;
    }

    /**
     * Get all connected wire neighbors in 3D (horizontal, step up, step down).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {Array<{x: number, y: number, z: number}>}
     */
    getConnectedWireNeighbors(x, y, z) {
        const neighbors = [];
        const isBlockAboveSolid = isSolidOpaqueBlock(this.getBlock(x, y + 1, z));

        for (let i = 0; i < HORIZONTAL_DIRECTIONS.length; i++) {
            const dir = HORIZONTAL_DIRECTIONS[i];
            const nx = x + dir.dx;
            const nz = z + dir.dz;

            // 1. Same Y level
            if (this.getBlock(nx, y, nz) === REDSTONE_BLOCKS.REDSTONE_WIRE) {
                neighbors.push({ x: nx, y: y, z: nz });
                continue;
            }

            // 2. Step UP: (nx, y + 1, nz)
            // Allowed ONLY IF the block directly above current wire is NOT solid opaque
            if (!isBlockAboveSolid) {
                if (this.getBlock(nx, y + 1, nz) === REDSTONE_BLOCKS.REDSTONE_WIRE) {
                    // Must be placed on a solid block beneath it (which is (nx, y, nz))
                    neighbors.push({ x: nx, y: y + 1, z: nz });
                    continue;
                }
            }

            // 3. Step DOWN: (nx, y - 1, nz)
            // Allowed ONLY IF the block above destination wire (nx, y, nz) is NOT solid opaque
            const isStepDownObstructed = isSolidOpaqueBlock(this.getBlock(nx, y, nz));
            if (!isStepDownObstructed) {
                if (this.getBlock(nx, y - 1, nz) === REDSTONE_BLOCKS.REDSTONE_WIRE) {
                    neighbors.push({ x: nx, y: y - 1, z: nz });
                }
            }
        }

        return neighbors;
    }

    /**
     * Full Redstone Wire Network Solver:
     * Discovers the contiguous wire component, gathers all direct power inputs,
     * and calculates exact equilibrium signal strengths using multi-source BFS propagation.
     * @param {number} startX 
     * @param {number} startY 
     * @param {number} startZ 
     */
    updateWireNetwork(startX, startY, startZ) {
        // Step 1: Discover all interconnected wires in this network component
        const network = new Map(); // key -> {x, y, z, directPower, calculatedPower}
        const openList = [{ x: startX, y: startY, z: startZ }];
        const startKey = this.key(startX, startY, startZ);
        network.set(startKey, { x: startX, y: startY, z: startZ, directPower: 0, calculatedPower: 0 });

        let head = 0;
        while (head < openList.length) {
            const curr = openList[head++];
            const neighbors = this.getConnectedWireNeighbors(curr.x, curr.y, curr.z);

            for (let i = 0; i < neighbors.length; i++) {
                const n = neighbors[i];
                const nk = this.key(n.x, n.y, n.z);
                if (!network.has(nk)) {
                    network.set(nk, { x: n.x, y: n.y, z: n.z, directPower: 0, calculatedPower: 0 });
                    openList.push(n);
                }
            }
        }

        // Step 2: Calculate direct external power for each wire node in the network
        /** @type {Array<{node: Object, power: number}>} BFS propagation queue */
        const propagationQueue = [];

        for (const node of network.values()) {
            node.directPower = this.getDirectWirePower(node.x, node.y, node.z);
            node.calculatedPower = node.directPower;

            if (node.directPower > 0) {
                propagationQueue.push({ node, power: node.directPower });
            }
        }

        // Sort queue so highest initial power propagates first
        propagationQueue.sort((a, b) => b.power - a.power);

        // Step 3: Multi-source BFS propagation across wire steps
        let qHead = 0;
        while (qHead < propagationQueue.length) {
            const { node, power } = propagationQueue[qHead++];

            if (power <= 1) continue; // Power of 1 decays to 0 on adjacent wires

            const nextPower = power - 1;
            const neighbors = this.getConnectedWireNeighbors(node.x, node.y, node.z);

            for (let i = 0; i < neighbors.length; i++) {
                const n = neighbors[i];
                const neighborNode = network.get(this.key(n.x, n.y, n.z));
                if (neighborNode && nextPower > neighborNode.calculatedPower) {
                    neighborNode.calculatedPower = nextPower;
                    propagationQueue.push({ node: neighborNode, power: nextPower });
                }
            }
        }

        // Step 4: Apply calculated power levels and notify changed blocks
        for (const node of network.values()) {
            const oldPower = this.getWirePower(node.x, node.y, node.z);
            if (oldPower !== node.calculatedPower) {
                this.setData(node.x, node.y, node.z, { power: node.calculatedPower });
                this.emit('powerChange', node.x, node.y, node.z, { oldPower, newPower: node.calculatedPower });
                this.notifyNeighbors(node.x, node.y, node.z);
            }
        }
    }

    // --- REDSTONE TORCH (INVERSION & BURNOUT) ---

    /**
     * Get the coordinates of the solid block a redstone torch is attached to.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {{x: number, y: number, z: number}}
     */
    getTorchAttachedBlockPos(x, y, z) {
        const data = this.getData(x, y, z);
        // Facing / attachment: 0 or DOWN = attached to floor (y-1)
        // 2: North = attached to South wall (z+1)
        // 3: South = attached to North wall (z-1)
        // 4: West = attached to East wall (x+1)
        // 5: East = attached to West wall (x-1)
        const attachDir = data.attachedDir || DIRECTIONS.DOWN;
        return {
            x: x + attachDir.dx,
            y: y + attachDir.dy,
            z: z + attachDir.dz
        };
    }

    /**
     * Evaluate torch state condition and schedule 1-tick delay update.
     */
    updateTorch(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (!isTorch(blockId)) return;

        const basePos = this.getTorchAttachedBlockPos(x, y, z);
        const isBasePowered = this.isBlockPowered(basePos.x, basePos.y, basePos.z);
        const data = this.getData(x, y, z);

        if (blockId === REDSTONE_BLOCKS.REDSTONE_TORCH_ON) {
            if (isBasePowered) {
                // Base is powered -> schedule turn OFF in 1 redstone tick
                this.tickQueue.schedule(x, y, z, blockId, 1, 0, this.currentTick);
            }
        } else if (blockId === REDSTONE_BLOCKS.REDSTONE_TORCH_OFF) {
            if (!isBasePowered && !data.isBurnedOut) {
                // Base is unpowered -> schedule turn ON in 1 redstone tick
                this.tickQueue.schedule(x, y, z, blockId, 1, 0, this.currentTick);
            }
        }
    }

    /**
     * Execute scheduled torch update.
     */
    processTorchTick(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (!isTorch(blockId)) return;

        const basePos = this.getTorchAttachedBlockPos(x, y, z);
        const isBasePowered = this.isBlockPowered(basePos.x, basePos.y, basePos.z);
        const data = this.getData(x, y, z);

        // Check burnout cooldown expiration
        if (data.isBurnedOut) {
            if (this.currentTick >= (data.burnoutEndTick || 0)) {
                data.isBurnedOut = false;
                data.burnoutToggles = [];
                this.emit('torchBurnoutRecover', x, y, z, {});
            } else {
                return; // Remains burned out
            }
        }

        if (blockId === REDSTONE_BLOCKS.REDSTONE_TORCH_ON && isBasePowered) {
            // Turn OFF
            this.setBlock(x, y, z, REDSTONE_BLOCKS.REDSTONE_TORCH_OFF, false);
            this.recordTorchToggle(x, y, z, data);
            this.notifyNeighbors(x, y, z);
            this.notifyBlockAndNeighbors(x, y + 1, z); // Block above loses strong power
        } else if (blockId === REDSTONE_BLOCKS.REDSTONE_TORCH_OFF && !isBasePowered && !data.isBurnedOut) {
            // Turn ON
            this.setBlock(x, y, z, REDSTONE_BLOCKS.REDSTONE_TORCH_ON, false);
            this.recordTorchToggle(x, y, z, data);
            this.notifyNeighbors(x, y, z);
            this.notifyBlockAndNeighbors(x, y + 1, z); // Block above gains strong power
        }
    }

    /**
     * Record torch toggle timestamp and check burnout threshold.
     */
    recordTorchToggle(x, y, z, data) {
        if (!data.burnoutToggles) data.burnoutToggles = [];
        const windowStart = this.currentTick - this.options.torchBurnoutWindow;

        // Keep toggles within burnout window
        data.burnoutToggles = data.burnoutToggles.filter(t => t >= windowStart);
        data.burnoutToggles.push(this.currentTick);

        if (data.burnoutToggles.length >= this.options.torchBurnoutThreshold) {
            // Torch Burnout triggered!
            data.isBurnedOut = true;
            data.burnoutEndTick = this.currentTick + this.options.torchBurnoutCooldown;
            this.setBlock(x, y, z, REDSTONE_BLOCKS.REDSTONE_TORCH_OFF, false);
            this.tickQueue.cancel(x, y, z);
            this.emit('torchBurnout', x, y, z, { endTick: data.burnoutEndTick });
            this.notifyNeighbors(x, y, z);
        }
    }

    // --- REDSTONE REPEATER (DELAY & LOCKING) ---

    /**
     * Get back (input), front (output), left, and right relative positions for a repeater.
     */
    getRepeaterPositions(x, y, z) {
        const data = this.getData(x, y, z);
        const facing = data.facing !== undefined ? data.facing : 0;
        const forward = getDirectionFromFacing(facing);
        const back = getOppositeDirection(forward);
        const left = getLeftDirection(forward);
        const right = getRightDirection(forward);

        return {
            forward,
            back,
            left,
            right,
            frontPos: { x: x + forward.dx, y: y + forward.dy, z: z + forward.dz },
            backPos: { x: x + back.dx, y: y + back.dy, z: z + back.dz },
            leftPos: { x: x + left.dx, y: y + left.dy, z: z + left.dz },
            rightPos: { x: x + right.dx, y: y + right.dy, z: z + right.dz }
        };
    }

    /**
     * Check if a repeater is locked by a powered repeater or comparator pointing into its side.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {boolean}
     */
    isRepeaterLocked(x, y, z) {
        const { leftPos, rightPos, left, right } = this.getRepeaterPositions(x, y, z);

        // Check left side
        const leftId = this.getBlock(leftPos.x, leftPos.y, leftPos.z);
        if (leftId === REDSTONE_BLOCKS.POWERED_REPEATER || leftId === REDSTONE_BLOCKS.POWERED_COMPARATOR) {
            const leftData = this.getData(leftPos.x, leftPos.y, leftPos.z);
            const leftFacing = getDirectionFromFacing(leftData.facing !== undefined ? leftData.facing : 0);
            // Points into this repeater if facing matches vector from left to here (-left)
            if (leftFacing.dx === -left.dx && leftFacing.dz === -left.dz) {
                return true;
            }
        }

        // Check right side
        const rightId = this.getBlock(rightPos.x, rightPos.y, rightPos.z);
        if (rightId === REDSTONE_BLOCKS.POWERED_REPEATER || rightId === REDSTONE_BLOCKS.POWERED_COMPARATOR) {
            const rightData = this.getData(rightPos.x, rightPos.y, rightPos.z);
            const rightFacing = getDirectionFromFacing(rightData.facing !== undefined ? rightData.facing : 0);
            if (rightFacing.dx === -right.dx && rightFacing.dz === -right.dz) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if input behind repeater is receiving power.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {boolean}
     */
    isRepeaterInputPowered(x, y, z) {
        const { backPos, back } = this.getRepeaterPositions(x, y, z);
        const backId = this.getBlock(backPos.x, backPos.y, backPos.z);

        if (backId === REDSTONE_BLOCKS.AIR) return false;
        if (backId === REDSTONE_BLOCKS.REDSTONE_BLOCK) return true;

        if (backId === REDSTONE_BLOCKS.REDSTONE_WIRE) {
            return this.getWirePower(backPos.x, backPos.y, backPos.z) > 0;
        }

        if (backId === REDSTONE_BLOCKS.POWERED_REPEATER) {
            const bData = this.getData(backPos.x, backPos.y, backPos.z);
            const bFacing = getDirectionFromFacing(bData.facing !== undefined ? bData.facing : 0);
            return bFacing.dx === -back.dx && bFacing.dz === -back.dz;
        }

        if (backId === REDSTONE_BLOCKS.POWERED_COMPARATOR) {
            const bData = this.getData(backPos.x, backPos.y, backPos.z);
            const bFacing = getDirectionFromFacing(bData.facing !== undefined ? bData.facing : 0);
            return bFacing.dx === -back.dx && bFacing.dz === -back.dz && (bData.outputSignal || 0) > 0;
        }

        // Solid block powered from behind
        if (isSolidOpaqueBlock(backId)) {
            return this.getMaxWeakPower(backPos.x, backPos.y, backPos.z) > 0;
        }

        return false;
    }

    /**
     * Update repeater state & schedule tick.
     */
    updateRepeater(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (!isRepeater(blockId)) return;

        const data = this.getData(x, y, z);
        const isLocked = this.isRepeaterLocked(x, y, z);
        const wasLocked = !!data.locked;
        data.locked = isLocked;

        if (isLocked !== wasLocked) {
            this.emit('repeaterLockChange', x, y, z, { locked: isLocked });
        }

        if (isLocked) {
            // State is frozen while locked - cancel pending toggles
            this.tickQueue.cancel(x, y, z);
            return;
        }

        const inputPowered = this.isRepeaterInputPowered(x, y, z);
        const delay = Math.max(1, Math.min(4, data.delay || 1)); // 1-4 redstone ticks

        if (inputPowered && blockId === REDSTONE_BLOCKS.UNPOWERED_REPEATER) {
            this.tickQueue.schedule(x, y, z, blockId, delay, 0, this.currentTick);
        } else if (!inputPowered && blockId === REDSTONE_BLOCKS.POWERED_REPEATER) {
            this.tickQueue.schedule(x, y, z, blockId, delay, 0, this.currentTick);
        }
    }

    /**
     * Execute scheduled repeater update.
     */
    processRepeaterTick(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (!isRepeater(blockId)) return;

        const data = this.getData(x, y, z);
        if (data.locked) return; // Do not toggle if locked

        const inputPowered = this.isRepeaterInputPowered(x, y, z);
        const { frontPos } = this.getRepeaterPositions(x, y, z);

        if (inputPowered && blockId === REDSTONE_BLOCKS.UNPOWERED_REPEATER) {
            // Turn ON
            this.setBlock(x, y, z, REDSTONE_BLOCKS.POWERED_REPEATER, false);
            this.notifyBlockAndNeighbors(frontPos.x, frontPos.y, frontPos.z);
            this.notifyNeighbors(x, y, z);
        } else if (!inputPowered && blockId === REDSTONE_BLOCKS.POWERED_REPEATER) {
            // Turn OFF
            this.setBlock(x, y, z, REDSTONE_BLOCKS.UNPOWERED_REPEATER, false);
            this.notifyBlockAndNeighbors(frontPos.x, frontPos.y, frontPos.z);
            this.notifyNeighbors(x, y, z);
        }
    }

    // --- REDSTONE COMPARATOR (COMPARE / SUBTRACTION MODE) ---

    /**
     * Get comparator positions (front, back, left, right).
     */
    getComparatorPositions(x, y, z) {
        const data = this.getData(x, y, z);
        const facing = data.facing !== undefined ? data.facing : 0;
        const forward = getDirectionFromFacing(facing);
        const back = getOppositeDirection(forward);
        const left = getLeftDirection(forward);
        const right = getRightDirection(forward);

        return {
            forward,
            back,
            left,
            right,
            frontPos: { x: x + forward.dx, y: y + forward.dy, z: z + forward.dz },
            backPos: { x: x + back.dx, y: y + back.dy, z: z + back.dz },
            leftPos: { x: x + left.dx, y: y + left.dy, z: z + left.dz },
            rightPos: { x: x + right.dx, y: y + right.dy, z: z + right.dz }
        };
    }

    /**
     * Calculate rear input signal strength (0-15) for comparator at (x, y, z).
     * Supports direct wire strength, repeaters, comparators, solid blocks, containers,
     * and reading container inventory through 1 solid block!
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {number} Signal strength 0-15
     */
    getComparatorInputSignal(x, y, z) {
        const { backPos, back } = this.getComparatorPositions(x, y, z);
        const backId = this.getBlock(backPos.x, backPos.y, backPos.z);

        if (backId === REDSTONE_BLOCKS.AIR) return 0;
        if (backId === REDSTONE_BLOCKS.REDSTONE_BLOCK) return 15;

        // 1. Direct Redstone Wire
        if (backId === REDSTONE_BLOCKS.REDSTONE_WIRE) {
            return this.getWirePower(backPos.x, backPos.y, backPos.z);
        }

        // 2. Direct Repeater facing comparator
        if (backId === REDSTONE_BLOCKS.POWERED_REPEATER) {
            const bData = this.getData(backPos.x, backPos.y, backPos.z);
            const bFacing = getDirectionFromFacing(bData.facing !== undefined ? bData.facing : 0);
            if (bFacing.dx === -back.dx && bFacing.dz === -back.dz) {
                return 15;
            }
        }

        // 3. Direct Comparator facing comparator
        if (backId === REDSTONE_BLOCKS.POWERED_COMPARATOR) {
            const bData = this.getData(backPos.x, backPos.y, backPos.z);
            const bFacing = getDirectionFromFacing(bData.facing !== undefined ? bData.facing : 0);
            if (bFacing.dx === -back.dx && bFacing.dz === -back.dz) {
                return bData.outputSignal || 15;
            }
        }

        // 4. Direct Container inventory
        const directContainer = this.getContainer(backPos.x, backPos.y, backPos.z);
        if (directContainer) {
            return calculateContainerSignal(directContainer);
        }

        // 5. Solid block
        if (isSolidOpaqueBlock(backId)) {
            // Check for container behind solid block (Minecraft 1.5 feature)
            const behindBlockPos = { x: backPos.x + back.dx, y: backPos.y + back.dy, z: backPos.z + back.dz };
            const containerBehind = this.getContainer(behindBlockPos.x, behindBlockPos.y, behindBlockPos.z);
            if (containerBehind) {
                return calculateContainerSignal(containerBehind);
            }

            // Otherwise, get power conducted through solid block
            return this.getMaxWeakPower(backPos.x, backPos.y, backPos.z);
        }

        return 0;
    }

    /**
     * Calculate maximum side signal strength (from left or right side) for comparator.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {number} Signal strength 0-15
     */
    getComparatorSideSignal(x, y, z) {
        const { leftPos, rightPos, left, right } = this.getComparatorPositions(x, y, z);
        let maxSide = 0;

        const checkSide = (pos, sideDir) => {
            const sideId = this.getBlock(pos.x, pos.y, pos.z);
            if (sideId === REDSTONE_BLOCKS.AIR) return 0;
            if (sideId === REDSTONE_BLOCKS.REDSTONE_BLOCK) return 15;

            if (sideId === REDSTONE_BLOCKS.REDSTONE_WIRE) {
                return this.getWirePower(pos.x, pos.y, pos.z);
            }

            if (sideId === REDSTONE_BLOCKS.POWERED_REPEATER) {
                const sData = this.getData(pos.x, pos.y, pos.z);
                const sFacing = getDirectionFromFacing(sData.facing !== undefined ? sData.facing : 0);
                if (sFacing.dx === -sideDir.dx && sFacing.dz === -sideDir.dz) {
                    return 15;
                }
            }

            if (sideId === REDSTONE_BLOCKS.POWERED_COMPARATOR) {
                const sData = this.getData(pos.x, pos.y, pos.z);
                const sFacing = getDirectionFromFacing(sData.facing !== undefined ? sData.facing : 0);
                if (sFacing.dx === -sideDir.dx && sFacing.dz === -sideDir.dz) {
                    return sData.outputSignal || 15;
                }
            }

            if (isSolidOpaqueBlock(sideId)) {
                return this.getMaxStrongPower(pos.x, pos.y, pos.z);
            }

            return 0;
        };

        const leftSig = checkSide(leftPos, left);
        const rightSig = checkSide(rightPos, right);
        return Math.max(leftSig, rightSig);
    }

    /**
     * Calculate target output signal for comparator given its mode and inputs.
     * Mode 0: Comparison Mode (Output = I if I >= S, else 0)
     * Mode 1: Subtraction Mode (Output = max(0, I - S))
     * @param {number} inputSignal 
     * @param {number} sideSignal 
     * @param {number} mode 
     * @returns {number} Target output signal 0-15
     */
    calculateComparatorOutput(inputSignal, sideSignal, mode = 0) {
        if (mode === 1) {
            // Subtraction Mode
            return Math.max(0, inputSignal - sideSignal);
        } else {
            // Comparison Mode (default)
            return (inputSignal >= sideSignal && inputSignal > 0) ? inputSignal : 0;
        }
    }

    /**
     * Update comparator state & schedule 1-tick delay update.
     */
    updateComparator(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (!isComparator(blockId)) return;

        const data = this.getData(x, y, z);
        const mode = data.mode || 0;
        const inputSignal = this.getComparatorInputSignal(x, y, z);
        const sideSignal = this.getComparatorSideSignal(x, y, z);
        const targetOutput = this.calculateComparatorOutput(inputSignal, sideSignal, mode);

        const currentOutput = data.outputSignal || 0;

        if (targetOutput !== currentOutput) {
            this.tickQueue.schedule(x, y, z, blockId, 1, 0, this.currentTick);
        }
    }

    /**
     * Execute scheduled comparator update.
     */
    processComparatorTick(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (!isComparator(blockId)) return;

        const data = this.getData(x, y, z);
        const mode = data.mode || 0;
        const inputSignal = this.getComparatorInputSignal(x, y, z);
        const sideSignal = this.getComparatorSideSignal(x, y, z);
        const targetOutput = this.calculateComparatorOutput(inputSignal, sideSignal, mode);

        const oldOutput = data.outputSignal || 0;
        data.outputSignal = targetOutput;

        const targetBlockId = targetOutput > 0 ? REDSTONE_BLOCKS.POWERED_COMPARATOR : REDSTONE_BLOCKS.UNPOWERED_COMPARATOR;

        if (targetBlockId !== blockId || targetOutput !== oldOutput) {
            this.setBlock(x, y, z, targetBlockId, false);
            this.emit('comparatorOutputChange', x, y, z, { oldOutput, newOutput: targetOutput, mode });

            const { frontPos } = this.getComparatorPositions(x, y, z);
            this.notifyBlockAndNeighbors(frontPos.x, frontPos.y, frontPos.z);
            this.notifyNeighbors(x, y, z);
        }
    }

    /**
     * Toggle comparator mode (0: Comparison <-> 1: Subtraction).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {number} New mode (0 or 1)
     */
    toggleComparatorMode(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (!isComparator(blockId)) return 0;

        const data = this.getData(x, y, z);
        data.mode = data.mode === 1 ? 0 : 1;
        this.emit('comparatorModeToggle', x, y, z, { mode: data.mode });
        this.updateComparator(x, y, z);
        return data.mode;
    }

    // --- REDSTONE LAMP ---

    updateLamp(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (!isLamp(blockId)) return;

        const isPowered = this.isBlockPowered(x, y, z);

        if (isPowered && blockId === REDSTONE_BLOCKS.REDSTONE_LAMP_OFF) {
            // Turn ON immediately
            this.setBlock(x, y, z, REDSTONE_BLOCKS.REDSTONE_LAMP_ON, false);
            this.emit('lampStateChange', x, y, z, { powered: true });
        } else if (!isPowered && blockId === REDSTONE_BLOCKS.REDSTONE_LAMP_ON) {
            // Turn OFF with 2 redstone tick delay (Minecraft standard)
            this.tickQueue.schedule(x, y, z, blockId, 2, 0, this.currentTick);
        }
    }

    processLampTick(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (blockId !== REDSTONE_BLOCKS.REDSTONE_LAMP_ON) return;

        const isPowered = this.isBlockPowered(x, y, z);
        if (!isPowered) {
            this.setBlock(x, y, z, REDSTONE_BLOCKS.REDSTONE_LAMP_OFF, false);
            this.emit('lampStateChange', x, y, z, { powered: false });
        }
    }

    // --- LEVER, BUTTON & PRESSURE PLATE INTERACTIONS ---

    /**
     * Toggle a lever state (ON <-> OFF).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {boolean} New powered state
     */
    toggleLever(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (blockId !== REDSTONE_BLOCKS.LEVER) return false;

        const data = this.getData(x, y, z);
        data.powered = !data.powered;
        this.emit('leverToggle', x, y, z, { powered: data.powered });

        const attachDir = data.attachDir || DIRECTIONS.DOWN;
        const attachedPos = { x: x + attachDir.dx, y: y + attachDir.dy, z: z + attachDir.dz };
        this.notifyBlockAndNeighbors(attachedPos.x, attachedPos.y, attachedPos.z);
        this.notifyNeighbors(x, y, z);
        return data.powered;
    }

    /**
     * Press a button (Stone or Wood), activating power and scheduling automatic release.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    pressButton(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (blockId !== REDSTONE_BLOCKS.STONE_BUTTON && blockId !== REDSTONE_BLOCKS.WOODEN_BUTTON) return;

        const data = this.getData(x, y, z);
        data.powered = true;
        this.emit('buttonPress', x, y, z, { powered: true });

        const attachDir = data.attachDir || DIRECTIONS.DOWN;
        const attachedPos = { x: x + attachDir.dx, y: y + attachDir.dy, z: z + attachDir.dz };
        this.notifyBlockAndNeighbors(attachedPos.x, attachedPos.y, attachedPos.z);
        this.notifyNeighbors(x, y, z);

        // Stone button: 10 redstone ticks (1 sec), Wood button: 15 redstone ticks (1.5 sec)
        const pressDuration = blockId === REDSTONE_BLOCKS.STONE_BUTTON ? 10 : 15;
        this.tickQueue.schedule(x, y, z, blockId, pressDuration, 0, this.currentTick);
    }

    processButtonTick(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (blockId !== REDSTONE_BLOCKS.STONE_BUTTON && blockId !== REDSTONE_BLOCKS.WOODEN_BUTTON) return;

        const data = this.getData(x, y, z);
        data.powered = false;
        this.emit('buttonRelease', x, y, z, { powered: false });

        const attachDir = data.attachDir || DIRECTIONS.DOWN;
        const attachedPos = { x: x + attachDir.dx, y: y + attachDir.dy, z: z + attachDir.dz };
        this.notifyBlockAndNeighbors(attachedPos.x, attachedPos.y, attachedPos.z);
        this.notifyNeighbors(x, y, z);
    }

    /**
     * Set pressure plate active state.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {boolean} pressed 
     * @param {number} [entityCount=1] Used for weighted pressure plates
     */
    setPressurePlate(x, y, z, pressed, entityCount = 1) {
        const blockId = this.getBlock(x, y, z);
        const data = this.getData(x, y, z);

        let power = 0;
        if (pressed) {
            if (blockId === REDSTONE_BLOCKS.WEIGHTED_PRESSURE_PLATE_LIGHT) {
                // Gold weighted: 1 signal per entity up to 15
                power = Math.min(15, Math.max(1, entityCount));
            } else if (blockId === REDSTONE_BLOCKS.WEIGHTED_PRESSURE_PLATE_HEAVY) {
                // Iron weighted: 1 signal per 10 entities
                power = Math.min(15, Math.ceil(entityCount / 10));
            } else {
                power = 15;
            }
        }

        data.powered = pressed && power > 0;
        data.power = power;

        this.notifyBlockAndNeighbors(x, y - 1, z); // Block beneath plate
        this.notifyNeighbors(x, y, z);
    }

    // --- PISTONS (NORMAL & STICKY) ---

    /**
     * Get piston facing direction.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {Object} Direction object
     */
    getPistonFacing(x, y, z) {
        const data = this.getData(x, y, z);
        return parseDirection(data.facing, DIRECTIONS.NORTH);
    }

    /**
     * Check if piston at (x, y, z) is extended.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {boolean}
     */
    isPistonExtended(x, y, z) {
        const data = this.getData(x, y, z);
        return Boolean(data.extended);
    }

    /**
     * Update piston state and schedule tick update if powered state changed.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    updatePiston(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (!isPiston(blockId)) return;

        const isPowered = this.isBlockPowered(x, y, z);
        const data = this.getData(x, y, z);

        if (isPowered && !data.extended) {
            this.tickQueue.schedule(x, y, z, blockId, 1, 0, this.currentTick);
        } else if (!isPowered && data.extended) {
            this.tickQueue.schedule(x, y, z, blockId, 1, 0, this.currentTick);
        }
    }

    /**
     * Process piston tick:
     * 1. Calculate up to 12 blocks to push in the facing direction.
     * 2. If blocked by bedrock, obsidian, or limit exceeded, fail.
     * 3. Otherwise, shift block IDs, metadata, and container inventories.
     * 4. If sticky piston retracting, pull 1 adjacent block back.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {'extend'|'retract'|null} [forceAction=null] Optional forced action
     * @returns {boolean} True if state changed / action succeeded
     */
    processPistonTick(x, y, z, forceAction = null) {
        const blockId = this.getBlock(x, y, z);
        if (!isPiston(blockId)) return false;

        const isSticky = (blockId === REDSTONE_BLOCKS.PISTON_STICKY);
        const data = this.getData(x, y, z);
        const dir = this.getPistonFacing(x, y, z);

        const isPowered = (forceAction === 'extend') ? true : ((forceAction === 'retract') ? false : this.isBlockPowered(x, y, z));

        if (isPowered && !data.extended) {
            // Extension: Calculate up to 12 blocks to push
            const blocksToPush = [];
            let step = 1;
            let canPush = false;

            while (step <= 13) {
                const currX = x + dir.dx * step;
                const currY = y + dir.dy * step;
                const currZ = z + dir.dz * step;
                const currBlockId = this.getBlock(currX, currY, currZ);

                if (currBlockId === REDSTONE_BLOCKS.AIR) {
                    canPush = true;
                    break;
                }

                // Immovable blocks: Bedrock, Obsidian, Extended Piston Head
                if (
                    currBlockId === REDSTONE_BLOCKS.BEDROCK ||
                    currBlockId === REDSTONE_BLOCKS.OBSIDIAN ||
                    currBlockId === REDSTONE_BLOCKS.PISTON_HEAD
                ) {
                    return false;
                }

                // Push limit of 12 blocks: cannot push 13th block if not air
                if (blocksToPush.length >= 12) {
                    return false;
                }

                blocksToPush.push({
                    x: currX,
                    y: currY,
                    z: currZ,
                    blockId: currBlockId,
                    data: this.metadataStore.get(this.key(currX, currY, currZ)),
                    container: this.containerStore.get(this.key(currX, currY, currZ))
                });

                step++;
            }

            if (!canPush) {
                return false;
            }

            // Shift blocks in reverse order (furthest block to closest block)
            for (let i = blocksToPush.length - 1; i >= 0; i--) {
                const b = blocksToPush[i];
                const destX = b.x + dir.dx;
                const destY = b.y + dir.dy;
                const destZ = b.z + dir.dz;

                this.setBlock(destX, destY, destZ, b.blockId, false);
                if (b.data) {
                    this.setData(destX, destY, destZ, Object.assign({}, b.data));
                }
                if (b.container) {
                    this.setContainer(destX, destY, destZ, b.container);
                }
                this.clearData(b.x, b.y, b.z);
                this.notifyBlockAndNeighbors(destX, destY, destZ);
            }

            // Place piston head in front of piston body
            const headX = x + dir.dx;
            const headY = y + dir.dy;
            const headZ = z + dir.dz;
            this.setBlock(headX, headY, headZ, REDSTONE_BLOCKS.PISTON_HEAD, false);
            this.setData(headX, headY, headZ, {
                pistonPos: { x, y, z },
                facing: dir,
                sticky: isSticky
            });

            data.extended = true;
            this.setData(x, y, z, data);

            this.notifyBlockAndNeighbors(headX, headY, headZ);
            this.notifyBlockAndNeighbors(x, y, z);
            this.emit('pistonPush', x, y, z, { facing: dir, sticky: isSticky, blocksPushed: blocksToPush.length });
            return true;

        } else if (!isPowered && data.extended) {
            // Retraction
            const headX = x + dir.dx;
            const headY = y + dir.dy;
            const headZ = z + dir.dz;

            if (this.getBlock(headX, headY, headZ) === REDSTONE_BLOCKS.PISTON_HEAD) {
                this.clearData(headX, headY, headZ);
                this.setBlock(headX, headY, headZ, REDSTONE_BLOCKS.AIR, false);
            }

            // Sticky piston pulls 1 block behind head
            if (isSticky) {
                const pullX = x + dir.dx * 2;
                const pullY = y + dir.dy * 2;
                const pullZ = z + dir.dz * 2;
                const pullBlockId = this.getBlock(pullX, pullY, pullZ);

                if (
                    pullBlockId !== REDSTONE_BLOCKS.AIR &&
                    pullBlockId !== REDSTONE_BLOCKS.BEDROCK &&
                    pullBlockId !== REDSTONE_BLOCKS.OBSIDIAN &&
                    pullBlockId !== REDSTONE_BLOCKS.PISTON_HEAD
                ) {
                    const pullData = this.metadataStore.get(this.key(pullX, pullY, pullZ));
                    const pullContainer = this.containerStore.get(this.key(pullX, pullY, pullZ));

                    this.setBlock(headX, headY, headZ, pullBlockId, false);
                    if (pullData) {
                        this.setData(headX, headY, headZ, Object.assign({}, pullData));
                    }
                    if (pullContainer) {
                        this.setContainer(headX, headY, headZ, pullContainer);
                    }
                    this.clearData(pullX, pullY, pullZ);
                    this.setBlock(pullX, pullY, pullZ, REDSTONE_BLOCKS.AIR, false);

                    this.notifyBlockAndNeighbors(pullX, pullY, pullZ);
                    this.notifyBlockAndNeighbors(headX, headY, headZ);
                }
            }

            data.extended = false;
            this.setData(x, y, z, data);

            this.notifyBlockAndNeighbors(headX, headY, headZ);
            this.notifyBlockAndNeighbors(x, y, z);
            this.emit('pistonRetract', x, y, z, { facing: dir, sticky: isSticky });
            return true;
        }

        return false;
    }

    // --- HOPPERS ---

    /**
     * Get hopper facing direction (DOWN, NORTH, SOUTH, WEST, EAST).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {Object} Direction object
     */
    getHopperFacing(x, y, z) {
        const data = this.getData(x, y, z);
        let dir = parseDirection(data.facing, DIRECTIONS.DOWN);
        if (dir === DIRECTIONS.UP) dir = DIRECTIONS.DOWN;
        return dir;
    }

    /**
     * Get or create hopper's 5-slot container inventory.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {Object} Inventory object
     */
    getHopperInventory(x, y, z) {
        let container = this.containerStore.get(this.key(x, y, z));
        if (!container) {
            container = {
                numSlots: 5,
                slots: new Array(5).fill(null)
            };
            this.containerStore.set(this.key(x, y, z), container);
        }
        return container;
    }

    /**
     * Update hopper state (check redstone locking and schedule tick).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    updateHopper(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (!isHopper(blockId)) return;

        const isPowered = this.isBlockPowered(x, y, z);
        const data = this.getData(x, y, z);
        data.locked = isPowered;

        if (!data.locked && !this.tickQueue.hasPending(x, y, z)) {
            this.tickQueue.schedule(x, y, z, blockId, 1, 0, this.currentTick);
        }
    }

    /**
     * Process hopper tick:
     * 1. Pull items from inventory directly above (y+1) into hopper's inventory
     * 2. Push items from hopper's inventory to inventory in facing direction
     * Disabled if powered by redstone.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {boolean} True if any item was pulled or pushed
     */
    processHopperTick(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (!isHopper(blockId)) return false;

        const isPowered = this.isBlockPowered(x, y, z);
        const data = this.getData(x, y, z);
        data.locked = isPowered;

        // Hoppers are locked (disabled) when receiving redstone power
        if (data.locked) return false;

        const dir = this.getHopperFacing(x, y, z);
        const hopperInv = this.getHopperInventory(x, y, z);
        const hopperSlots = Array.isArray(hopperInv) ? hopperInv : (hopperInv.slots || []);
        const hopperNumSlots = hopperInv.numSlots || hopperSlots.length || 5;

        let transferredAny = false;

        // 1. Pull items from inventory directly above (x, y + 1, z)
        const abovePos = { x, y: y + 1, z };
        const sourceInv = this.getContainer(abovePos.x, abovePos.y, abovePos.z) ||
            (this.getData(abovePos.x, abovePos.y, abovePos.z) && this.getData(abovePos.x, abovePos.y, abovePos.z).inventory);

        if (sourceInv) {
            const sourceSlots = Array.isArray(sourceInv) ? sourceInv : (sourceInv.slots || []);
            let pulled = false;

            for (let i = 0; i < sourceSlots.length; i++) {
                const srcItem = sourceSlots[i];
                if (srcItem && srcItem.count > 0) {
                    const maxStack = srcItem.maxStack || 64;

                    // Try to merge into existing matching stack in hopper
                    let inserted = false;
                    for (let j = 0; j < hopperNumSlots; j++) {
                        const hSlot = hopperSlots[j];
                        if (hSlot && hSlot.id === srcItem.id && hSlot.count < (hSlot.maxStack || maxStack)) {
                            hSlot.count++;
                            srcItem.count--;
                            if (srcItem.count <= 0) sourceSlots[i] = null;
                            inserted = true;
                            pulled = true;
                            break;
                        }
                    }

                    // Otherwise find first empty slot in hopper
                    if (!inserted) {
                        for (let j = 0; j < hopperNumSlots; j++) {
                            const hSlot = hopperSlots[j];
                            if (!hSlot || hSlot.count <= 0) {
                                hopperSlots[j] = {
                                    id: srcItem.id,
                                    count: 1,
                                    maxStack: maxStack,
                                    isBlock: Boolean(srcItem.isBlock)
                                };
                                srcItem.count--;
                                if (srcItem.count <= 0) sourceSlots[i] = null;
                                inserted = true;
                                pulled = true;
                                break;
                            }
                        }
                    }

                    if (pulled) {
                        transferredAny = true;
                        this.notifyNeighbors(x, y, z);
                        this.notifyNeighbors(abovePos.x, abovePos.y, abovePos.z);
                        this.emit('hopperPull', x, y, z, { from: abovePos, item: { id: srcItem.id, count: 1 } });
                        break; // Standard Minecraft 1 item per pull
                    }
                }
            }
        }

        // 2. Push items to inventory in facing direction (x + dir.dx, y + dir.dy, z + dir.dz)
        const targetPos = { x: x + dir.dx, y: y + dir.dy, z: z + dir.dz };
        const targetInv = this.getContainer(targetPos.x, targetPos.y, targetPos.z) ||
            (this.getData(targetPos.x, targetPos.y, targetPos.z) && this.getData(targetPos.x, targetPos.y, targetPos.z).inventory);

        if (targetInv) {
            const targetSlots = Array.isArray(targetInv) ? targetInv : (targetInv.slots || []);
            const targetNumSlots = targetInv.numSlots || targetSlots.length || (Array.isArray(targetInv) ? targetInv.length : 27);
            let pushed = false;

            for (let i = 0; i < hopperNumSlots; i++) {
                const hItem = hopperSlots[i];
                if (hItem && hItem.count > 0) {
                    const maxStack = hItem.maxStack || 64;

                    // Try to merge into matching slot in target container
                    let inserted = false;
                    for (let j = 0; j < targetNumSlots; j++) {
                        const tSlot = targetSlots[j];
                        if (tSlot && tSlot.id === hItem.id && tSlot.count < (tSlot.maxStack || maxStack)) {
                            tSlot.count++;
                            hItem.count--;
                            if (hItem.count <= 0) hopperSlots[i] = null;
                            inserted = true;
                            pushed = true;
                            break;
                        }
                    }

                    // Otherwise find first empty slot in target container
                    if (!inserted) {
                        for (let j = 0; j < targetNumSlots; j++) {
                            const tSlot = targetSlots[j];
                            if (!tSlot || tSlot.count <= 0) {
                                targetSlots[j] = {
                                    id: hItem.id,
                                    count: 1,
                                    maxStack: maxStack,
                                    isBlock: Boolean(hItem.isBlock)
                                };
                                hItem.count--;
                                if (hItem.count <= 0) hopperSlots[i] = null;
                                inserted = true;
                                pushed = true;
                                break;
                            }
                        }
                    }

                    if (pushed) {
                        transferredAny = true;
                        this.notifyNeighbors(x, y, z);
                        this.notifyNeighbors(targetPos.x, targetPos.y, targetPos.z);
                        this.emit('hopperPush', x, y, z, { to: targetPos, item: { id: hItem.id, count: 1 } });
                        break; // Standard Minecraft 1 item per push
                    }
                }
            }
        }

        return transferredAny;
    }

    // --- DROPPERS ---

    /**
     * Get dropper facing direction (DOWN, UP, NORTH, SOUTH, WEST, EAST).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {Object} Direction object
     */
    getDropperFacing(x, y, z) {
        const data = this.getData(x, y, z);
        return parseDirection(data.facing, DIRECTIONS.NORTH);
    }

    /**
     * Get or create dropper's 9-slot container inventory.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {Object} Inventory object
     */
    getDropperInventory(x, y, z) {
        let container = this.containerStore.get(this.key(x, y, z));
        if (!container) {
            container = {
                numSlots: 9,
                slots: new Array(9).fill(null)
            };
            this.containerStore.set(this.key(x, y, z), container);
        }
        return container;
    }

    /**
     * Update dropper state (check redstone rising edge and schedule tick).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    updateDropper(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (!isDropper(blockId)) return;

        const isPowered = this.isBlockPowered(x, y, z);
        const data = this.getData(x, y, z);
        const wasPowered = Boolean(data.powered);

        if (isPowered && !wasPowered) {
            data.powered = true;
            this.tickQueue.schedule(x, y, z, blockId, 1, 0, this.currentTick);
        } else if (!isPowered && wasPowered) {
            data.powered = false;
        }
    }

    /**
     * Process dropper tick:
     * If powered, eject a random item from inventory into the block in front
     * (or insert into facing inventory like a hopper).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {boolean} True if an item was ejected or inserted
     */
    processDropperTick(x, y, z) {
        const blockId = this.getBlock(x, y, z);
        if (!isDropper(blockId)) return false;

        const isPowered = this.isBlockPowered(x, y, z);
        const data = this.getData(x, y, z);
        data.powered = isPowered;

        if (!isPowered) return false;

        const dir = this.getDropperFacing(x, y, z);
        const dropperInv = this.getDropperInventory(x, y, z);
        const dropperSlots = Array.isArray(dropperInv) ? dropperInv : (dropperInv.slots || []);
        const dropperNumSlots = dropperInv.numSlots || dropperSlots.length || 9;

        // Find all non-empty slot indices
        const occupiedIndices = [];
        for (let i = 0; i < dropperNumSlots; i++) {
            const slot = dropperSlots[i];
            if (slot && slot.count > 0) {
                occupiedIndices.push(i);
            }
        }

        if (occupiedIndices.length === 0) {
            this.emit('dropperEmpty', x, y, z, {});
            return false;
        }

        // Pick a random occupied slot
        const chosenIndex = occupiedIndices[Math.floor(Math.random() * occupiedIndices.length)];
        const chosenSlot = dropperSlots[chosenIndex];
        const maxStack = chosenSlot.maxStack || 64;

        const itemToTransfer = {
            id: chosenSlot.id,
            count: 1,
            maxStack: maxStack,
            isBlock: Boolean(chosenSlot.isBlock)
        };

        // Decrement item count from dropper inventory
        chosenSlot.count--;
        if (chosenSlot.count <= 0) {
            dropperSlots[chosenIndex] = null;
        }

        const targetPos = { x: x + dir.dx, y: y + dir.dy, z: z + dir.dz };
        const targetInv = this.getContainer(targetPos.x, targetPos.y, targetPos.z) ||
            (this.getData(targetPos.x, targetPos.y, targetPos.z) && this.getData(targetPos.x, targetPos.y, targetPos.z).inventory);

        let inserted = false;

        if (targetInv) {
            const targetSlots = Array.isArray(targetInv) ? targetInv : (targetInv.slots || []);
            const targetNumSlots = targetInv.numSlots || targetSlots.length || (Array.isArray(targetInv) ? targetInv.length : 27);

            // 1. Try to merge into existing matching stack
            for (let j = 0; j < targetNumSlots; j++) {
                const tSlot = targetSlots[j];
                if (tSlot && tSlot.id === itemToTransfer.id && tSlot.count < (tSlot.maxStack || maxStack)) {
                    tSlot.count++;
                    inserted = true;
                    break;
                }
            }

            // 2. If not merged, find first empty slot
            if (!inserted) {
                for (let j = 0; j < targetNumSlots; j++) {
                    const tSlot = targetSlots[j];
                    if (!tSlot || tSlot.count <= 0) {
                        targetSlots[j] = {
                            id: itemToTransfer.id,
                            count: 1,
                            maxStack: maxStack,
                            isBlock: Boolean(itemToTransfer.isBlock)
                        };
                        inserted = true;
                        break;
                    }
                }
            }
        }

        data.lastDroppedItem = itemToTransfer;

        if (inserted) {
            this.notifyNeighbors(x, y, z);
            this.notifyNeighbors(targetPos.x, targetPos.y, targetPos.z);
            this.emit('dropperInsert', x, y, z, {
                target: targetPos,
                facing: dir,
                item: itemToTransfer
            });
        } else {
            // Ejected into block / world in front
            this.notifyNeighbors(x, y, z);
            this.emit('dropperEject', x, y, z, {
                target: targetPos,
                facing: dir,
                item: itemToTransfer
            });
        }

        return true;
    }

    // --- TRAPPED CHESTS ---

    /**
     * Set trapped chest open state and update emitted redstone power.
     * When container is open, emits signal strength equal to players looking in it (defaults to 1).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {boolean} isOpen 
     * @param {number} [numPlayers=1] Number of players looking in the chest
     */
    setChestOpen(x, y, z, isOpen, numPlayers = 1) {
        const blockId = this.getBlock(x, y, z);
        const data = this.getData(x, y, z);
        data.open = Boolean(isOpen);
        data.playersLooking = isOpen ? Math.max(1, numPlayers) : 0;

        this.emit('chestOpenStateChange', x, y, z, {
            open: data.open,
            playersLooking: data.playersLooking,
            blockId
        });

        // Trapped chest strongly powers the block directly beneath it (y-1)
        this.notifyBlockAndNeighbors(x, y - 1, z);
        // Trapped chest weakly powers surrounding neighbors
        this.notifyNeighbors(x, y, z);
    }

    // --- DAYLIGHT SENSORS ---

    /**
     * Calculate daylight light level (0-15) based on timeOfDay (0-24000 ticks) and emit strong power.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} [timeOfDay=6000] Current time in ticks (0-24000)
     * @returns {number} Emitted power level 0-15
     */
    updateDaylightSensor(x, y, z, timeOfDay = 6000) {
        const blockId = this.getBlock(x, y, z);
        if (!isDaylightSensor(blockId)) return 0;

        const normalizedTime = ((timeOfDay % 24000) + 24000) % 24000;
        let power = 0;

        if (normalizedTime >= 0 && normalizedTime <= 12000) {
            // Daytime (0 = 6:00 sunrise, 6000 = 12:00 noon peak, 12000 = 18:00 sunset)
            power = Math.max(0, Math.min(15, Math.round(15 * Math.sin((Math.PI * normalizedTime) / 12000))));
        } else {
            // Nighttime (12000 - 24000)
            power = 0;
        }

        const data = this.getData(x, y, z);
        const oldPower = data.power !== undefined ? data.power : -1;
        data.power = power;

        if (power !== oldPower) {
            this.emit('daylightSensorUpdate', x, y, z, { power, timeOfDay: normalizedTime });
            this.notifyBlockAndNeighbors(x, y, z);
        }

        return power;
    }

    /**
     * Set world time of day and refresh all daylight sensors.
     * @param {number} timeOfDay Time in ticks (0-24000)
     */
    setTimeOfDay(timeOfDay) {
        this.timeOfDay = timeOfDay;
        for (const [key] of this.metadataStore.entries()) {
            const [x, y, z] = key.split(',').map(Number);
            if (isDaylightSensor(this.getBlock(x, y, z))) {
                this.updateDaylightSensor(x, y, z, timeOfDay);
            }
        }
    }
}
