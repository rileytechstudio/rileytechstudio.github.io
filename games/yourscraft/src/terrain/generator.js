/**
 * Procedural Terrain Generator for Minecraft 1.5 WebGL Engine
 * Features:
 * - Multi-octave 2D Heightmaps with Continental & Biome Blending
 * - 3D Noise Caves & Overhangs
 * - Biome-specific Stratigraphy (Plains, Forest, Desert, Extreme Hills, Tundra, Ocean, Swamp)
 * - Ore Vein Generation (Coal, Iron, Gold, Redstone, Diamond, Lapis, Gravel, Dirt)
 * - Procedural Foliage & Trees (Oak trees, Cacti, Flowers, Tall Grass, Snow layers)
 * - Chunk-based population compatible with src/core/chunk.js
 * - Full Dimension Support: Overworld & Nether 3D solid cavern generation
 */

import { Chunk, BLOCKS, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from '../core/chunk.js';
import { NoiseGenerator, Random, ImprovedNoise, PerlinNoise } from './noise.js';

export const SEA_LEVEL = 64;

export const BIOMES = Object.freeze({
    OCEAN: {
        id: 0,
        name: 'Ocean',
        baseHeight: 46,
        heightScale: 12,
        topBlock: BLOCKS.SAND,
        subBlock: BLOCKS.SAND,
        waterBlock: BLOCKS.WATER,
        treeDensity: 0,
        foliageDensity: 0
    },
    PLAINS: {
        id: 1,
        name: 'Plains',
        baseHeight: 65,
        heightScale: 7,
        topBlock: BLOCKS.GRASS,
        subBlock: BLOCKS.DIRT,
        treeDensity: 0.003,
        flowerDensity: 0.03,
        tallGrassDensity: 0.12
    },
    FOREST: {
        id: 2,
        name: 'Forest',
        baseHeight: 67,
        heightScale: 10,
        topBlock: BLOCKS.GRASS,
        subBlock: BLOCKS.DIRT,
        treeDensity: 0.045,
        flowerDensity: 0.02,
        tallGrassDensity: 0.08
    },
    DESERT: {
        id: 3,
        name: 'Desert',
        baseHeight: 65,
        heightScale: 5,
        topBlock: BLOCKS.SAND,
        subBlock: BLOCKS.SANDSTONE,
        treeDensity: 0,
        cactusDensity: 0.008,
        deadBushDensity: 0.012
    },
    EXTREME_HILLS: {
        id: 4,
        name: 'Extreme Hills',
        baseHeight: 82,
        heightScale: 38,
        topBlock: BLOCKS.GRASS,
        subBlock: BLOCKS.STONE,
        treeDensity: 0.008,
        flowerDensity: 0.01,
        tallGrassDensity: 0.04,
        snowPeakHeight: 96
    },
    TAIGA: {
        id: 5,
        name: 'Taiga',
        baseHeight: 66,
        heightScale: 8,
        topBlock: BLOCKS.GRASS,
        subBlock: BLOCKS.DIRT,
        treeDensity: 0.025,
        tallGrassDensity: 0.04,
        hasSnowLayer: true,
        iceOnWater: true
    },
    SNOW: {
        id: 5,
        name: 'Snow / Taiga',
        baseHeight: 66,
        heightScale: 8,
        topBlock: BLOCKS.SNOW_BLOCK,
        subBlock: BLOCKS.DIRT,
        treeDensity: 0.015,
        tallGrassDensity: 0.02,
        hasSnowLayer: true,
        iceOnWater: true
    },
    TUNDRA: {
        id: 5,
        name: 'Tundra',
        baseHeight: 66,
        heightScale: 8,
        topBlock: BLOCKS.SNOW_BLOCK,
        subBlock: BLOCKS.DIRT,
        treeDensity: 0.01,
        tallGrassDensity: 0.02,
        hasSnowLayer: true,
        iceOnWater: true
    },
    SWAMP: {
        id: 6,
        name: 'Swamp',
        baseHeight: 63,
        heightScale: 3,
        topBlock: BLOCKS.GRASS,
        subBlock: BLOCKS.CLAY,
        treeDensity: 0.02,
        flowerDensity: 0.015,
        tallGrassDensity: 0.06,
        waterLilyChance: 0.03
    },
    NETHER: {
        id: 8,
        name: 'Nether',
        baseHeight: 64,
        heightScale: 0,
        topBlock: BLOCKS.NETHERRACK,
        subBlock: BLOCKS.NETHERRACK,
        waterBlock: BLOCKS.LAVA,
        treeDensity: 0,
        foliageDensity: 0
    }
});

export class TerrainGenerator {
    /**
     * @param {number|string} [seed=1337]
     * @param {Object} [config={}]
     * @param {string} [config.dimension='overworld'] - 'overworld' | 'nether'
     * @param {number} [config.netherHeight=128] - Nether cavern ceiling height
     * @param {number} [config.netherLavaLevel=32] - Nether lava lake/ocean level
     */
    constructor(seed = 1337, config = {}) {
        this.seed = seed;
        this.dimension = (config.dimension || 'overworld').toLowerCase();
        this.config = Object.assign({
            dimension: this.dimension,
            seaLevel: SEA_LEVEL,
            netherHeight: 128,
            netherLavaLevel: 32,
            enableCaves: true,
            enableOres: true,
            enableTrees: true,
            enableFoliage: true,
            caveThreshold: 0.58,
            bedrockDepth: 4
        }, config);

        this.dimension = this.config.dimension;
        this.initNoiseGenerators(seed);
    }

    /**
     * Initialize separate noise samplers for various terrain channels
     * @param {number|string} seed
     */
    initNoiseGenerators(seed) {
        const baseRng = new Random(seed);

        this.continentalNoise = new NoiseGenerator(baseRng.nextInt(1, 1000000), 'simplex');
        this.mountainNoise = new NoiseGenerator(baseRng.nextInt(1, 1000000), 'simplex');
        this.detailNoise = new NoiseGenerator(baseRng.nextInt(1, 1000000), 'simplex');
        
        // Temperature and Moisture noise samplers using ImprovedNoise
        this.temperatureNoise = new ImprovedNoise(baseRng.nextInt(1, 1000000));
        this.moistureNoise = new ImprovedNoise(baseRng.nextInt(1, 1000000));
        this.humidityNoise = this.moistureNoise; // Alias for backward compatibility

        this.caveNoise = new NoiseGenerator(baseRng.nextInt(1, 1000000), 'perlin');
        this.caveNoise2 = new NoiseGenerator(baseRng.nextInt(1, 1000000), 'perlin');
        this.oreNoise = new NoiseGenerator(baseRng.nextInt(1, 1000000), 'simplex');

        // Nether 3D noise samplers
        this.netherDensityNoise = new NoiseGenerator(baseRng.nextInt(1, 1000000), 'simplex');
        this.netherDetailNoise = new NoiseGenerator(baseRng.nextInt(1, 1000000), 'simplex');
        this.netherCaveNoise = new NoiseGenerator(baseRng.nextInt(1, 1000000), 'simplex');
        this.netherLavaNoise = new NoiseGenerator(baseRng.nextInt(1, 1000000), 'simplex');
    }

    /**
     * Sample climate temperature at world coordinates
     * @param {number} worldX 
     * @param {number} worldZ 
     * @returns {number} Value in range [-1, 1]
     */
    getTemperature(worldX, worldZ) {
        if (this.temperatureNoise && typeof this.temperatureNoise.fbm2D === 'function') {
            return this.temperatureNoise.fbm2D(worldX * 0.0012, worldZ * 0.0012, {
                octaves: 3,
                persistence: 0.5
            });
        }
        return 0;
    }

    /**
     * Sample climate moisture/humidity at world coordinates
     * @param {number} worldX 
     * @param {number} worldZ 
     * @returns {number} Value in range [-1, 1]
     */
    getMoisture(worldX, worldZ) {
        const sampler = this.moistureNoise || this.humidityNoise;
        if (sampler && typeof sampler.fbm2D === 'function') {
            return sampler.fbm2D(worldX * 0.0012, worldZ * 0.0012, {
                octaves: 3,
                persistence: 0.5
            });
        }
        return 0;
    }

    /**
     * Alias for getMoisture
     * @param {number} worldX 
     * @param {number} worldZ 
     * @returns {number}
     */
    getHumidity(worldX, worldZ) {
        return this.getMoisture(worldX, worldZ);
    }

    /**
     * Determine Biome at world coordinate (worldX, worldZ)
     * Maps terrain to biomes based on Temperature and Moisture:
     * - Desert (Sand / Cactus)
     * - Snow / Taiga (Snow layers, Ice)
     * - Forest (Oak Trees)
     * - Plains (Grass, Flowers, Tall Grass)
     *
     * @param {number} worldX 
     * @param {number} worldZ 
     * @returns {typeof BIOMES[keyof typeof BIOMES]}
     */
    getBiome(worldX, worldZ) {
        if (this.dimension === 'nether' || this.config.dimension === 'nether') {
            return BIOMES.NETHER;
        }

        // Sample continentalness to distinguish deep ocean from landmass
        const continentalness = this.continentalNoise.fbm2D(worldX * 0.0015, worldZ * 0.0015, {
            octaves: 3,
            persistence: 0.5,
            lacunarity: 2.0
        });

        if (continentalness < -0.22) {
            return BIOMES.OCEAN;
        }

        // Sample climate (Temperature & Moisture) using ImprovedNoise
        const temp = this.getTemperature(worldX, worldZ);
        const moisture = this.getMoisture(worldX, worldZ);

        // Mountain elevation check
        const mountainFactor = this.mountainNoise.fbm2D(worldX * 0.002, worldZ * 0.002, {
            octaves: 4,
            persistence: 0.55
        });

        if (mountainFactor > 0.45 && continentalness > 0.1) {
            return BIOMES.EXTREME_HILLS;
        }

        // Biome climate mapping based on Temperature and Moisture
        if (temp < -0.20) {
            // Cold biomes: Snow / Taiga (Snow layers, Ice)
            return moisture > 0.0 ? BIOMES.TAIGA : BIOMES.SNOW;
        } else if (temp > 0.20 && moisture < -0.05) {
            // Hot & dry biomes: Desert (Sand / Cactus)
            return BIOMES.DESERT;
        } else if (moisture > 0.35 && temp > 0.0) {
            // Hot & very humid: Swamp
            return BIOMES.SWAMP;
        } else if (moisture > 0.05) {
            // Temperate & moist: Forest (Oak Trees)
            return BIOMES.FOREST;
        } else {
            // Temperate & moderate: Plains
            return BIOMES.PLAINS;
        }
    }

    /**
     * Compute raw continuous surface height at world coordinates
     * @param {number} worldX 
     * @param {number} worldZ 
     * @returns {number}
     */
    getHeight(worldX, worldZ) {
        if (this.dimension === 'nether' || this.config.dimension === 'nether') {
            return this.config.netherHeight || 128;
        }

        const biome = this.getBiome(worldX, worldZ);

        // Base continental elevation
        const cont = this.continentalNoise.fbm2D(worldX * 0.002, worldZ * 0.002, {
            octaves: 3,
            persistence: 0.5
        });

        // Rolling hill elevation
        const hills = this.mountainNoise.fbm2D(worldX * 0.006, worldZ * 0.006, {
            octaves: 4,
            persistence: 0.5
        });

        // Fine surface details
        const detail = this.detailNoise.fbm2D(worldX * 0.02, worldZ * 0.02, {
            octaves: 2,
            persistence: 0.4
        });

        let height = biome.baseHeight + (cont * 8) + (hills * biome.heightScale) + (detail * 2.5);

        // Special mountain ridges
        if (biome === BIOMES.EXTREME_HILLS) {
            const ridges = this.mountainNoise.ridged2D(worldX * 0.005, worldZ * 0.005, {
                octaves: 4,
                persistence: 0.55
            });
            height += ridges * 30;
        }

        // Clamp to valid chunk height bounds
        return Math.max(2, Math.min(CHUNK_SIZE_Y - 8, Math.round(height)));
    }

    /**
     * Generate 16x16 heightmap for a chunk
     * @param {number} chunkX 
     * @param {number} chunkZ 
     * @returns {Int16Array} 256 height values (index = z * 16 + x)
     */
    getHeightmap(chunkX, chunkZ) {
        const heightmap = new Int16Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
        const startX = chunkX * CHUNK_SIZE_X;
        const startZ = chunkZ * CHUNK_SIZE_Z;

        for (let cz = 0; cz < CHUNK_SIZE_Z; cz++) {
            for (let cx = 0; cx < CHUNK_SIZE_X; cx++) {
                const wx = startX + cx;
                const wz = startZ + cz;
                heightmap[cz * CHUNK_SIZE_X + cx] = this.getHeight(wx, wz);
            }
        }

        return heightmap;
    }

    /**
     * Check if a 3D coordinate is inside a subterranean cave system (Overworld)
     * @param {number} wx 
     * @param {number} wy 
     * @param {number} wz 
     * @param {number} surfaceHeight 
     * @returns {boolean} True if voxel is hollow cave air
     */
    isCave(wx, wy, wz, surfaceHeight) {
        if (!this.config.enableCaves) return false;
        // Don't carve bedrock or punch straight through the ocean floor into water
        if (wy <= 4 || wy >= surfaceHeight - 2) return false;

        // Double 3D noise worm caves (Swiss Cheese / Tubular caves)
        const scale1 = 0.025;
        const n1 = this.caveNoise.fbm3D(wx * scale1, wy * scale1 * 1.4, wz * scale1, {
            octaves: 2,
            persistence: 0.5
        });

        const scale2 = 0.035;
        const n2 = this.caveNoise2.fbm3D(wx * scale2, wy * scale2 * 1.4, wz * scale2, {
            octaves: 2,
            persistence: 0.5
        });

        // Tubular intersection
        const caveValue = (n1 * n1) + (n2 * n2);
        return caveValue < 0.038;
    }

    /**
     * Determine underground Ore Block at (wx, wy, wz) (Overworld)
     * @param {number} wx 
     * @param {number} wy 
     * @param {number} wz 
     * @returns {number} Block ID (defaults to BLOCKS.STONE)
     */
    getOreBlock(wx, wy, wz) {
        if (!this.config.enableOres) return BLOCKS.STONE;

        // Fast seeded 3D ore noise evaluation
        const sample = this.oreNoise.get3D(wx * 0.15, wy * 0.15, wz * 0.15);

        // Diamond Ore: Y 1 to 16, very rare
        if (wy <= 16 && sample > 0.84) {
            return BLOCKS.DIAMOND_ORE;
        }

        // Redstone Ore: Y 1 to 16, rare
        if (wy <= 16 && sample < -0.80) {
            return BLOCKS.REDSTONE_ORE;
        }

        // Gold Ore: Y 1 to 32
        if (wy <= 32 && sample > 0.77) {
            return BLOCKS.GOLD_ORE;
        }

        // Lapis Lazuli Ore: Y 14 to 32
        if (wy >= 14 && wy <= 32 && sample < -0.76) {
            return BLOCKS.LAPIS_ORE;
        }

        // Iron Ore: Y 1 to 64, common
        if (wy <= 64 && sample > 0.65) {
            return BLOCKS.IRON_ORE;
        }

        // Coal Ore: Y 1 to 120, abundant
        if (wy <= 120 && (sample < -0.62 || (sample > 0.55 && sample < 0.63))) {
            return BLOCKS.COAL_ORE;
        }

        // Gravel pockets: Y 10 to 80
        if (wy >= 10 && wy <= 80 && sample > 0.50 && sample < 0.55) {
            return BLOCKS.GRAVEL;
        }

        // Dirt pockets: Y 10 to 80
        if (wy >= 10 && wy <= 80 && sample < -0.52 && sample > -0.58) {
            return BLOCKS.DIRT;
        }

        return BLOCKS.STONE;
    }

    /**
     * Populate a Chunk with terrain voxels, stratigraphy, ores, and flora (or Nether cavern)
     * @param {number} chunkX 
     * @param {number} chunkZ 
     * @param {Chunk} [targetChunk=null]
     * @returns {Chunk} Populated chunk instance
     */
    generateChunk(chunkX, chunkZ, targetChunk = null) {
        if (this.dimension === 'nether' || this.config.dimension === 'nether') {
            return this.generateNetherChunk(chunkX, chunkZ, targetChunk);
        }

        const chunk = targetChunk || new Chunk(chunkX, chunkZ, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z);
        const startX = chunkX * CHUNK_SIZE_X;
        const startZ = chunkZ * CHUNK_SIZE_Z;

        const heightmap = new Int16Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
        const biomeMap = new Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);

        // Precompute heightmap and biomes for all 256 columns in the chunk
        for (let cz = 0; cz < CHUNK_SIZE_Z; cz++) {
            for (let cx = 0; cx < CHUNK_SIZE_X; cx++) {
                const wx = startX + cx;
                const wz = startZ + cz;
                const colIdx = cz * CHUNK_SIZE_X + cx;
                heightmap[colIdx] = this.getHeight(wx, wz);
                biomeMap[colIdx] = this.getBiome(wx, wz);
            }
        }

        const bedrockRng = new Random((chunkX * 31337) ^ (chunkZ * 71993));

        // Fill column voxels (Bedrock -> Stone/Ores -> Dirt/Sublayer -> Surface Block -> Water)
        for (let cz = 0; cz < CHUNK_SIZE_Z; cz++) {
            for (let cx = 0; cx < CHUNK_SIZE_X; cx++) {
                const wx = startX + cx;
                const wz = startZ + cz;
                const colIdx = cz * CHUNK_SIZE_X + cx;
                const surfaceHeight = heightmap[colIdx];
                const biome = biomeMap[colIdx];

                for (let cy = 0; cy < CHUNK_SIZE_Y; cy++) {
                    // 1. Bedrock Layer (Y = 0 is solid, Y = 1..4 is probabilistic)
                    if (cy === 0) {
                        chunk.setBlock(cx, cy, cz, BLOCKS.BEDROCK);
                        continue;
                    } else if (cy < this.config.bedrockDepth) {
                        if (bedrockRng.next() < (1.0 - cy / this.config.bedrockDepth)) {
                            chunk.setBlock(cx, cy, cz, BLOCKS.BEDROCK);
                            continue;
                        }
                    }

                    // 2. Subterranean Caves check
                    if (cy <= surfaceHeight && this.isCave(wx, cy, wz, surfaceHeight)) {
                        chunk.setBlock(cx, cy, cz, BLOCKS.AIR);
                        continue;
                    }

                    // 3. Terrain Solid Fill & Stratigraphy
                    if (cy < surfaceHeight) {
                        const depthBelowSurface = surfaceHeight - cy;

                        if (depthBelowSurface <= 1) {
                            // Top block
                            let topBlock = biome.topBlock;
                            // High altitude snowy peaks for Extreme Hills
                            if (biome === BIOMES.EXTREME_HILLS && cy >= biome.snowPeakHeight) {
                                topBlock = BLOCKS.SNOW_BLOCK;
                            } else if (biome === BIOMES.EXTREME_HILLS && depthBelowSurface === 1 && cy > 78) {
                                topBlock = BLOCKS.STONE;
                            }
                            // Shoreline sand beach near sea level for temperate biomes
                            if (biome !== BIOMES.DESERT && !biome.hasSnowLayer && biome !== BIOMES.SWAMP) {
                                if (surfaceHeight <= this.config.seaLevel + 1 && surfaceHeight >= this.config.seaLevel - 1) {
                                    topBlock = BLOCKS.SAND;
                                }
                            }

                            chunk.setBlock(cx, cy, cz, topBlock);
                        } else if (depthBelowSurface <= 4) {
                            // Sub-surface layer (dirt, sandstone, clay, etc.)
                            let subBlock = biome.subBlock;
                            if (biome !== BIOMES.DESERT && !biome.hasSnowLayer && biome !== BIOMES.SWAMP) {
                                if (surfaceHeight <= this.config.seaLevel + 1 && surfaceHeight >= this.config.seaLevel - 1) {
                                    subBlock = BLOCKS.SANDSTONE;
                                }
                            }
                            chunk.setBlock(cx, cy, cz, subBlock);
                        } else {
                            // Deep stone layer with ore veins
                            const block = this.getOreBlock(wx, cy, wz);
                            chunk.setBlock(cx, cy, cz, block);
                        }
                    } else if (cy <= this.config.seaLevel) {
                        // Water body (Oceans, Lakes, Rivers, Ice on cold biomes)
                        if (biome.iceOnWater && cy === this.config.seaLevel) {
                            chunk.setBlock(cx, cy, cz, BLOCKS.ICE);
                        } else {
                            chunk.setBlock(cx, cy, cz, BLOCKS.WATER);
                        }
                    } else {
                        // Empty Air above surface
                        chunk.setBlock(cx, cy, cz, BLOCKS.AIR);
                    }
                }
            }
        }

        // Decorate Chunk with Trees, Cacti, Flowers, Tall Grass, Snow layers
        this.decorateChunk(chunk, heightmap, biomeMap);

        chunk.isDirty = true;
        return chunk;
    }

    /**
     * Generate Nether Chunk:
     * - Solid cavern bounded by bedrock ceiling at y=128 and floor at y=0
     * - Hollowed out by multi-scale 3D noise
     * - Made entirely of Netherrack and Lava lakes
     *
     * @param {number} chunkX 
     * @param {number} chunkZ 
     * @param {Chunk} [targetChunk=null]
     * @returns {Chunk} Populated chunk instance
     */
    generateNetherChunk(chunkX, chunkZ, targetChunk = null) {
        const chunk = targetChunk || new Chunk(chunkX, chunkZ, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z);
        const startX = chunkX * CHUNK_SIZE_X;
        const startZ = chunkZ * CHUNK_SIZE_Z;

        const netherHeight = this.config.netherHeight !== undefined ? this.config.netherHeight : 128;
        const lavaLevel = this.config.netherLavaLevel !== undefined ? this.config.netherLavaLevel : 32;
        const bedrockDepth = this.config.bedrockDepth !== undefined ? this.config.bedrockDepth : 4;
        const bedrockRng = new Random((chunkX * 31337) ^ (chunkZ * 71993));

        for (let cz = 0; cz < CHUNK_SIZE_Z; cz++) {
            for (let cx = 0; cx < CHUNK_SIZE_X; cx++) {
                const wx = startX + cx;
                const wz = startZ + cz;

                for (let cy = 0; cy < CHUNK_SIZE_Y; cy++) {
                    // 1. Above bedrock ceiling: empty air
                    if (cy > netherHeight) {
                        chunk.setBlock(cx, cy, cz, BLOCKS.AIR);
                        continue;
                    }

                    // 2. Bedrock Floor (y = 0 solid, y = 1..bedrockDepth-1 probabilistic)
                    if (cy === 0) {
                        chunk.setBlock(cx, cy, cz, BLOCKS.BEDROCK);
                        continue;
                    } else if (cy < bedrockDepth) {
                        if (bedrockRng.next() < (1.0 - cy / bedrockDepth)) {
                            chunk.setBlock(cx, cy, cz, BLOCKS.BEDROCK);
                            continue;
                        }
                    }

                    // 3. Bedrock Ceiling (y = netherHeight solid, y = netherHeight-bedrockDepth+1..netherHeight-1 probabilistic)
                    if (cy === netherHeight) {
                        chunk.setBlock(cx, cy, cz, BLOCKS.BEDROCK);
                        continue;
                    } else if (cy > netherHeight - bedrockDepth) {
                        if (bedrockRng.next() < (1.0 - (netherHeight - cy) / bedrockDepth)) {
                            chunk.setBlock(cx, cy, cz, BLOCKS.BEDROCK);
                            continue;
                        }
                    }

                    // 4. 3D Noise Cavern Density Calculation
                    // Vertical bias: solid ceiling near top, solid floor near bottom, hollow cavern in middle
                    let ceilBias = 0;
                    let floorBias = 0;
                    if (cy > 96) {
                        const cf = (cy - 96) / (netherHeight - 96);
                        ceilBias = Math.pow(cf, 2.0) * 1.1;
                    }
                    if (cy < 24) {
                        const ff = (24 - cy) / 24.0;
                        floorBias = Math.pow(ff, 2.0) * 0.9;
                    }

                    const midBias = -0.12;
                    const heightBias = midBias + ceilBias + floorBias;

                    // Multi-scale 3D noise
                    const n1 = this.netherDensityNoise.fbm3D(wx * 0.025, cy * 0.032, wz * 0.025, {
                        octaves: 3,
                        persistence: 0.5,
                        lacunarity: 2.0
                    });

                    const n2 = this.netherDetailNoise.fbm3D(wx * 0.06, cy * 0.06, wz * 0.06, {
                        octaves: 2,
                        persistence: 0.5,
                        lacunarity: 2.0
                    }) * 0.25;

                    // Large 3D cavern hollower for expansive halls
                    const c1 = this.netherCaveNoise.get3D(wx * 0.018, cy * 0.022, wz * 0.018);

                    const density = n1 + n2 + heightBias - (c1 * 0.15);

                    if (density > 0) {
                        // Solid Cavern: Netherrack with Nether Quartz Ore veins
                        if (this.config.enableOres && this.isQuartzOre(wx, cy, wz)) {
                            chunk.setBlock(cx, cy, cz, BLOCKS.QUARTZ_ORE);
                        } else {
                            chunk.setBlock(cx, cy, cz, BLOCKS.NETHERRACK);
                        }
                    } else {
                        // Hollow Cavern: Lava lake below lavaLevel, Air above
                        if (cy <= lavaLevel) {
                            chunk.setBlock(cx, cy, cz, BLOCKS.LAVA);
                        } else {
                            // Rare high-elevation lava pocket in cavern walls
                            const lavaPocket = this.netherLavaNoise.get3D(wx * 0.1, cy * 0.1, wz * 0.1);
                            if (lavaPocket > 0.85 && cy < 100 && cy > 40) {
                                chunk.setBlock(cx, cy, cz, BLOCKS.LAVA);
                            } else {
                                chunk.setBlock(cx, cy, cz, BLOCKS.AIR);
                            }
                        }
                    }
                }
            }
        }

        chunk.isDirty = true;
        return chunk;
    }

    /**
     * Determine if coordinate contains Nether Quartz Ore in Nether caverns
     * @param {number} wx 
     * @param {number} wy 
     * @param {number} wz 
     * @returns {boolean}
     */
    isQuartzOre(wx, wy, wz) {
        if (!this.config.enableOres) return false;
        const netherHeight = this.config.netherHeight !== undefined ? this.config.netherHeight : 128;
        if (wy < 10 || wy > netherHeight - 10) return false;

        const sample = this.oreNoise.get3D(wx * 0.18, wy * 0.18, wz * 0.18);
        return sample > 0.66;
    }

    /**
     * Decorate Chunk surface with trees, flowers, cacti, grass, and snow (Overworld)
     * Features:
     * - Desert: Cacti & Dead Bushes
     * - Snow / Taiga: Taiga/Pine trees with snow layers, ice on water, surface snow layers
     * - Forest: Dense Oak Trees, flowers, tall grass
     * - Plains: Occasional Oak Trees, abundant flowers, tall grass
     *
     * @param {Chunk} chunk 
     * @param {Int16Array} heightmap 
     * @param {Array} biomeMap 
     */
    decorateChunk(chunk, heightmap, biomeMap) {
        const decoRng = new Random(((chunk.x * 49287) ^ (chunk.z * 93821)) + 54321);

        for (let cz = 0; cz < CHUNK_SIZE_Z; cz++) {
            for (let cx = 0; cx < CHUNK_SIZE_X; cx++) {
                const colIdx = cz * CHUNK_SIZE_X + cx;
                const surfaceHeight = heightmap[colIdx];
                const biome = biomeMap[colIdx];
                const topBlock = chunk.getBlock(cx, surfaceHeight - 1, cz);

                // Skip decoration underwater (unless surface is ice)
                if (surfaceHeight <= this.config.seaLevel && topBlock !== BLOCKS.ICE) {
                    continue;
                }

                const roll = decoRng.next();

                // 1. Procedural Trees (Forest Oak Trees, Taiga Trees, Plains occasional trees)
                if (this.config.enableTrees && biome.treeDensity > 0 && roll < biome.treeDensity) {
                    if (topBlock === BLOCKS.GRASS || topBlock === BLOCKS.DIRT || topBlock === BLOCKS.SNOW_BLOCK) {
                        if (biome === BIOMES.TAIGA || biome === BIOMES.SNOW || biome === BIOMES.TUNDRA) {
                            this.generateTaigaTree(chunk, cx, surfaceHeight, cz, decoRng);
                        } else {
                            this.generateOakTree(chunk, cx, surfaceHeight, cz, decoRng);
                        }
                        continue;
                    }
                }

                // 2. Desert Cacti & Dead Bushes
                if (biome === BIOMES.DESERT && topBlock === BLOCKS.SAND) {
                    if (roll < biome.cactusDensity) {
                        const cactusHeight = decoRng.nextInt(1, 3);
                        for (let h = 0; h < cactusHeight; h++) {
                            const y = surfaceHeight + h;
                            if (y < CHUNK_SIZE_Y) {
                                chunk.setBlock(cx, y, cz, BLOCKS.CACTUS);
                            }
                        }
                        continue;
                    } else if (roll < biome.cactusDensity + (biome.deadBushDensity || 0)) {
                        chunk.setBlock(cx, surfaceHeight, cz, BLOCKS.DEAD_BUSH);
                        continue;
                    }
                }

                // 3. Flowers & Tall Grass (Plains, Forest, Swamp)
                if (this.config.enableFoliage && (topBlock === BLOCKS.GRASS || topBlock === BLOCKS.DIRT)) {
                    if (biome.flowerDensity && roll < biome.flowerDensity) {
                        // 50% yellow dandelion, 50% red poppy
                        const flower = decoRng.next() < 0.5 ? BLOCKS.DANDELION : BLOCKS.POPPY;
                        chunk.setBlock(cx, surfaceHeight, cz, flower);
                        continue;
                    } else if (biome.tallGrassDensity && roll < (biome.flowerDensity || 0) + biome.tallGrassDensity) {
                        chunk.setBlock(cx, surfaceHeight, cz, BLOCKS.TALL_GRASS);
                        continue;
                    }
                }

                // 4. Snow Layer on Cold Biomes (Taiga, Snow, Tundra)
                if (biome.hasSnowLayer && surfaceHeight < CHUNK_SIZE_Y) {
                    if (topBlock === BLOCKS.GRASS || topBlock === BLOCKS.DIRT || topBlock === BLOCKS.STONE || topBlock === BLOCKS.SNOW_BLOCK) {
                        if (chunk.getBlock(cx, surfaceHeight, cz) === BLOCKS.AIR) {
                            chunk.setBlock(cx, surfaceHeight, cz, BLOCKS.SNOW_LAYER);
                        }
                    }
                }
            }
        }
    }

    /**
     * Generate standard Minecraft 1.5 Oak Tree
     * @param {Chunk} chunk 
     * @param {number} x Local X (0-15)
     * @param {number} startY Surface Y
     * @param {number} z Local Z (0-15)
     * @param {Random} rng Seeded random
     */
    generateOakTree(chunk, x, startY, z, rng) {
        if (rng.next() < 0.1) {
            this.generateLargeOakTree(chunk, x, startY, z, rng);
            return;
        }

        const treeHeight = rng.nextInt(4, 6);
        const topY = startY + treeHeight;

        if (topY + 2 >= CHUNK_SIZE_Y) return;

        // Tree Leaves Canopy: 5x5 at top-3 & top-2, 3x3 at top-1 & top
        for (let ly = topY - 3; ly <= topY + 1; ly++) {
            const relY = ly - topY;
            const radius = relY >= 0 ? 1 : 2;

            for (let lx = -radius; lx <= radius; lx++) {
                for (let lz = -radius; lz <= radius; lz++) {
                    // Corner smoothing: drop outer corners on largest leaf layer
                    if (Math.abs(lx) === radius && Math.abs(lz) === radius) {
                        if (relY >= 0 || rng.next() < 0.5) continue;
                    }

                    const targetX = x + lx;
                    const targetZ = z + lz;

                    if (chunk.inBounds(targetX, ly, targetZ)) {
                        // Don't overwrite existing solid wood trunk
                        if (chunk.getBlock(targetX, ly, targetZ) === BLOCKS.AIR) {
                            chunk.setBlock(targetX, ly, targetZ, BLOCKS.OAK_LEAVES);
                        }
                    }
                }
            }
        }

        // Tree Wood Trunk: column of Oak Logs
        for (let h = 0; h < treeHeight; h++) {
            const targetY = startY + h;
            if (targetY < CHUNK_SIZE_Y) {
                chunk.setBlock(x, targetY, z, BLOCKS.OAK_LOG);
            }
        }

        // Turn dirt below trunk into dirt (prevents grass under tree trunk)
        chunk.setBlock(x, startY - 1, z, BLOCKS.DIRT);
    }

    /**
     * Generate Large Oak Tree with branches
     */
    generateLargeOakTree(chunk, x, startY, z, rng) {
        const treeHeight = rng.nextInt(10, 14);
        const trunkTopY = startY + treeHeight - 2;

        if (trunkTopY + 2 >= CHUNK_SIZE_Y) return;

        // Trunk
        for (let h = 0; h < treeHeight; h++) {
            const targetY = startY + h;
            if (targetY < CHUNK_SIZE_Y) {
                chunk.setBlock(x, targetY, z, BLOCKS.OAK_LOG);
            }
        }
        chunk.setBlock(x, startY - 1, z, BLOCKS.DIRT);

        // Generate some branches
        const numBranches = rng.nextInt(3, 6);
        for (let i = 0; i < numBranches; i++) {
            // Branch starts somewhere on the upper half of the trunk
            const branchStartY = startY + rng.nextInt(Math.floor(treeHeight / 2), treeHeight - 2);
            let bx = x;
            let by = branchStartY;
            let bz = z;

            // Direction of the branch
            const dx = rng.nextInt(-1, 2);
            const dz = rng.nextInt(-1, 2);
            if (dx === 0 && dz === 0) continue;

            const branchLength = rng.nextInt(2, 5);
            for (let j = 0; j < branchLength; j++) {
                bx += dx;
                by += (rng.next() < 0.3 ? 1 : 0); // Occasionally go up
                bz += dz;

                if (chunk.inBounds(bx, by, bz)) {
                    chunk.setBlock(bx, by, bz, BLOCKS.OAK_LOG);
                }
            }
            
            // Add leaves at the end of the branch
            this.generateLeafCluster(chunk, bx, by, bz, rng);
        }
        
        // Leaves at top of trunk
        this.generateLeafCluster(chunk, x, trunkTopY, z, rng);
    }

    /**
     * Generate a cluster of leaves around a branch node
     */
    generateLeafCluster(chunk, bx, by, bz, rng) {
        const radius = 2;
        for (let ly = by - 1; ly <= by + 1; ly++) {
            for (let lx = -radius; lx <= radius; lx++) {
                for (let lz = -radius; lz <= radius; lz++) {
                    if (Math.abs(lx) === radius && Math.abs(lz) === radius && rng.next() < 0.5) continue;
                    const tx = bx + lx;
                    const tz = bz + lz;
                    if (chunk.inBounds(tx, ly, tz)) {
                        if (chunk.getBlock(tx, ly, tz) === BLOCKS.AIR) {
                            chunk.setBlock(tx, ly, tz, BLOCKS.OAK_LEAVES);
                        }
                    }
                }
            }
        }
    }

    /**
     * Generate standard Minecraft Taiga / Pine Tree with snow layers on canopy
     * @param {Chunk} chunk 
     * @param {number} x Local X (0-15)
     * @param {number} startY Surface Y
     * @param {number} z Local Z (0-15)
     * @param {Random} rng Seeded random
     */
    generateTaigaTree(chunk, x, startY, z, rng) {
        const treeHeight = rng.nextInt(6, 8);
        const topY = startY + treeHeight;

        if (topY + 2 >= CHUNK_SIZE_Y) return;

        // Trunk
        for (let h = 0; h < treeHeight; h++) {
            const targetY = startY + h;
            if (targetY < CHUNK_SIZE_Y) {
                chunk.setBlock(x, targetY, z, BLOCKS.OAK_LOG);
            }
        }
        chunk.setBlock(x, startY - 1, z, BLOCKS.DIRT);

        // Top apex leaf
        if (chunk.inBounds(x, topY, z)) {
            chunk.setBlock(x, topY, z, BLOCKS.OAK_LEAVES);
            if (chunk.inBounds(x, topY + 1, z)) {
                chunk.setBlock(x, topY + 1, z, BLOCKS.SNOW_LAYER);
            }
        }

        // Conical stepped foliage layers downwards
        let radius = 1;
        for (let y = topY - 1; y >= startY + 2; y--) {
            const layerRadius = ((topY - y) % 2 === 1) ? radius : Math.max(1, radius - 1);
            for (let lx = -layerRadius; lx <= layerRadius; lx++) {
                for (let lz = -layerRadius; lz <= layerRadius; lz++) {
                    if (Math.abs(lx) === layerRadius && Math.abs(lz) === layerRadius && layerRadius > 1 && rng.next() < 0.4) {
                        continue;
                    }
                    const tx = x + lx;
                    const tz = z + lz;
                    if (chunk.inBounds(tx, y, tz)) {
                        if (chunk.getBlock(tx, y, tz) === BLOCKS.AIR) {
                            chunk.setBlock(tx, y, tz, BLOCKS.OAK_LEAVES);
                            if (chunk.inBounds(tx, y + 1, tz) && chunk.getBlock(tx, y + 1, tz) === BLOCKS.AIR) {
                                chunk.setBlock(tx, y + 1, tz, BLOCKS.SNOW_LAYER);
                            }
                        }
                    }
                }
            }
            if ((topY - y) % 2 === 0 && radius < 2) {
                radius++;
            }
        }
    }
}
