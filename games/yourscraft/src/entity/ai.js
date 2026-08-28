/**
 * AI and Pathfinding System for Minecraft 1.5 WebGL Engine
 * Features:
 * - 3D Voxel A* Pathfinding with jump heights (1 block max up)
 * - Safe falling & drop height analysis (avoids lethal falls > 3 blocks unless water)
 * - Width and height clearance checking for different mob dimensions (Pig, Cow, Zombie, Skeleton, Creeper, Spider, Enderman, Ghast, ZombiePigman, WitherSkeleton)
 * - Liquid / Hazard avoidance (Lava, Fire, Cacti)
 * - Priority Queue (Binary Min-Heap) for O(log N) node selection
 * - Path Navigator with dynamic jump triggers and stuck detection
 * - Modular AI Goal System:
 *   - WanderGoal (random wandering)
 *   - ChaseTargetGoal (pathfinding pursuit)
 *   - MeleeAttackGoal (close combat)
 *   - FleeGoal (panic sprint away from damage)
 *   - RangedAttackGoal (Skeleton bow strafe & aim)
 *   - CreeperExplodeGoal (hiss, fuse, explode)
 *   - SpiderClimbGoal (wall climbing mechanics)
 *   - SpiderTargetGoal (daylight neutrality vs night hostility)
 *   - SpiderLeapGoal (pouncing attack leap)
 *   - EndermanStareGoal (crosshair eye-contact detection & aggro)
 *   - EndermanTeleportGoal (water avoidance, projectile evasion, combat ambushes)
 *   - GhastFlyGoal (3D floating / hovering flight dynamics)
 *   - GhastAttackGoal (long-range charging & fireball projectile barrage)
 *   - ZombiePigmanAngerGoal (neutral until attacked, horde pack aggression)
 */

import { BLOCKS } from '../core/chunk.js';

/* ========================================================================= */
/* BLOCK CLASSIFICATION & COLLISION HELPERS                                  */
/* ========================================================================= */

// Set of all non-colliding, passable blocks (entities can walk through)
const PASSABLE_BLOCKS = new Set([
    BLOCKS.AIR,
    BLOCKS.TALL_GRASS,
    BLOCKS.DEAD_BUSH,
    BLOCKS.DANDELION,
    BLOCKS.POPPY,
    BLOCKS.BROWN_MUSHROOM,
    BLOCKS.RED_MUSHROOM,
    BLOCKS.TORCH,
    BLOCKS.FIRE, // Passable physically, but marked as hazard
    BLOCKS.SNOW_LAYER,
    BLOCKS.WHEAT,
    BLOCKS.SUGAR_CANE
]);

// Hazardous blocks that inflict damage
const HAZARD_BLOCKS = new Set([
    BLOCKS.LAVA,
    BLOCKS.LAVA_FLOWING,
    BLOCKS.FIRE,
    BLOCKS.CACTUS
]);

// Liquid blocks
const LIQUID_BLOCKS = new Set([
    BLOCKS.WATER,
    BLOCKS.WATER_FLOWING,
    BLOCKS.LAVA,
    BLOCKS.LAVA_FLOWING
]);

/**
 * Check if a block ID is solid terrain
 * @param {number} blockId 
 * @returns {boolean}
 */
export function isBlockSolid(blockId) {
    if (blockId === undefined || blockId === null || blockId === BLOCKS.AIR) return false;
    if (PASSABLE_BLOCKS.has(blockId)) return false;
    if (LIQUID_BLOCKS.has(blockId)) return false;
    return true;
}

/**
 * Check if a block ID is passable (can occupy without colliding)
 * @param {number} blockId 
 * @returns {boolean}
 */
export function isBlockPassable(blockId) {
    if (blockId === undefined || blockId === null || blockId === BLOCKS.AIR) return true;
    return PASSABLE_BLOCKS.has(blockId);
}

/**
 * Check if a block is liquid
 * @param {number} blockId 
 * @returns {boolean}
 */
export function isBlockLiquid(blockId) {
    return LIQUID_BLOCKS.has(blockId);
}

/**
 * Check if a block is hazardous (lava, fire, cactus)
 * @param {number} blockId 
 * @returns {boolean}
 */
export function isBlockHazardous(blockId) {
    return HAZARD_BLOCKS.has(blockId);
}

/**
 * Helper to safely query block from different world representations
 * (supports Chunk, World instance, or custom accessor function)
 * @param {Object|Function} world 
 * @param {number} x 
 * @param {number} y 
 * @param {number} z 
 * @returns {number} Block ID
 */
export function getBlockAt(world, x, y, z) {
    if (!world) return BLOCKS.AIR;
    if (y < 0 || y >= 256) return BLOCKS.AIR;

    if (typeof world.getBlock === 'function') {
        return world.getBlock(x, y, z);
    } else if (typeof world === 'function') {
        return world(x, y, z);
    }
    return BLOCKS.AIR;
}

/**
 * Check vertical and horizontal clearance for a mob at block position (x, y, z)
 * @param {Object} world 
 * @param {number} x Block X
 * @param {number} y Block Y (feet position)
 * @param {number} z Block Z
 * @param {number} mobWidth Width in blocks
 * @param {number} mobHeight Height in blocks
 * @returns {boolean} True if mob can stand at (x, y, z)
 */
export function checkClearance(world, x, y, z, mobWidth = 0.6, mobHeight = 1.8) {
    const requiredHeight = Math.max(1, Math.ceil(mobHeight));

    // 1. Check ground beneath feet (must be solid or liquid/ladder)
    const groundBlock = getBlockAt(world, x, y - 1, z);
    const isGroundStandable = isBlockSolid(groundBlock) || groundBlock === BLOCKS.WATER || groundBlock === BLOCKS.LADDER;
    if (!isGroundStandable) return false;

    // Reject standing directly on hazard
    if (isBlockHazardous(groundBlock)) return false;

    // 2. Check vertical space for mob body
    for (let dy = 0; dy < requiredHeight; dy++) {
        const block = getBlockAt(world, x, y + dy, z);
        // Space must be passable and not a hazard
        if (!isBlockPassable(block) && block !== BLOCKS.WATER && block !== BLOCKS.LADDER) {
            return false;
        }
        if (isBlockHazardous(block)) {
            return false;
        }
    }

    // 3. For wide mobs (width > 1.0), check adjacent horizontal block volume
    if (mobWidth > 1.0) {
        const extraX = [x + 1, x - 1];
        const extraZ = [z + 1, z - 1];

        for (const ex of extraX) {
            for (let dy = 0; dy < requiredHeight; dy++) {
                const b = getBlockAt(world, ex, y + dy, z);
                if (isBlockSolid(b) || isBlockHazardous(b)) return false;
            }
        }
        for (const ez of extraZ) {
            for (let dy = 0; dy < requiredHeight; dy++) {
                const b = getBlockAt(world, x, y + dy, ez);
                if (isBlockSolid(b) || isBlockHazardous(b)) return false;
            }
        }
    }

    return true;
}

