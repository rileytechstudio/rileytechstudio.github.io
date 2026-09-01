import * as THREE from 'three';
import { CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z, Chunk, BLOCKS } from './chunk.js';
import { getAtlasMaterial, getTextureAtlas, getBlockFaceUV, getBlockFaceTexture, BLOCK_TEXTURE_MAP } from './textureManager.js';

export { getAtlasMaterial, getTextureAtlas, getBlockFaceUV, getBlockFaceTexture, BLOCK_TEXTURE_MAP };

export const SPRITE_BLOCKS = new Set([6, 31, 32, 37, 38, 39, 40, 50, 51, 59, 83]); // Plants, torches, fire, etc.
export const BLOCK_COLORS = {
    // 0: Air (not rendered)
    1: { top: [0.50, 0.50, 0.50], side: [0.50, 0.50, 0.50], bottom: [0.50, 0.50, 0.50] }, // Stone
    2: { top: [0.38, 0.68, 0.28], side: [0.46, 0.56, 0.26], bottom: [0.53, 0.37, 0.23] }, // Grass Block
    3: { top: [0.53, 0.37, 0.23], side: [0.53, 0.37, 0.23], bottom: [0.53, 0.37, 0.23] }, // Dirt
    4: { top: [0.42, 0.42, 0.42], side: [0.42, 0.42, 0.42], bottom: [0.42, 0.42, 0.42] }, // Cobblestone
    5: { top: [0.68, 0.53, 0.33], side: [0.68, 0.53, 0.33], bottom: [0.68, 0.53, 0.33] }, // Oak Planks
    7: { top: [0.18, 0.18, 0.18], side: [0.18, 0.18, 0.18], bottom: [0.18, 0.18, 0.18] }, // Bedrock
    8: { top: [0.20, 0.40, 0.80], side: [0.20, 0.40, 0.80], bottom: [0.20, 0.40, 0.80] }, // Flowing Water
    9: { top: [0.20, 0.40, 0.80], side: [0.20, 0.40, 0.80], bottom: [0.20, 0.40, 0.80] }, // Still Water
    12: { top: [0.86, 0.82, 0.58], side: [0.86, 0.82, 0.58], bottom: [0.86, 0.82, 0.58] }, // Sand
    13: { top: [0.55, 0.52, 0.50], side: [0.55, 0.52, 0.50], bottom: [0.55, 0.52, 0.50] }, // Gravel
    14: { top: [0.58, 0.55, 0.40], side: [0.58, 0.55, 0.40], bottom: [0.58, 0.55, 0.40] }, // Gold Ore
    15: { top: [0.58, 0.53, 0.50], side: [0.58, 0.53, 0.50], bottom: [0.58, 0.53, 0.50] }, // Iron Ore
    16: { top: [0.30, 0.30, 0.30], side: [0.30, 0.30, 0.30], bottom: [0.30, 0.30, 0.30] }, // Coal Ore
    17: { top: [0.65, 0.55, 0.35], side: [0.42, 0.31, 0.18], bottom: [0.65, 0.55, 0.35] }, // Oak Log
    18: { top: [0.22, 0.55, 0.18], side: [0.22, 0.55, 0.18], bottom: [0.22, 0.55, 0.18] }, // Oak Leaves
    20: { top: [0.85, 0.92, 0.98], side: [0.85, 0.92, 0.98], bottom: [0.85, 0.92, 0.98] }, // Glass
    24: { top: [0.85, 0.82, 0.60], side: [0.85, 0.82, 0.60], bottom: [0.85, 0.82, 0.60] }, // Sandstone
    35: { top: [0.90, 0.90, 0.90], side: [0.90, 0.90, 0.90], bottom: [0.90, 0.90, 0.90] }, // White Wool
    41: { top: [0.95, 0.88, 0.25], side: [0.95, 0.88, 0.25], bottom: [0.95, 0.88, 0.25] }, // Gold Block
    42: { top: [0.85, 0.85, 0.85], side: [0.85, 0.85, 0.85], bottom: [0.85, 0.85, 0.85] }, // Iron Block
    45: { top: [0.65, 0.30, 0.25], side: [0.65, 0.30, 0.25], bottom: [0.65, 0.30, 0.25] }, // Brick
    46: { top: [0.80, 0.20, 0.15], side: [0.80, 0.20, 0.15], bottom: [0.80, 0.20, 0.15] }, // TNT
    47: { top: [0.68, 0.53, 0.33], side: [0.55, 0.40, 0.25], bottom: [0.68, 0.53, 0.33] }, // Bookshelf
    48: { top: [0.35, 0.48, 0.35], side: [0.35, 0.48, 0.35], bottom: [0.35, 0.48, 0.35] }, // Moss Stone
    49: { top: [0.12, 0.10, 0.18], side: [0.12, 0.10, 0.18], bottom: [0.12, 0.10, 0.18] }, // Obsidian
    56: { top: [0.45, 0.65, 0.65], side: [0.45, 0.65, 0.65], bottom: [0.45, 0.65, 0.65] }, // Diamond Ore
    57: { top: [0.38, 0.88, 0.88], side: [0.38, 0.88, 0.88], bottom: [0.38, 0.88, 0.88] }, // Diamond Block
    73: { top: [0.60, 0.20, 0.20], side: [0.60, 0.20, 0.20], bottom: [0.60, 0.20, 0.20] }, // Redstone Ore
    89: { top: [0.90, 0.80, 0.50], side: [0.90, 0.80, 0.50], bottom: [0.90, 0.80, 0.50] }, // Glowstone
    152: { top: [0.85, 0.10, 0.05], side: [0.85, 0.10, 0.05], bottom: [0.85, 0.10, 0.05] }, // Redstone Block
};

