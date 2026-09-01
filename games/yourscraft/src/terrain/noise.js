

export class Random {
    
    constructor(seed = 1337) {
        this.setSeed(seed);
    }

    setSeed(seed) {
        if (typeof seed === 'string') {
            let hash = 1779033703 ^ seed.length;
            for (let i = 0; i < seed.length; i++) {
                hash = Math.imul(hash ^ seed.charCodeAt(i), 3432918353);
                hash = (hash << 13) | (hash >>> 19);
            }
            this.state = (hash >>> 0);
        } else {
            this.state = (seed >>> 0) || 1;
        }
    }

    next() {
        let t = (this.state += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    nextFloat(min = 0, max = 1) {
        return min + this.next() * (max - min);
    }
}

export class PerlinNoise {
    
    constructor(seed = 1337) {
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        this.reseed(seed);
    }

    reseed(seed) {
        const rng = new Random(seed);
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }
        // Fisher-Yates shuffle
        for (let i = 255; i > 0; i--) {
            const j = rng.nextInt(0, i);
            const temp = p[i];
            p[i] = p[j];
            p[j] = temp;
        }
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
            this.permMod12[i] = (this.perm[i] % 12);
        }
    }

    noise2D(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);

        const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
        const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);

        const aa = this.perm[this.perm[X] + Y];
        const ab = this.perm[this.perm[X] + Y + 1];
        const ba = this.perm[this.perm[X + 1] + Y];
        const bb = this.perm[this.perm[X + 1] + Y + 1];

        const gAA = grad2(this.permMod12[aa], xf, yf);
        const gBA = grad2(this.permMod12[ba], xf - 1, yf);
        const gAB = grad2(this.permMod12[ab], xf, yf - 1);
        const gBB = grad2(this.permMod12[bb], xf - 1, yf - 1);

        const x1 = lerp(gAA, gBA, u);
        const x2 = lerp(gAB, gBB, u);

        return lerp(x1, x2, v);
    }

    noise3D(x, y, z) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const zf = z - Math.floor(z);

        const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
        const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
        const w = zf * zf * zf * (zf * (zf * 6 - 15) + 10);

        const A = this.perm[X] + Y;
        const AA = this.perm[A] + Z;
        const AB = this.perm[A + 1] + Z;
        const B = this.perm[X + 1] + Y;
        const BA = this.perm[B] + Z;
        const BB = this.perm[B + 1] + Z;

        const g1 = grad3(this.permMod12[AA], xf, yf, zf);
        const g2 = grad3(this.permMod12[BA], xf - 1, yf, zf);
        const g3 = grad3(this.permMod12[AB], xf, yf - 1, zf);
        const g4 = grad3(this.permMod12[BB], xf - 1, yf - 1, zf);
        const g5 = grad3(this.permMod12[AA + 1], xf, yf, zf - 1);
        const g6 = grad3(this.permMod12[BA + 1], xf - 1, yf, zf - 1);
        const g7 = grad3(this.permMod12[AB + 1], xf, yf - 1, zf - 1);
        const g8 = grad3(this.permMod12[BB + 1], xf - 1, yf - 1, zf - 1);

        const x11 = lerp(g1, g2, u);
        const x12 = lerp(g3, g4, u);
        const x21 = lerp(g5, g6, u);
        const x22 = lerp(g7, g8, u);

        const y1 = lerp(x11, x12, v);
        const y2 = lerp(x21, x22, v);

        return lerp(y1, y2, w);
    }

    noise(x, y, z = 0) {
        return this.noise3D(x, y, z);
    }
}

export class ImprovedNoise {
    
    constructor(seed = 1337) {
        this.perlin = new PerlinNoise(seed);
    }

    reseed(seed) {
        this.perlin.reseed(seed);
    }

    noise(x, y, z = 0) {
        return this.perlin.noise3D(x, y, z);
    }

    noise2D(x, y) {
        return this.perlin.noise2D(x, y);
    }

    noise3D(x, y, z) {
        return this.perlin.noise3D(x, y, z);
    }

    fbm2D(x, y, options = {}) {
        const octaves = options.octaves || 4;
        const persistence = options.persistence !== undefined ? options.persistence : 0.5;
        const lacunarity = options.lacunarity || 2.0;
        let freq = options.frequency || 1.0;
        let amp = options.amplitude !== undefined ? options.amplitude : 1.0;

        let total = 0;
        let maxAmp = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.perlin.noise2D(x * freq, y * freq) * amp;
            maxAmp += amp;
            amp *= persistence;
            freq *= lacunarity;
        }