/* ========================================================================= */
/* BINARY MIN-HEAP PRIORITY QUEUE                                            */
/* ========================================================================= */

/**
 * High-performance Binary Min-Heap Priority Queue for A*
 */
export class PriorityQueue {
    constructor() {
        this.heap = [];
    }

    /**
     * @param {PathNode} node 
     */
    push(node) {
        this.heap.push(node);
        this._bubbleUp(this.heap.length - 1);
    }

    /**
     * @returns {PathNode|null}
     */
    pop() {
        if (this.heap.length === 0) return null;
        const top = this.heap[0];
        const bottom = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = bottom;
            this._sinkDown(0);
        }
        return top;
    }

    /**
     * @returns {PathNode|null}
     */
    peek() {
        return this.heap.length > 0 ? this.heap[0] : null;
    }

    /**
     * @returns {boolean}
     */
    isEmpty() {
        return this.heap.length === 0;
    }

    /**
     * @returns {number}
     */
    size() {
        return this.heap.length;
    }

    clear() {
        this.heap.length = 0;
    }

    _bubbleUp(index) {
        const element = this.heap[index];
        while (index > 0) {
            const parentIdx = (index - 1) >> 1;
            const parent = this.heap[parentIdx];
            if (element.f >= parent.f) break;
            this.heap[index] = parent;
            index = parentIdx;
        }
        this.heap[index] = element;
    }

    _sinkDown(index) {
        const length = this.heap.length;
        const element = this.heap[index];

        while (true) {
            const leftChildIdx = (index << 1) + 1;
            const rightChildIdx = leftChildIdx + 1;
            let swapIdx = -1;
            let minF = element.f;

            if (leftChildIdx < length) {
                const leftChild = this.heap[leftChildIdx];
                if (leftChild.f < minF) {
                    minF = leftChild.f;
                    swapIdx = leftChildIdx;
                }
            }

            if (rightChildIdx < length) {
                const rightChild = this.heap[rightChildIdx];
                if (rightChild.f < minF) {
                    swapIdx = rightChildIdx;
                }
            }

            if (swapIdx === -1) break;
            this.heap[index] = this.heap[swapIdx];
            index = swapIdx;
        }
        this.heap[index] = element;
    }
}

/* ========================================================================= */
/* A* PATHFINDING ON 3D VOXEL GRID                                           */
/* ========================================================================= */

/**
 * Search Node for A* Graph
 */
export class PathNode {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} [g=0] Cost from start
     * @param {number} [h=0] Estimated cost to goal
     * @param {PathNode|null} [parent=null] 
     */
    constructor(x, y, z, g = 0, h = 0, parent = null) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.g = g;
        this.h = h;
        this.f = g + h;
        this.parent = parent;
        this.key = `${x},${y},${z}`;
    }
}

/**
 * 3D Voxel A* Pathfinder
 */
export class AStarPathfinder {
    /**
     * @param {Object} [options={}]
     */
    constructor(options = {}) {
        this.maxNodes = options.maxNodes || 1200; // Max node expansions
        this.maxJumpHeight = options.maxJumpHeight || 1; // 1 block max jump in Minecraft
        this.maxDropHeight = options.maxDropHeight || 3; // Safe fall height without damage
        this.allowDiagonal = options.allowDiagonal !== undefined ? options.allowDiagonal : true;
        this.heuristicWeight = options.heuristicWeight || 1.05; // Slightly greedy for speed
    }

    /**
     * Compute 3D distance heuristic (Euclidean with vertical penalty)
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} z1 
     * @param {number} x2 
     * @param {number} y2 
     * @param {number} z2 
     * @returns {number}
     */
    heuristic(x1, y1, z1, x2, y2, z2) {
        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        const dz = Math.abs(z1 - z2);

        // Euclidean distance heuristic
        return Math.hypot(dx, dy * 1.2, dz) * this.heuristicWeight;
    }