const DEFAULT_BLOCK_COLOR = [0.70, 0.70, 0.70];

export function getBlockColor(blockId, faceType) {
    const config = BLOCK_COLORS[blockId];
    if (!config) return DEFAULT_BLOCK_COLOR;
    return config[faceType] || config.side || DEFAULT_BLOCK_COLOR;
}

export const DEFAULT_AO_CURVE = Object.freeze([0.5, 0.7, 0.85, 1.0]);

export const FACES = [
    {
        name: 'top',
        type: 'top',
        dir: [0, 1, 0],
        normal: [0, 1, 0],
        corners: [
            [0, 1, 1],
            [1, 1, 1],
            [1, 1, 0],
            [0, 1, 0]
        ],
        uvs: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1]
        ]
    },
    {
        name: 'bottom',
        type: 'bottom',
        dir: [0, -1, 0],
        normal: [0, -1, 0],
        corners: [
            [0, 0, 0],
            [1, 0, 0],
            [1, 0, 1],
            [0, 0, 1]
        ],
        uvs: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1]
        ]
    },
    {
        name: 'north',
        type: 'side',
        dir: [0, 0, -1],
        normal: [0, 0, -1],
        corners: [
            [1, 0, 0],
            [0, 0, 0],
            [0, 1, 0],
            [1, 1, 0]
        ],
        uvs: [
            [1, 0],
            [0, 0],
            [0, 1],
            [1, 1]
        ]
    },
    {
        name: 'south',
        type: 'side',
        dir: [0, 0, 1],
        normal: [0, 0, 1],
        corners: [
            [0, 0, 1],
            [1, 0, 1],
            [1, 1, 1],
            [0, 1, 1]
        ],
        uvs: [
            [1, 0],
            [0, 0],
            [0, 1],
            [1, 1]
        ]
    },
    {
        name: 'west',
        type: 'side',
        dir: [-1, 0, 0],
        normal: [-1, 0, 0],
        corners: [
            [0, 0, 0],
            [0, 0, 1],
            [0, 1, 1],
            [0, 1, 0]
        ],
        uvs: [
            [1, 0],
            [0, 0],
            [0, 1],
            [1, 1]
        ]
    },
    {
        name: 'east',
        type: 'side',
        dir: [1, 0, 0],
        normal: [1, 0, 0],
        corners: [
            [1, 0, 1],
            [1, 0, 0],
            [1, 1, 0],
            [1, 1, 1]
        ],
        uvs: [
            [1, 0],
            [0, 0],
            [0, 1],
            [1, 1]
        ]
    }
];

