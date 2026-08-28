import * as THREE from 'three';
import { getTextureAtlas, getBlockFaceTexture, BLOCK_TEXTURE_MAP } from '../core/textureManager.js';
import { BLOCKS } from '../core/chunk.js';

/**
 * 3D Isometric Icon Renderer for Minecraft 1.5 WebGL Engine
 *
 * Renders authentic 3D isometric cube snapshots of block IDs using an offscreen
 * Three.js WebGLRenderer and textures from the procedural texture atlas.
 */

// Blocks that should be rendered as 2D sprites (plants, torch, ladder, liquids, etc.)
export const SPRITE_BLOCKS = new Set([
    0,   // AIR
    6,   // OAK_SAPLING
    8,   // WATER_FLOWING
    9,   // WATER
    10,  // LAVA_FLOWING
    11,  // LAVA
    31,  // TALL_GRASS
    32,  // DEAD_BUSH
    37,  // DANDELION
    38,  // POPPY
    39,  // BROWN_MUSHROOM
    40,  // RED_MUSHROOM
    50,  // TORCH
    51,  // FIRE
    59,  // WHEAT
    65,  // LADDER
    66,  // RAIL
    27,  // POWERED_RAIL
    28,  // DETECTOR_RAIL
    83,  // SUGAR_CANE
    157  // ACTIVATOR_RAIL
]);

/**
 * Checks if a block or item ID should be rendered as a 3D isometric cube.
 * @param {number|string} id
 * @returns {boolean}
 */
export function is3DBlock(id) {
    const numId = Number(id);
    if (!numId || isNaN(numId) || numId <= 0) return false;
    return numId <= 255 && !SPRITE_BLOCKS.has(numId);
}

// In-memory cache for rendered 3D block icons (Data URIs)
const ICON_CACHE = new Map();

// Three.js Offscreen Rendering Pipeline
let renderer = null;
let scene = null;
let camera = null;
let cubeGeometry = null;
let cubeMaterial = null;
let cubeMesh = null;
let uvAttr = null;

// Standard Minecraft 1.5 Isometric Cube Face Definitions:
// Camera is looking from North-West at an angle of 30 deg pitch, 45 deg yaw.
// Visible faces:
// - Top (+Y): Normal (0, 1, 0) -> Shading: 1.0 (Full sunlight)
// - North (-Z): Normal (0, 0, -1) -> Screen Left -> Shading: 0.65
// - West (-X): Normal (-1, 0, 0) -> Screen Right -> Shading: 0.85
// - Bottom (-Y), South (+Z), East (+X) backfaces are culled.
const CUBE_FACES = [
    {
        name: 'top',
        type: 'top',
        corners: [
            [-0.5, 0.5, 0.5],
            [0.5, 0.5, 0.5],
            [0.5, 0.5, -0.5],
            [-0.5, 0.5, -0.5]
        ],
        uvs: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1]
        ],
        light: 1.0
    },
    {
        name: 'bottom',
        type: 'bottom',
        corners: [
            [-0.5, -0.5, -0.5],
            [0.5, -0.5, -0.5],
            [0.5, -0.5, 0.5],
            [-0.5, -0.5, 0.5]
        ],
        uvs: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1]
        ],
        light: 0.5
    },
    {
        name: 'north',
        type: 'side',
        corners: [
            [0.5, -0.5, -0.5],
            [-0.5, -0.5, -0.5],
            [-0.5, 0.5, -0.5],
            [0.5, 0.5, -0.5]
        ],
        uvs: [
            [1, 0],
            [0, 0],
            [0, 1],
            [1, 1]
        ],
        light: 0.65
    },
    {
        name: 'south',
        type: 'side',
        corners: [
            [-0.5, -0.5, 0.5],
            [0.5, -0.5, 0.5],
            [0.5, 0.5, 0.5],
            [-0.5, 0.5, 0.5]
        ],
        uvs: [
            [1, 0],
            [0, 0],
            [0, 1],
            [1, 1]
        ],
        light: 0.65
    },
    {
        name: 'west',
        type: 'side',
        corners: [
            [-0.5, -0.5, -0.5],
            [-0.5, -0.5, 0.5],
            [-0.5, 0.5, 0.5],
            [-0.5, 0.5, -0.5]
        ],
        uvs: [
            [1, 0],
            [0, 0],
            [0, 1],
            [1, 1]
        ],
        light: 0.85
    },
    {
        name: 'east',
        type: 'side',
        corners: [
            [0.5, -0.5, 0.5],
            [0.5, -0.5, -0.5],
            [0.5, 0.5, -0.5],
            [0.5, 0.5, 0.5]
        ],
        uvs: [
            [1, 0],
            [0, 0],
            [0, 1],
            [1, 1]
        ],
        light: 0.85
    }
];