    /**
     * Find path from start position to goal position
     * @param {Object} world World / Chunk instance with getBlock(x,y,z)
     * @param {{x: number, y: number, z: number}} start Start position (feet)
     * @param {{x: number, y: number, z: number}} goal Target position (feet)
     * @param {Object} [mobConfig={}] Mob dimensions & parameters
     * @param {number} [mobConfig.width=0.6]
     * @param {number} [mobConfig.height=1.8]
     * @param {number} [mobConfig.maxDropHeight=3]
     * @param {number} [mobConfig.maxJumpHeight=1]
     * @returns {Array<{x: number, y: number, z: number}>|null} Array of waypoint coordinates
     */
    findPath(world, start, goal, mobConfig = {}) {
        const mobWidth = mobConfig.width || 0.6;
        const mobHeight = mobConfig.height || 1.8;
        const maxDrop = mobConfig.maxDropHeight !== undefined ? mobConfig.maxDropHeight : this.maxDropHeight;
        const maxJump = mobConfig.maxJumpHeight !== undefined ? mobConfig.maxJumpHeight : this.maxJumpHeight;

        // Quantize start and goal to integer block coordinates
        let startX = Math.floor(start.x);
        let startY = Math.floor(start.y);
        let startZ = Math.floor(start.z);

        const goalX = Math.floor(goal.x);
        const goalY = Math.floor(goal.y);
        const goalZ = Math.floor(goal.z);

        // Snap start position down to solid ground if floating slightly
        startY = this._snapToGround(world, startX, startY, startZ, mobWidth, mobHeight);

        // Check if start is valid
        if (!checkClearance(world, startX, startY, startZ, mobWidth, mobHeight)) {
            // Attempt to search 1 block radius for nearby valid standable position
            const validStart = this._findNearbyStandable(world, startX, startY, startZ, mobWidth, mobHeight);
            if (validStart) {
                startX = validStart.x;
                startY = validStart.y;
                startZ = validStart.z;
            } else {
                return null;
            }
        }

        // If start is already at goal
        if (startX === goalX && startY === goalY && startZ === goalZ) {
            return [{ x: goal.x, y: goal.y, z: goal.z }];
        }

        const openSet = new PriorityQueue();
        const nodeMap = new Map(); // key -> PathNode
        const closedSet = new Set(); // set of keys

        const startNode = new PathNode(
            startX,
            startY,
            startZ,
            0,
            this.heuristic(startX, startY, startZ, goalX, goalY, goalZ),
            null
        );

        openSet.push(startNode);
        nodeMap.set(startNode.key, startNode);

        let closestNode = startNode;
        let closestDist = startNode.h;
        let expansions = 0;

        // Neighbor movement offsets (8 horizontal directions)
        const directions = [
            { dx: 1, dz: 0, cost: 1.0 },
            { dx: -1, dz: 0, cost: 1.0 },
            { dx: 0, dz: 1, cost: 1.0 },
            { dx: 0, dz: -1, cost: 1.0 }
        ];

        if (this.allowDiagonal) {
            directions.push(
                { dx: 1, dz: 1, cost: Math.SQRT2 },
                { dx: 1, dz: -1, cost: Math.SQRT2 },
                { dx: -1, dz: 1, cost: Math.SQRT2 },
                { dx: -1, dz: -1, cost: Math.SQRT2 }
            );
        }

        while (!openSet.isEmpty() && expansions < this.maxNodes) {
            const current = openSet.pop();
            expansions++;

            // Goal check
            if (current.x === goalX && Math.abs(current.y - goalY) <= 1 && current.z === goalZ) {
                return this._reconstructPath(current, goal);
            }

            // Track closest node in case max iterations is reached
            if (current.h < closestDist) {
                closestDist = current.h;
                closestNode = current;
            }

            closedSet.add(current.key);

            // Explore neighbors
            for (let i = 0; i < directions.length; i++) {
                const dir = directions[i];
                const nx = current.x + dir.dx;
                const nz = current.z + dir.dz;

                // Diagonal movement check: verify adjacent orthogonal blocks are not solid walls
                if (dir.dx !== 0 && dir.dz !== 0) {
                    const blockSide1 = getBlockAt(world, current.x + dir.dx, current.y, current.z);
                    const blockSide2 = getBlockAt(world, current.x, current.y, current.z + dir.dz);
                    if (isBlockSolid(blockSide1) && isBlockSolid(blockSide2)) {
                        continue; // Blocked by corner collision
                    }
                }

                // Determine valid vertical step / jump / drop for this neighbor column
                const validSteps = this._getValidSteps(
                    world,
                    current.x,
                    current.y,
                    current.z,
                    nx,
                    nz,
                    mobWidth,
                    mobHeight,
                    maxJump,
                    maxDrop
                );

                for (let s = 0; s < validSteps.length; s++) {
                    const step = validSteps[s];
                    const ny = step.y;
                    const moveCost = dir.cost * step.costMultiplier;
                    const stepKey = `${nx},${ny},${nz}`;

                    if (closedSet.has(stepKey)) continue;

                    const tentativeG = current.g + moveCost;
                    let neighbor = nodeMap.get(stepKey);

                    if (!neighbor) {
                        const h = this.heuristic(nx, ny, nz, goalX, goalY, goalZ);
                        neighbor = new PathNode(nx, ny, nz, tentativeG, h, current);
                        nodeMap.set(stepKey, neighbor);
                        openSet.push(neighbor);
                    } else if (tentativeG < neighbor.g) {
                        neighbor.g = tentativeG;
                        neighbor.f = tentativeG + neighbor.h;
                        neighbor.parent = current;
                        openSet._bubbleUp(openSet.heap.indexOf(neighbor));
                    }
                }
            }
        }

        // Return best partial path if reached search limit
        if (closestNode !== startNode && closestDist < startNode.h) {
            return this._reconstructPath(closestNode, goal);
        }

        return null;
    }

    /**
     * Scan candidate heights in neighbor column (nx, nz) for flat walk, 1-block jump, or safe drop
     * @private
     */
    _getValidSteps(world, curX, curY, curZ, nx, nz, mobWidth, mobHeight, maxJump, maxDrop) {
        const steps = [];
        const requiredHeight = Math.max(1, Math.ceil(mobHeight));

        // 1. Flat Walk (same Y level)
        if (checkClearance(world, nx, curY, nz, mobWidth, mobHeight)) {
            steps.push({ y: curY, costMultiplier: 1.0 });
        }

        // 2. Jump Up 1 Block (dy = +1)
        if (maxJump >= 1) {
            const jumpY = curY + 1;
            // Check if jumping headroom exists at current position so mob doesn't bonk ceiling
            const headroomBlock = getBlockAt(world, curX, curY + requiredHeight, curZ);
            if (isBlockPassable(headroomBlock) || headroomBlock === BLOCKS.WATER) {
                // Check if target position at jumpY has valid standing clearance
                if (checkClearance(world, nx, jumpY, nz, mobWidth, mobHeight)) {
                    steps.push({ y: jumpY, costMultiplier: 1.5 }); // Jump effort penalty
                }
            }
        }

        // 3. Step Down / Safe Fall (dy = -1 to -maxDrop)
        // Only consider falling if flat walk at curY is not already a valid solid ground
        const groundAtFlat = getBlockAt(world, nx, curY - 1, nz);
        if (!isBlockSolid(groundAtFlat) && groundAtFlat !== BLOCKS.WATER && groundAtFlat !== BLOCKS.LADDER) {
            for (let drop = 1; drop <= maxDrop; drop++) {
                const targetY = curY - drop;
                if (targetY < 0) break;

                // Check fall corridor: all blocks between curY and targetY + requiredHeight must be passable
                let corridorClear = true;
                for (let cy = targetY + 1; cy <= curY + requiredHeight - 1; cy++) {
                    const cb = getBlockAt(world, nx, cy, nz);
                    if (!isBlockPassable(cb) && cb !== BLOCKS.WATER) {
                        corridorClear = false;
                        break;
                    }
                }
                if (!corridorClear) break;

                // Check if target landing spot is valid and standable
                if (checkClearance(world, nx, targetY, nz, mobWidth, mobHeight)) {
                    const landingGround = getBlockAt(world, nx, targetY - 1, nz);
                    const isWaterLanding = landingGround === BLOCKS.WATER || getBlockAt(world, nx, targetY, nz) === BLOCKS.WATER;

                    // Fall cost: scale slightly with drop height
                    const dropCost = 1.0 + (drop * 0.25) + (isWaterLanding ? 0.5 : 0);
                    steps.push({ y: targetY, costMultiplier: dropCost });
                    break; // Found highest safe landing block in this column
                }
            }
        }

        return steps;
    }