export function isBlockTransparent(blockId) {
    if (!blockId || blockId === 0) return true;
    return blockId === 20 || blockId === 8 || blockId === 9 || blockId === 10 || blockId === 11 ||
           blockId === 18 || blockId === 6 || blockId === 31 || blockId === 32 || blockId === 37 || blockId === 38 ||
           blockId === 39 || blockId === 40 || blockId === 50 || blockId === 51 || blockId === 59 ||
           blockId === 78 || blockId === 83 || blockId === 66 || blockId === 27 || blockId === 28 || blockId === 157;
}

export function isBlockOccluding(blockId) {
    if (!blockId || blockId === 0 || blockId === -1) return false;
    return !isBlockTransparent(blockId);
}

export function calculateAO(side1, side2, corner) {
    const s1 = Boolean(side1);
    const s2 = Boolean(side2);
    const c = Boolean(corner);

    if (s1 && s2) {
        return 0;
    }
    return 3 - (Number(s1) + Number(s2) + Number(c));
}

export const calculateVertexAO = calculateAO;

export function generateChunkGeometry(chunk, options = {}) {
    const isChunkInstance = chunk && typeof chunk.getBlock === 'function';
    const sizeX = isChunkInstance ? chunk.sizeX || CHUNK_SIZE_X : CHUNK_SIZE_X;
    const sizeY = isChunkInstance ? chunk.sizeY || CHUNK_SIZE_Y : CHUNK_SIZE_Y;
    const sizeZ = isChunkInstance ? chunk.sizeZ || CHUNK_SIZE_Z : CHUNK_SIZE_Z;

    const getBlock = isChunkInstance
        ? (x, y, z) => chunk.getBlock(x, y, z)
        : (x, y, z) => {
            if (x < 0 || x >= sizeX || y < 0 || y >= sizeY || z < 0 || z >= sizeZ) return 0;
            const idx = (y * sizeZ + z) * sizeX + x;
            return chunk[idx] || 0;
        };

    const world = (options && typeof options.getBlock === 'function')
        ? options
        : (options && options.world) || (chunk && chunk.world) || null;

    const getWorldBlock = (options && typeof options.getWorldBlock === 'function')
        ? options.getWorldBlock
        : (world ? (wx, wy, wz) => world.getBlock(wx, wy, wz) : null);

    // Pre-calculate surface heightmap for cave darkening
    const heightMap = new Int32Array(sizeX * sizeZ);
    for (let hx = 0; hx < sizeX; hx++) {
        for (let hz = 0; hz < sizeZ; hz++) {
            let h = 0;
            for (let hy = sizeY - 1; hy >= 0; hy--) {
                const hb = getBlock(hx, hy, hz);
                if (hb !== 0 && !isBlockTransparent(hb)) {
                    h = hy;
                    break;
                }
            }
            heightMap[hx * sizeZ + hz] = h;
        }
    }

    const chunkOriginX = (chunk.x !== undefined ? chunk.x : chunk.cx || 0) * sizeX;
    const chunkOriginZ = (chunk.z !== undefined ? chunk.z : chunk.cz || 0) * sizeZ;

    const getVoxel = (bx, by, bz) => {
        if (by < 0 || by >= sizeY) return 0;
        if (bx >= 0 && bx < sizeX && bz >= 0 && bz < sizeZ) {
            return getBlock(bx, by, bz);
        }
        if (getWorldBlock) {
            return getWorldBlock(chunkOriginX + bx, by, chunkOriginZ + bz);
        }
        return 0;
    };

    const transparentCheck = options.strictAirOnly
        ? (id) => id === 0
        : (id) => isBlockTransparent(id);

    const getLight = (wx, wy, wz) => {
        if (wy < 0 || wy >= sizeY) return 15 << 4;
        if (wx >= 0 && wx < sizeX && wz >= 0 && wz < sizeZ) {
            return chunk && chunk.getLight ? chunk.getLight(wx, wy, wz) : (15 << 4);
        }
        if (world && world.getLight) {
            return world.getLight(chunkOriginX + wx, wy, chunkOriginZ + wz);
        }
        return 15 << 4;
    };

    const enableAO = options.enableAO !== false;
    const aoCurve = options.aoCurve || DEFAULT_AO_CURVE;
    const atlas = options.atlas || getTextureAtlas();

    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];
    const torches = [];

    let vertexCount = 0;

    for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
            for (let x = 0; x < sizeX; x++) {
                const blockId = getBlock(x, y, z);
                if (blockId === 0) continue; // Skip air
                
                if (options.filter === 'opaque' && (blockId === 8 || blockId === 9)) continue;
                if (options.filter === 'translucent' && blockId !== 8 && blockId !== 9) continue;

                // Custom Meshing for Rails (Flat transparent quads)
                if (blockId === 66 || blockId === 27 || blockId === 28 || blockId === 157) {
                    const lightVal = getLight(x, y, z);
                    const skyLight = (lightVal >> 4) & 0x0F;
                    const blockLight = lightVal & 0x0F;
                    const shade = [blockLight / 15.0, skyLight / 15.0, 1.0];
                    
                    let uvInfo = getBlockFaceUV(blockId, 'all', '', atlas);
                    
                    const isRail = (id) => id === 66 || id === 27 || id === 28 || id === 157;
                    const checkRail = (dx, dz) => {
                        if (isRail(getVoxel(x + dx, y, z + dz))) return { dy: 0 };
                        if (isRail(getVoxel(x + dx, y + 1, z + dz))) return { dy: 1 };
                        if (isRail(getVoxel(x + dx, y - 1, z + dz))) return { dy: -1 };
                        return null;
                    };
                    const rn = checkRail(0, -1);
                    const rs = checkRail(0, 1);
                    const re = checkRail(1, 0);
                    const rw = checkRail(-1, 0);
                    
                    let shape = 'ns'; 
                    let isCurve = false;
                    let rot = 0;
                    
                    if (re || rw) { shape = 'ew'; rot = 90; }
                    if ((rn || rs) && !re && !rw) { shape = 'ns'; rot = 0; }
                    
                    if (rs && re && !rn && !rw) { shape = 'se'; rot = 180; isCurve = true; }
                    if (rs && rw && !rn && !re) { shape = 'sw'; rot = 270; isCurve = true; }
                    if (rn && re && !rs && !rw) { shape = 'ne'; rot = 90; isCurve = true; }
                    if (rn && rw && !rs && !re) { shape = 'nw'; rot = 0; isCurve = true; }
                    
                    // Slopes override curves
                    let yN = 0, yS = 0, yE = 0, yW = 0;
                    if (rn && rn.dy === 1) { shape = 'ns'; rot = 0; isCurve = false; yN = 1.0; }
                    else if (rs && rs.dy === 1) { shape = 'ns'; rot = 0; isCurve = false; yS = 1.0; }
                    else if (re && re.dy === 1) { shape = 'ew'; rot = 90; isCurve = false; yE = 1.0; }
                    else if (rw && rw.dy === 1) { shape = 'ew'; rot = 90; isCurve = false; yW = 1.0; }
                    
                    if (isCurve) {
                        const customUV = typeof atlas.getUV === 'function' ? atlas.getUV('rail_curved') : null;
                        if (customUV) uvInfo = customUV;
                    }
                    
                    let ySW = 0.05, ySE = 0.05, yNE = 0.05, yNW = 0.05;
                    if (yN === 1.0) { yNE = 1.05; yNW = 1.05; }
                    if (yS === 1.0) { ySE = 1.05; ySW = 1.05; }
                    if (yE === 1.0) { yNE = 1.05; ySE = 1.05; }
                    if (yW === 1.0) { yNW = 1.05; ySW = 1.05; }
                    
                    let uMin = uvInfo.uMin, uMax = uvInfo.uMax;
                    let vMin = uvInfo.vMin, vMax = uvInfo.vMax;
                    
                    let uSW, vSW, uSE, vSE, uNE, vNE, uNW, vNW;
                    if (rot === 0) {
                        uSW = uMin; vSW = vMax; uSE = uMax; vSE = vMax; uNE = uMax; vNE = vMin; uNW = uMin; vNW = vMin;
                    } else if (rot === 90) {
                        uSW = uMax; vSW = vMax; uSE = uMax; vSE = vMin; uNE = uMin; vNE = vMin; uNW = uMin; vNW = vMax;
                    } else if (rot === 180) {
                        uSW = uMax; vSW = vMin; uSE = uMin; vSE = vMin; uNE = uMin; vNE = vMax; uNW = uMax; vNW = vMax;
                    } else if (rot === 270) {
                        uSW = uMin; vSW = vMin; uSE = uMin; vSE = vMax; uNE = uMax; vNE = vMax; uNW = uMax; vNW = vMin;
                    }
                    
                    // Top face
                    positions.push(
                        x, y + ySW, z + 1,
                        x + 1, y + ySE, z + 1,
                        x + 1, y + yNE, z,
                        x, y + yNW, z
                    );
                    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
                    uvs.push(
                        uSW, vSW,
                        uSE, vSE,
                        uNE, vNE,
                        uNW, vNW
                    );
                    colors.push(...shade, ...shade, ...shade, ...shade);
                    indices.push(vertexCount, vertexCount+1, vertexCount+2, vertexCount, vertexCount+2, vertexCount+3);
                    vertexCount += 4;
                    
                    continue;
                }

                // Custom Meshing for Sprite Blocks (Crossed Squares)
                if (SPRITE_BLOCKS.has(blockId)) {
                    const lightVal = getLight(x, y, z);
                    const skyLight = (lightVal >> 4) & 0x0F;
                    const blockLight = lightVal & 0x0F;
                    const shade = [blockLight / 15.0, skyLight / 15.0, 1.0];
                    
                    const uvInfo = getBlockFaceUV(blockId, 'side', atlas);
                    
                    // Cross plane 1 (diag 1)
                    const p1 = [
                        [x, y, z], [x+1, y, z+1], [x+1, y+1, z+1], [x, y+1, z]
                    ];
                    // Cross plane 2 (diag 2)
                    const p2 = [
                        [x+1, y, z], [x, y, z+1], [x, y+1, z+1], [x+1, y+1, z]
                    ];
                    
                    const addSpritePlane = (pts) => {
                        // Front face
                        positions.push(...pts[0], ...pts[1], ...pts[2], ...pts[3]);
                        normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0); // upward normals
                        uvs.push(uvInfo.uMin, uvInfo.vMin, uvInfo.uMax, uvInfo.vMin, uvInfo.uMax, uvInfo.vMax, uvInfo.uMin, uvInfo.vMax);
                        colors.push(...shade, ...shade, ...shade, ...shade);
                        indices.push(vertexCount, vertexCount+1, vertexCount+2, vertexCount, vertexCount+2, vertexCount+3);
                        vertexCount += 4;
                        
                        // Back face
                        positions.push(...pts[1], ...pts[0], ...pts[3], ...pts[2]);
                        normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
                        uvs.push(uvInfo.uMax, uvInfo.vMin, uvInfo.uMin, uvInfo.vMin, uvInfo.uMin, uvInfo.vMax, uvInfo.uMax, uvInfo.vMax);
                        colors.push(...shade, ...shade, ...shade, ...shade);
                        indices.push(vertexCount, vertexCount+1, vertexCount+2, vertexCount, vertexCount+2, vertexCount+3);
                        vertexCount += 4;
                    };
                    
                    addSpritePlane(p1);
                    addSpritePlane(p2);
                    continue;
                }

                for (let f = 0; f < FACES.length; f++) {
                    const face = FACES[f];
                    const nx = face.dir[0];
                    const ny = face.dir[1];
                    const nz = face.dir[2];

                    const neighborId = getVoxel(x + nx, y + ny, z + nz);

                    // Face is visible if adjacent neighbor is transparent/passable
                    // CRITICAL FIX: Cull internal faces between identical blocks to prevent water lag!
                    if (blockId === neighborId) continue;

                    if (transparentCheck(neighborId)) {
                        let effectiveFaceName = face.name;
                        if (blockId === 61 || blockId === 62) {
                            const meta = chunk.getMetadata ? chunk.getMetadata(x, y, z) : 0;
                            // meta: 2=North, 3=South, 4=West, 5=East (default North logic is used for the front texture key)
                            if (meta === 2 && face.name === 'north') effectiveFaceName = 'north';
                            else if (meta === 3 && face.name === 'south') effectiveFaceName = 'north';
                            else if (meta === 4 && face.name === 'west') effectiveFaceName = 'north';
                            else if (meta === 5 && face.name === 'east') effectiveFaceName = 'north';
                            else effectiveFaceName = 'side';
                        }
                        
                        const uvBounds = getBlockFaceUV(blockId, face.type, effectiveFaceName, atlas);
                        const faceAoScores = [3, 3, 3, 3];

                        // Air space position directly in front of the face
                        const ax = x + nx;
                        const ay = y + ny;
                        const az = z + nz;

                        for (let i = 0; i < 4; i++) {
                            const corner = face.corners[i];
                            const cx = corner[0];
                            let cy = corner[1];
                            const cz = corner[2];
                            
                            // Lower WATER top vertices by 1/8th if block above is AIR
                            if (blockId === 9 && cy === 1) { // BLOCKS.WATER = 9
                                if (getVoxel(x, y + 1, z) === 0) { // AIR = 0
                                    cy -= 0.125;
                                }
                            }
                            
                            // Render SNOW_LAYER as 1/8th height
                            if (blockId === 78 && cy === 1) { // BLOCKS.SNOW_LAYER = 78
                                cy -= 0.875;
                            }

                            // Vertex Position
                            positions.push(x + cx, y + cy, z + cz);

                            // Normal
                            normals.push(face.normal[0], face.normal[1], face.normal[2]);

                            // UV
                            const [u_local, v_local] = face.uvs[i];
                            const u = uvBounds.uMin + u_local * (uvBounds.uMax - uvBounds.uMin);
                            const v = uvBounds.vMin + v_local * (uvBounds.vMax - uvBounds.vMin);
                            uvs.push(u, v);

                            // Calculate Vertex Ambient Occlusion (AO) and Smooth Lighting
                            let aoScore = 3;
                            let aoFactor = 1.0;
                            let vertexSkyLight = 15;
                            let vertexBlockLight = 0;

                            if (enableAO) {
                                let s1x = ax, s1y = ay, s1z = az;
                                let s2x = ax, s2y = ay, s2z = az;
                                let crnx = ax, crny = ay, crnz = az;

                                if (nx !== 0) {
                                    const dy = cy === 1 ? 1 : -1;
                                    const dz = cz === 1 ? 1 : -1;
                                    s1z += dz;
                                    s2y += dy;
                                    crny += dy;
                                    crnz += dz;
                                } else if (ny !== 0) {
                                    const dx = cx === 1 ? 1 : -1;
                                    const dz = cz === 1 ? 1 : -1;
                                    s1x += dx;
                                    s2z += dz;
                                    crnx += dx;
                                    crnz += dz;
                                } else {
                                    // nz !== 0
                                    const dx = cx === 1 ? 1 : -1;
                                    const dy = cy === 1 ? 1 : -1;
                                    s1x += dx;
                                    s2y += dy;
                                    crnx += dx;
                                    crny += dy;
                                }

                                const s1 = isBlockOccluding(getVoxel(s1x, s1y, s1z));
                                const s2 = isBlockOccluding(getVoxel(s2x, s2y, s2z));
                                const c  = isBlockOccluding(getVoxel(crnx, crny, crnz));

                                aoScore = calculateAO(s1, s2, c);
                                faceAoScores[i] = aoScore;
                                aoFactor = aoCurve[aoScore];

                                // Smooth lighting: sample 4 surrounding blocks (center, side1, side2, corner)
                                const l0 = getLight(ax, ay, az);
                                let skySum = (l0 >> 4) & 0x0F;
                                let blkSum = l0 & 0x0F;
                                let sampleCount = 1;

                                if (!s1) {
                                    const l1 = getLight(s1x, s1y, s1z);
                                    skySum += (l1 >> 4) & 0x0F;
                                    blkSum += (l1 & 0x0F);
                                }
                                sampleCount++;

                                if (!s2) {
                                    const l2 = getLight(s2x, s2y, s2z);
                                    skySum += (l2 >> 4) & 0x0F;
                                    blkSum += (l2 & 0x0F);
                                }
                                sampleCount++;

                                if (!s1 || !s2) {
                                    if (!c) {
                                        const l3 = getLight(crnx, crny, crnz);
                                        skySum += (l3 >> 4) & 0x0F;
                                        blkSum += (l3 & 0x0F);
                                    }
                                    sampleCount++;
                                }

                                vertexSkyLight = skySum / sampleCount;
                                vertexBlockLight = blkSum / sampleCount;
                            } else {
                                const lightVal = getLight(ax, ay, az);
                                vertexSkyLight = (lightVal >> 4) & 0x0F;
                                vertexBlockLight = lightVal & 0x0F;
                            }

                            // Push packed light data into vertex colors (R=block, G=sky, B=AO)
                            colors.push(vertexBlockLight / 15.0, vertexSkyLight / 15.0, aoFactor);
                        }

                        // Quad Triangulation with Anisotropy-Fixing Diagonal Flip
                        const v0 = vertexCount;
                        const v1 = vertexCount + 1;
                        const v2 = vertexCount + 2;
                        const v3 = vertexCount + 3;

                        if (enableAO && (faceAoScores[0] + faceAoScores[2] < faceAoScores[1] + faceAoScores[3])) {
                            // Flip diagonal to (v1, v3) to prevent dark diagonal artifact across quad
                            indices.push(v0, v1, v3, v1, v2, v3);
                        } else {
                            // Default diagonal (v0, v2)
                            indices.push(v0, v1, v2, v0, v2, v3);
                        }

                        vertexCount += 4;
                    }
                }
            }
        }
    }

    const geometry = new THREE.BufferGeometry();
    if (positions.length > 0) {
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
    }

    geometry.torches = torches;
    return geometry;
}

