import * as THREE from 'three';
import { generateTextureAtlas, GENERATORS, createThreeCanvasTexture } from '../assets/textureGen.js';
import { BLOCKS } from './chunk.js';

/**
 * Texture Manager for Minecraft 1.5 WebGL Engine
 * 
 * Manages the procedural texture atlas and exports materials and UV lookups
 * for voxel chunk meshing.
 */

let cachedAtlas = null;
let cachedMaterial = null;

/**
 * Block ID to atlas texture name mapping.
 * Specifies textures for specific faces ('top', 'bottom', 'side', or direction names 'north', 'south', 'east', 'west').
 */
export const BLOCK_TEXTURE_MAP = Object.freeze({
    [BLOCKS.RAIL]: { all: "rail_normal" },
    [BLOCKS.POWERED_RAIL]: { all: "rail_golden" },
    [BLOCKS.DETECTOR_RAIL]: { all: "rail_detector" },
    [BLOCKS.ACTIVATOR_RAIL]: { all: "rail_activator" },
    [BLOCKS.STONE]: { all: 'stone' },
    [BLOCKS.GRASS]: { top: 'grass_top', bottom: 'dirt', side: 'grass_side' },
    [BLOCKS.DIRT]: { all: 'dirt' },
    [BLOCKS.COBBLESTONE]: { all: 'cobblestone' },
    [BLOCKS.OAK_PLANKS]: { all: 'planks' },
    [BLOCKS.OAK_SAPLING]: { all: 'leaves' },
    [BLOCKS.BEDROCK]: { all: 'bedrock' },
    [BLOCKS.WATER_FLOWING]: { all: 'water' },
    [BLOCKS.WATER]: { all: 'water' },
    [BLOCKS.LAVA_FLOWING]: { all: 'lava' },
    [BLOCKS.LAVA]: { all: 'lava' },
    [BLOCKS.SAND]: { all: 'sand' },
    [BLOCKS.GRAVEL]: { all: 'gravel' },
    [BLOCKS.GOLD_ORE]: { all: 'gold_ore' },
    [BLOCKS.IRON_ORE]: { all: 'iron_ore' },
    [BLOCKS.COAL_ORE]: { all: 'coal_ore' },
    [BLOCKS.OAK_LOG]: { top: 'log_top', bottom: 'log_top', side: 'log_side' },
    [BLOCKS.OAK_LEAVES]: { all: 'leaves' },
    [BLOCKS.SPONGE]: { all: 'sponge' },
    [BLOCKS.GLASS]: { all: 'glass' },
    [BLOCKS.LAPIS_ORE]: { all: 'lapis_ore' },
    [BLOCKS.LAPIS_BLOCK]: { all: 'lapis_block' },
    [BLOCKS.SANDSTONE]: { top: 'sandstone_top', bottom: 'sandstone_bottom', side: 'sandstone_side' },
    [BLOCKS.TALL_GRASS]: { all: 'grass_top' },
    [BLOCKS.DEAD_BUSH]: { all: 'planks' },
    [BLOCKS.WOOL]: { all: 'wool' },
    [BLOCKS.DANDELION]: { all: 'gold_ore' },
    [BLOCKS.POPPY]: { all: 'redstone_ore' },
    [BLOCKS.BROWN_MUSHROOM]: { all: 'planks' },
    [BLOCKS.RED_MUSHROOM]: { all: 'redstone_ore' },
    [BLOCKS.GOLD_BLOCK]: { all: 'gold_block' },
    [BLOCKS.IRON_BLOCK]: { all: 'iron_block' },
    [BLOCKS.DOUBLE_STONE_SLAB]: { all: 'stone' },
    [BLOCKS.STONE_SLAB]: { all: 'stone' },
    [BLOCKS.BRICKS]: { all: 'brick' },
    [BLOCKS.TNT]: { top: 'tnt_top', bottom: 'tnt_bottom', side: 'tnt_side' },
    [BLOCKS.BOOKSHELF]: { top: 'planks', bottom: 'planks', side: 'bookshelf' },
    [BLOCKS.MOSSY_COBBLESTONE]: { all: 'mossy_cobblestone' },
    [BLOCKS.OBSIDIAN]: { all: 'obsidian' },
    [BLOCKS.TORCH]: { all: 'torch' },
    [BLOCKS.DANDELION]: { all: 'dandelion' },
    [BLOCKS.POPPY]: { all: 'poppy' },
    [BLOCKS.DIAMOND_ORE]: { all: 'diamond_ore' },
    [BLOCKS.DIAMOND_BLOCK]: { all: 'diamond_block' },
    [BLOCKS.CRAFTING_TABLE]: { top: 'crafting_table_top', bottom: 'planks', side: 'crafting_table_side' },
    [BLOCKS.FARMLAND]: { top: 'dirt', bottom: 'dirt', side: 'dirt' },
    [BLOCKS.FURNACE]: { top: 'furnace_top', bottom: 'furnace_top', north: 'furnace_front', side: 'furnace_side' },
    [BLOCKS.LADDER]: { all: 'planks' },
    [BLOCKS.REDSTONE_ORE]: { all: 'redstone_ore' },
    [BLOCKS.SNOW_LAYER]: { all: 'snow' },
    [BLOCKS.ICE]: { all: 'ice' },
    [BLOCKS.SNOW_BLOCK]: { all: 'snow' },
    [BLOCKS.CACTUS]: { top: 'cactus_top', bottom: 'cactus_bottom', side: 'cactus_side' },
    [BLOCKS.CLAY]: { all: 'clay' },
    [BLOCKS.SUGAR_CANE]: { all: 'leaves' },
    [BLOCKS.FENCE]: { all: 'planks' },
    [BLOCKS.PUMPKIN]: { top: 'pumpkin_top', bottom: 'pumpkin_top', south: 'pumpkin_face', side: 'pumpkin_side' },
    [BLOCKS.NETHERRACK]: { all: 'netherrack' },
    [BLOCKS.SOUL_SAND]: { all: 'soul_sand' },
    [BLOCKS.GLOWSTONE]: { all: 'glowstone' },
    [BLOCKS.REDSTONE_BLOCK]: { all: 'redstone_block' },
    [BLOCKS.QUARTZ_ORE]: { all: 'quartz_ore' },
    [BLOCKS.QUARTZ_BLOCK]: { top: 'quartz_block_top', bottom: 'quartz_block_bottom', side: 'quartz_block_side' },
    [BLOCKS.QUARTZ_PILLAR]: { top: 'quartz_pillar_top', bottom: 'quartz_pillar_top', side: 'quartz_pillar_side' },
    [BLOCKS.QUARTZ_CHISELED]: { top: 'quartz_chiseled_top', bottom: 'quartz_chiseled_top', side: 'quartz_chiseled_side' },
    [BLOCKS.DISPENSER]: { top: 'furnace_top', bottom: 'furnace_top', north: 'dispenser_front', side: 'furnace_side' },
    [BLOCKS.DROPPER]: { top: 'furnace_top', bottom: 'furnace_top', north: 'dropper_front', side: 'furnace_side' },
    [BLOCKS.PISTON]: { top: 'piston_top', bottom: 'furnace_top', side: 'piston_side' },
    [BLOCKS.HOPPER]: { top: 'hopper_top', bottom: 'hopper_side', side: 'hopper_side' },
    [BLOCKS.REPEATER_BLOCK]: { top: 'repeater_top', bottom: 'stone', side: 'stone' },
    [BLOCKS.BED]: { top: 'bed_top', bottom: 'planks', side: 'bed_side' },
    324: { all: 'wooden_door' },
    330: { all: 'iron_door' }
});