    /**
     * Snap floating starting Y to nearest solid ground beneath
     * @private
     */
    _snapToGround(world, x, y, z, mobWidth, mobHeight) {
        for (let dy = 0; dy <= 4; dy++) {
            const checkY = y - dy;
            if (checkY < 0) break;
            if (checkClearance(world, x, checkY, z, mobWidth, mobHeight)) {
                return checkY;
            }
        }
        return y;
    }

    /**
     * Search 1-block radius for a valid nearby standable position
     * @private
     */
    _findNearbyStandable(world, x, y, z, mobWidth, mobHeight) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (checkClearance(world, x + dx, y + dy, z + dz, mobWidth, mobHeight)) {
                        return { x: x + dx, y: y + dy, z: z + dz };
                    }
                }
            }
        }
        return null;
    }

    /**
     * Reconstruct path from end node to start, inserting center coordinates
     * @private
     */
    _reconstructPath(endNode, finalGoal) {
        const waypoints = [];
        let curr = endNode;

        while (curr) {
            waypoints.push({
                x: curr.x + 0.5,
                y: curr.y,
                z: curr.z + 0.5
            });
            curr = curr.parent;
        }

        waypoints.reverse();

        // Optional Path smoothing / line-of-sight cleanup
        const smoothed = this._smoothPath(waypoints);

        // Ensure exact final target position is appended if close
        if (waypoints.length > 0 && finalGoal) {
            const last = smoothed[smoothed.length - 1];
            const distToFinal = Math.hypot(last.x - finalGoal.x, last.z - finalGoal.z);
            if (distToFinal > 0.4 && distToFinal < 2.0) {
                smoothed.push({ x: finalGoal.x, y: finalGoal.y, z: finalGoal.z });
            }
        }

        return smoothed;
    }

    /**
     * Smooth path by skipping intermediate redundant waypoints on flat straight lines
     * @private
     */
    _smoothPath(waypoints) {
        if (waypoints.length <= 2) return waypoints;

        const smoothed = [waypoints[0]];
        let i = 0;

        while (i < waypoints.length - 1) {
            let furthest = i + 1;
            // Check collinear flat steps
            for (let j = i + 2; j < Math.min(i + 5, waypoints.length); j++) {
                const p1 = waypoints[i];
                const p2 = waypoints[j];

                // Only smooth flat horizontal segments with equal Y
                if (p1.y === p2.y) {
                    const dx = p2.x - p1.x;
                    const dz = p2.z - p1.z;
                    let isStraight = true;

                    for (let k = i + 1; k < j; k++) {
                        const mid = waypoints[k];
                        if (mid.y !== p1.y) {
                            isStraight = false;
                            break;
                        }
                        const t = (k - i) / (j - i);
                        const expectedX = p1.x + dx * t;
                        const expectedZ = p1.z + dz * t;
                        if (Math.abs(mid.x - expectedX) > 0.1 || Math.abs(mid.z - expectedZ) > 0.1) {
                            isStraight = false;
                            break;
                        }
                    }

                    if (isStraight) {
                        furthest = j;
                    }
                }
            }

            smoothed.push(waypoints[furthest]);
            i = furthest;
        }

        return smoothed;
    }
}

/* ========================================================================= */
/* PATH NAVIGATOR & MOVEMENT CONTROLLER                                      */
/* ========================================================================= */

/**
 * PathNavigator drives an entity smoothly along an A* path
 */
export class PathNavigator {
    /**
     * @param {Object} entity LivingEntity or Mob
     * @param {AStarPathfinder} [pathfinder=null] 
     */
    constructor(entity, pathfinder = null) {
        this.entity = entity;
        this.pathfinder = pathfinder || new AStarPathfinder();

        this.path = null;
        this.waypointIndex = 0;
        this.targetPos = null;

        // Navigation settings
        this.reachRadius = 0.45; // Horizontal reach tolerance
        this.speedMultiplier = 1.0;
        this.isStuck = false;
        this.stuckTimer = 0;
        this.lastPos = { x: 0, y: 0, z: 0 };
    }

    /**
     * Request path to target destination
     * @param {Object} world 
     * @param {{x: number, y: number, z: number}} targetPos 
     * @returns {boolean} True if path found
     */
    moveTo(world, targetPos) {
        this.targetPos = targetPos;
        const mobConfig = {
            width: this.entity.width || 0.6,
            height: this.entity.height || 1.8,
            maxDropHeight: 3,
            maxJumpHeight: 1
        };

        const path = this.pathfinder.findPath(world, this.entity.position, targetPos, mobConfig);
        if (path && path.length > 0) {
            this.path = path;
            this.waypointIndex = 0;
            this.isStuck = false;
            this.stuckTimer = 0;
            this.lastPos = { ...this.entity.position };
            return true;
        }

        this.path = null;
        return false;
    }

    /**
     * Set explicit waypoint list
     * @param {Array<{x: number, y: number, z: number}>} path 
     */
    setPath(path) {
        this.path = path;
        this.waypointIndex = 0;
        this.isStuck = false;
        this.stuckTimer = 0;
    }

    /**
     * Clear active path
     */
    clearPath() {
        this.path = null;
        this.waypointIndex = 0;
    }

    /**
     * Check if navigator has active path
     * @returns {boolean}
     */
    hasPath() {
        return this.path !== null && this.waypointIndex < this.path.length;
    }

    /**
     * Check if navigation finished
     * @returns {boolean}
     */
    isFinished() {
        return !this.path || this.waypointIndex >= this.path.length;
    }

