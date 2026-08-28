/**
 * Environment & Day/Night Cycle System for Minecraft 1.5 WebGL Engine
 * 
 * Features:
 * - 24,000 tick Minecraft time cycle (20 real-time minutes = 20 ticks/sec)
 * - X-axis celestial rotation for Sun and Moon DirectionalLights
 * - Smooth color interpolation for Scene Background, Fog, Ambient, Sun, Moon, and Fill lights
 * - Multi-stop color keyframes across Day, Sunset, Night, Pre-dawn, and Sunrise
 * - Procedural Celestial Meshes (Sun quad, Moon quad) and Dynamic Night Starfield
 * - Real-time Shadow optimization (auto-toggles shadows when below horizon)
 * - Target-following capabilities (centers sky/lighting around player position)
 * - Complete time controls (setTime, setDay, setNight, setSunrise, setSunset, pause/resume)
 */

import * as THREE from "three";

export const TICKS_PER_DAY = 24000;
export const TICKS_PER_SECOND = 20; // 24000 ticks / 1200 seconds (20 mins)

/**
 * Keyframe Definitions for Sky Background Color
 */
export const SKY_KEYFRAMES = Object.freeze([
    { time: 0,     color: new THREE.Color(0xFFA066) }, // 06:00 Sunrise Peak (Golden Orange)
    { time: 1500,  color: new THREE.Color(0x87CEEB) }, // 07:30 Morning (Sky Blue)
    { time: 6000,  color: new THREE.Color(0x78A7FF) }, // 12:00 Midday (Clear Sky Blue)
    { time: 10500, color: new THREE.Color(0x87CEEB) }, // 16:30 Late Afternoon (Sky Blue)
    { time: 12000, color: new THREE.Color(0xFF6020) }, // 18:00 Sunset Peak (Vibrant Orange-Red)
    { time: 13500, color: new THREE.Color(0x1C1838) }, // 19:30 Dusk (Deep Purple-Indigo)
    { time: 15000, color: new THREE.Color(0x050716) }, // 21:00 Night (Dark Blue-Black)
    { time: 22000, color: new THREE.Color(0x050716) }, // 04:00 Late Night (Dark Blue-Black)
    { time: 23200, color: new THREE.Color(0x3B1C42) }, // 05:12 Pre-Dawn (Indigo-Rose)
    { time: 24000, color: new THREE.Color(0xFFA066) }  // 06:00 Sunrise Wrap
]);

/**
 * Keyframe Definitions for Fog Color
 */
export const FOG_KEYFRAMES = Object.freeze([
    { time: 0,     color: new THREE.Color(0xEE8044) }, // Sunrise Fog (Warm Orange)
    { time: 1500,  color: new THREE.Color(0x87CEEB) }, // Morning Fog (Sky Blue)
    { time: 6000,  color: new THREE.Color(0x87CEEB) }, // Midday Fog (Sky Blue)
    { time: 10500, color: new THREE.Color(0x87CEEB) }, // Afternoon Fog (Sky Blue)
    { time: 12000, color: new THREE.Color(0xE85D04) }, // Sunset Fog (Intense Orange)
    { time: 13500, color: new THREE.Color(0x181530) }, // Dusk Fog (Dark Indigo)
    { time: 15000, color: new THREE.Color(0x050714) }, // Night Fog (Black-Blue)
    { time: 22000, color: new THREE.Color(0x050714) }, // Late Night Fog (Black-Blue)
    { time: 23200, color: new THREE.Color(0x321638) }, // Pre-Dawn Fog (Deep Violet)
    { time: 24000, color: new THREE.Color(0xEE8044) }  // Sunrise Fog Wrap
]);

/**
 * Keyframe Definitions for Sun Light (Color & Intensity)
 */