/**
 * Returns the texture name for a given block ID and face type.
 * @param {number} blockId
 * @param {'top'|'bottom'|'side'} [faceType='side']
 * @param {string} [faceName='']
 * @returns {string} Texture key name in atlas
 */
export function getBlockFaceTexture(blockId, faceType = 'side', faceName = '') {
    if (faceName && typeof faceName === 'string' && faceName.startsWith('destroy_stage_')) {
        return faceName;
    }
    const entry = BLOCK_TEXTURE_MAP[blockId];
    if (!entry) {
        return 'stone';
    }

    if (faceName && entry[faceName]) {
        return entry[faceName];
    }
    if (faceType && entry[faceType]) {
        return entry[faceType];
    }
    if (entry.all) {
        return entry.all;
    }
    return entry.side || 'stone';
}

/**
 * Get or create the singleton procedural texture atlas.
 * @param {string[]} [blockList]
 * @param {number} [seed]
 * @returns {{canvas: HTMLCanvasElement, texture: THREE.CanvasTexture, uvs: Object, atlasWidth: number, atlasHeight: number, dataURI: string}}
 */
export function getTextureAtlas(blockList, seed) {
    if (!cachedAtlas || blockList || seed !== undefined) {
        const atlas = generateTextureAtlas(blockList || Object.keys(GENERATORS), seed);
        if (!blockList && seed === undefined) {
            cachedAtlas = atlas;
        }
        return atlas;
    }
    return cachedAtlas;
}