    /**
     * Update navigation physics and entity steering
     * @param {number} dt 
     * @param {Object} world 
     */
    update(dt = 0.05, world = null) {
        if (!this.hasPath()) return;

        const currentWaypoint = this.path[this.waypointIndex];
        const entityPos = this.entity.position;

        const dx = currentWaypoint.x - entityPos.x;
        const dy = currentWaypoint.y - entityPos.y;
        const dz = currentWaypoint.z - entityPos.z;
        const distXZ = Math.hypot(dx, dz);

        // Check if waypoint reached
        if (distXZ <= this.reachRadius && Math.abs(dy) <= 1.2) {
            this.waypointIndex++;
            if (this.waypointIndex >= this.path.length) {
                this.clearPath();
                return;
            }
        }

        // Steer entity towards waypoint
        const targetYaw = Math.atan2(dx, dz);
        this.entity.rotation.yaw = targetYaw;
        this.entity.headYaw = targetYaw;

        // Apply movement velocity
        const speed = (this.entity.movementSpeed || 0.25) * this.speedMultiplier * 4.0;
        const moveDist = Math.max(distXZ, 0.001);
        this.entity.velocity.x = (dx / moveDist) * speed;
        this.entity.velocity.z = (dz / moveDist) * speed;

        // Jump trigger when next waypoint is elevated (dy > 0.4) or bumping into solid block
        if (dy > 0.4 || (this.entity.isCollidedHorizontally && distXZ > 0.2)) {
            if (this.entity.onGround) {
                this.entity.jump();
            }
        }

        // Stuck detection
        const movedDist = Math.hypot(entityPos.x - this.lastPos.x, entityPos.z - this.lastPos.z);
        if (movedDist < 0.05 * dt) {
            this.stuckTimer += dt;
            if (this.stuckTimer > 1.2) {
                this.isStuck = true;
                // Attempt jump to unstick
                if (this.entity.onGround) this.entity.jump();
            }
            if (this.stuckTimer > 2.5) {
                // Cancel failed path
                this.clearPath();
            }
        } else {
            this.stuckTimer = 0;
            this.isStuck = false;
        }

        this.lastPos.x = entityPos.x;
        this.lastPos.y = entityPos.y;
        this.lastPos.z = entityPos.z;
    }
}

/* ========================================================================= */
/* AI BEHAVIOR GOALS                                                         */
/* ========================================================================= */

/**
 * Base AI Goal
 */
export class Goal {
    /**
     * @param {Mob} mob 
     */
    constructor(mob) {
        this.mob = mob;
    }

    canStart() { return true; }
    shouldContinue() { return this.canStart(); }
    start() {}
    stop() {}
    tick(dt, world) {}
}

/**
 * WanderGoal: Roam around randomly within radius
 */
export class WanderGoal extends Goal {
    /**
     * @param {Mob} mob 
     * @param {number} [wanderRadius=8] 
     * @param {number} [interval=5] 
     */
    constructor(mob, wanderRadius = 8, interval = 5) {
        super(mob);
        this.wanderRadius = wanderRadius;
        this.interval = interval;
        this.timer = Math.random() * interval;
    }

    canStart() {
        return this.mob.isAlive() && (!this.mob.target || this.mob.state === 'IDLE');
    }

    tick(dt, world) {
        this.timer += dt;
        if (this.timer >= this.interval) {
            this.timer = 0;

            if (!this.mob.pathNavigator) {
                this.mob.pathNavigator = new PathNavigator(this.mob);
            }

            // Pick random target in radius
            const angle = Math.random() * Math.PI * 2;
            const dist = 3 + Math.random() * (this.wanderRadius - 3);
            const targetX = this.mob.position.x + Math.sin(angle) * dist;
            const targetZ = this.mob.position.z + Math.cos(angle) * dist;

            this.mob.pathNavigator.moveTo(world, {
                x: targetX,
                y: this.mob.position.y,
                z: targetZ
            });
            this.mob.state = 'WANDER';
        }
    }
}

/**
 * ChaseTargetGoal: Track and pathfind towards target entity
 */
export class ChaseTargetGoal extends Goal {
    /**
     * @param {Mob} mob 
     * @param {number} [repathInterval=0.6] 
     */
    constructor(mob, repathInterval = 0.6) {
        super(mob);
        this.repathInterval = repathInterval;
        this.repathTimer = 0;
    }

    canStart() {
        return (
            this.mob.isAlive() &&
            this.mob.target &&
            this.mob.target.isAlive() &&
            this.mob.distanceTo(this.mob.target) <= (this.mob.followRange || 16.0)
        );
    }

    tick(dt, world) {
        if (!this.mob.target) return;

        this.repathTimer += dt;
        if (this.repathTimer >= this.repathInterval) {
            this.repathTimer = 0;

            if (!this.mob.pathNavigator) {
                this.mob.pathNavigator = new PathNavigator(this.mob);
            }

            this.mob.pathNavigator.moveTo(world, this.mob.target.position);
            this.mob.state = 'CHASE';
        }
    }
}

/**
 * MeleeAttackGoal: Deal damage when close to target
 */
export class MeleeAttackGoal extends Goal {
    /**
     * @param {Mob} mob 
     */
    constructor(mob) {
        super(mob);
    }

    canStart() {
        return (
            this.mob.isAlive() &&
            this.mob.target &&
            this.mob.target.isAlive() &&
            this.mob.distanceTo(this.mob.target) <= (this.mob.attackRange + this.mob.target.width / 2)
        );
    }

    tick(dt, world) {
        if (this.mob.attackEntity) {
            this.mob.attackEntity(this.mob.target);
            this.mob.state = 'ATTACK';
        }
    }
}

/**
 * FleeGoal: Panic and sprint away from danger source
 */
export class FleeGoal extends Goal {
    /**
     * @param {Mob} mob 
     */
    constructor(mob) {
        super(mob);
        this.repathTimer = 0;
    }

    canStart() {
        return this.mob.isAlive() && this.mob.panicTimer > 0;
    }

    tick(dt, world) {
        this.repathTimer += dt;
        if (this.repathTimer > 0.8) {
            this.repathTimer = 0;

            if (!this.mob.pathNavigator) {
                this.mob.pathNavigator = new PathNavigator(this.mob);
            }

            // Run in random direction away from current spot
            const angle = Math.random() * Math.PI * 2;
            const dist = 8 + Math.random() * 4;
            const fx = this.mob.position.x + Math.sin(angle) * dist;
            const fz = this.mob.position.z + Math.cos(angle) * dist;

            this.mob.pathNavigator.speedMultiplier = 1.4; // Sprint panic speed
            this.mob.pathNavigator.moveTo(world, { x: fx, y: this.mob.position.y, z: fz });
            this.mob.state = 'FLEE';
        }
    }
}

/**
 * RangedAttackGoal (Skeleton): Maintain distance, strafe, and shoot arrows
 */