export const SUN_LIGHT_KEYFRAMES = Object.freeze([
    { time: 0,     color: new THREE.Color(0xFFAA66), intensity: 0.60 }, // Sunrise
    { time: 1500,  color: new THREE.Color(0xFFFBE8), intensity: 0.95 }, // Morning
    { time: 6000,  color: new THREE.Color(0xFFFFFF), intensity: 1.00 }, // Midday Zenith
    { time: 10500, color: new THREE.Color(0xFFFBE8), intensity: 0.95 }, // Afternoon
    { time: 12000, color: new THREE.Color(0xFF7733), intensity: 0.60 }, // Sunset
    { time: 12500, color: new THREE.Color(0xFF4422), intensity: 0.15 }, // Twilight
    { time: 13000, color: new THREE.Color(0x000000), intensity: 0.00 }, // Sun Dip below horizon
    { time: 23000, color: new THREE.Color(0x000000), intensity: 0.00 }, // Night
    { time: 23500, color: new THREE.Color(0xFF5533), intensity: 0.15 }, // Sun Peeking
    { time: 24000, color: new THREE.Color(0xFFAA66), intensity: 0.60 }  // Sunrise Wrap
]);

/**
 * Keyframe Definitions for Moon Light (Color & Intensity)
 */
export const MOON_LIGHT_KEYFRAMES = Object.freeze([
    { time: 0,     color: new THREE.Color(0x7799CC), intensity: 0.00 }, // Sunrise (Moon Below Horizon)
    { time: 12000, color: new THREE.Color(0x7799CC), intensity: 0.00 }, // Sunset (Moon Rising)
    { time: 13000, color: new THREE.Color(0x88AADD), intensity: 0.15 }, // Dusk
    { time: 15000, color: new THREE.Color(0x99BBEE), intensity: 0.28 }, // Night
    { time: 18000, color: new THREE.Color(0xAACCFF), intensity: 0.35 }, // Midnight Zenith
    { time: 21000, color: new THREE.Color(0x99BBEE), intensity: 0.28 }, // Late Night
    { time: 23000, color: new THREE.Color(0x88AADD), intensity: 0.15 }, // Pre-Dawn
    { time: 24000, color: new THREE.Color(0x7799CC), intensity: 0.00 }  // Sunrise Wrap
]);

/**
 * Keyframe Definitions for Ambient Light (Color & Intensity)
 */
export const AMBIENT_LIGHT_KEYFRAMES = Object.freeze([
    { time: 0,     color: new THREE.Color(0xFFB077), intensity: 0.45 }, // Sunrise
    { time: 1500,  color: new THREE.Color(0xE8F0FF), intensity: 0.55 }, // Morning
    { time: 6000,  color: new THREE.Color(0xFFFFFF), intensity: 0.60 }, // Midday
    { time: 10500, color: new THREE.Color(0xE8F0FF), intensity: 0.55 }, // Afternoon
    { time: 12000, color: new THREE.Color(0xFF9955), intensity: 0.45 }, // Sunset
    { time: 13500, color: new THREE.Color(0x303055), intensity: 0.30 }, // Dusk
    { time: 15000, color: new THREE.Color(0x1E2640), intensity: 0.18 }, // Night
    { time: 22000, color: new THREE.Color(0x1E2640), intensity: 0.18 }, // Late Night
    { time: 23200, color: new THREE.Color(0x35254A), intensity: 0.30 }, // Pre-Dawn
    { time: 24000, color: new THREE.Color(0xFFB077), intensity: 0.45 }  // Sunrise Wrap
]);

/**
 * Keyframe Definitions for Fill Light (Color & Intensity)
 */
export const FILL_LIGHT_KEYFRAMES = Object.freeze([
    { time: 0,     color: new THREE.Color(0xE09060), intensity: 0.25 }, // Sunrise
    { time: 1500,  color: new THREE.Color(0x90B0E0), intensity: 0.35 }, // Morning
    { time: 6000,  color: new THREE.Color(0x90B0E0), intensity: 0.35 }, // Midday
    { time: 10500, color: new THREE.Color(0x90B0E0), intensity: 0.35 }, // Afternoon
    { time: 12000, color: new THREE.Color(0xD07040), intensity: 0.25 }, // Sunset
    { time: 13500, color: new THREE.Color(0x202040), intensity: 0.10 }, // Dusk
    { time: 15000, color: new THREE.Color(0x101525), intensity: 0.05 }, // Night
    { time: 22000, color: new THREE.Color(0x101525), intensity: 0.05 }, // Late Night
    { time: 23200, color: new THREE.Color(0x201530), intensity: 0.10 }, // Pre-Dawn
    { time: 24000, color: new THREE.Color(0xE09060), intensity: 0.25 }  // Sunrise Wrap
]);