/**
 * Get UV coordinates for a block ID and face from the texture atlas.
 * @param {number} blockId
 * @param {'top'|'bottom'|'side'} [faceType='side']
 * @param {string} [faceName='']
 * @param {Object} [atlas=null]
 * @returns {{uMin: number, vMin: number, uMax: number, vMax: number}}
 */
export function getBlockFaceUV(blockId, faceType = 'side', faceName = '', atlas = null) {
    const activeAtlas = atlas || getTextureAtlas();
    const texName = getBlockFaceTexture(blockId, faceType, faceName);
    const uv = activeAtlas.uvs[texName] || activeAtlas.uvs['stone'];

    if (!uv) {
        return { uMin: 0, vMin: 0, uMax: 1, vMax: 1 };
    }
    return uv;
}

/**
 * Get the Three.js CanvasTexture of the texture atlas.
 * @param {number} [seed]
 * @returns {THREE.CanvasTexture}
 */
export function getAtlasTexture(seed) {
    return getTextureAtlas(undefined, seed).texture;
}

/**
 * Builds a THREE.MeshBasicMaterial using the canvas texture atlas, with custom Minecraft-style lighting.
 */
export function getAtlasMaterial(options = {}) {
    const atlas = getTextureAtlas();
    
    const mat = new THREE.MeshBasicMaterial({
        map: atlas.texture,
        alphaTest: 0.1,
        transparent: true,
        side: THREE.FrontSide,
        vertexColors: true,
        ...options
    });

    mat.userData = {
        sunLevel: { value: 1.0 }
    };

    mat.onBeforeCompile = (shader) => {
        shader.uniforms.sunLevel = mat.userData.sunLevel;
        
        shader.fragmentShader = `
            uniform float sunLevel;
        ` + shader.fragmentShader;

        shader.fragmentShader = shader.fragmentShader.replace(
            `#include <color_fragment>`,
            `
#ifdef USE_COLOR
    float blockLight = vColor.r;
    float skyLight = vColor.g * sunLevel;
    
    // Minecraft-style exponential light curve
    // Torches (blockLight) are massively boosted at the source and fall off sharply
    float bBright = pow(blockLight, 2.0) * 2.5;
    float sBright = pow(skyLight, 1.5) * 1.1;
    
    // Warm overdriven tint for torches, neutral for sky
    vec3 bColor = bBright * vec3(1.3, 1.0, 0.7);
    vec3 sColor = sBright * vec3(1.0, 1.0, 1.0);
    
    // Combine light
    vec3 finalLight = bColor + sColor;
    finalLight = min(finalLight, vec3(1.6)); // Allow high over-exposure for bright center
    finalLight = max(finalLight, vec3(0.02)); // Deep darkness in caves
    
    // Ambient Occlusion
    float ao = vColor.b;
    
    diffuseColor.rgb *= finalLight * ao;
#endif
            `
        );
    };

    // Store in global window for DayNightCycle to update sunLevel
    if (!window.chunkMaterials) window.chunkMaterials = [];
    window.chunkMaterials.push(mat);

    return mat;
}

/**
 * Reset / clear cached atlas and materials (useful for tests or seed reload).
 */
export function resetTextureManager() {
    cachedAtlas = null;
    cachedMaterial = null;
}

export default {
    BLOCK_TEXTURE_MAP,
    getBlockFaceTexture,
    getTextureAtlas,
    getBlockFaceUV,
    getAtlasTexture,
    getAtlasMaterial,
    resetTextureManager
};