export class RangedAttackGoal extends Goal {
    /**
     * @param {Skeleton} mob 
     */
    constructor(mob) {
        super(mob);
        this.repathTimer = 0;
    }

    canStart() {
        return (
            this.mob.isAlive() &&
            this.mob.target &&
            this.mob.target.isAlive() &&
            this.mob.distanceTo(this.mob.target) <= this.mob.followRange
        );
    }

    tick(dt, world) {
        const target = this.mob.target;
        const dist = this.mob.distanceTo(target);

        // Always face target
        this.mob.lookAt(target.position.x, target.position.y, target.position.z);

        // Maintain preferred combat distance (~10 blocks)
        if (!this.mob.pathNavigator) {
            this.mob.pathNavigator = new PathNavigator(this.mob);
        }

        if (dist > (this.mob.preferredCombatDistance || 10.0) + 2) {
            // Approach target
            this.repathTimer += dt;
            if (this.repathTimer > 0.8) {
                this.repathTimer = 0;
                this.mob.pathNavigator.moveTo(world, target.position);
            }
        } else if (dist < (this.mob.preferredCombatDistance || 10.0) - 3) {
            // Back away from target
            this.repathTimer += dt;
            if (this.repathTimer > 0.8) {
                this.repathTimer = 0;
                const dx = this.mob.position.x - target.position.x;
                const dz = this.mob.position.z - target.position.z;
                const len = Math.hypot(dx, dz) || 1;
                const backX = this.mob.position.x + (dx / len) * 4;
                const backZ = this.mob.position.z + (dz / len) * 4;
                this.mob.pathNavigator.moveTo(world, { x: backX, y: this.mob.position.y, z: backZ });
            }
        } else {
            // In optimal range: strafe and shoot
            this.mob.pathNavigator.clearPath();
            this.mob.moveRelative(0, this.mob.strafeDirection || 1, (this.mob.movementSpeed || 0.25) * 0.5);

            if (this.mob.shootArrow) {
                this.mob.shootArrow(target, world);
            }
        }
    }
}

/**
 * CreeperExplodeGoal: Approach target, hiss fuse when close, detonate
 */
export class CreeperExplodeGoal extends Goal {
    /**
     * @param {Creeper} mob 
     * @param {number} [fuseDistance=3.0] 
     * @param {number} [defuseDistance=5.0] 
     */
    constructor(mob, fuseDistance = 3.0, defuseDistance = 5.0) {
        super(mob);
        this.fuseDistance = fuseDistance;
        this.defuseDistance = defuseDistance;
    }

    canStart() {
        return (
            this.mob.isAlive() &&
            this.mob.target &&
            this.mob.target.isAlive()
        );
    }

    tick(dt, world) {
        const target = this.mob.target;
        const dist = this.mob.distanceTo(target);

        if (dist <= this.fuseDistance) {
            // Within blast range: Stop moving, hiss and arm fuse!
            if (this.mob.pathNavigator) {
                this.mob.pathNavigator.clearPath();
            }
            this.mob.setFuseState(1);
            this.mob.lookAt(target.position.x, target.position.y, target.position.z);
        } else if (dist > this.defuseDistance) {
            // Target escaped range: Defuse
            this.mob.setFuseState(-1);
        }
    }
}

/**
 * SpiderClimbGoal: Allows Spiders to scale vertical walls when colliding with blocks
 */
export class SpiderClimbGoal extends Goal {
    /**
     * @param {Mob} mob 
     * @param {number} [climbSpeed=3.5] 
     */
    constructor(mob, climbSpeed = 3.5) {
        super(mob);
        this.climbSpeed = climbSpeed;
    }

    canStart() {
        return this.mob.isAlive();
    }

    tick(dt, world) {
        // A spider climbs when collided horizontally or facing directly against a solid wall
        const isTouchingWall = this.mob.isCollidedHorizontally || this._checkWallInFront(world);
        if (isTouchingWall) {
            this.mob.isClimbing = true;
            this.mob.velocity.y = this.climbSpeed;
            this.mob.fallDistance = 0;
        } else {
            this.mob.isClimbing = false;
        }
    }

    _checkWallInFront(world) {
        if (!world) return false;
        const rad = this.mob.rotation.yaw;
        const forwardX = Math.sin(rad);
        const forwardZ = Math.cos(rad);
        const checkX = Math.floor(this.mob.position.x + forwardX * 0.8);
        const checkY = Math.floor(this.mob.position.y + 0.5);
        const checkZ = Math.floor(this.mob.position.z + forwardZ * 0.8);
        const block = getBlockAt(world, checkX, checkY, checkZ);
        return isBlockSolid(block);
    }
}

/**
 * SpiderTargetGoal: Spiders are hostile in darkness / at night, but neutral in bright daylight unless attacked
 */
export class SpiderTargetGoal extends Goal {
    /**
     * @param {Mob} mob 
     */
    constructor(mob) {
        super(mob);
        this.checkTimer = 0;
    }

    canStart() {
        return this.mob.isAlive();
    }

    tick(dt, world) {
        this.checkTimer += dt;
        if (this.checkTimer < 0.5) return;
        this.checkTimer = 0;

        // If mob was recently attacked (panicTimer or target set from damage), maintain aggro
        if (this.mob.panicTimer > 0 || (this.mob.target && this.mob.target.isAlive() && this.mob.isHostileToTarget)) {
            this.mob.isHostile = true;
            return;
        }

        const isDaytime = world && world.isDay !== undefined ? world.isDay : false;
        if (isDaytime) {
            const isExposed = this._isExposedToSky(world);
            if (isExposed) {
                // In bright daylight: neutral unless damaged
                this.mob.isHostile = false;
                if (this.mob.target && !this.mob.isHostileToTarget) {
                    this.mob.setTarget(null);
                    this.mob.state = 'IDLE';
                }
                return;
            }
        }

        // Hostile at night or underground
        this.mob.isHostile = true;
    }

    _isExposedToSky(world) {
        if (!world || typeof world.getBlock !== 'function') return true;
        const bx = Math.floor(this.mob.position.x);
        const by = Math.floor(this.mob.position.y + this.mob.height);
        const bz = Math.floor(this.mob.position.z);
        for (let y = by; y < 256; y++) {
            const b = world.getBlock(bx, y, bz);
            if (b !== BLOCKS.AIR && b !== BLOCKS.GLASS) return false;
        }
        return true;
    }
}

