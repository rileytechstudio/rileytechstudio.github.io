import * as THREE from 'three';

/**
 * Procedural Pixel-Art Texture Generator for Minecraft 1.5 WebGL
 * 
 * Generates 16x16 retro pixel-art textures for blocks using HTML5 Canvas 2D.
 * Supports exporting as HTML5 Canvas, base64 Data URIs, and Three.js CanvasTextures
 * with crisp nearest-neighbor filtering (THREE.NearestFilter).
 */

// ==========================================
// 1. PSEUDO-RANDOM NUMBER GENERATOR (PRNG)
// ==========================================

/**
 * Mulberry32 32-bit PRNG for deterministic procedural textures.
 * @param {number} seed 
 * @returns {() => number} Returns float in range [0, 1)
 */
export function createRNG(seed = 12345678) {
    let s = (seed >>> 0) || 1;
    return function () {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ==========================================
// 2. CANVAS & COLOR UTILITIES
// ==========================================

/**
 * Create a new 16x16 offscreen HTML5 Canvas.
 * @param {number} width 
 * @param {number} height 
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}}
 */
export function createPixelCanvas(width = 16, height = 16) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
}

/**
 * Clamp a number between min and max.
 */
function clamp(val, min = 0, max = 255) {
    return Math.max(min, Math.min(max, val));
}

/**
 * Convert RGB array to CSS string.
 */
function rgb(r, g, b, a = 1.0) {
    return a < 1.0 
        ? `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})` 
        : `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/**
 * Apply random color noise / jitter to base RGB values.
 */
function jitter(rgbArr, amount, rng = Math.random) {
    const delta = (rng() * 2 - 1) * amount;
    return [
        clamp(rgbArr[0] + delta),
        clamp(rgbArr[1] + delta),
        clamp(rgbArr[2] + delta)
    ];
}

/**
 * Pick a random color from a weighted palette list.
 */
function pickWeighted(palette, rng = Math.random) {
    const rand = rng();
    let accumulated = 0;
    for (const item of palette) {
        accumulated += item.weight;
        if (rand <= accumulated) {
            return item.color;
        }
    }
    return palette[palette.length - 1].color;
}

/**
 * Draw a single pixel (1x1 unit) onto the 2D canvas context.
 */
function setPixel(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
}

// ==========================================
// 3. PROCEDURAL TEXTURE GENERATORS
// ==========================================

/**
 * Procedural 16x16 Dirt Texture
 */
export function generateDirtCanvas(seed = 42) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const palette = [
        { color: [134, 96, 67], weight: 0.40 },  // Base brown
        { color: [118, 85, 59], weight: 0.25 },  // Medium-dark brown
        { color: [102, 73, 50], weight: 0.15 },  // Dark brown
        { color: [87, 61, 40],  weight: 0.10 },  // Deep loam shadow
        { color: [155, 114, 82], weight: 0.08 }, // Light dirt speck
        { color: [173, 131, 95], weight: 0.02 }  // Pebble highlight
    ];

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const baseColor = pickWeighted(palette, rng);
            const noisyColor = jitter(baseColor, 5, rng);
            setPixel(ctx, x, y, rgb(noisyColor[0], noisyColor[1], noisyColor[2]));
        }
    }

    return canvas;
}

/**
 * Procedural 16x16 Grass Top Texture
 */
export function generateGrassTopCanvas(seed = 101) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const palette = [
        { color: [91, 140, 56],  weight: 0.45 }, // Base lush green
        { color: [108, 164, 66], weight: 0.25 }, // Bright blade green
        { color: [77, 120, 47],  weight: 0.15 }, // Forest green
        { color: [62, 98, 38],   weight: 0.10 }, // Dark shadow moss
        { color: [126, 186, 77], weight: 0.05 }  // Sunlit blade tip
    ];

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const baseColor = pickWeighted(palette, rng);
            const noisyColor = jitter(baseColor, 4, rng);
            setPixel(ctx, x, y, rgb(noisyColor[0], noisyColor[1], noisyColor[2]));
        }
    }

    return canvas;
}

/**
 * Procedural 16x16 Grass Side Texture
 */
export function generateGrassSideCanvas(seed = 202) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const dirtCanvas = generateDirtCanvas(seed + 1);
    ctx.drawImage(dirtCanvas, 0, 0);

    const bladeDepths = [
        2, 3, 4, 3, 2, 2, 3, 5, 4, 3, 2, 3, 4, 3, 2, 3
    ];

    const grassPalette = [
        { color: [91, 140, 56],  weight: 0.45 },
        { color: [108, 164, 66], weight: 0.25 },
        { color: [77, 120, 47],  weight: 0.20 },
        { color: [126, 186, 77], weight: 0.10 }
    ];

    for (let x = 0; x < 16; x++) {
        const depth = bladeDepths[x];
        for (let y = 0; y < depth; y++) {
            const isBottomTip = (y === depth - 1);
            let color;
            if (isBottomTip && depth > 2) {
                color = [50, 80, 30];
            } else {
                color = pickWeighted(grassPalette, rng);
                color = jitter(color, 4, rng);
            }
            setPixel(ctx, x, y, rgb(color[0], color[1], color[2]));
        }
    }

    return canvas;
}

/**
 * Procedural 16x16 Stone Texture
 */
export function generateStoneCanvas(seed = 303) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const palette = [
        { color: [120, 120, 120], weight: 0.40 },
        { color: [105, 105, 105], weight: 0.25 },
        { color: [136, 136, 136], weight: 0.20 },
        { color: [90, 90, 90],    weight: 0.10 },
        { color: [155, 155, 155], weight: 0.05 }
    ];

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const baseColor = pickWeighted(palette, rng);
            const noisyColor = jitter(baseColor, 5, rng);
            setPixel(ctx, x, y, rgb(noisyColor[0], noisyColor[1], noisyColor[2]));
        }
    }

    return canvas;
}

/**
 * Procedural 16x16 Cobblestone Texture
 */
export function generateCobblestoneCanvas(seed = 404) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    ctx.fillStyle = "#383838";
    ctx.fillRect(0, 0, 16, 16);

    const rocks = [
        { x: 1, y: 1, w: 6, h: 4 },
        { x: 8, y: 1, w: 7, h: 3 },
        { x: 1, y: 6, w: 4, h: 4 },
        { x: 6, y: 5, w: 5, h: 5 },
        { x: 12, y: 5, w: 3, h: 5 },
        { x: 1, y: 11, w: 6, h: 4 },
        { x: 8, y: 11, w: 7, h: 4 }
    ];

    rocks.forEach(rock => {
        for (let ry = 0; ry < rock.h; ry++) {
            for (let rx = 0; rx < rock.w; rx++) {
                const px = rock.x + rx;
                const py = rock.y + ry;
                if (px < 16 && py < 16) {
                    const isEdge = (rx === 0 || rx === rock.w - 1 || ry === 0 || ry === rock.h - 1);
                    const shade = isEdge ? 90 + rng() * 20 : 130 + rng() * 30;
                    setPixel(ctx, px, py, rgb(shade, shade, shade));
                }
            }
        }
    });

    return canvas;
}

/**
 * Procedural 16x16 Oak Wood Planks Texture
 */
export function generatePlanksCanvas(seed = 505) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const baseWood = [170, 128, 77];
    const darkWood = [135, 98, 55];
    const seamColor = [95, 68, 38];

    for (let y = 0; y < 16; y++) {
        const isPlankBorder = (y % 4 === 3);
        for (let x = 0; x < 16; x++) {
            if (isPlankBorder) {
                setPixel(ctx, x, y, rgb(seamColor[0], seamColor[1], seamColor[2]));
            } else {
                const grain = (rng() > 0.3) ? baseWood : darkWood;
                const color = jitter(grain, 8, rng);
                setPixel(ctx, x, y, rgb(color[0], color[1], color[2]));
            }
        }
    }

    const joints = [
        { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 },
        { x: 11, y: 4 }, { x: 11, y: 5 }, { x: 11, y: 6 },
        { x: 4, y: 8 }, { x: 4, y: 9 }, { x: 4, y: 10 },
        { x: 12, y: 12 }, { x: 12, y: 13 }, { x: 12, y: 14 }
    ];

    joints.forEach(j => {
        setPixel(ctx, j.x, j.y, rgb(seamColor[0], seamColor[1], seamColor[2]));
    });

    return canvas;
}

/**
 * Procedural 16x16 Oak Log (Side Bark) Texture
 */
export function generateLogSideCanvas(seed = 606) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const barkPalette = [
        { color: [107, 78, 45], weight: 0.4 },
        { color: [84, 59, 32],  weight: 0.35 },
        { color: [61, 41, 21],  weight: 0.15 },
        { color: [128, 95, 58], weight: 0.10 }
    ];

    for (let x = 0; x < 16; x++) {
        const colBase = pickWeighted(barkPalette, rng);
        for (let y = 0; y < 16; y++) {
            const noisy = jitter(colBase, 10, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }

    return canvas;
}

/**
 * Procedural 16x16 Oak Log (Top Rings) Texture
 */
export function generateLogTopCanvas(seed = 707) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const barkBorder = [84, 59, 32];
    const ringDark = [160, 125, 78];
    const ringLight = [186, 149, 97];
    const core = [140, 105, 62];

    const centerX = 7.5;
    const centerY = 7.5;

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            let color;
            if (x === 0 || x === 15 || y === 0 || y === 15 || dist >= 7.2) {
                color = jitter(barkBorder, 8, rng);
            } else if (dist < 2.0) {
                color = jitter(core, 6, rng);
            } else if (Math.sin(dist * 2.2) > 0) {
                color = jitter(ringDark, 6, rng);
            } else {
                color = jitter(ringLight, 6, rng);
            }
            setPixel(ctx, x, y, rgb(color[0], color[1], color[2]));
        }
    }

    return canvas;
}

/**
 * Procedural 16x16 Sand Texture
 */
export function generateSandCanvas(seed = 808) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const palette = [
        { color: [219, 211, 160], weight: 0.50 },
        { color: [206, 196, 142], weight: 0.30 },
        { color: [230, 222, 175], weight: 0.15 },
        { color: [184, 174, 120], weight: 0.05 }
    ];

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 4, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }

    return canvas;
}

/**
 * Procedural 16x16 Bedrock Texture
 */
export function generateBedrockCanvas(seed = 909) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const palette = [
        { color: [20, 20, 20],   weight: 0.40 },
        { color: [45, 45, 45],   weight: 0.30 },
        { color: [75, 75, 75],   weight: 0.20 },
        { color: [110, 110, 110], weight: 0.10 }
    ];

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 6, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }

    return canvas;
}

/**
 * Procedural 16x16 Glass Texture
 */
export function generateGlassCanvas() {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.clearRect(0, 0, 16, 16);

    const frameColor = "rgba(215, 235, 245, 0.7)";
    const glintColor = "rgba(255, 255, 255, 0.85)";

    for (let i = 0; i < 16; i++) {
        setPixel(ctx, i, 0, frameColor);
        setPixel(ctx, i, 15, frameColor);
        setPixel(ctx, 0, i, frameColor);
        setPixel(ctx, 15, i, frameColor);
    }

    const glints = [
        { x: 3, y: 3 }, { x: 4, y: 2 }, { x: 5, y: 1 },
        { x: 4, y: 4 }, { x: 5, y: 3 },
        { x: 10, y: 10 }, { x: 11, y: 9 }, { x: 12, y: 8 }
    ];

    glints.forEach(g => {
        setPixel(ctx, g.x, g.y, glintColor);
    });

    return canvas;
}

/**
 * Procedural 16x16 Leaves Texture
 */
export function generateLeavesCanvas(seed = 1111) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    ctx.clearRect(0, 0, 16, 16);

    const palette = [
        { color: [46, 94, 30],  weight: 0.40 },
        { color: [58, 117, 38], weight: 0.35 },
        { color: [72, 144, 48], weight: 0.15 }
    ];

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            if (rng() < 0.18) {
                continue;
            }
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 6, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }

    return canvas;
}

/**
 * Procedural 16x16 Brick Texture
 */
export function generateBrickCanvas(seed = 1212) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const mortar = [185, 175, 165];
    const brickRed = [156, 68, 54];
    const brickDark = [125, 50, 38];
    const brickLight = [180, 85, 68];

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const isMortarY = (y % 4 === 0);
            const isMortarX1 = (y < 8 && y > 0 && x === 7);
            const isMortarX2 = (y > 8 && y < 16 && (x === 3 || x === 11));

            if (isMortarY || isMortarX1 || isMortarX2) {
                const mColor = jitter(mortar, 6, rng);
                setPixel(ctx, x, y, rgb(mColor[0], mColor[1], mColor[2]));
            } else {
                const choice = rng();
                const bBase = choice < 0.6 ? brickRed : (choice < 0.85 ? brickDark : brickLight);
                const bColor = jitter(bBase, 8, rng);
                setPixel(ctx, x, y, rgb(bColor[0], bColor[1], bColor[2]));
            }
        }
    }

    return canvas;
}

/**
 * Procedural 16x16 Ore Texture
 */
export function generateOreCanvas(oreType = "redstone", seed = 1313) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const stoneCanvas = generateStoneCanvas(seed);
    ctx.drawImage(stoneCanvas, 0, 0);

    const orePalettes = {
        coal: { base: [36, 36, 36], highlight: [60, 60, 60], shadow: [15, 15, 15] },
        iron: { base: [216, 175, 147], highlight: [240, 205, 180], shadow: [170, 130, 105] },
        gold: { base: [255, 215, 0], highlight: [255, 240, 120], shadow: [195, 155, 0] },
        redstone: { base: [230, 20, 20], highlight: [255, 90, 90], shadow: [160, 10, 10] },
        diamond: { base: [92, 230, 225], highlight: [180, 255, 250], shadow: [40, 160, 160] },
        lapis: { base: [30, 70, 180], highlight: [70, 120, 230], shadow: [15, 35, 110] },
        emerald: { base: [23, 221, 98], highlight: [110, 255, 160], shadow: [12, 140, 60] }
    };

    const oreColors = orePalettes[oreType] || orePalettes.redstone;

    const clusters = [
        { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 },
        { x: 10, y: 4 }, { x: 11, y: 4 }, { x: 11, y: 5 },
        { x: 6, y: 9 }, { x: 7, y: 9 }, { x: 7, y: 10 }, { x: 8, y: 9 },
        { x: 12, y: 11 }, { x: 13, y: 11 },
        { x: 2, y: 12 }, { x: 3, y: 12 }, { x: 2, y: 13 }
    ];

    clusters.forEach(pt => {
        const r = rng();
        const color = (r < 0.25) ? oreColors.highlight : ((r < 0.75) ? oreColors.base : oreColors.shadow);
        const noisy = jitter(color, 4, rng);
        setPixel(ctx, pt.x, pt.y, rgb(noisy[0], noisy[1], noisy[2]));
    });

    return canvas;
}

/**
 * Procedural 16x16 Animated/Liquid Water Texture
 */
export function generateWaterCanvas(seed = 1414) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const palette = [
        { color: [40, 80, 200, 0.8],  weight: 0.40 },
        { color: [30, 65, 180, 0.8],  weight: 0.30 },
        { color: [60, 110, 230, 0.8], weight: 0.20 },
        { color: [90, 145, 255, 0.8], weight: 0.10 }
    ];

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            setPixel(ctx, x, y, rgb(base[0], base[1], base[2], base[3]));
        }
    }

    return canvas;
}

/**
 * Procedural 16x16 Animated/Liquid Lava Texture
 */
export function generateLavaCanvas(seed = 1515) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const palette = [
        { color: [230, 90, 10],  weight: 0.45 },
        { color: [200, 45, 5],   weight: 0.30 },
        { color: [255, 180, 20], weight: 0.15 },
        { color: [130, 20, 0],   weight: 0.10 }
    ];

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 6, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }

    return canvas;
}

/**
 * Procedural 16x16 Gravel Texture
 */
export function generateGravelCanvas(seed = 1616) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const palette = [
        { color: [136, 126, 126], weight: 0.40 },
        { color: [120, 110, 110], weight: 0.25 },
        { color: [155, 145, 145], weight: 0.20 },
        { color: [95, 88, 88],    weight: 0.10 },
        { color: [175, 160, 155], weight: 0.05 }
    ];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 5, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Sandstone Side Texture
 */
export function generateSandstoneSideCanvas(seed = 1717) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const baseTan = [218, 210, 158];
    const shadowTan = [190, 180, 130];
    const darkBand = [160, 150, 105];
    for (let y = 0; y < 16; y++) {
        const isBand = (y === 3 || y === 11 || y === 12);
        for (let x = 0; x < 16; x++) {
            const base = isBand ? darkBand : ((rng() > 0.4) ? baseTan : shadowTan);
            const noisy = jitter(base, 4, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Sandstone Top Texture
 */
export function generateSandstoneTopCanvas(seed = 1718) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const palette = [
        { color: [225, 218, 170], weight: 0.50 },
        { color: [210, 202, 150], weight: 0.35 },
        { color: [195, 185, 135], weight: 0.15 }
    ];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 3, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Sandstone Bottom Texture
 */
export function generateSandstoneBottomCanvas(seed = 1719) {
    return generateSandstoneTopCanvas(seed + 10);
}

/**
 * Procedural 16x16 Snow Texture
 */
export function generateSnowCanvas(seed = 1818) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const palette = [
        { color: [240, 246, 250], weight: 0.55 },
        { color: [225, 235, 245], weight: 0.30 },
        { color: [210, 222, 238], weight: 0.10 },
        { color: [255, 255, 255], weight: 0.05 }
    ];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 2, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Ice Texture
 */
export function generateIceCanvas(seed = 1919) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const palette = [
        { color: [140, 180, 245, 0.85], weight: 0.50 },
        { color: [160, 200, 255, 0.85], weight: 0.30 },
        { color: [120, 160, 235, 0.85], weight: 0.15 },
        { color: [200, 230, 255, 0.90], weight: 0.05 }
    ];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            setPixel(ctx, x, y, rgb(base[0], base[1], base[2], base[3]));
        }
    }
    const frost = [{x: 4, y: 3}, {x: 5, y: 4}, {x: 6, y: 5}, {x: 11, y: 10}, {x: 12, y: 11}];
    frost.forEach(pt => setPixel(ctx, pt.x, pt.y, 'rgba(230,245,255,0.95)'));
    return canvas;
}

/**
 * Procedural 16x16 Cactus Side Texture
 */
export function generateCactusSideCanvas(seed = 2020) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const greenRib = [15, 115, 25];
    const greenDark = [10, 85, 18];
    const spineColor = [220, 220, 220];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const isGroove = (x % 4 === 0);
            const base = isGroove ? greenDark : greenRib;
            const noisy = jitter(base, 4, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    const spines = [
        {x: 2, y: 3}, {x: 6, y: 7}, {x: 10, y: 3}, {x: 14, y: 7},
        {x: 2, y: 11}, {x: 6, y: 15}, {x: 10, y: 11}, {x: 14, y: 15}
    ];
    spines.forEach(s => setPixel(ctx, s.x, s.y, rgb(spineColor[0], spineColor[1], spineColor[2])));
    return canvas;
}

/**
 * Procedural 16x16 Cactus Top Texture
 */
export function generateCactusTopCanvas(seed = 2021) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const green = [18, 125, 30];
    const center = [10, 80, 18];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const isCenter = (x >= 6 && x <= 9 && y >= 6 && y <= 9);
            const base = isCenter ? center : green;
            const noisy = jitter(base, 4, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Clay Texture
 */
export function generateClayCanvas(seed = 2121) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const palette = [
        { color: [160, 166, 178], weight: 0.45 },
        { color: [148, 154, 166], weight: 0.35 },
        { color: [175, 180, 192], weight: 0.20 }
    ];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 3, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Obsidian Texture
 */
export function generateObsidianCanvas(seed = 2222) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const palette = [
        { color: [20, 15, 30], weight: 0.50 },
        { color: [12, 10, 20], weight: 0.30 },
        { color: [38, 25, 55], weight: 0.15 },
        { color: [55, 35, 80], weight: 0.05 }
    ];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 4, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Sponge Texture
 */
export function generateSpongeCanvas(seed = 2323) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const palette = [
        { color: [195, 195, 60], weight: 0.55 },
        { color: [175, 175, 45], weight: 0.25 },
        { color: [135, 135, 30], weight: 0.15 },
        { color: [215, 215, 80], weight: 0.05 }
    ];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 5, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 TNT Side Texture
 */
export function generateTNTSideCanvas(seed = 2424) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const red = "#c82518";
    const white = "#eaeaea";
    const darkRed = "#8e150c";
    ctx.fillStyle = red;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = darkRed;
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillStyle = white;
    ctx.fillRect(0, 5, 16, 6);
    ctx.fillStyle = "#111111";
    ctx.fillRect(2, 6, 3, 1); ctx.fillRect(3, 7, 1, 3);
    ctx.fillRect(6, 6, 1, 4); ctx.fillRect(7, 7, 1, 1); ctx.fillRect(8, 8, 1, 1); ctx.fillRect(9, 6, 1, 4);
    ctx.fillRect(11, 6, 3, 1); ctx.fillRect(12, 7, 1, 3);
    return canvas;
}

/**
 * Procedural 16x16 TNT Top Texture
 */
export function generateTNTTopCanvas(seed = 2425) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const red = [180, 40, 28];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const noisy = jitter(red, 6, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    ctx.fillStyle = "#444444";
    ctx.fillRect(7, 7, 2, 2);
    ctx.fillStyle = "#888888";
    ctx.fillRect(7, 6, 1, 1);
    return canvas;
}

/**
 * Procedural 16x16 Bookshelf Texture
 */
export function generateBookshelfCanvas(seed = 2525) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const planks = generatePlanksCanvas(seed);
    ctx.drawImage(planks, 0, 0);

    const bookColors = [
        [160, 40, 30], [40, 70, 160], [40, 130, 50], [180, 140, 40], [120, 50, 140]
    ];
    for (let shelf = 0; shelf < 2; shelf++) {
        const startY = shelf === 0 ? 1 : 9;
        ctx.fillStyle = "#2a1a0f";
        ctx.fillRect(1, startY, 14, 6);
        let curX = 2;
        while (curX < 14) {
            const width = Math.min(14 - curX, Math.floor(rng() * 2) + 1);
            const color = bookColors[Math.floor(rng() * bookColors.length)];
            ctx.fillStyle = rgb(color[0], color[1], color[2]);
            ctx.fillRect(curX, startY + 1, width, 5);
            curX += width + 1;
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Crafting Table Top
 */
export function generateCraftingTableTopCanvas(seed = 2626) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const planks = generatePlanksCanvas(seed);
    ctx.drawImage(planks, 0, 0);
    ctx.strokeStyle = "#5a3a1f";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 15, 15);
    ctx.fillStyle = "rgba(60, 35, 15, 0.6)";
    for (let i = 1; i <= 2; i++) {
        ctx.fillRect(i * 5, 1, 1, 14);
        ctx.fillRect(1, i * 5, 14, 1);
    }
    return canvas;
}

/**
 * Procedural 16x16 Crafting Table Side
 */
export function generateCraftingTableSideCanvas(seed = 2627) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const planks = generatePlanksCanvas(seed);
    ctx.drawImage(planks, 0, 0);
    ctx.fillStyle = "#332211";
    ctx.fillRect(3, 4, 2, 8);
    ctx.fillRect(9, 4, 3, 3);
    ctx.fillRect(10, 7, 1, 5);
    return canvas;
}

/**
 * Procedural 16x16 Furnace Front
 */
export function generateFurnaceFrontCanvas(seed = 2727) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const stone = generateCobblestoneCanvas(seed);
    ctx.drawImage(stone, 0, 0);
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(3, 5, 10, 8);
    ctx.fillStyle = "#111111";
    ctx.fillRect(4, 6, 8, 6);
    return canvas;
}

/**
 * Procedural 16x16 Pumpkin Side
 */
export function generatePumpkinSideCanvas(seed = 2828) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const orangeBase = [215, 120, 20];
    const orangeDark = [170, 85, 10];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const isRib = (x % 4 === 0);
            const base = isRib ? orangeDark : orangeBase;
            const noisy = jitter(base, 6, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Pumpkin Top
 */
export function generatePumpkinTopCanvas(seed = 2829) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const orange = [200, 110, 15];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const noisy = jitter(orange, 6, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    ctx.fillStyle = "#4a6828";
    ctx.fillRect(7, 7, 2, 2);
    return canvas;
}

/**
 * Procedural 16x16 Pumpkin Face
 */
export function generatePumpkinFaceCanvas(seed = 2830) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const pumpkin = generatePumpkinSideCanvas(seed);
    ctx.drawImage(pumpkin, 0, 0);
    ctx.fillStyle = "#221100";
    ctx.fillRect(3, 4, 3, 2); ctx.fillRect(4, 3, 1, 1);
    ctx.fillRect(10, 4, 3, 2); ctx.fillRect(11, 3, 1, 1);
    ctx.fillRect(7, 7, 2, 2);
    ctx.fillRect(3, 11, 2, 2); ctx.fillRect(5, 12, 2, 2);
    ctx.fillRect(7, 11, 2, 2); ctx.fillRect(9, 12, 2, 2);
    ctx.fillRect(11, 11, 2, 2);
    return canvas;
}

/**
 * Procedural 16x16 Netherrack
 */
export function generateNetherrackCanvas(seed = 2929) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const palette = [
        { color: [110, 20, 20], weight: 0.40 },
        { color: [85, 12, 12],  weight: 0.30 },
        { color: [135, 30, 30], weight: 0.20 },
        { color: [60, 8, 8],    weight: 0.10 }
    ];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 5, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Soul Sand
 */
export function generateSoulSandCanvas(seed = 3030) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const palette = [
        { color: [80, 60, 48], weight: 0.45 },
        { color: [62, 45, 35], weight: 0.35 },
        { color: [100, 78, 62], weight: 0.20 }
    ];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 4, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Glowstone
 */
export function generateGlowstoneCanvas(seed = 3131) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const palette = [
        { color: [225, 175, 75], weight: 0.40 },
        { color: [250, 210, 110], weight: 0.30 },
        { color: [180, 130, 45], weight: 0.20 },
        { color: [255, 240, 170], weight: 0.10 }
    ];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 6, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Nether Quartz Ore Texture
 */
export function generateQuartzOreCanvas(seed = 2930) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    // Draw Netherrack background
    const netherrack = generateNetherrackCanvas(seed);
    ctx.drawImage(netherrack, 0, 0);

    const quartzColors = {
        base: [232, 226, 218],
        highlight: [255, 255, 252],
        shadow: [198, 189, 178]
    };

    const clusters = [
        { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 },
        { x: 10, y: 4 }, { x: 11, y: 4 }, { x: 11, y: 5 },
        { x: 6, y: 8 }, { x: 7, y: 8 }, { x: 7, y: 9 }, { x: 8, y: 9 }, { x: 6, y: 9 },
        { x: 12, y: 11 }, { x: 13, y: 11 }, { x: 12, y: 12 },
        { x: 2, y: 11 }, { x: 3, y: 11 }, { x: 2, y: 12 }, { x: 3, y: 12 }
    ];

    clusters.forEach(pt => {
        const r = rng();
        const color = (r < 0.35) ? quartzColors.highlight : ((r < 0.80) ? quartzColors.base : quartzColors.shadow);
        const noisy = jitter(color, 3, rng);
        setPixel(ctx, pt.x, pt.y, rgb(noisy[0], noisy[1], noisy[2]));
    });

    return canvas;
}

/**
 * Procedural 16x16 Block of Quartz Texture
 */
export function generateQuartzBlockCanvas(seed = 3535) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const baseColor = [235, 230, 222];
    const borderColor = [218, 212, 202];
    const highlightColor = [250, 247, 242];

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const isBorder = (x === 0 || x === 15 || y === 0 || y === 15);
            const isInnerHighlight = (x === 1 || y === 1) && !isBorder;
            const col = isBorder ? borderColor : (isInnerHighlight ? highlightColor : baseColor);
            const noisy = jitter(col, 3, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Quartz Pillar Side Texture
 */
export function generateQuartzPillarSideCanvas(seed = 3536) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const fluteLight = [242, 238, 232];
    const fluteBase = [232, 227, 218];
    const fluteShadow = [210, 204, 194];

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const colIdx = x % 4;
            let col = fluteBase;
            if (colIdx === 0) col = fluteLight;
            else if (colIdx === 1) col = fluteBase;
            else if (colIdx === 2) col = fluteBase;
            else if (colIdx === 3) col = fluteShadow;

            // Top and bottom border caps
            if (y === 0 || y === 15) {
                col = fluteShadow;
            }

            const noisy = jitter(col, 2, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Quartz Pillar Top Texture
 */
export function generateQuartzPillarTopCanvas(seed = 3537) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const baseColor = [232, 227, 218];
    const ringOuter = [212, 206, 196];
    const ringInner = [246, 242, 236];
    const centerDot = [200, 194, 184];

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            let col = baseColor;
            const dist = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
            if (dist > 6) col = ringOuter;
            else if (dist > 4.5) col = ringInner;
            else if (dist > 2.5) col = ringOuter;
            else if (dist > 1.5) col = ringInner;
            else col = centerDot;

            const noisy = jitter(col, 2, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Chiseled Quartz Block Texture
 */
export function generateQuartzChiseledCanvas(seed = 3538) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);

    const baseColor = [234, 229, 220];
    const shadow = [202, 196, 186];
    const highlight = [252, 248, 242];

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            let col = baseColor;
            // Outer border
            if (x === 0 || x === 15 || y === 0 || y === 15) {
                col = shadow;
            } else if (x === 1 || y === 1) {
                col = highlight;
            } else if (x === 14 || y === 14) {
                col = shadow;
            } else if (x === 3 || x === 12 || y === 3 || y === 12) {
                // Inner frame
                if (x >= 3 && x <= 12 && y >= 3 && y <= 12) {
                    col = (x === 3 || y === 3) ? shadow : highlight;
                }
            } else if (x >= 6 && x <= 9 && y >= 6 && y <= 9) {
                // Central carved gem symbol
                col = shadow;
            }

            const noisy = jitter(col, 2, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Mossy Cobblestone
 */
export function generateMossyCobblestoneCanvas(seed = 3232) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const cobble = generateCobblestoneCanvas(seed);
    ctx.drawImage(cobble, 0, 0);

    const mossPalette = [
        { color: [60, 110, 40], weight: 0.50 },
        { color: [75, 135, 50], weight: 0.30 },
        { color: [45, 85, 30],  weight: 0.20 }
    ];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            if (rng() < 0.35) {
                const base = pickWeighted(mossPalette, rng);
                const noisy = jitter(base, 4, rng);
                setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
            }
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Solid Metal / Mineral Block
 */
export function generateSolidMineralBlockCanvas(type = "gold", seed = 3333) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const mineralPalettes = {
        gold: { base: [245, 215, 50], border: [195, 160, 20], highlight: [255, 240, 120] },
        iron: { base: [220, 220, 220], border: [165, 165, 165], highlight: [245, 245, 245] },
        diamond: { base: [95, 235, 230], border: [55, 175, 170], highlight: [180, 255, 250] },
        lapis: { base: [30, 70, 170], border: [18, 45, 120], highlight: [60, 110, 220] },
        redstone: { base: [210, 25, 25], border: [150, 15, 15], highlight: [255, 80, 80] },
        emerald: { base: [25, 210, 95], border: [15, 140, 60], highlight: [100, 250, 155] }
    };
    const p = mineralPalettes[type] || mineralPalettes.gold;
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const isBorder = (x === 0 || x === 15 || y === 0 || y === 15);
            const isHighlight = (x === 1 || y === 1);
            const base = isBorder ? p.border : (isHighlight ? p.highlight : p.base);
            const noisy = jitter(base, 4, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}

/**
 * Procedural 16x16 Wool Texture
 */
export function generateWoolCanvas(seed = 3434) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const rng = createRNG(seed);
    const palette = [
        { color: [225, 225, 225], weight: 0.50 },
        { color: [205, 205, 205], weight: 0.35 },
        { color: [185, 185, 185], weight: 0.15 }
    ];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const base = pickWeighted(palette, rng);
            const noisy = jitter(base, 3, rng);
            setPixel(ctx, x, y, rgb(noisy[0], noisy[1], noisy[2]));
        }
    }
    return canvas;
}


export function generateDispenserFrontCanvas(seed = 4001) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const base = generateCobblestoneCanvas(seed);
    ctx.drawImage(base, 0, 0);
    ctx.fillStyle = "#333";
    ctx.fillRect(6, 6, 4, 4);
    ctx.fillStyle = "#555";
    ctx.fillRect(7, 5, 2, 1);
    ctx.fillRect(5, 7, 1, 2);
    ctx.fillRect(10, 7, 1, 2);
    ctx.fillRect(7, 10, 2, 1);
    return canvas;
}

export function generateDropperFrontCanvas(seed = 4002) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const base = generateCobblestoneCanvas(seed);
    ctx.drawImage(base, 0, 0);
    ctx.fillStyle = "#333";
    ctx.fillRect(6, 7, 4, 3);
    ctx.fillRect(7, 10, 2, 1);
    ctx.fillStyle = "#555";
    ctx.fillRect(5, 8, 1, 3);
    ctx.fillRect(10, 8, 1, 3);
    ctx.fillRect(7, 6, 2, 1);
    return canvas;
}

export function generatePistonSideCanvas(seed = 4003) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const base = generateCobblestoneCanvas(seed);
    ctx.drawImage(base, 0, 0);
    const wood = generatePlanksCanvas(seed);
    ctx.drawImage(wood, 0, 0, 16, 4, 0, 0, 16, 4);
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 4, 16, 1);
    return canvas;
}

export function generatePistonTopCanvas(seed = 4004) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const wood = generatePlanksCanvas(seed);
    ctx.drawImage(wood, 0, 0);
    return canvas;
}

export function generateHopperTopCanvas(seed = 4005) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const base = generateSolidMineralBlockCanvas("iron", seed);
    ctx.drawImage(base, 0, 0);
    ctx.fillStyle = "#222";
    ctx.fillRect(4, 4, 8, 8);
    return canvas;
}

export function generateHopperSideCanvas(seed = 4006) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const base = generateSolidMineralBlockCanvas("iron", seed);
    ctx.drawImage(base, 0, 0);
    ctx.fillStyle = "#000";
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(0, 8, 4, 8);
    ctx.fillRect(12, 8, 4, 8);
    ctx.globalCompositeOperation = "source-over";
    return canvas;
}

export function generateRepeaterTopCanvas(seed = 4007) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const base = generateStoneCanvas(seed);
    ctx.drawImage(base, 0, 0);
    ctx.fillStyle = "#a00";
    ctx.fillRect(7, 2, 2, 3);
    ctx.fillRect(7, 10, 2, 3);
    return canvas;
}

export function generateBedTopCanvas(seed = 4008) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.fillStyle = "#d00";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#fff";
    ctx.fillRect(2, 2, 12, 6);
    return canvas;
}


export function generateWoodenDoorCanvas(seed = 4010) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const wood = generatePlanksCanvas(seed);
    ctx.drawImage(wood, 0, 0);
    ctx.fillStyle = "#321"; // Dark wood windows
    ctx.fillRect(2, 2, 4, 4);
    ctx.fillRect(10, 2, 4, 4);
    ctx.fillRect(2, 8, 4, 4);
    ctx.fillRect(10, 8, 4, 4);
    return canvas;
}

export function generateIronDoorCanvas(seed = 4011) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const iron = generateSolidMineralBlockCanvas("iron", seed);
    ctx.drawImage(iron, 0, 0);
    ctx.fillStyle = "#444";
    ctx.fillRect(2, 2, 4, 4);
    ctx.fillRect(10, 2, 4, 4);
    ctx.fillRect(2, 8, 4, 4);
    ctx.fillRect(10, 8, 4, 4);
    return canvas;
}

export function generateBedSideCanvas(seed = 4009) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    const wood = generatePlanksCanvas(seed);
    ctx.drawImage(wood, 0, 0);
    ctx.fillStyle = "#d00";
    ctx.fillRect(0, 0, 16, 8);
    return canvas;
}

// ==========================================
// 4. THREE.JS TEXTURE INTEGRATION
// ==========================================

/**
 * Wraps an HTML5 Canvas into a Three.js CanvasTexture with pixel-art settings.
 * Applies NearestFilter so textures remain sharp voxels without linear blur.
 * @param {HTMLCanvasElement} canvas 
 * @returns {THREE.CanvasTexture}
 */
export function createThreeCanvasTexture(canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    if (THREE.SRGBColorSpace) {
        texture.colorSpace = THREE.SRGBColorSpace;
    }
    texture.needsUpdate = true;
    return texture;
}

/**
 * Map of texture generator functions by block name.
 */

/**
 * Procedural 16x16 Destroy Stage Canvas (0-9)
 */

export function generateFlowerCanvas(type = "dandelion", seed = 9999) {
    const { canvas, ctx } = createPixelCanvas();
    const rng = createRNG(seed);
    
    // Transparent background
    ctx.clearRect(0, 0, 16, 16);
    
    const stemColor = "#2d7b1a";
    const leafColor = "#3c9e25";
    const headColor = type === "dandelion" ? "#ffec30" : "#d12222";
    const coreColor = type === "dandelion" ? "#d1a815" : "#871111";
    
    // Draw stem
    ctx.fillStyle = stemColor;
    ctx.fillRect(7, 8, 2, 8);
    
    // Draw leaves
    ctx.fillStyle = leafColor;
    ctx.fillRect(5, 12, 2, 2);
    ctx.fillRect(9, 10, 2, 2);
    
    // Draw head
    ctx.fillStyle = headColor;
    ctx.fillRect(5, 4, 6, 5);
    ctx.fillRect(6, 3, 4, 1);
    ctx.fillRect(4, 5, 1, 3);
    ctx.fillRect(11, 5, 1, 3);
    
    // Draw core
    ctx.fillStyle = coreColor;
    ctx.fillRect(7, 5, 2, 2);
    
    return canvas;
}

export function generateTorchCanvas(seed = 5050) {
    const { canvas, ctx } = createPixelCanvas();
    ctx.clearRect(0, 0, 16, 16);
    
    // Draw stick (2x6)
    ctx.fillStyle = "#5c4a30";
    ctx.fillRect(7, 6, 2, 6);
    ctx.fillStyle = "#4a3b26"; // shadow
    ctx.fillRect(8, 6, 1, 6);
    
    // Draw coal head (2x2)
    ctx.fillStyle = "#222222";
    ctx.fillRect(7, 4, 2, 2);
    
    // Draw fire
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(7, 3, 2, 1);
    ctx.fillRect(7, 4, 1, 1);
    ctx.fillStyle = "#ff9900";
    ctx.fillRect(8, 4, 1, 1);
    
    return canvas;
}

export function generateDestroyStageCanvas(stage = 0) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.clearRect(0, 0, 16, 16);
    const rng = createRNG(12345 + stage * 10);
    
    // Crack properties based on stage (0 = barely cracked, 9 = almost destroyed)
    const crackColor = "rgba(0, 0, 0, 0.75)";
    const numCracks = 2 + stage * 3;
    const maxCrackLength = 3 + stage * 2;
    
    ctx.fillStyle = crackColor;
    
    // Generate random walking cracks
    for (let i = 0; i < numCracks; i++) {
        let x = Math.floor(rng() * 16);
        let y = Math.floor(rng() * 16);
        
        let length = Math.floor(rng() * maxCrackLength) + 1;
        for (let j = 0; j < length; j++) {
            if (x >= 0 && x < 16 && y >= 0 && y < 16) {
                setPixel(ctx, x, y, crackColor);
            }
            // Move randomly
            const dir = rng();
            if (dir < 0.25) x++;
            else if (dir < 0.5) x--;
            else if (dir < 0.75) y++;
            else y--;
        }
    }
    
    return canvas;
}

export function generateRailNormalCanvas() {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.fillStyle = "#5c4028";
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = "#888888"; 
    ctx.fillRect(4, 0, 2, 16);
    ctx.fillRect(10, 0, 2, 16);
    ctx.fillStyle = "#cccccc"; 
    ctx.fillRect(4, 0, 1, 16);
    ctx.fillRect(10, 0, 1, 16);
    return canvas;
}

export function generateRailGoldenCanvas() {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.fillStyle = "#5c4028";
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = "#d4af37"; 
    ctx.fillRect(4, 0, 2, 16);
    ctx.fillRect(10, 0, 2, 16);
    ctx.fillStyle = "#f3e5ab"; 
    ctx.fillRect(4, 0, 1, 16);
    ctx.fillRect(10, 0, 1, 16);
    ctx.fillStyle = "#4a0000";
    ctx.fillRect(7, 0, 2, 16);
    return canvas;
}

export function generateRailGoldenPoweredCanvas() {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.fillStyle = "#5c4028";
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = "#d4af37"; 
    ctx.fillRect(4, 0, 2, 16);
    ctx.fillRect(10, 0, 2, 16);
    ctx.fillStyle = "#f3e5ab"; 
    ctx.fillRect(4, 0, 1, 16);
    ctx.fillRect(10, 0, 1, 16);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(7, 0, 2, 16);
    return canvas;
}

export function generateRailDetectorCanvas() {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.fillStyle = "#5c4028";
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = "#777777";
    ctx.fillRect(4, 5, 8, 6);
    ctx.fillStyle = "#888888"; 
    ctx.fillRect(4, 0, 2, 16);
    ctx.fillRect(10, 0, 2, 16);
    ctx.fillStyle = "#cccccc"; 
    ctx.fillRect(4, 0, 1, 16);
    ctx.fillRect(10, 0, 1, 16);
    return canvas;
}

export function generateRailActivatorCanvas() {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.fillStyle = "#5c4028";
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = "#888888"; 
    ctx.fillRect(4, 0, 2, 16);
    ctx.fillRect(10, 0, 2, 16);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(7, 4, 2, 2);
    ctx.fillRect(7, 10, 2, 2);
    return canvas;
}

export const GENERATORS = {
    rail_normal: generateRailNormalCanvas,
    rail_golden: generateRailGoldenCanvas,
    rail_golden_powered: generateRailGoldenPoweredCanvas,
    rail_detector: generateRailDetectorCanvas,
    rail_activator: generateRailActivatorCanvas,
    destroy_stage_0: () => generateDestroyStageCanvas(0),
    destroy_stage_1: () => generateDestroyStageCanvas(1),
    destroy_stage_2: () => generateDestroyStageCanvas(2),
    destroy_stage_3: () => generateDestroyStageCanvas(3),
    destroy_stage_4: () => generateDestroyStageCanvas(4),
    destroy_stage_5: () => generateDestroyStageCanvas(5),
    destroy_stage_6: () => generateDestroyStageCanvas(6),
    destroy_stage_7: () => generateDestroyStageCanvas(7),
    destroy_stage_8: () => generateDestroyStageCanvas(8),
    destroy_stage_9: () => generateDestroyStageCanvas(9),
    grass: generateGrassTopCanvas,
    grass_top: generateGrassTopCanvas,
    grass_side: generateGrassSideCanvas,
    dirt: generateDirtCanvas,
    stone: generateStoneCanvas,
    cobblestone: generateCobblestoneCanvas,
    wood: generatePlanksCanvas,
    planks: generatePlanksCanvas,
    log_side: generateLogSideCanvas,
    log_top: generateLogTopCanvas,
    sand: generateSandCanvas,
    bedrock: generateBedrockCanvas,
    glass: generateGlassCanvas,
    leaves: generateLeavesCanvas,
    brick: generateBrickCanvas,
    water: generateWaterCanvas,
    lava: generateLavaCanvas,
    gravel: generateGravelCanvas,
    sandstone: generateSandstoneSideCanvas,
    sandstone_side: generateSandstoneSideCanvas,
    sandstone_top: generateSandstoneTopCanvas,
    sandstone_bottom: generateSandstoneBottomCanvas,
    snow: generateSnowCanvas,
    ice: generateIceCanvas,
    cactus: generateCactusSideCanvas,
    cactus_side: generateCactusSideCanvas,
    cactus_top: generateCactusTopCanvas,
    cactus_bottom: generateCactusTopCanvas,
    clay: generateClayCanvas,
    obsidian: generateObsidianCanvas,
    sponge: generateSpongeCanvas,
    tnt: generateTNTSideCanvas,
    tnt_side: generateTNTSideCanvas,
    tnt_top: generateTNTTopCanvas,
    tnt_bottom: generateTNTTopCanvas,
    bookshelf: generateBookshelfCanvas,
    crafting_table_top: generateCraftingTableTopCanvas,
    crafting_table_side: generateCraftingTableSideCanvas,
    furnace_front: generateFurnaceFrontCanvas,
    furnace_side: generateCobblestoneCanvas,
    furnace_top: generateStoneCanvas,
    pumpkin_side: generatePumpkinSideCanvas,
    pumpkin_top: generatePumpkinTopCanvas,
    pumpkin_face: generatePumpkinFaceCanvas,
    netherrack: generateNetherrackCanvas,
    soul_sand: generateSoulSandCanvas,
    glowstone: generateGlowstoneCanvas,
    mossy_cobblestone: generateMossyCobblestoneCanvas,
    gold_block: (seed) => generateSolidMineralBlockCanvas("gold", seed),
    iron_block: (seed) => generateSolidMineralBlockCanvas("iron", seed),
    diamond_block: (seed) => generateSolidMineralBlockCanvas("diamond", seed),
    lapis_block: (seed) => generateSolidMineralBlockCanvas("lapis", seed),
    redstone_block: (seed) => generateSolidMineralBlockCanvas("redstone", seed),
    emerald_block: (seed) => generateSolidMineralBlockCanvas("emerald", seed),
    wool: generateWoolCanvas,
    coal_ore: (seed) => generateOreCanvas("coal", seed),
    iron_ore: (seed) => generateOreCanvas("iron", seed),
    gold_ore: (seed) => generateOreCanvas("gold", seed),
    torch: generateTorchCanvas,
    redstone_ore: (seed) => generateOreCanvas("redstone", seed),
    dandelion: () => generateFlowerCanvas("dandelion", 11),
    poppy: () => generateFlowerCanvas("poppy", 12),
    diamond_ore: (seed) => generateOreCanvas("diamond", seed),
    lapis_ore: (seed) => generateOreCanvas("lapis", seed),
    emerald_ore: (seed) => generateOreCanvas("emerald", seed),
    quartz_ore: generateQuartzOreCanvas,
    quartz_block: generateQuartzBlockCanvas,
    quartz_block_top: generateQuartzBlockCanvas,
    quartz_block_side: generateQuartzBlockCanvas,
    quartz_block_bottom: generateQuartzBlockCanvas,
    quartz_pillar: generateQuartzPillarSideCanvas,
    quartz_pillar_side: generateQuartzPillarSideCanvas,
    quartz_pillar_top: generateQuartzPillarTopCanvas,
    quartz_chiseled: generateQuartzChiseledCanvas,
    quartz_chiseled_top: generateQuartzChiseledCanvas,
    quartz_chiseled_side: generateQuartzChiseledCanvas,
    dispenser_front: generateDispenserFrontCanvas,
    dropper_front: generateDropperFrontCanvas,
    piston_side: generatePistonSideCanvas,
    piston_top: generatePistonTopCanvas,
    hopper_top: generateHopperTopCanvas,
    hopper_side: generateHopperSideCanvas,
    repeater_top: generateRepeaterTopCanvas,
    bed_top: generateBedTopCanvas,
    bed_side: generateBedSideCanvas,
    wooden_door: generateWoodenDoorCanvas,
    iron_door: generateIronDoorCanvas
};

/**
 * Generate an HTML5 Canvas for a specific texture name.
 * @param {string} name 
 * @param {number} [seed] 
 * @returns {HTMLCanvasElement}
 */
export function getTextureCanvas(name, seed) {
    const gen = GENERATORS[name.toLowerCase()];
    if (!gen) {
        console.warn(`[textureGen] Unknown texture "${name}". Falling back to stone.`);
        return generateStoneCanvas(seed);
    }
    return gen(seed);
}

/**
 * Export a texture as a base64 Data URI (image/png).
 * @param {string} name 
 * @param {number} [seed] 
 * @returns {string} base64 Data URI
 */
export function getTextureDataURI(name, seed) {
    const canvas = getTextureCanvas(name, seed);
    return canvas.toDataURL("image/png");
}

/**
 * Get a Three.js CanvasTexture for a block type.
 * @param {string} name 
 * @param {number} [seed] 
 * @returns {THREE.CanvasTexture}
 */
export function getCanvasTexture(name, seed) {
    const canvas = getTextureCanvas(name, seed);
    return createThreeCanvasTexture(canvas);
}

/**
 * Generate an object map of all available textures as Three.js CanvasTextures.
 * @param {number} [seed] 
 * @returns {Record<string, THREE.CanvasTexture>}
 */
export function getAllCanvasTextures(seed) {
    const textures = {};
    for (const key of Object.keys(GENERATORS)) {
        textures[key] = getCanvasTexture(key, seed);
    }
    return textures;
}

/**
 * Generate an object map of all available textures as Base64 Data URIs.
 * @param {number} [seed] 
 * @returns {Record<string, string>}
 */
export function getAllDataURIs(seed) {
    const uris = {};
    for (const key of Object.keys(GENERATORS)) {
        uris[key] = getTextureDataURI(key, seed);
    }
    return uris;
}

/**
 * Helper to build standard 6-sided materials array for a voxel block.
 * @param {string} blockType 
 * @returns {THREE.MeshLambertMaterial[] | THREE.MeshBasicMaterial[]}
 */
export function createBlockMaterials(blockType) {
    const textures = {
        top: null,
        bottom: null,
        side: null
    };

    switch (blockType.toLowerCase()) {
        case "grass":
            textures.top = getCanvasTexture("grass_top");
            textures.bottom = getCanvasTexture("dirt");
            textures.side = getCanvasTexture("grass_side");
            break;
        case "log":
        case "wood_log":
            textures.top = getCanvasTexture("log_top");
            textures.bottom = getCanvasTexture("log_top");
            textures.side = getCanvasTexture("log_side");
            break;
        default: {
            const tex = getCanvasTexture(blockType);
            textures.top = tex;
            textures.bottom = tex;
            textures.side = tex;
            break;
        }
    }

    const sideMat = new THREE.MeshLambertMaterial({ map: textures.side });
    const topMat = new THREE.MeshLambertMaterial({ map: textures.top });
    const bottomMat = new THREE.MeshLambertMaterial({ map: textures.bottom });

    return [
        sideMat,   // +X Right
        sideMat,   // -X Left
        topMat,    // +Y Top
        bottomMat, // -Y Bottom
        sideMat,   // +Z Front
        sideMat    // -Z Back
    ];
}

/**
 * Procedural Texture Atlas Generator
 * Compiles all block textures into a single texture sheet with UV coordinates.
 * Extremely efficient for voxel chunk meshing.
 */
export function generateTextureAtlas(blockList = Object.keys(GENERATORS), seed) {
    const count = blockList.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const atlasWidth = cols * 16;
    const atlasHeight = rows * 16;

    const { canvas, ctx } = createPixelCanvas(atlasWidth, atlasHeight);
    const uvs = {};

    blockList.forEach((name, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * 16;
        const y = row * 16;

        const tileCanvas = getTextureCanvas(name, seed);
        ctx.drawImage(tileCanvas, x, y);

        // Normalized UV coordinates
        uvs[name] = {
            uMin: x / atlasWidth,
            vMin: 1 - (y + 16) / atlasHeight,
            uMax: (x + 16) / atlasWidth,
            vMax: 1 - y / atlasHeight,
            x,
            y,
            width: 16,
            height: 16
        };
    });

    const texture = createThreeCanvasTexture(canvas);

    return {
        canvas,
        texture,
        dataURI: canvas.toDataURL("image/png"),
        uvs,
        atlasWidth,
        atlasHeight
    };
}

export default {
    createRNG,
    createPixelCanvas,
    generateDirtCanvas,
    generateGrassTopCanvas,
    generateGrassSideCanvas,
    generateStoneCanvas,
    generateCobblestoneCanvas,
    generatePlanksCanvas,
    generateLogSideCanvas,
    generateLogTopCanvas,
    generateSandCanvas,
    generateBedrockCanvas,
    generateGlassCanvas,
    generateLeavesCanvas,
    generateBrickCanvas,
    generateOreCanvas,
    generateWaterCanvas,
    generateLavaCanvas,
    generateGravelCanvas,
    generateSandstoneSideCanvas,
    generateSandstoneTopCanvas,
    generateSandstoneBottomCanvas,
    generateSnowCanvas,
    generateIceCanvas,
    generateCactusSideCanvas,
    generateCactusTopCanvas,
    generateClayCanvas,
    generateObsidianCanvas,
    generateSpongeCanvas,
    generateTNTSideCanvas,
    generateTNTTopCanvas,
    generateBookshelfCanvas,
    generateCraftingTableTopCanvas,
    generateCraftingTableSideCanvas,
    generateFurnaceFrontCanvas,
    generatePumpkinSideCanvas,
    generatePumpkinTopCanvas,
    generatePumpkinFaceCanvas,
    generateNetherrackCanvas,
    generateSoulSandCanvas,
    generateGlowstoneCanvas,
    generateMossyCobblestoneCanvas,
    generateSolidMineralBlockCanvas,
    generateWoolCanvas,
    generateQuartzOreCanvas,
    generateQuartzBlockCanvas,
    generateQuartzPillarSideCanvas,
    generateQuartzPillarTopCanvas,
    generateQuartzChiseledCanvas,
    createThreeCanvasTexture,
    getTextureCanvas,
    getTextureDataURI,
    getCanvasTexture,
    getAllCanvasTextures,
    getAllDataURIs,
    createBlockMaterials,
    generateTextureAtlas,
    generateDestroyStageCanvas,
    GENERATORS
};
