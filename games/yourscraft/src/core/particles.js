/**
 * Particle System for Minecraft 1.5 WebGL Engine
 * 
 * Features:
 * - High-performance GPU-accelerated rendering using THREE.InstancedMesh
 * - Zero-allocation physics & life cycle simulation loop using flat TypedArrays
 * - emitBlockDebris: spawns authentic tumbling voxel cubes with gravity, drag, and fade-out
 * - emitExplosion: multi-layered explosions (blast core, volumetric expanding smoke, embers/sparks, debris)
 * - Extensive helper emitters: emitSmoke, emitFlame, emitSparks, emitCrit, emitSplash, emitRedstone, emitHeart
 * - Authentic block color palettes with procedural tint variation for all Minecraft blocks
 * - Optional voxel terrain collision & ground bounce physics
 */

import * as THREE from "three";
import { BLOCKS } from "./chunk.js";

// ==========================================
// 1. AUTHENTIC BLOCK COLOR PALETTES
// ==========================================

export const BLOCK_COLOR_PALETTES = Object.freeze({
    [BLOCKS.STONE]: [0x828282, 0x6e6e6e, 0x969696, 0x5b5b5b],
    [BLOCKS.GRASS]: [0x5d9b30, 0x4f8728, 0x866043, 0x6d4e36, 0x6bb83a],
    [BLOCKS.DIRT]: [0x866043, 0x735137, 0x5d412b, 0x966d4e],
    [BLOCKS.COBBLESTONE]: [0x686868, 0x545454, 0x7a7a7a, 0x404040, 0x858585],
    [BLOCKS.OAK_PLANKS]: [0xbc9862, 0xa68350, 0xd0ab75, 0x8e6e3e],
    [BLOCKS.OAK_SAPLING]: [0x468224, 0x36681a, 0x5ca830, 0x6d4e36],
    [BLOCKS.BEDROCK]: [0x363636, 0x222222, 0x484848, 0x181818],
    [BLOCKS.WATER_FLOWING]: [0x306cd4, 0x2052ab, 0x4785eb, 0x1b4594],
    [BLOCKS.WATER]: [0x306cd4, 0x2052ab, 0x4785eb, 0x1b4594],
    [BLOCKS.LAVA_FLOWING]: [0xd8450e, 0xfa6e12, 0xffa41c, 0xb83208],
    [BLOCKS.LAVA]: [0xd8450e, 0xfa6e12, 0xffa41c, 0xb83208],
    [BLOCKS.SAND]: [0xdcd29d, 0xcabf87, 0xebe1b2, 0xb8ad75],
    [BLOCKS.GRAVEL]: [0x858080, 0x716b6b, 0x9a9595, 0x5e5858],
    [BLOCKS.GOLD_ORE]: [0x828282, 0xffdc33, 0xe5be20, 0x6e6e6e],
    [BLOCKS.IRON_ORE]: [0x828282, 0xd8b59e, 0xbf987e, 0x6e6e6e],
    [BLOCKS.COAL_ORE]: [0x828282, 0x303030, 0x1f1f1f, 0x454545],
    [BLOCKS.OAK_LOG]: [0x674f32, 0x4d3920, 0x8f7652, 0x362714],
    [BLOCKS.OAK_LEAVES]: [0x367e23, 0x286318, 0x4a9d32, 0x1d4d10],
    [BLOCKS.SPONGE]: [0xc8c44c, 0xaead3a, 0xdcd75d, 0x93922a],
    [BLOCKS.GLASS]: [0xd6f4fa, 0xbfe9f2, 0xeafbff, 0x9fd2de],
    [BLOCKS.LAPIS_ORE]: [0x828282, 0x2159be, 0x143c8d, 0x6e6e6e],
    [BLOCKS.LAPIS_BLOCK]: [0x1c4fa8, 0x133d8a, 0x2964cc, 0x0f2d6a],
    [BLOCKS.SANDSTONE]: [0xdad19c, 0xc4bb84, 0xeee6b2, 0xaba16b],
    [BLOCKS.BED]: [0xb82626, 0x961a1a, 0xdedede, 0xbc9862],
    [BLOCKS.TALL_GRASS]: [0x5d9b30, 0x4a8224, 0x6db539],
    [BLOCKS.DEAD_BUSH]: [0x7f613c, 0x664d2d, 0x96744c],
    [BLOCKS.WOOL]: [0xdedede, 0xc8c8c8, 0xefefef, 0xb2b2b2],
    [BLOCKS.DANDELION]: [0xffec33, 0xdeb812, 0x4a8224],
    [BLOCKS.POPPY]: [0xdf2424, 0xb81515, 0x4a8224],
    [BLOCKS.BROWN_MUSHROOM]: [0x9a7b56, 0x7d6140, 0xb5946d],
    [BLOCKS.RED_MUSHROOM]: [0xd82b2b, 0xb21c1c, 0xececec],
    [BLOCKS.GOLD_BLOCK]: [0xfdee43, 0xe5cf2f, 0xfff66e, 0xcaa918],
    [BLOCKS.IRON_BLOCK]: [0xd8d8d8, 0xc2c2c2, 0xeeeeee, 0xaaaaaa],
    [BLOCKS.DOUBLE_STONE_SLAB]: [0x828282, 0x6e6e6e, 0x969696],
    [BLOCKS.STONE_SLAB]: [0x828282, 0x6e6e6e, 0x969696],
    [BLOCKS.BRICKS]: [0x9c4838, 0xb55745, 0x7f3527, 0xc8c0b8],
    [BLOCKS.TNT]: [0xdb3624, 0xbd2615, 0xffffff, 0x333333],
    [BLOCKS.BOOKSHELF]: [0xbc9862, 0x8a3c28, 0x245585, 0x287d3a],
    [BLOCKS.MOSSY_COBBLESTONE]: [0x686868, 0x4f783c, 0x545454, 0x608e49],
    [BLOCKS.OBSIDIAN]: [0x181427, 0x0f0c1c, 0x241d3a, 0x2e1e4a],
    [BLOCKS.TORCH]: [0xbc9862, 0xffd23b, 0xff8818, 0x333333],
    [BLOCKS.FIRE]: [0xffd700, 0xff6600, 0xee2200, 0xfff077],
    [BLOCKS.DIAMOND_ORE]: [0x828282, 0x5decf5, 0x38cbd5, 0x6e6e6e],
    [BLOCKS.DIAMOND_BLOCK]: [0x5decf5, 0x3fe1eb, 0x8ff5fc, 0x22b2bc],
    [BLOCKS.CRAFTING_TABLE]: [0xbc9862, 0x7a502c, 0x484848, 0x9a7144],
    [BLOCKS.WHEAT]: [0xdec24e, 0xc4a938, 0x4a8224, 0xe8d26f],
    [BLOCKS.FARMLAND]: [0x593d26, 0x452d1a, 0x6d4d32],
    [BLOCKS.FURNACE]: [0x686868, 0x505050, 0x383838, 0xff8818],
    [BLOCKS.LADDER]: [0xbc9862, 0x967444, 0xcaa973],
    [BLOCKS.REDSTONE_ORE]: [0x828282, 0xee1e1e, 0xa80e0e, 0x6e6e6e],
    [BLOCKS.SNOW_LAYER]: [0xf5f8fa, 0xe2ebf2, 0xffffff, 0xcfdce8],
    [BLOCKS.ICE]: [0xa3cbf4, 0x81b5ea, 0xcbe2fb, 0x639fd8],
    [BLOCKS.SNOW_BLOCK]: [0xf5f8fa, 0xe2ebf2, 0xffffff, 0xcfdce8],
    [BLOCKS.CACTUS]: [0x4c832a, 0x3a691e, 0x5da135, 0x2b4f14],
    [BLOCKS.CLAY]: [0x9ea8b5, 0x8a94a2, 0xb2bcc9, 0x76808e],
    [BLOCKS.SUGAR_CANE]: [0x6ca337, 0x568727, 0x82bd48],
    [BLOCKS.FENCE]: [0xbc9862, 0xa68350, 0x8e6e3e],
    [BLOCKS.PUMPKIN]: [0xd87b1c, 0xbc640f, 0xed8d2e, 0x5d7f2a],
    [BLOCKS.NETHERRACK]: [0x752828, 0x5d1d1d, 0x8d3535, 0x471212],
    [BLOCKS.SOUL_SAND]: [0x5c483d, 0x47352b, 0x725b4e, 0x36261d],
    [BLOCKS.GLOWSTONE]: [0xedd47b, 0xd8ba5a, 0xffe99b, 0xba9b3c],
    [BLOCKS.REDSTONE_BLOCK]: [0xee1818, 0xbe0d0d, 0xff3b3b, 0x8e0606]
});