        return maxAmp > 0 ? (total / maxAmp) * (options.amplitude || 1.0) : 0;
    }

    fbm3D(x, y, z, options = {}) {
        const octaves = options.octaves || 4;
        const persistence = options.persistence !== undefined ? options.persistence : 0.5;
        const lacunarity = options.lacunarity || 2.0;
        let freq = options.frequency || 1.0;
        let amp = options.amplitude !== undefined ? options.amplitude : 1.0;

        let total = 0;
        let maxAmp = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.perlin.noise3D(x * freq, y * freq, z * freq) * amp;
            maxAmp += amp;
            amp *= persistence;
            freq *= lacunarity;
        }

        return maxAmp > 0 ? (total / maxAmp) * (options.amplitude || 1.0) : 0;
    }
}

const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
const F3 = 1.0 / 3.0;
const G3 = 1.0 / 6.0;

const GRAD3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

export class SimplexNoise {
    
    constructor(seed = 1337) {
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        this.reseed(seed);
    }

    reseed(seed) {
        const rng = new Random(seed);
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = rng.nextInt(0, i);
            const temp = p[i];
            p[i] = p[j];
            p[j] = temp;
        }
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
            this.permMod12[i] = this.perm[i] % 12;
        }
    }

    noise2D(xin, yin) {
        let n0 = 0, n1 = 0, n2 = 0;

        // Skew the input space to determine which simplex cell we're in
        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const t = (i + j) * G2;
        const X0 = i - t; // Unskew cell origin back to (x,y) space
        const Y0 = j - t;
        const x0 = xin - X0; // The x,y distances from cell origin
        const y0 = yin - Y0;

        // Determine which simplex we are in for 2D (triangle)
        let i1, j1;
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else {
            i1 = 0;
            j1 = 1;
        }

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;

        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.permMod12[ii + this.perm[jj]];
        const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
        const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

        // Calculate contribution from three corners
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            t0 *= t0;
            n0 = t0 * t0 * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            t1 *= t1;
            n1 = t1 * t1 * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            t2 *= t2;
            n2 = t2 * t2 * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2);
        }

        // Scale result to [-1, 1]
        return 70.0 * (n0 + n1 + n2);
    }

    noise3D(xin, yin, zin) {
        let n0 = 0, n1 = 0, n2 = 0, n3 = 0;

        // Skew input space
        const s = (xin + yin + zin) * F3;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const k = Math.floor(zin + s);
        const t = (i + j + k) * G3;
        const X0 = i - t;
        const Y0 = j - t;
        const Z0 = k - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;
        const z0 = zin - Z0;

        let i1, j1, k1;
        let i2, j2, k2;

        if (x0 >= y0) {
            if (y0 >= z0) {
                i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
            } else if (x0 >= z0) {
                i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
            } else {
                i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
            }
        } else {
            if (y0 < z0) {
                i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
            } else if (x0 < z0) {
                i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
            } else {
                i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
            }
        }

        const x1 = x0 - i1 + G3;
        const y1 = y0 - j1 + G3;
        const z1 = z0 - k1 + G3;
        const x2 = x0 - i2 + 2.0 * G3;
        const y2 = y0 - j2 + 2.0 * G3;
        const z2 = z0 - k2 + 2.0 * G3;
        const x3 = x0 - 1.0 + 3.0 * G3;
        const y3 = y0 - 1.0 + 3.0 * G3;
        const z3 = z0 - 1.0 + 3.0 * G3;

        const ii = i & 255;
        const jj = j & 255;
        const kk = k & 255;

        const gi0 = this.permMod12[ii + this.perm[jj + this.perm[kk]]];
        const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]];
        const gi2 = this.permMod12[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]];
        const gi3 = this.permMod12[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]];

        let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if (t0 >= 0) {
            t0 *= t0;
            n0 = t0 * t0 * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0 + GRAD3[gi0][2] * z0);
        }

        let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 >= 0) {
            t1 *= t1;
            n1 = t1 * t1 * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1 + GRAD3[gi1][2] * z1);
        }

        let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 >= 0) {
            t2 *= t2;
            n2 = t2 * t2 * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2 + GRAD3[gi2][2] * z2);
        }

        let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 >= 0) {
            t3 *= t3;
            n3 = t3 * t3 * (GRAD3[gi3][0] * x3 + GRAD3[gi3][1] * y3 + GRAD3[gi3][2] * z3);
        }

        return 32.0 * (n0 + n1 + n2 + n3);
    }
}

export class NoiseGenerator {
    
    constructor(seed = 1337, type = 'simplex') {
        this.noise = (type === 'perlin' || type === 'improved') ? new PerlinNoise(seed) : new SimplexNoise(seed);
    }