function initOffscreenPipeline(size = 32) {
    if (renderer) return;
    if (typeof document === 'undefined') return;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: false,
            preserveDrawingBuffer: true,
            powerPreference: 'low-power'
        });
    } catch (e) {
        console.warn('WebGLRenderer unavailable for icon rendering, falling back to 2D canvas', e);
        return;
    }

    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();

    // Orthographic Camera positioned at North-West isometric viewpoint
    // Frustum size 2.0 gives ~1.7 unit box size (85% fill) centered on 32x32 canvas
    const frustum = 2.0;
    camera = new THREE.OrthographicCamera(
        -frustum / 2, frustum / 2,
        frustum / 2, -frustum / 2,
        0.1, 100
    );
    camera.position.set(-10, 12.247, -10);
    camera.lookAt(0, 0, 0);

    // Build reusable 6-face cube BufferGeometry
    cubeGeometry = new THREE.BufferGeometry();

    const vertexCount = CUBE_FACES.length * 4; // 24 vertices
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const colors = new Float32Array(vertexCount * 3);
    const indices = [];

    for (let f = 0; f < CUBE_FACES.length; f++) {
        const face = CUBE_FACES[f];
        const baseIndex = f * 4;

        for (let v = 0; v < 4; v++) {
            const corner = face.corners[v];
            const pIdx = (baseIndex + v) * 3;
            positions[pIdx] = corner[0];
            positions[pIdx + 1] = corner[1];
            positions[pIdx + 2] = corner[2];

            const cIdx = (baseIndex + v) * 3;
            colors[cIdx] = face.light;
            colors[cIdx + 1] = face.light;
            colors[cIdx + 2] = face.light;
        }

        // Two counter-clockwise triangles per face
        indices.push(
            baseIndex, baseIndex + 1, baseIndex + 2,
            baseIndex, baseIndex + 2, baseIndex + 3
        );
    }

    const positionAttr = new THREE.BufferAttribute(positions, 3);
    uvAttr = new THREE.BufferAttribute(uvs, 2);
    const colorAttr = new THREE.BufferAttribute(colors, 3);

    cubeGeometry.setAttribute('position', positionAttr);
    cubeGeometry.setAttribute('uv', uvAttr);
    cubeGeometry.setAttribute('color', colorAttr);
    cubeGeometry.setIndex(indices);

    const atlas = getTextureAtlas();
    cubeMaterial = new THREE.MeshBasicMaterial({
        map: atlas.texture,
        transparent: true,
        alphaTest: 0.05,
        vertexColors: true,
        side: THREE.FrontSide
    });

    cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    scene.add(cubeMesh);
}

function updateCubeUVs(blockId) {
    const atlas = getTextureAtlas();
    const entry = BLOCK_TEXTURE_MAP[blockId] || { all: 'stone' };
    const uvArray = uvAttr.array;

    for (let f = 0; f < CUBE_FACES.length; f++) {
        const face = CUBE_FACES[f];
        const baseIndex = f * 4;

        // Determine face texture key name
        let texKey;
        if (face.name === 'north') {
            // Front-visible face (show furnace front, pumpkin face, dispenser front, etc.)
            if (entry.north) {
                texKey = entry.north;
            } else if (entry.south) {
                texKey = entry.south;
            } else {
                texKey = getBlockFaceTexture(blockId, face.type, face.name);
            }
        } else {
            texKey = getBlockFaceTexture(blockId, face.type, face.name);
        }

        const faceUV = (atlas.uvs && atlas.uvs[texKey]) ? atlas.uvs[texKey] : (atlas.uvs && atlas.uvs['stone']) || { uMin: 0, vMin: 0, uMax: 1, vMax: 1 };

        for (let v = 0; v < 4; v++) {
            const localU = face.uvs[v][0];
            const localV = face.uvs[v][1];
            const uIdx = (baseIndex + v) * 2;
            uvArray[uIdx] = faceUV.uMin + localU * (faceUV.uMax - faceUV.uMin);
            uvArray[uIdx + 1] = faceUV.vMin + localV * (faceUV.vMax - faceUV.vMin);
        }
    }

    uvAttr.needsUpdate = true;
}

/**
 * Render a 3D isometric snapshot for a block ID.
 * @param {number|string} blockId 
 * @param {number} [size=32] 
 * @returns {string} Data URI
 */
export function renderBlockIcon(blockId, size = 32) {
    const numId = Number(blockId);
    if (!numId || numId <= 0) return '';

    const cacheKey = ;
    if (ICON_CACHE.has(cacheKey)) {
        return ICON_CACHE.get(cacheKey);
    }

    initOffscreenPipeline(size);

    if (!renderer || !scene || !camera || !cubeMesh) {
        return '';
    }

    // Ensure material map is the latest atlas texture
    const atlas = getTextureAtlas();
    if (cubeMaterial.map !== atlas.texture) {
        cubeMaterial.map = atlas.texture;
        cubeMaterial.needsUpdate = true;
    }

    updateCubeUVs(numId);

    // Render 3D isometric snapshot
    renderer.render(scene, camera);

    const dataUri = renderer.domElement.toDataURL('image/png');
    ICON_CACHE.set(cacheKey, dataUri);
    return dataUri;
}

/**
 * Alias for renderBlockIcon
 */
export function getBlockIconDataUri(blockId, size = 32) {
    return renderBlockIcon(blockId, size);
}

/**
 * Clear the icon cache (e.g. upon texture atlas regeneration or seed reset).
 */
export function clearIconCache() {
    ICON_CACHE.clear();
}

/**
 * Preload 3D block icons into the cache.
 * @param {number[]} [blockList] 
 */
export function preloadBlockIcons(blockList) {
    const list = blockList || Object.values(BLOCKS);
    for (const id of list) {
        if (is3DBlock(id)) {
            renderBlockIcon(id);
        }
    }
}

export default {
    SPRITE_BLOCKS,
    is3DBlock,
    renderBlockIcon,
    getBlockIconDataUri,
    clearIconCache,
    preloadBlockIcons
};