const DEFAULT_BLOCK_PALETTE = [0x828282, 0x6e6e6e, 0x969696];

/**
 * Scale animation curve types.
 */
export const SCALE_CURVE = Object.freeze({
    DEBRIS_SHRINK: 0, // Stays normal size for 65% of life, then shrinks smoothly to 0
    LINEAR_SHRINK: 1, // Linear lerp from scaleStart to scaleEnd
    SMOKE_EXPAND: 2,  // Expands rapidly on spawn, then shrinks to 0
    EXPONENTIAL: 3,   // Quick initial fade/shrink
    CONSTANT: 4       // Keeps initial scale throughout lifetime
});

// ==========================================
// 2. PARTICLE SYSTEM CLASS
// ==========================================

export class ParticleSystem {
    /**
     * @param {THREE.Scene} [scene=null] - Optional Three.js scene to attach the mesh to
     * @param {Object} [options={}] - Configuration options
     * @param {number} [options.maxParticles=4096] - Maximum number of concurrent particles
     * @param {THREE.BufferGeometry} [options.geometry=null] - Custom particle geometry (default: 1x1x1 box)
     * @param {THREE.Material} [options.material=null] - Custom material for instanced mesh
     * @param {Object} [options.world=null] - Reference to World instance for voxel collision
     * @param {number} [options.defaultGravity=18.0] - Default gravity acceleration (m/s^2)
     * @param {number} [options.defaultDrag=0.98] - Default air resistance coefficient
     */
    constructor(scene = null, options = {}) {
        this.maxParticles = options.maxParticles || 4096;
        this.world = options.world || null;
        this.defaultGravity = options.defaultGravity !== undefined ? options.defaultGravity : 18.0;
        this.defaultDrag = options.defaultDrag !== undefined ? options.defaultDrag : 0.98;

        // Geometry: Unit Cube (1x1x1 centered)
        this.geometry = options.geometry || new THREE.BoxGeometry(1, 1, 1);

        // Material: MeshLambertMaterial with standard diffuse lighting and instance colors
        this.material = options.material || new THREE.MeshLambertMaterial({
            vertexColors: false,
            side: THREE.FrontSide,
            roughness: 0.85
        });

        // InstancedMesh setup
        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.maxParticles);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        
        // Initialize instance colors buffer
        this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.maxParticles * 3), 3);
        this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        
        this.mesh.count = 0;
        this.mesh.frustumCulled = false; // Prevent culling when particles spread wide

        // High-performance Struct-of-Arrays (Flat TypedArrays)
        this.posX = new Float32Array(this.maxParticles);
        this.posY = new Float32Array(this.maxParticles);
        this.posZ = new Float32Array(this.maxParticles);

        this.velX = new Float32Array(this.maxParticles);
        this.velY = new Float32Array(this.maxParticles);
        this.velZ = new Float32Array(this.maxParticles);

        this.rotX = new Float32Array(this.maxParticles);
        this.rotY = new Float32Array(this.maxParticles);
        this.rotZ = new Float32Array(this.maxParticles);

        this.rotVelX = new Float32Array(this.maxParticles);
        this.rotVelY = new Float32Array(this.maxParticles);
        this.rotVelZ = new Float32Array(this.maxParticles);

        this.scaleStart = new Float32Array(this.maxParticles);
        this.scaleEnd = new Float32Array(this.maxParticles);
        this.scaleCurve = new Uint8Array(this.maxParticles);

        this.age = new Float32Array(this.maxParticles);
        this.lifetime = new Float32Array(this.maxParticles);

        this.gravity = new Float32Array(this.maxParticles);
        this.drag = new Float32Array(this.maxParticles);
        this.bounce = new Float32Array(this.maxParticles);
        this.collide = new Uint8Array(this.maxParticles);

        this.colorR = new Float32Array(this.maxParticles);
        this.colorG = new Float32Array(this.maxParticles);
        this.colorB = new Float32Array(this.maxParticles);

        this.endColorR = new Float32Array(this.maxParticles);
        this.endColorG = new Float32Array(this.maxParticles);
        this.endColorB = new Float32Array(this.maxParticles);

        this.aliveCount = 0;

        // Reusable scratch objects to eliminate GC allocations in update loop
        this._tempMatrix = new THREE.Matrix4();
        this._tempPos = new THREE.Vector3();
        this._tempEuler = new THREE.Euler();
        this._tempQuat = new THREE.Quaternion();
        this._tempScale = new THREE.Vector3();
        this._tempColor = new THREE.Color();

        // Attach to scene if provided
        if (scene) {
            this.addToScene(scene);
        }
    }

    /**
     * Attach the particle mesh to a Three.js scene.
     * @param {THREE.Scene} scene 
     */
    addToScene(scene) {
        if (scene && !scene.children.includes(this.mesh)) {
            scene.add(this.mesh);
            this.scene = scene;
        }
    }

    /**
     * Remove the particle mesh from a Three.js scene.
     * @param {THREE.Scene} [scene] 
     */
    removeFromScene(scene = null) {
        const targetScene = scene || this.scene;
        if (targetScene && targetScene.children.includes(this.mesh)) {
            targetScene.remove(this.mesh);
        }
    }

    /**
     * Set world reference for terrain collision checks.
     * @param {Object} world 
     */
    setWorld(world) {
        this.world = world;
    }

    /**
     * Pick a representative color for a block ID.
     * @param {number} blockId 
     * @param {number} [jitter=0.08] - Random brightness variation (0 to 1)
     * @returns {THREE.Color}
     */
    getBlockColor(blockId, jitter = 0.08) {
        const palette = BLOCK_COLOR_PALETTES[blockId] || DEFAULT_BLOCK_PALETTE;
        const hex = palette[Math.floor(Math.random() * palette.length)];
        
        this._tempColor.setHex(hex);
        if (jitter > 0) {
            const factor = 1.0 + (Math.random() * 2 - 1) * jitter;
            this._tempColor.r = Math.min(1.0, Math.max(0.0, this._tempColor.r * factor));
            this._tempColor.g = Math.min(1.0, Math.max(0.0, this._tempColor.g * factor));
            this._tempColor.b = Math.min(1.0, Math.max(0.0, this._tempColor.b * factor));
        }
        return this._tempColor;
    }

    /**
     * Low-level emitter to spawn a single particle with full control over attributes.
     * @param {Object} params 
     * @returns {number} Index of the spawned particle or -1 if buffer full
     */
    emitParticle(params = {}) {
        if (this.aliveCount >= this.maxParticles) {
            return -1;
        }

        const i = this.aliveCount;

        // Position
        this.posX[i] = params.x || 0;
        this.posY[i] = params.y || 0;
        this.posZ[i] = params.z || 0;

        // Velocity
        this.velX[i] = params.vx || 0;
        this.velY[i] = params.vy || 0;
        this.velZ[i] = params.vz || 0;

        // Rotation & Angular Velocity
        this.rotX[i] = params.rx !== undefined ? params.rx : Math.random() * Math.PI * 2;
        this.rotY[i] = params.ry !== undefined ? params.ry : Math.random() * Math.PI * 2;
        this.rotZ[i] = params.rz !== undefined ? params.rz : Math.random() * Math.PI * 2;

        this.rotVelX[i] = params.rvx !== undefined ? params.rvx : (Math.random() - 0.5) * 8.0;
        this.rotVelY[i] = params.rvy !== undefined ? params.rvy : (Math.random() - 0.5) * 8.0;
        this.rotVelZ[i] = params.rvz !== undefined ? params.rvz : (Math.random() - 0.5) * 8.0;

        // Scale & Curve
        const scale = params.scale !== undefined ? params.scale : 0.12;
        this.scaleStart[i] = scale;
        this.scaleEnd[i] = params.scaleEnd !== undefined ? params.scaleEnd : 0.0;
        this.scaleCurve[i] = params.scaleCurve !== undefined ? params.scaleCurve : SCALE_CURVE.DEBRIS_SHRINK;

        // Life & Physics
        this.age[i] = 0;
        this.lifetime[i] = Math.max(0.01, params.lifetime !== undefined ? params.lifetime : 1.0);
        this.gravity[i] = params.gravity !== undefined ? params.gravity : this.defaultGravity;
        this.drag[i] = params.drag !== undefined ? params.drag : this.defaultDrag;
        this.bounce[i] = params.bounce !== undefined ? params.bounce : 0.25;
        this.collide[i] = params.collide !== undefined ? (params.collide ? 1 : 0) : 1;

        // Color & End Color (for fading / transitioning)
        let color = params.color;
        if (typeof color === "number") {
            this._tempColor.setHex(color);
            color = this._tempColor;
        } else if (!color) {
            color = this._tempColor.setRGB(1, 1, 1);
        }

        this.colorR[i] = color.r;
        this.colorG[i] = color.g;
        this.colorB[i] = color.b;

        let endColor = params.endColor;
        if (typeof endColor === "number") {
            this._tempColor.setHex(endColor);
            endColor = this._tempColor;
        } else if (!endColor) {
            endColor = color;
        }

        this.endColorR[i] = endColor.r;
        this.endColorG[i] = endColor.g;
        this.endColorB[i] = endColor.b;

        this.aliveCount++;
        return i;
    }

    // ==========================================
    // 3. MAIN EMITTERS
    // ==========================================

    /**
     * Spawns colored voxel debris cubes when a block is broken or damaged.
     * 
     * @param {number} x - Block world X coordinate (or center X)
     * @param {number} y - Block world Y coordinate (or center Y)
     * @param {number} z - Block world Z coordinate (or center Z)
     * @param {number} [blockId=BLOCKS.STONE] - Block ID to extract colors from
     * @param {number} [count=24] - Number of debris cubes to spawn
     * @param {Object} [options={}] - Custom options for speed, spread, scale, lifetime
     */
    emitBlockDebris(x, y, z, blockId = BLOCKS.STONE, count = 24, options = {}) {
        if (blockId === BLOCKS.AIR) return;

        // Calculate block bounds (support both integer block coords or float center point)
        const isBlockOrigin = Math.floor(x) === x && Math.floor(y) === y && Math.floor(z) === z;
        const centerX = isBlockOrigin ? x + 0.5 : x;
        const centerY = isBlockOrigin ? y + 0.5 : y;
        const centerZ = isBlockOrigin ? z + 0.5 : z;

        const baseScale = options.scale !== undefined ? options.scale : 0.11;
        const speed = options.speed !== undefined ? options.speed : 2.6;
        const upwardPop = options.upwardVelocity !== undefined ? options.upwardVelocity : 2.2;
        const gravity = options.gravity !== undefined ? options.gravity : this.defaultGravity;
        const lifetimeBase = options.lifetime !== undefined ? options.lifetime : 0.85;
        const spread = options.spread !== undefined ? options.spread : 0.4;
        const collide = options.collide !== undefined ? options.collide : true;

        for (let i = 0; i < count; i++) {
            if (this.aliveCount >= this.maxParticles) break;

            // Spread within the 1x1x1 voxel bounds
            const px = centerX + (Math.random() - 0.5) * spread * 2;
            const py = centerY + (Math.random() - 0.5) * spread * 2;
            const pz = centerZ + (Math.random() - 0.5) * spread * 2;

            // Outward velocity with upward kick
            const angle = Math.random() * Math.PI * 2;
            const horizontalSpeed = (0.3 + Math.random() * 0.7) * speed;
            const vx = Math.cos(angle) * horizontalSpeed;
            const vy = upwardPop * (0.6 + Math.random() * 0.8);
            const vz = Math.sin(angle) * horizontalSpeed;

            // Random scale variance
            const pScale = baseScale * (0.75 + Math.random() * 0.5);

            // Lifetime with variance
            const pLifetime = lifetimeBase * (0.75 + Math.random() * 0.5);

            // Color selection from authentic palette
            const color = options.color || this.getBlockColor(blockId, 0.1);

            this.emitParticle({
                x: px,
                y: py,
                z: pz,
                vx: vx,
                vy: vy,
                vz: vz,
                scale: pScale,
                scaleCurve: SCALE_CURVE.DEBRIS_SHRINK,
                lifetime: pLifetime,
                gravity: gravity,
                drag: 0.98,
                bounce: 0.3,
                collide: collide,
                color: color,
                rx: Math.random() * Math.PI * 2,
                ry: Math.random() * Math.PI * 2,
                rz: Math.random() * Math.PI * 2,
                rvx: (Math.random() - 0.5) * 12.0,
                rvy: (Math.random() - 0.5) * 12.0,
                rvz: (Math.random() - 0.5) * 12.0
            });
        }
    }

    /**
     * Spawns an authentic multi-layered Minecraft explosion:
     * 1. Fiery high-speed blast core particles (white -> yellow -> orange -> red)
     * 2. Volumetric rising & expanding smoke puffs (charcoal -> gray -> ash)
     * 3. High-velocity flying spark embers
     * 4. Ejected terrain debris chunks
     * 
     * @param {number} x - Center X of explosion
     * @param {number} y - Center Y of explosion
     * @param {number} z - Center Z of explosion
     * @param {Object} [options={}] - Custom explosion parameters
     * @param {number} [options.power=3.0] - Explosion power / radius
     * @param {number} [options.fireCount=80] - Number of blast flame particles
     * @param {number} [options.smokeCount=60] - Number of smoke cloud particles
     * @param {number} [options.sparkCount=40] - Number of flying ember sparks
     * @param {number} [options.debrisCount=30] - Number of rock/dirt debris chunks
     * @param {number} [options.debrisBlockId=BLOCKS.DIRT] - Block ID for debris chunks
     */
    emitExplosion(x, y, z, options = {}) {
        const power = options.power !== undefined ? options.power : 3.0;
        const powerRatio = power / 3.0;

        const fireCount = Math.round(options.fireCount !== undefined ? options.fireCount : 75 * powerRatio);
        const smokeCount = Math.round(options.smokeCount !== undefined ? options.smokeCount : 55 * powerRatio);
        const sparkCount = Math.round(options.sparkCount !== undefined ? options.sparkCount : 35 * powerRatio);
        const debrisCount = Math.round(options.debrisCount !== undefined ? options.debrisCount : 25 * powerRatio);
        const debrisBlockId = options.debrisBlockId !== undefined ? options.debrisBlockId : BLOCKS.DIRT;

        // 1. Blast Core & Fireballs (Spherical high-speed burst, quickly decelerating)
        const fireColors = [0xffffff, 0xffe044, 0xff8811, 0xee2200];
        for (let i = 0; i < fireCount; i++) {
            if (this.aliveCount >= this.maxParticles) break;

            // Random spherical direction
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const speed = (3.5 + Math.random() * 7.5) * Math.sqrt(powerRatio);

            const vx = Math.sin(phi) * Math.cos(theta) * speed;
            const vy = Math.cos(phi) * speed + 0.8;
            const vz = Math.sin(phi) * Math.sin(theta) * speed;

            const colorHex = fireColors[Math.floor(Math.random() * fireColors.length)];
            const endColorHex = Math.random() > 0.4 ? 0x222222 : 0xcc2200; // Turns into smoke/ember

            this.emitParticle({
                x: x + (Math.random() - 0.5) * 0.4,
                y: y + (Math.random() - 0.5) * 0.4,
                z: z + (Math.random() - 0.5) * 0.4,
                vx: vx,
                vy: vy,
                vz: vz,
                scale: (0.18 + Math.random() * 0.22) * Math.sqrt(powerRatio),
                scaleCurve: SCALE_CURVE.EXPONENTIAL,
                lifetime: 0.3 + Math.random() * 0.4,
                gravity: 4.0,
                drag: 0.86, // Decelerates rapidly
                bounce: 0.0,
                collide: false,
                color: colorHex,
                endColor: endColorHex
            });
        }

        // 2. Volumetric Smoke Clouds (Thermal buoyancy, expanding puffs)
        const smokeColors = [0x333333, 0x555555, 0x777777, 0x999999, 0xbbbbbb];
        for (let i = 0; i < smokeCount; i++) {
            if (this.aliveCount >= this.maxParticles) break;

            const angle = Math.random() * Math.PI * 2;
            const horizontalSpeed = (0.8 + Math.random() * 3.2) * Math.sqrt(powerRatio);
            const vx = Math.cos(angle) * horizontalSpeed;
            const vy = (1.2 + Math.random() * 2.8) * Math.sqrt(powerRatio);
            const vz = Math.sin(angle) * horizontalSpeed;

            const colorHex = smokeColors[Math.floor(Math.random() * smokeColors.length)];

            this.emitParticle({
                x: x + (Math.random() - 0.5) * 0.8,
                y: y + (Math.random() - 0.5) * 0.8,
                z: z + (Math.random() - 0.5) * 0.8,
                vx: vx,
                vy: vy,
                vz: vz,
                scale: (0.16 + Math.random() * 0.25) * Math.sqrt(powerRatio),
                scaleCurve: SCALE_CURVE.SMOKE_EXPAND,
                lifetime: 0.9 + Math.random() * 1.1,
                gravity: -1.5, // Negative gravity: rising thermal lift
                drag: 0.94,
                bounce: 0.0,
                collide: false,
                color: colorHex,
                endColor: 0x222222
            });
        }

        // 3. High-Velocity Sparks / Burning Embers (Arcing trajectories)
        for (let i = 0; i < sparkCount; i++) {
            if (this.aliveCount >= this.maxParticles) break;

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 0.8); // Mostly upper hemisphere
            const speed = (6.0 + Math.random() * 9.0) * Math.sqrt(powerRatio);

            const vx = Math.sin(phi) * Math.cos(theta) * speed;
            const vy = Math.cos(phi) * speed + 1.5;
            const vz = Math.sin(phi) * Math.sin(theta) * speed;

            this.emitParticle({
                x: x,
                y: y + 0.2,
                z: z,
                vx: vx,
                vy: vy,
                vz: vz,
                scale: 0.06 + Math.random() * 0.04,
                scaleCurve: SCALE_CURVE.EXPONENTIAL,
                lifetime: 0.5 + Math.random() * 0.7,
                gravity: 22.0,
                drag: 0.97,
                bounce: 0.4,
                collide: true,
                color: 0xffe544,
                endColor: 0xaa1100
            });
        }

        // 4. Ground Debris Chunks (Dirt & Cobblestone flying outward)
        if (debrisCount > 0) {
            this.emitBlockDebris(x, y, z, debrisBlockId, debrisCount, {
                speed: 4.5 * Math.sqrt(powerRatio),
                upwardVelocity: 4.0 * Math.sqrt(powerRatio),
                spread: 0.6,
                scale: 0.12,
                lifetime: 1.2
            });
        }
    }

    // ==========================================
    // 4. EXTENSIVE GAMEPLAY EMITTERS
    // ==========================================

    /**
     * Spawns rising smoke puffs (for torches, furnaces, campfires, TNT fuse).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} [count=6] 
     * @param {Object} [options={}] 
     */
    emitSmoke(x, y, z, count = 6, options = {}) {
        const scale = options.scale !== undefined ? options.scale : 0.12;
        const lifetime = options.lifetime !== undefined ? options.lifetime : 1.0;
        const color = options.color !== undefined ? options.color : 0x555555;

        for (let i = 0; i < count; i++) {
            if (this.aliveCount >= this.maxParticles) break;

            this.emitParticle({
                x: x + (Math.random() - 0.5) * 0.15,
                y: y + (Math.random() - 0.5) * 0.15,
                z: z + (Math.random() - 0.5) * 0.15,
                vx: (Math.random() - 0.5) * 0.3,
                vy: 0.8 + Math.random() * 0.7,
                vz: (Math.random() - 0.5) * 0.3,
                scale: scale,
                scaleCurve: SCALE_CURVE.SMOKE_EXPAND,
                lifetime: lifetime * (0.8 + Math.random() * 0.4),
                gravity: -0.5,
                drag: 0.96,
                collide: false,
                color: color,
                endColor: 0x222222
            });
        }
    }

    /**
     * Spawns flame particles (for torches, fire, furnace active state).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} [count=6] 
     * @param {Object} [options={}] 
     */
    emitFlame(x, y, z, count = 6, options = {}) {
        const scale = options.scale !== undefined ? options.scale : 0.09;
        const flameColors = [0xffd700, 0xff7700, 0xff3300, 0xfff088];

        for (let i = 0; i < count; i++) {
            if (this.aliveCount >= this.maxParticles) break;

            const colorHex = flameColors[Math.floor(Math.random() * flameColors.length)];

            this.emitParticle({
                x: x + (Math.random() - 0.5) * 0.12,
                y: y + (Math.random() - 0.5) * 0.12,
                z: z + (Math.random() - 0.5) * 0.12,
                vx: (Math.random() - 0.5) * 0.2,
                vy: 0.6 + Math.random() * 0.6,
                vz: (Math.random() - 0.5) * 0.2,
                scale: scale * (0.8 + Math.random() * 0.4),
                scaleCurve: SCALE_CURVE.LINEAR_SHRINK,
                lifetime: 0.4 + Math.random() * 0.3,
                gravity: -1.0,
                drag: 0.95,
                collide: false,
                color: colorHex,
                endColor: 0xff1100
            });
        }
    }

    /**
     * Spawns high-velocity sparks / embers (for metal clashes, anvil, flint & steel).
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} [count=16] 
     * @param {Object} [options={}] 
     */
    emitSparks(x, y, z, count = 16, options = {}) {
        const speed = options.speed !== undefined ? options.speed : 5.0;
        const gravity = options.gravity !== undefined ? options.gravity : 20.0;
        const lifetime = options.lifetime !== undefined ? options.lifetime : 0.6;
        const scale = options.scale !== undefined ? options.scale : 0.06;

        for (let i = 0; i < count; i++) {
            if (this.aliveCount >= this.maxParticles) break;

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 0.9);
            const pSpeed = speed * (0.5 + Math.random() * 0.8);

            const vx = Math.sin(phi) * Math.cos(theta) * pSpeed;
            const vy = Math.cos(phi) * pSpeed + 1.0;
            const vz = Math.sin(phi) * Math.sin(theta) * pSpeed;

            this.emitParticle({
                x: x,
                y: y,
                z: z,
                vx: vx,
                vy: vy,
                vz: vz,
                scale: scale,
                scaleCurve: SCALE_CURVE.EXPONENTIAL,
                lifetime: lifetime * (0.6 + Math.random() * 0.6),
                gravity: gravity,
                drag: 0.96,
                bounce: 0.4,
                collide: true,
                color: 0xffea44,
                endColor: 0xaa2200
            });
        }
    }

    /**
     * Spawns Minecraft critical hit spark particles.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} [count=16] 
     * @param {Object} [options={}] 
     */
    emitCrit(x, y, z, count = 16, options = {}) {
        for (let i = 0; i < count; i++) {
            if (this.aliveCount >= this.maxParticles) break;

            const angle = Math.random() * Math.PI * 2;
            const horizSpeed = 1.0 + Math.random() * 2.0;

            this.emitParticle({
                x: x,
                y: y,
                z: z,
                vx: Math.cos(angle) * horizSpeed,
                vy: 1.0 + Math.random() * 1.5,
                vz: Math.sin(angle) * horizSpeed,
                scale: 0.08,
                scaleCurve: SCALE_CURVE.LINEAR_SHRINK,
                lifetime: 0.4 + Math.random() * 0.3,
                gravity: 12.0,
                drag: 0.92,
                collide: true,
                color: 0xffee44,
                endColor: 0x995500
            });
        }
    }

    /**
     * Spawns water splash droplets.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} [count=12] 
     * @param {Object} [options={}] 
     */
    emitSplash(x, y, z, count = 12, options = {}) {
        for (let i = 0; i < count; i++) {
            if (this.aliveCount >= this.maxParticles) break;

            const angle = Math.random() * Math.PI * 2;
            const horizSpeed = 0.8 + Math.random() * 1.8;

            this.emitParticle({
                x: x + (Math.random() - 0.5) * 0.4,
                y: y,
                z: z + (Math.random() - 0.5) * 0.4,
                vx: Math.cos(angle) * horizSpeed,
                vy: 2.0 + Math.random() * 2.0,
                vz: Math.sin(angle) * horizSpeed,
                scale: 0.07,
                scaleCurve: SCALE_CURVE.DEBRIS_SHRINK,
                lifetime: 0.5 + Math.random() * 0.4,
                gravity: 16.0,
                drag: 0.98,
                bounce: 0.1,
                collide: true,
                color: 0x3b77e8,
                endColor: 0x76a7fa
            });
        }
    }

    /**
     * Spawns redstone dust sparkle particles.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} [count=8] 
     * @param {Object} [options={}] 
     */
    emitRedstone(x, y, z, count = 8, options = {}) {
        for (let i = 0; i < count; i++) {
            if (this.aliveCount >= this.maxParticles) break;

            this.emitParticle({
                x: x + (Math.random() - 0.5) * 0.4,
                y: y + (Math.random() - 0.5) * 0.4,
                z: z + (Math.random() - 0.5) * 0.4,
                vx: (Math.random() - 0.5) * 0.4,
                vy: 0.2 + Math.random() * 0.5,
                vz: (Math.random() - 0.5) * 0.4,
                scale: 0.06 + Math.random() * 0.03,
                scaleCurve: SCALE_CURVE.LINEAR_SHRINK,
                lifetime: 0.6 + Math.random() * 0.4,
                gravity: -0.2,
                drag: 0.94,
                collide: false,
                color: 0xff1a1a,
                endColor: 0x770000
            });
        }
    }

    /**
     * Spawns love/breeding hearts.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} [count=4] 
     * @param {Object} [options={}] 
     */
    emitHeart(x, y, z, count = 4, options = {}) {
        for (let i = 0; i < count; i++) {
            if (this.aliveCount >= this.maxParticles) break;

            this.emitParticle({
                x: x + (Math.random() - 0.5) * 0.5,
                y: y + (Math.random() - 0.5) * 0.3,
                z: z + (Math.random() - 0.5) * 0.5,
                vx: (Math.random() - 0.5) * 0.3,
                vy: 0.7 + Math.random() * 0.5,
                vz: (Math.random() - 0.5) * 0.3,
                scale: 0.12,
                scaleCurve: SCALE_CURVE.LINEAR_SHRINK,
                lifetime: 1.0 + Math.random() * 0.5,
                gravity: -0.3,
                drag: 0.96,
                collide: false,
                color: 0xff3366,
                endColor: 0xff0033
            });
        }
    }

    // ==========================================
    // 5. SIMULATION & RENDERING LOOP
    // ==========================================

    /**
     * Updates physics, lifetimes, scale curves, color lerping, and instanced mesh matrices.
     * Must be called inside the main animation loop.
     * 
     * @param {number} delta - Frame delta time in seconds
     * @param {Object} [worldOverride=null] - Optional world override for collision
     */
    update(delta, worldOverride = null) {
        if (this.aliveCount === 0) {
            if (this.mesh.count !== 0) {
                this.mesh.count = 0;
                this.mesh.instanceMatrix.needsUpdate = true;
            }
            return;
        }

        const dt = Math.min(delta, 0.1); // Cap delta to prevent physics blowout on lag
        const activeWorld = worldOverride || this.world;

        let i = 0;
        while (i < this.aliveCount) {
            this.age[i] += dt;
            const life = this.lifetime[i];

            // Check if particle has died
            if (this.age[i] >= life) {
                // Fast O(1) swap-and-pop removal with the last alive particle
                const last = this.aliveCount - 1;
                if (i < last) {
                    this.posX[i] = this.posX[last];
                    this.posY[i] = this.posY[last];
                    this.posZ[i] = this.posZ[last];
                    this.velX[i] = this.velX[last];
                    this.velY[i] = this.velY[last];
                    this.velZ[i] = this.velZ[last];
                    this.rotX[i] = this.rotX[last];
                    this.rotY[i] = this.rotY[last];
                    this.rotZ[i] = this.rotZ[last];
                    this.rotVelX[i] = this.rotVelX[last];
                    this.rotVelY[i] = this.rotVelY[last];
                    this.rotVelZ[i] = this.rotVelZ[last];
                    this.scaleStart[i] = this.scaleStart[last];
                    this.scaleEnd[i] = this.scaleEnd[last];
                    this.scaleCurve[i] = this.scaleCurve[last];
                    this.age[i] = this.age[last];
                    this.lifetime[i] = this.lifetime[last];
                    this.gravity[i] = this.gravity[last];
                    this.drag[i] = this.drag[last];
                    this.bounce[i] = this.bounce[last];
                    this.collide[i] = this.collide[last];
                    this.colorR[i] = this.colorR[last];
                    this.colorG[i] = this.colorG[last];
                    this.colorB[i] = this.colorB[last];
                    this.endColorR[i] = this.endColorR[last];
                    this.endColorG[i] = this.endColorG[last];
                    this.endColorB[i] = this.endColorB[last];
                }
                this.aliveCount--;
                continue; // Re-evaluate index i which now holds the swapped particle
            }

            // 1. Physics integration
            const grav = this.gravity[i];
            const pDrag = this.drag[i];
            const dragCoeff = Math.pow(pDrag, dt * 60);

            // Apply gravity
            this.velY[i] -= grav * dt;

            // Apply air resistance
            this.velX[i] *= dragCoeff;
            this.velY[i] *= dragCoeff;
            this.velZ[i] *= dragCoeff;

            // Apply position translation
            let nextX = this.posX[i] + this.velX[i] * dt;
            let nextY = this.posY[i] + this.velY[i] * dt;
            let nextZ = this.posZ[i] + this.velZ[i] * dt;

            // Optional terrain collision & floor bounce
            if (this.collide[i] === 1 && activeWorld && activeWorld.getBlock) {
                const blockY = Math.floor(nextY);
                const blockX = Math.floor(nextX);
                const blockZ = Math.floor(nextZ);
                const blockBelow = activeWorld.getBlock(blockX, blockY, blockZ);

                if (blockBelow !== BLOCKS.AIR && blockBelow !== undefined) {
                    // Particle collided with solid block floor
                    const floorY = blockY + 1.0;
                    if (this.posY[i] >= floorY) {
                        nextY = floorY + 0.05;
                        this.velY[i] = -this.velY[i] * this.bounce[i];
                        this.velX[i] *= 0.7; // Surface friction
                        this.velZ[i] *= 0.7;
                        this.rotVelX[i] *= 0.5;
                        this.rotVelZ[i] *= 0.5;
                    }
                }
            }

            this.posX[i] = nextX;
            this.posY[i] = nextY;
            this.posZ[i] = nextZ;

            // Apply angular rotation
            this.rotX[i] += this.rotVelX[i] * dt;
            this.rotY[i] += this.rotVelY[i] * dt;
            this.rotZ[i] += this.rotVelZ[i] * dt;

            // 2. Scale & Fade-out calculations
            const progress = this.age[i] / life; // 0.0 (birth) to 1.0 (death)
            const sStart = this.scaleStart[i];
            const sEnd = this.scaleEnd[i];
            const curve = this.scaleCurve[i];
            let currentScale = sStart;

            switch (curve) {
                case SCALE_CURVE.DEBRIS_SHRINK:
                    // Stays near full size for 65% of life, then shrinks smoothly to 0
                    if (progress < 0.65) {
                        currentScale = sStart * (1.0 - 0.15 * (progress / 0.65));
                    } else {
                        const fadeProg = (progress - 0.65) / 0.35;
                        currentScale = sStart * 0.85 * (1.0 - fadeProg);
                    }
                    break;
                case SCALE_CURVE.LINEAR_SHRINK:
                    currentScale = sStart + (sEnd - sStart) * progress;
                    break;
                case SCALE_CURVE.SMOKE_EXPAND:
                    // Starts compact (0.4x), puffs up (1.3x) during first 30%, then dissipates
                    if (progress < 0.3) {
                        const puffProg = progress / 0.3;
                        currentScale = sStart * (0.4 + 0.9 * Math.sin(puffProg * Math.PI * 0.5));
                    } else {
                        const fadeProg = (progress - 0.3) / 0.7;
                        currentScale = sStart * 1.3 * (1.0 - fadeProg);
                    }
                    break;
                case SCALE_CURVE.EXPONENTIAL:
                    currentScale = sStart * Math.max(0.0, 1.0 - Math.pow(progress, 1.5));
                    break;
                case SCALE_CURVE.CONSTANT:
                default:
                    currentScale = sStart;
                    break;
            }
            currentScale = Math.max(0.0001, currentScale);

            // 3. Color interpolation (e.g. fire to smoke, or bright redstone fade)
            const r = this.colorR[i] + (this.endColorR[i] - this.colorR[i]) * progress;
            const g = this.colorG[i] + (this.endColorG[i] - this.colorG[i]) * progress;
            const b = this.colorB[i] + (this.endColorB[i] - this.colorB[i]) * progress;

            // 4. Update InstancedMesh matrix and color buffer
            this._tempEuler.set(this.rotX[i], this.rotY[i], this.rotZ[i], "XYZ");
            this._tempQuat.setFromEuler(this._tempEuler);
            this._tempPos.set(this.posX[i], this.posY[i], this.posZ[i]);
            this._tempScale.set(currentScale, currentScale, currentScale);

            this._tempMatrix.compose(this._tempPos, this._tempQuat, this._tempScale);
            this.mesh.setMatrixAt(i, this._tempMatrix);

            this._tempColor.setRGB(r, g, b);
            this.mesh.setColorAt(i, this._tempColor);

            i++;
        }

        // Set active instance draw count and mark GPU buffers as dirty
        this.mesh.count = this.aliveCount;
        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) {
            this.mesh.instanceColor.needsUpdate = true;
        }
    }

    /**
     * Clear all active particles immediately.
     */
    clear() {
        this.aliveCount = 0;
        this.mesh.count = 0;
        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) {
            this.mesh.instanceColor.needsUpdate = true;
        }
    }

    /**
     * Dispose of geometry, materials, and detach from scene.
     */
    dispose() {
        this.clear();
        this.removeFromScene();
        if (this.geometry) {
            this.geometry.dispose();
        }
        if (this.material) {
            if (Array.isArray(this.material)) {
                this.material.forEach(m => m.dispose());
            } else {
                this.material.dispose();
            }
        }
    }
}

export default {
    ParticleSystem,
    BLOCK_COLOR_PALETTES,
    SCALE_CURVE
};