/**
 * SpiderLeapGoal: Pounces / leaps forward at target when in range (2-6 blocks)
 */
export class SpiderLeapGoal extends Goal {
    /**
     * @param {Mob} mob 
     * @param {number} [leapInterval=4.0] 
     */
    constructor(mob, leapInterval = 4.0) {
        super(mob);
        this.leapInterval = leapInterval;
        this.leapTimer = Math.random() * leapInterval;
    }

    canStart() {
        return (
            this.mob.isAlive() &&
            this.mob.target &&
            this.mob.target.isAlive() &&
            this.mob.onGround &&
            this.mob.isHostile
        );
    }

    tick(dt, world) {
        this.leapTimer += dt;
        if (this.leapTimer < this.leapInterval) return;

        const target = this.mob.target;
        const dist = this.mob.distanceTo(target);

        if (dist >= 2.0 && dist <= 6.0) {
            this.leapTimer = 0;
            if (typeof this.mob.leapAtTarget === 'function') {
                this.mob.leapAtTarget(target);
            }
        }
    }
}

/**
 * EndermanStareGoal: Enderman becomes aggressive when a player/entity stares directly into its eyes
 */
export class EndermanStareGoal extends Goal {
    /**
     * @param {Mob} mob 
     * @param {number} [stareDistance=64.0] 
     */
    constructor(mob, stareDistance = 64.0) {
        super(mob);
        this.stareDistance = stareDistance;
    }

    canStart() {
        return this.mob.isAlive();
    }

    tick(dt, world) {
        if (this.mob.isAggro) {
            if (!this.mob.target || !this.mob.target.isAlive()) {
                this.mob.isAggro = false;
                this.mob.isStaring = false;
                this.mob.movementSpeed = 0.30;
                this.mob.state = 'IDLE';
            }
            return;
        }

        const lookers = this._findLookers(world);
        if (lookers.length > 0) {
            const looker = lookers[0];
            this.mob.setTarget(looker);
            this.mob.isAggro = true;
            this.mob.isStaring = true;
            this.mob.isHostile = true;
            this.mob.movementSpeed = 0.45;
            this.mob.lookAt(looker.position.x, looker.position.y + (looker.eyeHeight || 1.62), looker.position.z);
            this.mob.state = 'CHASE';
        }
    }

    _findLookers(world) {
        if (!world || !world.entities) return [];
        const lookers = [];
        const enderEye = this.mob.getEyePosition();

        for (const entity of world.entities) {
            if (entity === this.mob || !entity.isAlive || !entity.isAlive()) continue;
            if (entity.rotation === undefined) continue;

            const dist = this.mob.distanceTo(entity);
            if (dist > this.stareDistance) continue;

            // Check if entity is looking towards Enderman's head
            const eyePos = entity.getEyePosition ? entity.getEyePosition() : { x: entity.position.x, y: entity.position.y + (entity.eyeHeight || 1.62), z: entity.position.z };
            const dx = enderEye.x - eyePos.x;
            const dy = enderEye.y - eyePos.y;
            const dz = enderEye.z - eyePos.z;
            const len = Math.hypot(dx, dy, dz);
            if (len < 0.01) continue;

            const dirX = dx / len;
            const dirY = dy / len;
            const dirZ = dz / len;

            // Entity view vector
            const yaw = entity.rotation.yaw || 0;
            const pitch = entity.rotation.pitch || 0;
            const lookX = -Math.sin(yaw) * Math.cos(pitch);
            const lookY = -Math.sin(pitch);
            const lookZ = -Math.cos(yaw) * Math.cos(pitch);

            const dot = lookX * dirX + lookY * dirY + lookZ * dirZ;
            // Dot product > 0.96 indicates crosshair is aligned with Enderman's head
            if (dot > 0.96) {
                lookers.push(entity);
            }
        }
        return lookers;
    }
}

/**
 * EndermanTeleportGoal: Teleports away on water/rain contact, projectile evasion, or combat ambushes
 */
export class EndermanTeleportGoal extends Goal {
    /**
     * @param {Mob} mob 
     * @param {number} [teleportInterval=7.0] 
     */
    constructor(mob, teleportInterval = 7.0) {
        super(mob);
        this.teleportInterval = teleportInterval;
        this.timer = Math.random() * teleportInterval;
    }

    canStart() {
        return this.mob.isAlive();
    }

    tick(dt, world) {
        // Water contact: instant damage and teleport
        if (this.mob.inWater) {
            this.mob.takeDamage(1, 'water');
            if (typeof this.mob.teleportRandomly === 'function') {
                this.mob.teleportRandomly(world, 16);
            }
            return;
        }

        // Combat teleport ambush
        if (this.mob.target && this.mob.target.isAlive()) {
            this.timer += dt;
            if (this.timer >= this.teleportInterval) {
                this.timer = 0;
                if (Math.random() < 0.40) {
                    const target = this.mob.target;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 3 + Math.random() * 4;
                    const tx = target.position.x + Math.sin(angle) * dist;
                    const tz = target.position.z + Math.cos(angle) * dist;
                    if (typeof this.mob.teleportTo === 'function') {
                        this.mob.teleportTo(world, tx, target.position.y, tz);
                    }
                }
            }
        }
    }
}

/**
 * GhastFlyGoal: 3D hovering and air navigation for Ghasts (Nether aerial mob)
 */
export class GhastFlyGoal extends Goal {
    /**
     * @param {Mob} mob 
     * @param {number} [hoverAltitude=16.0] 
     * @param {number} [wanderRadius=24.0] 
     */
    constructor(mob, hoverAltitude = 16.0, wanderRadius = 24.0) {
        super(mob);
        this.hoverAltitude = hoverAltitude;
        this.wanderRadius = wanderRadius;
        this.courseChangeTimer = 0;
        this.targetWaypoint = null;
    }

    canStart() {
        return this.mob.isAlive();
    }