    reseed(seed) {
        this.noise.reseed(seed);
    }

    noise(x, y, z = 0) {
        return this.noise.noise ? this.noise.noise(x, y, z) : this.noise.noise3D(x, y, z);
    }

    get2D(x, y) {
        return this.noise.noise2D(x, y);
    }

    get3D(x, y, z) {
        return this.noise.noise3D(x, y, z);
    }

    fbm2D(x, y, options = {}) {
        const octaves = options.octaves || 4;
        const persistence = options.persistence !== undefined ? options.persistence : 0.5;
        const lacunarity = options.lacunarity || 2.0;
        let freq = options.frequency || 1.0;
        let amp = options.amplitude !== undefined ? options.amplitude : 1.0;

        let total = 0;
        let maxAmp = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.noise.noise2D(x * freq, y * freq) * amp;
            maxAmp += amp;
            amp *= persistence;
            freq *= lacunarity;
        }

        return maxAmp > 0 ? (total / maxAmp) * (options.amplitude || 1.0) : 0;
    }

    fbm3D(x, y, z, options = {}) {
        const octaves = options.octaves || 4;
        const persistence = options.persistence !== undefined ? options.persistence : 0.5;
        const lacunarity = options.lacunarity || 2.0;
        let freq = options.frequency || 1.0;
        let amp = options.amplitude !== undefined ? options.amplitude : 1.0;

        let total = 0;
        let maxAmp = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.noise.noise3D(x * freq, y * freq, z * freq) * amp;
            maxAmp += amp;
            amp *= persistence;
            freq *= lacunarity;
        }

        return maxAmp > 0 ? (total / maxAmp) * (options.amplitude || 1.0) : 0;
    }

    ridged2D(x, y, options = {}) {
        const octaves = options.octaves || 4;
        const persistence = options.persistence !== undefined ? options.persistence : 0.5;
        const lacunarity = options.lacunarity || 2.0;
        let freq = options.frequency || 1.0;
        let amp = options.amplitude !== undefined ? options.amplitude : 1.0;

        let total = 0;
        let weight = 1.0;

        for (let i = 0; i < octaves; i++) {
            let n = 1.0 - Math.abs(this.noise.noise2D(x * freq, y * freq));
            n = n * n; // Square to sharpen ridges
            n *= weight;
            weight = Math.min(Math.max(n * 2.0, 0.0), 1.0);
            total += n * amp;
            amp *= persistence;
            freq *= lacunarity;
        }

        return total;
    }

    ridged3D(x, y, z, options = {}) {
        const octaves = options.octaves || 4;
        const persistence = options.persistence !== undefined ? options.persistence : 0.5;
        const lacunarity = options.lacunarity || 2.0;
        let freq = options.frequency || 1.0;
        let amp = options.amplitude !== undefined ? options.amplitude : 1.0;

        let total = 0;
        let weight = 1.0;

        for (let i = 0; i < octaves; i++) {
            let n = 1.0 - Math.abs(this.noise.noise3D(x * freq, y * freq, z * freq));
            n = n * n;
            n *= weight;
            weight = Math.min(Math.max(n * 2.0, 0.0), 1.0);
            total += n * amp;
            amp *= persistence;
            freq *= lacunarity;
        }

        return total;
    }

    turbulence2D(x, y, options = {}) {
        const octaves = options.octaves || 4;
        const persistence = options.persistence !== undefined ? options.persistence : 0.5;
        const lacunarity = options.lacunarity || 2.0;
        let freq = options.frequency || 1.0;
        let amp = 1.0;

        let total = 0;
        let maxAmp = 0;

        for (let i = 0; i < octaves; i++) {
            total += Math.abs(this.noise.noise2D(x * freq, y * freq)) * amp;
            maxAmp += amp;
            amp *= persistence;
            freq *= lacunarity;
        }

        return maxAmp > 0 ? total / maxAmp : 0;
    }
}

// Helper gradient & interpolation functions
function lerp(a, b, t) {
    return a + t * (b - a);
}

function grad2(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
}

function grad3(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

// Standalone default instances for quick usage
const defaultSimplex = new SimplexNoise(1337);
const defaultPerlin = new PerlinNoise(1337);

export function noise2D(x, y) {
    return defaultSimplex.noise2D(x, y);
}

export function noise3D(x, y, z) {
    return defaultSimplex.noise3D(x, y, z);
}

export function perlin2D(x, y) {
    return defaultPerlin.noise2D(x, y);
}

export function perlin3D(x, y, z) {
    return defaultPerlin.noise3D(x, y, z);
}