/**
 * Interpolates color between keyframes based on current cycle time.
 * 
 * @param {number} time - Current time in ticks [0, 24000)
 * @param {Array<{time: number, color: THREE.Color}>} keyframes 
 * @param {THREE.Color} [targetColor] - Optional color to store result
 * @returns {THREE.Color}
 */
export function interpolateColorKeyframes(time, keyframes, targetColor = new THREE.Color()) {
    const t = ((time % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY;
    const len = keyframes.length;

    for (let i = 0; i < len - 1; i++) {
        const k1 = keyframes[i];
        const k2 = keyframes[i + 1];
        if (t >= k1.time && t <= k2.time) {
            const range = k2.time - k1.time;
            const alpha = range === 0 ? 0 : (t - k1.time) / range;
            targetColor.copy(k1.color).lerp(k2.color, alpha);
            return targetColor;
        }
    }

    targetColor.copy(keyframes[0].color);
    return targetColor;
}

/**
 * Interpolates scalar value between keyframes based on current cycle time.
 * 
 * @param {number} time - Current time in ticks [0, 24000)
 * @param {Array<{time: number, intensity: number}>} keyframes 
 * @returns {number}
 */
export function interpolateScalarKeyframes(time, keyframes) {
    const t = ((time % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY;
    const len = keyframes.length;

    for (let i = 0; i < len - 1; i++) {
        const k1 = keyframes[i];
        const k2 = keyframes[i + 1];
        if (t >= k1.time && t <= k2.time) {
            const range = k2.time - k1.time;
            const alpha = range === 0 ? 0 : (t - k1.time) / range;
            return k1.intensity + (k2.intensity - k1.intensity) * alpha;
        }
    }

    return keyframes[0].intensity;
}

/**
 * DayNightCycle manages celestial rotation, light sources, fog, sky colors,
 * and environment updates for the voxel world.
 */
export class DayNightCycle {
    /**
     * @param {THREE.Scene|Object} scene - Three.js Scene or options configuration object
     * @param {THREE.AmbientLight} [ambientLight] - Scene ambient light
     * @param {THREE.DirectionalLight} [sunLight] - Scene sun directional light
     * @param {THREE.Light} [fillLight] - Scene secondary fill light
     * @param {Object} [options={}] - Additional settings
     * @param {number} [options.initialTime=6000] - Starting time in ticks (default 6000 = midday)
     * @param {number} [options.ticksPerSecond=TICKS_PER_SECOND] - Simulation speed
     * @param {number} [options.orbitRadius=200] - Celestial rotation radius in blocks
     * @param {boolean} [options.enableMoonLight=true] - Whether to create and manage moon light
     * @param {boolean} [options.enableStars=true] - Whether to generate night starfield
     * @param {boolean} [options.enableCelestialMeshes=true] - Whether to render 3D Sun and Moon
     * @param {THREE.Vector3} [options.center] - World anchor point for sun/moon rotation
     */
    constructor(scene, ambientLight, sunLight, fillLight, options = {}) {
        // Support either positional arguments or options object as first argument
        if (scene && typeof scene === "object" && !scene.isScene && (scene.scene || scene.sunLight)) {
            const config = scene;
            this.scene = config.scene || null;
            this.ambientLight = config.ambientLight || null;
            this.sunLight = config.sunLight || null;
            this.fillLight = config.fillLight || null;
            options = config;
        } else {
            this.scene = scene || null;
            this.ambientLight = ambientLight || null;
            this.sunLight = sunLight || null;
            this.fillLight = fillLight || null;
        }

        // Configuration
        this.time = options.initialTime !== undefined ? options.initialTime : 6000; // default noon (6000 ticks)
        this.totalTicks = this.time;
        this.ticksPerSecond = options.ticksPerSecond !== undefined ? options.ticksPerSecond : TICKS_PER_SECOND;
        this.orbitRadius = options.orbitRadius || 200;
        this.paused = options.paused || false;
        this.dayCount = Math.floor(this.totalTicks / TICKS_PER_DAY) + 1;

        // Origin target for light tracking
        this.targetPosition = options.center ? options.center.clone() : new THREE.Vector3(0, 0, 0);

        // Working colors for interpolation
        this._currentSkyColor = new THREE.Color();
        this._currentFogColor = new THREE.Color();
        this._currentSunColor = new THREE.Color();
        this._currentMoonColor = new THREE.Color();
        this._currentAmbientColor = new THREE.Color();
        this._currentFillColor = new THREE.Color();

        // 1. Initialize Moon Directional Light
        const enableMoon = options.enableMoonLight !== false;
        if (enableMoon) {
            this.moonLight = new THREE.DirectionalLight(0x99bbff, 0.0);
            this.moonLight.name = "MoonLight";
            this.moonLight.castShadow = options.moonShadows || false;
            if (this.moonLight.castShadow) {
                this.moonLight.shadow.mapSize.width = 1024;
                this.moonLight.shadow.mapSize.height = 1024;
                this.moonLight.shadow.camera.near = 0.5;
                this.moonLight.shadow.camera.far = this.orbitRadius * 2.5;
                this.moonLight.shadow.camera.left = -50;
                this.moonLight.shadow.camera.right = 50;
                this.moonLight.shadow.camera.top = 50;
                this.moonLight.shadow.camera.bottom = -50;
                this.moonLight.shadow.bias = -0.0005;
            }
            if (this.scene && !this.moonLight.parent) {
                this.scene.add(this.moonLight);
                if (this.moonLight.target && !this.moonLight.target.parent) {
                    this.scene.add(this.moonLight.target);
                }
            }
        } else {
            this.moonLight = null;
        }

        // Configure Sun Light target if in scene
        if (this.sunLight && this.scene) {
            if (!this.sunLight.parent) this.scene.add(this.sunLight);
            if (this.sunLight.target && !this.sunLight.target.parent) {
                this.scene.add(this.sunLight.target);
            }
        }

        // 2. Optional Celestial Meshes (Sun & Moon Quads)
        this.celestialGroup = new THREE.Group();
        this.celestialGroup.name = "CelestialGroup";
        this.sunMesh = null;
        this.moonMesh = null;
        if (options.enableCelestialMeshes !== false && this.scene) {
            this._createCelestialMeshes();
            this.scene.add(this.celestialGroup);
        }

        // 3. Optional Starfield
        this.starfield = null;
        if (options.enableStars !== false && this.scene) {
            this._createStarfield(options.starCount || 1000);
            this.scene.add(this.starfield);
        }

        // Event hooks
        this.onPhaseChange = options.onPhaseChange || null;
        this.onDayChange = options.onDayChange || null;
        this.currentPhase = this.getPhase();

        // Perform initial update to sync all lighting & colors
        this.update(0);
    }

    // ==========================================
    // 1. CELESTIAL MESHES & STARFIELD
    // ==========================================

    /**
     * Create stylized Minecraft-like Sun and Moon billboard meshes.
     * @private
     */
    _createCelestialMeshes() {
        const sunDistance = this.orbitRadius * 0.95;
        const moonDistance = this.orbitRadius * 0.95;

        // Sun Mesh (Bright Glowing Square)
        const sunGeo = new THREE.PlaneGeometry(24, 24);
        const sunMat = new THREE.MeshBasicMaterial({
            color: 0xffffee,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0,
            depthWrite: false
        });
        this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
        this.sunMesh.name = "SunMesh";
        this.celestialGroup.add(this.sunMesh);

        // Moon Mesh (Silver-White Square)
        const moonGeo = new THREE.PlaneGeometry(18, 18);
        const moonMat = new THREE.MeshBasicMaterial({
            color: 0xddedff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
            depthWrite: false
        });
        this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
        this.moonMesh.name = "MoonMesh";
        this.celestialGroup.add(this.moonMesh);
    }

    /**
     * Create procedural starry night sky points.
     * @param {number} count 
     * @private
     */
    _createStarfield(count = 1000) {
        const starGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const radius = this.orbitRadius * 0.92;

        for (let i = 0; i < count; i++) {
            // Generate uniform points on a sphere
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = radius * (0.85 + Math.random() * 0.15);

            positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.cos(phi);
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }

        starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.5,
            transparent: true,
            opacity: 0.0,
            depthWrite: false
        });

        this.starfield = new THREE.Points(starGeo, starMat);
        this.starfield.name = "Starfield";
    }

    // ==========================================
    // 2. SIMULATION UPDATE LOOP
    // ==========================================

    /**
     * Main update method called each frame to advance time and update environment.
     * 
     * @param {number} delta - Frame delta time in seconds
     * @param {THREE.Vector3} [centerPosition] - Optional player/camera position to center lights & stars on
     */
    update(delta = 0, centerPosition = null) {
        // Update anchor position if provided
        if (centerPosition) {
            this.targetPosition.copy(centerPosition);
        }

        // 1. Advance simulation time
        if (!this.paused && delta > 0) {
            const previousDay = this.dayCount;
            this.time = (this.time + delta * this.ticksPerSecond) % TICKS_PER_DAY;
            if (this.time < 0) this.time += TICKS_PER_DAY;

            this.totalTicks += delta * this.ticksPerSecond;
            this.dayCount = Math.floor(this.totalTicks / TICKS_PER_DAY) + 1;

            if (this.dayCount !== previousDay && typeof this.onDayChange === "function") {
                this.onDayChange(this.dayCount);
            }

            const newPhase = this.getPhase();
            if (newPhase !== this.currentPhase) {
                this.currentPhase = newPhase;
                if (typeof this.onPhaseChange === "function") {
                    this.onPhaseChange(this.currentPhase, this.time);
                }
            }
        }

        // 2. Calculate Celestial Sun & Moon Angle around X Axis
        // At tick 0 (Sunrise / 06:00): phi = 0, Sun Y = 0, Sun Z = +R
        // At tick 6000 (Noon / 12:00): phi = PI/2, Sun Y = +R, Sun Z = 0
        // At tick 12000 (Sunset / 18:00): phi = PI, Sun Y = 0, Sun Z = -R
        // At tick 18000 (Midnight / 00:00): phi = 3PI/2, Sun Y = -R, Sun Z = 0
        const phi = (this.time / TICKS_PER_DAY) * Math.PI * 2;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const sunY = sinPhi * this.orbitRadius;
        const sunZ = cosPhi * this.orbitRadius;

        const moonY = -sunY;
        const moonZ = -sunZ;

        // 3. Update Sun Light Position & Shadow
        if (this.sunLight) {
            this.sunLight.position.set(
                this.targetPosition.x,
                this.targetPosition.y + sunY,
                this.targetPosition.z + sunZ
            );
            if (this.sunLight.target) {
                this.sunLight.target.position.copy(this.targetPosition);
                this.sunLight.target.updateMatrixWorld();
            }

            // Interpolate color and intensity
            interpolateColorKeyframes(this.time, SUN_LIGHT_KEYFRAMES, this._currentSunColor);
            const sunIntensity = interpolateScalarKeyframes(this.time, SUN_LIGHT_KEYFRAMES);

            this.sunLight.color.copy(this._currentSunColor);
            this.sunLight.intensity = sunIntensity;

            // Optimize shadows: only cast shadow when sun is above horizon
            this.sunLight.castShadow = (sunY > -5);
            
            if (window.chunkMaterials) {
                // Minimum ambient sky light at night is 0.05
                const shaderSun = Math.max(0.05, sunIntensity);
                for (const mat of window.chunkMaterials) {
                    if (mat.userData && mat.userData.sunLevel) {
                        mat.userData.sunLevel.value = shaderSun;
                    }
                }
            }
        }

        // 4. Update Moon Light Position & Shadow
        if (this.moonLight) {
            this.moonLight.position.set(
                this.targetPosition.x,
                this.targetPosition.y + moonY,
                this.targetPosition.z + moonZ
            );
            if (this.moonLight.target) {
                this.moonLight.target.position.copy(this.targetPosition);
                this.moonLight.target.updateMatrixWorld();
            }

            // Interpolate color and intensity
            interpolateColorKeyframes(this.time, MOON_LIGHT_KEYFRAMES, this._currentMoonColor);
            const moonIntensity = interpolateScalarKeyframes(this.time, MOON_LIGHT_KEYFRAMES);

            this.moonLight.color.copy(this._currentMoonColor);
            this.moonLight.intensity = moonIntensity;

            // Only cast shadow when moon is above horizon
            if (this.moonLight.castShadow !== undefined) {
                this.moonLight.castShadow = (moonY > 0 && moonIntensity > 0.05);
            }
        }

        // 5. Update Ambient Light
        if (this.ambientLight) {
            interpolateColorKeyframes(this.time, AMBIENT_LIGHT_KEYFRAMES, this._currentAmbientColor);
            const ambientIntensity = interpolateScalarKeyframes(this.time, AMBIENT_LIGHT_KEYFRAMES);

            this.ambientLight.color.copy(this._currentAmbientColor);
            this.ambientLight.intensity = ambientIntensity;
        }

        // 6. Update Fill Light (if present)
        if (this.fillLight) {
            interpolateColorKeyframes(this.time, FILL_LIGHT_KEYFRAMES, this._currentFillColor);
            const fillIntensity = interpolateScalarKeyframes(this.time, FILL_LIGHT_KEYFRAMES);

            this.fillLight.color.copy(this._currentFillColor);
            this.fillLight.intensity = fillIntensity;
        }

        // 7. Update Scene Background and Fog Colors
        interpolateColorKeyframes(this.time, SKY_KEYFRAMES, this._currentSkyColor);
        interpolateColorKeyframes(this.time, FOG_KEYFRAMES, this._currentFogColor);

        if (this.scene) {
            if (this.scene.background && typeof this.scene.background.copy === "function") {
                this.scene.background.copy(this._currentSkyColor);
            } else if (this.scene.background !== undefined) {
                this.scene.background = this._currentSkyColor.clone();
            }

            if (this.scene.fog && this.scene.fog.color) {
                this.scene.fog.color.copy(this._currentFogColor);
            }
        }

        // 8. Update Celestial Meshes & Starfield Positions
        if (this.celestialGroup) {
            this.celestialGroup.position.copy(this.targetPosition);

            if (this.sunMesh) {
                const sunDist = this.orbitRadius * 0.95;
                this.sunMesh.position.set(0, sinPhi * sunDist, cosPhi * sunDist);
                this.sunMesh.lookAt(0, 0, 0);
                this.sunMesh.visible = (sunY > -20);
                if (this.sunMesh.material) {
                    this.sunMesh.material.color.copy(this._currentSunColor);
                }
            }

            if (this.moonMesh) {
                const moonDist = this.orbitRadius * 0.95;
                this.moonMesh.position.set(0, -sinPhi * moonDist, -cosPhi * moonDist);
                this.moonMesh.lookAt(0, 0, 0);
                this.moonMesh.visible = (moonY > -20);
                if (this.moonMesh.material) {
                    this.moonMesh.material.color.copy(this._currentMoonColor);
                }
            }
        }

        // 9. Update Starfield Opacity & Rotation
        if (this.starfield) {
            this.starfield.position.copy(this.targetPosition);
            // Stars slowly rotate around X axis with time
            this.starfield.rotation.x = phi;

            // Fade stars in when sun is below horizon
            const nightFactor = Math.max(0, -sinPhi);
            const starOpacity = THREE.MathUtils.clamp(nightFactor * 1.25 - 0.1, 0, 0.9);
            this.starfield.material.opacity = starOpacity;
            this.starfield.visible = (starOpacity > 0.01);
        }
    }

    // ==========================================
    // 3. TIME QUERIES & CONTROL METHODS
    // ==========================================

    /**
     * Get current time of day in Minecraft ticks [0, 24000).
     * @returns {number}
     */
    getTime() {
        return this.time;
    }

    /**
     * Set current time of day in Minecraft ticks [0, 24000).
     * @param {number} ticks 
     */
    setTime(ticks) {
        this.time = ((ticks % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY;
        this.update(0);
    }

    /**
     * Get normalized cycle progress [0.0, 1.0).
     * @returns {number}
     */
    getNormalizedTime() {
        return this.time / TICKS_PER_DAY;
    }

    /**
     * Set normalized cycle progress [0.0, 1.0).
     * @param {number} progress 
     */
    setNormalizedTime(progress) {
        this.setTime(progress * TICKS_PER_DAY);
    }

    /**
     * Return current sun angle in radians [0, 2*PI).
     * @returns {number}
     */
    getSunAngle() {
        return (this.time / TICKS_PER_DAY) * Math.PI * 2;
    }

    /**
     * Returns true if it is currently daytime (sun above horizon).
     * @returns {boolean}
     */
    isDay() {
        return this.time >= 0 && this.time < 12000;
    }

    /**
     * Returns true if it is currently nighttime (sun below horizon).
     * @returns {boolean}
     */
    isNight() {
        return this.time >= 13500 && this.time < 22500;
    }

    /**
     * Get current phase name: "sunrise", "day", "sunset", or "night".
     * @returns {"sunrise"|"day"|"sunset"|"night"}
     */
    getPhase() {
        if (this.time >= 22500 || this.time < 1500) {
            return "sunrise";
        } else if (this.time >= 1500 && this.time < 11500) {
            return "day";
        } else if (this.time >= 11500 && this.time < 13500) {
            return "sunset";
        } else {
            return "night";
        }
    }

    /**
     * Formats the current time as a 24-hour Minecraft clock (HH:MM).
     * Tick 0 = 06:00, Tick 6000 = 12:00, Tick 12000 = 18:00, Tick 18000 = 00:00.
     * @returns {string}
     */
    getFormattedTime() {
        const hours = (Math.floor(this.time / 1000) + 6) % 24;
        const minutes = Math.floor((this.time % 1000) * 0.06);
        const hh = String(hours).padStart(2, "0");
        const mm = String(minutes).padStart(2, "0");
        return `${hh}:${mm}`;
    }

    /**
     * Set time to Sunrise (tick 0 / 06:00).
     */
    setSunrise() {
        this.setTime(0);
    }

    /**
     * Set time to Midday / Day (tick 6000 / 12:00).
     */
    setDay() {
        this.setTime(6000);
    }

    /**
     * Set time to Sunset (tick 12000 / 18:00).
     */
    setSunset() {
        this.setTime(12000);
    }

    /**
     * Set time to Midnight / Night (tick 18000 / 00:00).
     */
    setNight() {
        this.setTime(18000);
    }

    /**
     * Pause the day/night cycle progression.
     */
    pause() {
        this.paused = true;
    }

    /**
     * Resume the day/night cycle progression.
     */
    resume() {
        this.paused = false;
    }

    /**
     * Toggle pause state.
     * @returns {boolean} New paused state
     */
    togglePause() {
        this.paused = !this.paused;
        return this.paused;
    }

    /**
     * Dispose celestial resources and clean up scene objects.
     */
    dispose() {
        if (this.scene) {
            if (this.moonLight) {
                this.scene.remove(this.moonLight);
                if (this.moonLight.target) this.scene.remove(this.moonLight.target);
            }
            if (this.celestialGroup) {
                this.scene.remove(this.celestialGroup);
            }
            if (this.starfield) {
                this.scene.remove(this.starfield);
                if (this.starfield.geometry) this.starfield.geometry.dispose();
                if (this.starfield.material) this.starfield.material.dispose();
            }
        }
        if (this.sunMesh) {
            if (this.sunMesh.geometry) this.sunMesh.geometry.dispose();
            if (this.sunMesh.material) this.sunMesh.material.dispose();
        }
        if (this.moonMesh) {
            if (this.moonMesh.geometry) this.moonMesh.geometry.dispose();
            if (this.moonMesh.material) this.moonMesh.material.dispose();
        }
    }
}

export default DayNightCycle;