    tick(dt, world) {
        this.courseChangeTimer += dt;
        const pos = this.mob.position;

        if (this.courseChangeTimer > 4.0 || !this.targetWaypoint || this.mob.distanceToPos(this.targetWaypoint.x, this.targetWaypoint.y, this.targetWaypoint.z) < 2.5) {
            this.courseChangeTimer = 0;

            const angle = Math.random() * Math.PI * 2;
            const dist = 8 + Math.random() * this.wanderRadius;
            const tx = pos.x + Math.sin(angle) * dist;
            const tz = pos.z + Math.cos(angle) * dist;

            let groundY = 64;
            if (world && typeof world.getBlock === 'function') {
                for (let y = Math.min(128, Math.floor(pos.y + 10)); y >= 0; y--) {
                    const b = world.getBlock(Math.floor(tx), y, Math.floor(tz));
                    if (isBlockSolid(b)) {
                        groundY = y;
                        break;
                    }
                }
            }

            const targetY = Math.max(groundY + this.hoverAltitude, 30 + Math.random() * 20);
            this.targetWaypoint = { x: tx, y: targetY, z: tz };
        }

        if (this.targetWaypoint) {
            const dx = this.targetWaypoint.x - pos.x;
            const dy = this.targetWaypoint.y - pos.y;
            const dz = this.targetWaypoint.z - pos.z;
            const dist = Math.hypot(dx, dy, dz) || 1;

            const flySpeed = this.mob.movementSpeed || 0.15;
            const accel = 1.2 * dt;

            this.mob.velocity.x += (dx / dist) * flySpeed * 10 * accel;
            this.mob.velocity.y += (dy / dist) * flySpeed * 10 * accel;
            this.mob.velocity.z += (dz / dist) * flySpeed * 10 * accel;

            // Velocity damping in air
            this.mob.velocity.x *= 0.96;
            this.mob.velocity.y *= 0.96;
            this.mob.velocity.z *= 0.96;

            if (!this.mob.target) {
                this.mob.rotation.yaw = Math.atan2(dx, dz);
                this.mob.headYaw = this.mob.rotation.yaw;
            }
        }
    }
}

/**
 * GhastAttackGoal: Targets entities at long range, charges for 1s, and shoots explosive fireballs
 */
export class GhastAttackGoal extends Goal {
    /**
     * @param {Mob} mob 
     * @param {number} [attackRange=64.0] 
     */
    constructor(mob, attackRange = 64.0) {
        super(mob);
        this.attackRange = attackRange;
        this.shootCooldown = 0;
        this.chargeTimer = 0;
    }

    canStart() {
        return (
            this.mob.isAlive() &&
            this.mob.target &&
            this.mob.target.isAlive() &&
            this.mob.distanceTo(this.mob.target) <= this.attackRange
        );
    }

    tick(dt, world) {
        const target = this.mob.target;
        const dist = this.mob.distanceTo(target);

        // Turn towards target
        this.mob.lookAt(target.position.x, target.position.y + (target.eyeHeight || 1.62), target.position.z);

        if (this.shootCooldown > 0) {
            this.shootCooldown = Math.max(0, this.shootCooldown - dt);
            this.mob.isCharging = false;
            return;
        }

        const hasLOS = this._hasLineOfSight(
            world,
            this.mob.getEyePosition(),
            target.getEyePosition ? target.getEyePosition() : { x: target.position.x, y: target.position.y + (target.eyeHeight || 1.62), z: target.position.z }
        );

        if (!hasLOS) {
            this.mob.isCharging = false;
            this.chargeTimer = 0;
            return;
        }

        // Charge phase (1.0 second warning)
        this.mob.isCharging = true;
        this.chargeTimer += dt;

        if (this.chargeTimer >= (this.mob.chargeDuration || 1.0)) {
            if (typeof this.mob.shootFireball === 'function') {
                this.mob.shootFireball(target, world);
            }
            this.mob.isCharging = false;
            this.chargeTimer = 0;
            this.shootCooldown = this.mob.shootInterval || 3.0;
        }
    }

    _hasLineOfSight(world, from, to) {
        if (!world || typeof world.getBlock !== 'function') return true;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dz = to.z - from.z;
        const dist = Math.hypot(dx, dy, dz);
        const steps = Math.ceil(dist);
        if (steps === 0) return true;

        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const bx = Math.floor(from.x + dx * t);
            const by = Math.floor(from.y + dy * t);
            const bz = Math.floor(from.z + dz * t);
            const block = world.getBlock(bx, by, bz);
            if (isBlockSolid(block)) {
                return false;
            }
        }
        return true;
    }
}

/**
 * ZombiePigmanAngerGoal: Manages neutrality until provoked, then enrages and pursues target
 */
export class ZombiePigmanAngerGoal extends Goal {
    /**
     * @param {Mob} mob 
     */
    constructor(mob) {
        super(mob);
    }

    canStart() {
        return this.mob.isAlive() && this.mob.angerLevel > 0;
    }

    tick(dt, world) {
        this.mob.angerLevel = Math.max(0, this.mob.angerLevel - dt);

        if (this.mob.angerLevel <= 0) {
            // Calm down: return to neutral state
            this.mob.isHostile = false;
            this.mob.setTarget(null);
            this.mob.movementSpeed = 0.23;
            this.mob.state = 'IDLE';
            return;
        }

        // Enraged combat state
        this.mob.isHostile = true;
        this.mob.movementSpeed = 0.38;

        if (this.mob.angerTarget && this.mob.angerTarget.isAlive && this.mob.angerTarget.isAlive()) {
            this.mob.setTarget(this.mob.angerTarget);
        } else {
            this.mob.setTarget(null);
            this.mob.angerLevel = 0;
            this.mob.isHostile = false;
        }
    }
}

/**
 * NearestAttackableTargetGoal: Hostile mobs passively scan for targets within follow range
 */
export class NearestAttackableTargetGoal extends Goal {
    constructor(mob, targetType = 'player', searchInterval = 1.0) {
        super(mob);
        this.targetType = targetType;
        this.searchInterval = searchInterval;
        this.searchTimer = Math.random() * searchInterval;
    }

    canStart() {
        return this.mob.isAlive() && !this.mob.target && this.mob.isHostile;
    }

    tick(dt, world) {
        this.searchTimer += dt;
        if (this.searchTimer >= this.searchInterval) {
            this.searchTimer = 0;
            if (!world || !world.entities) return;

            let closest = null;
            let closestDist = this.mob.followRange || 16.0;

            for (const entity of world.entities) {
                if (entity.type === this.targetType && typeof entity.isAlive === 'function' && entity.isAlive()) {
                    const dist = this.mob.distanceTo(entity);
                    if (dist <= closestDist) {
                        closestDist = dist;
                        closest = entity;
                    }
                }
            }

            if (closest) {
                this.mob.setTarget(closest);
                this.mob.state = 'CHASE';
            }
        }
    }
}