export function createChunkMesh(chunk, worldOrMaterial = null, customMaterial = null) {
    let world = null;
    let material = null;

    if (worldOrMaterial) {
        if (typeof worldOrMaterial.getBlock === 'function' || worldOrMaterial.chunks || worldOrMaterial.generator) {
            world = worldOrMaterial;
            material = customMaterial || (world && world.material) || null;
        } else if (worldOrMaterial.isMaterial || typeof worldOrMaterial.onBeforeCompile === 'function') {
            material = worldOrMaterial;
            world = (chunk && chunk.world) || null;
        }
    } else {
        world = (chunk && chunk.world) || null;
        material = customMaterial || null;
    }

    const opaqueGeo = generateChunkGeometry(chunk, { world, filter: 'opaque' });
    const transGeo = generateChunkGeometry(chunk, { world, filter: 'translucent' });

    let opaqueMat, transMat;
    if (!material) {
        opaqueMat = getAtlasMaterial({ vertexColors: true, transparent: false, alphaTest: 0.5 });
        transMat = getAtlasMaterial({ vertexColors: true, transparent: true, alphaTest: 0.1 });
    } else {
        opaqueMat = material.clone();
        opaqueMat.vertexColors = true;
        opaqueMat.transparent = false;
        opaqueMat.alphaTest = 0.5;
        
        transMat = material.clone();
        transMat.vertexColors = true;
        transMat.transparent = true;
        transMat.alphaTest = 0.1;
    }

    const group = new THREE.Group();
    
    if (opaqueGeo.attributes.position) {
        const opaqueMesh = new THREE.Mesh(opaqueGeo, opaqueMat);
        opaqueMesh.castShadow = true;
        opaqueMesh.receiveShadow = true;
        opaqueMesh.userData = { chunk };
        group.add(opaqueMesh);
    }
    
    if (transGeo.attributes.position) {
        const transMesh = new THREE.Mesh(transGeo, transMat);
        transMesh.receiveShadow = true;
        transMesh.userData = { chunk };
        group.add(transMesh);
    }

    const sizeX = chunk.sizeX || CHUNK_SIZE_X;
    const sizeZ = chunk.sizeZ || CHUNK_SIZE_Z;
    const posX = (chunk.x !== undefined ? chunk.x : chunk.cx || 0) * sizeX;
    const posZ = (chunk.z !== undefined ? chunk.z : chunk.cz || 0) * sizeZ;
    group.position.set(posX, 0, posZ);
    
    chunk.mesh = group;
    // Combine torches from both passes
    const allTorches = [...(opaqueGeo.torches || []), ...(transGeo.torches || [])];
    group.userData = { torches: allTorches, chunk };
    return group;
}
