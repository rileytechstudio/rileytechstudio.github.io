

import * as THREE from "three";

export const WEATHER_TYPES = Object.freeze({
    CLEAR: "clear",
    RAIN: "rain",
    THUNDER: "thunder",
    STORM: "thunder" // Alias for THUNDER
});

export const PRECIPITATION_TYPES = Object.freeze({
    NONE: "none",
    RAIN: "rain",
    SNOW: "snow"
});

export function createRainTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vertical blurred rain streak with soft tapered ends
    const grad = ctx.createLinearGradient(8, 0, 8, 64);
    grad.addColorStop(0.0, "rgba(180, 210, 255, 0.0)");
    grad.addColorStop(0.15, "rgba(195, 225, 255, 0.45)");
    grad.addColorStop(0.85, "rgba(215, 240, 255, 0.95)");
    grad.addColorStop(1.0, "rgba(180, 210, 255, 0.2)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(5, 2, 6, 60, 3);
    ctx.fill();

    // Bright inner core
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.roundRect(7, 10, 2, 48, 1);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
}

export function createSnowTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stylized authentic Minecraft square snowflake pattern
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    
    // Center cross
    ctx.fillRect(12, 6, 8, 20);
    ctx.fillRect(6, 12, 20, 8);
    
    // Diagonal pixels
    ctx.fillRect(8, 8, 4, 4);
    ctx.fillRect(20, 8, 4, 4);
    ctx.fillRect(8, 20, 4, 4);
    ctx.fillRect(20, 20, 4, 4);

    // Soft outer glow
    ctx.fillStyle = "rgba(220, 240, 255, 0.35)";
    ctx.fillRect(4, 14, 2, 4);
    ctx.fillRect(26, 14, 2, 4);
    ctx.fillRect(14, 4, 4, 2);
    ctx.fillRect(14, 26, 4, 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    return texture;
}

export class WeatherSystem {
    
    constructor(scene, camera, world, options = {}) {
        this.scene = scene;
        this.camera = camera;
        this.world = world;
        this.dayNightCycle = options.dayNightCycle || null;
        this.audio = options.audio || null;

        // Configuration
        this.enableAutoWeather = options.enableAutoWeather !== undefined ? options.enableAutoWeather : true;
        this.particleRadius = options.particleRadius || 32;
        this.particleHeight = options.particleHeight || 30;
        this.rainParticleCount = options.rainParticleCount || 3200;
        this.snowParticleCount = options.snowParticleCount || 2400;

        // Weather State Machine
        this.currentWeather = options.initialWeather || WEATHER_TYPES.CLEAR;
        this.targetWeather = this.currentWeather;
        
        // Transition Strengths [0.0 = none, 1.0 = fully active]
        this.rainStrength = (this.currentWeather === WEATHER_TYPES.RAIN || this.currentWeather === WEATHER_TYPES.THUNDER) ? 1.0 : 0.0;
        this.thunderStrength = (this.currentWeather === WEATHER_TYPES.THUNDER) ? 1.0 : 0.0;
        this.transitionSpeed = options.transitionSpeed || 0.35; // Per second transition rate

        // Weather Duration Timers (in seconds)
        // Clear: 300s - 900s (5-15 mins); Rain: 180s - 420s (3-7 mins); Thunder: 120s - 300s (2-5 mins)
        this.weatherTimer = 0;
        this.weatherDuration = this._getRandomDurationForWeather(this.currentWeather);

        // Biome & Precipitation Status
        this.currentBiome = null;
        this.currentPrecipitationType = PRECIPITATION_TYPES.RAIN;
        this.rainOpacityTarget = 0.0;
        this.snowOpacityTarget = 0.0;
        this.isIndoors = false;

        // Lightning & Thunder System
        this.lightningTimer = 0;
        this.lightningInterval = this._getRandomLightningInterval();
        this.activeLightningBolts = [];
        this.flashIntensity = 0.0;
        this.flashColor = new THREE.Color(0xffffff);
        this.lightningLight = null;

        // Wind Vector
        this.wind = new THREE.Vector3(2.5, 0, 1.2);
        this.windAngle = 0;

        // Color Buffers for Sky & Fog Interpolation
        this._tempSkyColor = new THREE.Color();
        this._tempFogColor = new THREE.Color();
        this._clearSkyColor = new THREE.Color(0x87CEEB);
        this._clearFogColor = new THREE.Color(0x87CEEB);
        this._overcastSkyDay = new THREE.Color(0x526078);
        this._overcastSkyNight = new THREE.Color(0x10141f);
        this._overcastFogDay = new THREE.Color(0x5a6880);
        this._overcastFogNight = new THREE.Color(0x121622);
        this._stormSkyDay = new THREE.Color(0x232733);
        this._stormSkyNight = new THREE.Color(0x0a0c12);
        this._stormFogDay = new THREE.Color(0x282d3b);
        this._stormFogNight = new THREE.Color(0x0c0e14);

        // Base Fog settings
        this.baseFogDensity = 0.015;
        this.maxRainFogDensity = 0.038;
        this.maxStormFogDensity = 0.054;

        // 1. Initialize Textures
        this.rainTexture = createRainTexture();
        this.snowTexture = createSnowTexture();

        // 2. Initialize Particle Systems
        this._initRainParticles();
        this._initSnowParticles();

        // 3. Initialize Procedural Audio
        this._initAmbientAudio();

        // Event callbacks
        this.onWeatherChange = options.onWeatherChange || null;
        this.onLightningStrike = options.onLightningStrike || null;
    }

    // ==========================================
    // 1. PARTICLE SYSTEM INITIALIZATION
    // ==========================================

    _initRainParticles() {
        const count = this.rainParticleCount;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);

        const r = this.particleRadius;
        const h = this.particleHeight;

        for (let i = 0; i < count; i++) {
            // Distribute uniformly in cylinder/box around origin
            positions[i * 3]     = (Math.random() - 0.5) * r * 2;
            positions[i * 3 + 1] = Math.random() * h;
            positions[i * 3 + 2] = (Math.random() - 0.5) * r * 2;

            // Downward velocity (28-36 m/s) with subtle individual variation
            velocities[i * 3]     = (Math.random() - 0.5) * 1.5;
            velocities[i * 3 + 1] = -(30.0 + Math.random() * 8.0);
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
        }

        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));

        this.rainMaterial = new THREE.PointsMaterial({
            size: 1.0,
            map: this.rainTexture,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.NormalBlending,
            color: 0x99ccff
        });

        this.rainPoints = new THREE.Points(geometry, this.rainMaterial);
        this.rainPoints.name = "WeatherRainParticles";
        this.rainPoints.frustumCulled = false;
        this.rainPoints.visible = false;

        if (this.scene) {
            this.scene.add(this.rainPoints);
        }
    }

    _initSnowParticles() {
        const count = this.snowParticleCount;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const phases = new Float32Array(count);
        const fallSpeeds = new Float32Array(count);

        const r = this.particleRadius;
        const h = this.particleHeight;

        for (let i = 0; i < count; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * r * 2;
            positions[i * 3 + 1] = Math.random() * h;
            positions[i * 3 + 2] = (Math.random() - 0.5) * r * 2;

            phases[i] = Math.random() * Math.PI * 2;
            // Gentle snowflake fall speed (3.5 - 5.5 m/s)
            fallSpeeds[i] = 3.5 + Math.random() * 2.0;
        }

        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
        geometry.setAttribute("fallSpeed", new THREE.BufferAttribute(fallSpeeds, 1));

        this.snowMaterial = new THREE.PointsMaterial({
            size: 1.2,
            map: this.snowTexture,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.NormalBlending,
            color: 0xffffff
        });

        this.snowPoints = new THREE.Points(geometry, this.snowMaterial);
        this.snowPoints.name = "WeatherSnowParticles";
        this.snowPoints.frustumCulled = false;
        this.snowPoints.visible = false;

        if (this.scene) {
            this.scene.add(this.snowPoints);
        }
    }

    // ==========================================
    // 2. PROCEDURAL AMBIENT RAIN & THUNDER AUDIO
    // ==========================================

    _initAmbientAudio() {
        try {
            if (typeof window === "undefined") return;
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            this.audioCtx = (this.audio && this.audio.context) ? this.audio.context : new AudioContextClass();

            // Create 3 seconds of looping white/pink noise buffer for realistic rain patter
            const bufferSize = this.audioCtx.sampleRate * 3;
            const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            
            let b0 = 0, b1 = 0, b2 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                // Pink noise filter approximation
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                let pink = b0 + b1 + b2 + white * 0.5362;
                
                // Add micro-splatter clicks
                if (Math.random() < 0.008) {
                    pink += (Math.random() - 0.5) * 1.8;
                }
                output[i] = pink * 0.15;
            }

            this.rainAudioBuffer = noiseBuffer;

            // Audio graph: BufferSource -> BandPass Filter -> Shelter LowPass Filter -> Gain -> Destination
            this.rainGain = this.audioCtx.createGain();
            this.rainGain.gain.value = 0.0;

            this.rainFilter = this.audioCtx.createBiquadFilter();
            this.rainFilter.type = "bandpass";
            this.rainFilter.frequency.value = 1200;
            this.rainFilter.Q.value = 0.8;

            this.shelterFilter = this.audioCtx.createBiquadFilter();
            this.shelterFilter.type = "lowpass";
            this.shelterFilter.frequency.value = 8000;

            this.rainFilter.connect(this.shelterFilter);
            this.shelterFilter.connect(this.rainGain);
            this.rainGain.connect(this.audioCtx.destination);

            this.rainSource = null;
            this._rainAudioStarted = false;

            // Unlock audio on interaction
            const unlock = () => {
                if (this.audioCtx && this.audioCtx.state === "suspended") {
                    this.audioCtx.resume();
                }
                this._startRainAudioLoop();
                window.removeEventListener("click", unlock);
                window.removeEventListener("keydown", unlock);
            };
            window.addEventListener("click", unlock, { once: true });
            window.addEventListener("keydown", unlock, { once: true });
        } catch (e) {
            console.warn("Weather audio initialization skipped:", e);
        }
    }

    _startRainAudioLoop() {
        if (this._rainAudioStarted || !this.audioCtx || !this.rainAudioBuffer) return;
        try {
            this.rainSource = this.audioCtx.createBufferSource();
            this.rainSource.buffer = this.rainAudioBuffer;
            this.rainSource.loop = true;
            this.rainSource.connect(this.rainFilter);
            this.rainSource.start(0);
            this._rainAudioStarted = true;
        } catch (e) {
            // Audio unlock handled on gesture
        }
    }

    playThunderSound(distance = 25) {
        if (!this.audioCtx) return;
        try {
            if (this.audioCtx.state === "suspended") {
                this.audioCtx.resume();
            }

            const now = this.audioCtx.currentTime;
            const distanceDelay = Math.min(0.35, distance / 340.0); // Sound propagation delay
            const startTime = now + distanceDelay;

            // 1. Initial Sharp Crack / Burst (Mid-High Noise Burst)
            const crackDuration = 0.25;
            const crackBuffer = this.audioCtx.createBuffer(1, Math.floor(this.audioCtx.sampleRate * crackDuration), this.audioCtx.sampleRate);
            const crackData = crackBuffer.getChannelData(0);
            for (let i = 0; i < crackData.length; i++) {
                const t = i / crackBuffer.sampleRate;
                const env = Math.exp(-t * 22);
                crackData[i] = (Math.random() * 2 - 1) * env * 0.9;
            }
            const crackSource = this.audioCtx.createBufferSource();
            crackSource.buffer = crackBuffer;

            const crackFilter = this.audioCtx.createBiquadFilter();
            crackFilter.type = "highpass";
            crackFilter.frequency.value = 600;

            const crackGain = this.audioCtx.createGain();
            const crackVol = Math.max(0.1, 1.0 - (distance / 80));
            crackGain.gain.setValueAtTime(crackVol * 0.85, startTime);
            crackGain.gain.exponentialRampToValueAtTime(0.001, startTime + crackDuration);

            crackSource.connect(crackFilter);
            crackFilter.connect(crackGain);
            crackGain.connect(this.audioCtx.destination);
            crackSource.start(startTime);

            // 2. Rolling Deep Sub-Bass Rumble (45Hz - 110Hz resonant sweep)
            const rumbleDuration = 2.2 + Math.random() * 0.8;
            const osc = this.audioCtx.createOscillator();
            const oscGain = this.audioCtx.createGain();

            osc.type = "triangle";
            osc.frequency.setValueAtTime(95, startTime);
            osc.frequency.exponentialRampToValueAtTime(38, startTime + rumbleDuration);

            const rumbleVol = Math.max(0.2, 1.0 - (distance / 100));
            oscGain.gain.setValueAtTime(0.01, startTime);
            oscGain.gain.linearRampToValueAtTime(rumbleVol * 0.9, startTime + 0.12);
            oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + rumbleDuration);

            osc.connect(oscGain);
            oscGain.connect(this.audioCtx.destination);
            osc.start(startTime);
            osc.stop(startTime + rumbleDuration);

            // 3. Low-frequency rumbling noise layer
            const noiseDur = 2.0;
            const noiseBuf = this.audioCtx.createBuffer(1, Math.floor(this.audioCtx.sampleRate * noiseDur), this.audioCtx.sampleRate);
            const nData = noiseBuf.getChannelData(0);
            for (let i = 0; i < nData.length; i++) {
                nData[i] = (Math.random() * 2 - 1);
            }
            const nSource = this.audioCtx.createBufferSource();
            nSource.buffer = noiseBuf;

            const nFilter = this.audioCtx.createBiquadFilter();
            nFilter.type = "lowpass";
            nFilter.frequency.setValueAtTime(350, startTime);
            nFilter.frequency.exponentialRampToValueAtTime(80, startTime + noiseDur);

            const nGain = this.audioCtx.createGain();
            nGain.gain.setValueAtTime(rumbleVol * 0.6, startTime);
            nGain.gain.exponentialRampToValueAtTime(0.001, startTime + noiseDur);

            nSource.connect(nFilter);
            nFilter.connect(nGain);
            nGain.connect(this.audioCtx.destination);
            nSource.start(startTime);
        } catch (e) {
            // Audio error gracefully ignored
        }
    }

    // ==========================================
    // 3. WEATHER LOGIC & TRANSITIONS
    // ==========================================

    _getRandomDurationForWeather(weather) {
        if (weather === WEATHER_TYPES.CLEAR) {
            return 300 + Math.random() * 600; // 5 to 15 minutes
        } else if (weather === WEATHER_TYPES.RAIN) {
            return 180 + Math.random() * 240; // 3 to 7 minutes
        } else {
            return 90 + Math.random() * 180;  // 1.5 to 4.5 minutes
        }
    }

    _getRandomLightningInterval() {
        return 6.0 + Math.random() * 12.0; // 6 to 18 seconds
    }

    setWeather(type, duration = null) {
        const normalized = (type === "storm") ? WEATHER_TYPES.THUNDER : type.toLowerCase();
        if (!Object.values(WEATHER_TYPES).includes(normalized)) {
            console.warn(`[Weather] Unknown weather type: ${type}`);
            return;
        }

        const previousWeather = this.currentWeather;
        this.targetWeather = normalized;
        this.currentWeather = normalized;
        this.weatherTimer = 0;
        this.weatherDuration = duration !== null ? duration : this._getRandomDurationForWeather(normalized);

        console.log(`[Weather] Weather changed to "${normalized}" (Duration: ${Math.round(this.weatherDuration)}s)`);

        if (typeof this.onWeatherChange === "function" && previousWeather !== this.currentWeather) {
            this.onWeatherChange(this.currentWeather, previousWeather);
        }
    }

    setClear(duration = null) { this.setWeather(WEATHER_TYPES.CLEAR, duration); }
    setRain(duration = null) { this.setWeather(WEATHER_TYPES.RAIN, duration); }
    setThunder(duration = null) { this.setWeather(WEATHER_TYPES.THUNDER, duration); }
    setStorm(duration = null) { this.setWeather(WEATHER_TYPES.THUNDER, duration); }

    toggleWeather() {
        if (this.currentWeather === WEATHER_TYPES.CLEAR) {
            this.setRain();
        } else if (this.currentWeather === WEATHER_TYPES.RAIN) {
            this.setThunder();
        } else {
            this.setClear();
        }
        return this.currentWeather;
    }

    getWeather() { return this.currentWeather; }
    getWeatherType() { return this.currentWeather; }
    getRainStrength() { return this.rainStrength; }
    getThunderStrength() { return this.thunderStrength; }
    isRaining() { return this.rainStrength > 0.05; }
    isThundering() { return this.thunderStrength > 0.05; }
    isStorming() { return this.thunderStrength > 0.05; }

    getBiomePrecipitation(x, y, z) {
        if (!this.world) {
            return { biome: null, precipitation: PRECIPITATION_TYPES.RAIN };
        }

        let biome = null;
        if (typeof this.world.getBiome === "function") {
            biome = this.world.getBiome(x, z);
        }

        let temp = 0;
        let moisture = 0;
        if (this.world.generator) {
            if (typeof this.world.generator.getTemperature === "function") {
                temp = this.world.generator.getTemperature(x, z);
            }
            if (typeof this.world.generator.getMoisture === "function") {
                moisture = this.world.generator.getMoisture(x, z);
            }
        }

        // 1. Arid / No precipitation biomes (Desert, Nether)
        if (biome && (biome.name === "Desert" || biome.id === 3 || biome.name === "Nether" || biome.id === 7)) {
            return { biome, precipitation: PRECIPITATION_TYPES.NONE };
        }
        if (temp > 0.25 && moisture < -0.05) {
            return { biome, precipitation: PRECIPITATION_TYPES.NONE };
        }

        // 2. Cold / Snow biomes (Snow, Taiga, Tundra, or high mountain elevation)
        if (biome && (biome.hasSnowLayer || biome.name?.includes("Snow") || biome.name?.includes("Taiga") || biome.name?.includes("Tundra"))) {
            return { biome, precipitation: PRECIPITATION_TYPES.SNOW };
        }
        if (temp < -0.20) {
            return { biome, precipitation: PRECIPITATION_TYPES.SNOW };
        }
        // Extreme Hills snow peaks above Y=96
        if (biome && biome.name === "Extreme Hills" && y >= 96) {
            return { biome, precipitation: PRECIPITATION_TYPES.SNOW };
        }

        // 3. Temperate rain biomes (Plains, Forest, Ocean, Swamp, etc.)
        return { biome, precipitation: PRECIPITATION_TYPES.RAIN };
    }

    // ==========================================
    // 4. PROCEDURAL 3D LIGHTNING BOLTS
    // ==========================================

    createLightningStrike(strikePos = null) {
        if (!this.scene) return;

        const camPos = this.camera ? this.camera.position : new THREE.Vector3(0, 64, 0);

        // Pick random ground target near camera if not specified
        let targetX = camPos.x + (Math.random() - 0.5) * 60;
        let targetZ = camPos.z + (Math.random() - 0.5) * 60;
        let targetY = 64;

        if (strikePos) {
            targetX = strikePos.x;
            targetY = strikePos.y;
            targetZ = strikePos.z;
        } else if (this.world && typeof this.world.getHighestBlockY === "function") {
            targetY = Math.max(40, this.world.getHighestBlockY(Math.floor(targetX), Math.floor(targetZ)) + 1);
        }

        const startY = Math.max(targetY + 45, 120);
        const points = [];

        // Fractal midpoint displacement line generator
        function generateBoltSegment(x1, y1, z1, x2, y2, z2, roughness, depth) {
            if (depth <= 0) {
                points.push(x1, y1, z1, x2, y2, z2);
                return;
            }
            const midX = (x1 + x2) * 0.5 + (Math.random() - 0.5) * roughness;
            const midY = (y1 + y2) * 0.5 + (Math.random() - 0.5) * (roughness * 0.4);
            const midZ = (z1 + z2) * 0.5 + (Math.random() - 0.5) * roughness;

            generateBoltSegment(x1, y1, z1, midX, midY, midZ, roughness * 0.55, depth - 1);
            generateBoltSegment(midX, midY, midZ, x2, y2, z2, roughness * 0.55, depth - 1);

            // Occasional branching fork
            if (depth === 2 && Math.random() < 0.6) {
                const branchEndX = midX + (Math.random() - 0.5) * 16;
                const branchEndY = midY - 10 - Math.random() * 12;
                const branchEndZ = midZ + (Math.random() - 0.5) * 16;
                generateBoltSegment(midX, midY, midZ, branchEndX, branchEndY, branchEndZ, roughness * 0.4, depth - 2);
            }
        }

        generateBoltSegment(targetX + (Math.random() - 0.5) * 8, startY, targetZ + (Math.random() - 0.5) * 8, targetX, targetY, targetZ, 14.0, 4);

        const boltGeo = new THREE.BufferGeometry();
        boltGeo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));

        const boltMat = new THREE.LineBasicMaterial({
            color: 0xebf6ff,
            linewidth: 3,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const boltLine = new THREE.LineSegments(boltGeo, boltMat);
        boltLine.name = "LightningBolt";
        this.scene.add(boltLine);

        // Strike flash point light
        const pointLight = new THREE.PointLight(0xaad8ff, 6.0, 80, 2);
        pointLight.position.set(targetX, targetY + 2, targetZ);
        this.scene.add(pointLight);

        // Register active bolt with lifetime
        const boltObj = {
            mesh: boltLine,
            light: pointLight,
            lifetime: 0.28,
            maxLife: 0.28,
            targetX, targetY, targetZ
        };
        this.activeLightningBolts.push(boltObj);

        // Trigger sky flash
        this.flashIntensity = 1.0;

        // Play thunder sound with distance delay
        const dist = camPos.distanceTo(new THREE.Vector3(targetX, targetY, targetZ));
        this.playThunderSound(dist);

        if (typeof this.onLightningStrike === "function") {
            this.onLightningStrike({ x: targetX, y: targetY, z: targetZ, distance: dist });
        }
    }

    // ==========================================
    // 5. MAIN SIMULATION UPDATE LOOP
    // ==========================================

    update(delta = 0.016, player = null, camera = null) {
        const cam = camera || this.camera;
        if (!cam) return;

        const camPos = cam.position;
        const playerPos = player ? player.position : camPos;

        // 1. Advance automatic weather cycle
        if (this.enableAutoWeather && delta > 0) {
            this.weatherTimer += delta;
            if (this.weatherTimer >= this.weatherDuration) {
                // Transition to next randomized weather state
                if (this.currentWeather === WEATHER_TYPES.CLEAR) {
                    // 75% chance of Rain, 25% chance of Storm
                    const next = Math.random() < 0.25 ? WEATHER_TYPES.THUNDER : WEATHER_TYPES.RAIN;
                    this.setWeather(next);
                } else {
                    // Rain/Thunder ends -> Clear
                    this.setWeather(WEATHER_TYPES.CLEAR);
                }
            }
        }

        // 2. Smoothly interpolate Weather Transition Strengths
        const targetRain = (this.currentWeather === WEATHER_TYPES.RAIN || this.currentWeather === WEATHER_TYPES.THUNDER) ? 1.0 : 0.0;
        const targetThunder = (this.currentWeather === WEATHER_TYPES.THUNDER) ? 1.0 : 0.0;

        const rate = this.transitionSpeed * delta;
        if (this.rainStrength < targetRain) {
            this.rainStrength = Math.min(targetRain, this.rainStrength + rate);
        } else if (this.rainStrength > targetRain) {
            this.rainStrength = Math.max(targetRain, this.rainStrength - rate);
        }

        if (this.thunderStrength < targetThunder) {
            this.thunderStrength = Math.min(targetThunder, this.thunderStrength + rate);
        } else if (this.thunderStrength > targetThunder) {
            this.thunderStrength = Math.max(targetThunder, this.thunderStrength - rate);
        }

        // 3. Biome & Shelter Check
        const { biome, precipitation } = this.getBiomePrecipitation(playerPos.x, playerPos.y, playerPos.z);
        this.currentBiome = biome;
        this.currentPrecipitationType = precipitation;

        // Check if player has solid roof overhead
        if (this.world && typeof this.world.getHighestBlockY === "function") {
            const topY = this.world.getHighestBlockY(Math.floor(playerPos.x), Math.floor(playerPos.z));
            this.isIndoors = (topY > playerPos.y + 1.8);
        } else {
            this.isIndoors = false;
        }

        // Target opacities based on biome & weather
        let targetRainOp = 0.0;
        let targetSnowOp = 0.0;

        if (this.rainStrength > 0.01) {
            if (precipitation === PRECIPITATION_TYPES.RAIN) {
                targetRainOp = this.rainStrength * 0.85;
            } else if (precipitation === PRECIPITATION_TYPES.SNOW) {
                targetSnowOp = this.rainStrength * 0.95;
            }
        }

        // Smoothly blend particle material opacities
        const blendRate = 2.5 * delta;
        this.rainMaterial.opacity += (targetRainOp - this.rainMaterial.opacity) * Math.min(1.0, blendRate);
        this.snowMaterial.opacity += (targetSnowOp - this.snowMaterial.opacity) * Math.min(1.0, blendRate);

        this.rainPoints.visible = (this.rainMaterial.opacity > 0.01);
        this.snowPoints.visible = (this.snowMaterial.opacity > 0.01);

        // 4. Update Particle Physics
        this.windAngle += delta * 0.2;
        this.wind.x = Math.sin(this.windAngle) * 2.0 + 1.5;
        this.wind.z = Math.cos(this.windAngle * 0.7) * 1.5 + 0.8;

        if (this.rainPoints.visible) {
            this._updateRainParticles(delta, camPos);
        }
        if (this.snowPoints.visible) {
            this._updateSnowParticles(delta, camPos);
        }

        // 5. Update Lightning & Thunder System
        if (this.thunderStrength > 0.3) {
            this.lightningTimer += delta;
            if (this.lightningTimer >= this.lightningInterval) {
                this.lightningTimer = 0;
                this.lightningInterval = this._getRandomLightningInterval();
                this.createLightningStrike();
            }
        }

        // Update active lightning bolt meshes & decay
        for (let i = this.activeLightningBolts.length - 1; i >= 0; i--) {
            const bolt = this.activeLightningBolts[i];
            bolt.lifetime -= delta;
            
            if (bolt.lifetime <= 0) {
                if (bolt.mesh && bolt.mesh.parent) {
                    bolt.mesh.parent.remove(bolt.mesh);
                    bolt.mesh.geometry.dispose();
                    bolt.mesh.material.dispose();
                }
                if (bolt.light && bolt.light.parent) {
                    bolt.light.parent.remove(bolt.light);
                    bolt.light.dispose();
                }
                this.activeLightningBolts.splice(i, 1);
            } else {
                // Multi-pulse flickering
                const norm = bolt.lifetime / bolt.maxLife;
                const flicker = Math.sin(norm * Math.PI * 5) > 0 ? 1.0 : 0.4;
                bolt.mesh.material.opacity = norm * flicker;
                bolt.light.intensity = 6.0 * norm * flicker;
            }
        }

        // Decay sky flash intensity
        if (this.flashIntensity > 0) {
            this.flashIntensity = Math.max(0, this.flashIntensity - delta * 4.5);
        }

        // 6. Update Ambient Rain Audio Gain & Shelter Filtering
        if (this.rainGain && this._rainAudioStarted) {
            const shelterMult = this.isIndoors ? 0.35 : 1.0;
            const targetGain = this.rainStrength * shelterMult * (precipitation === PRECIPITATION_TYPES.RAIN ? 0.6 : 0.1);
            this.rainGain.gain.setValueAtTime(targetGain, this.audioCtx.currentTime);

            if (this.shelterFilter) {
                const targetCutoff = this.isIndoors ? 1400 : 8000;
                this.shelterFilter.frequency.setValueAtTime(targetCutoff, this.audioCtx.currentTime);
            }
        }

        // 7. Apply Atmospheric Sky Color & Fog Density
        this.applyAtmosphericEffects(camPos);
    }

    _updateRainParticles(delta, camPos) {
        const pos = this.rainPoints.geometry.attributes.position.array;
        const vel = this.rainPoints.geometry.attributes.velocity.array;
        const count = this.rainParticleCount;
        const r = this.particleRadius;
        const h = this.particleHeight;
        const halfR = r;

        const windX = this.wind.x;
        const windZ = this.wind.z;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            // Apply velocity + wind
            pos[i3]     += (vel[i3] + windX) * delta;
            pos[i3 + 1] += vel[i3 + 1] * delta;
            pos[i3 + 2] += (vel[i3 + 2] + windZ) * delta;

            // Height check to prevent raining underground
            if (this.world && typeof this.world.getHighestBlockY === "function") {
                const ceiling = this.world.getHighestBlockY(pos[i3], pos[i3 + 2]);
                if (pos[i3 + 1] < ceiling) {
                    pos[i3 + 1] += this.particleHeight;
                }
            }

            // Wrap Y around camera
            if (pos[i3 + 1] < camPos.y - 6.0) {
                pos[i3 + 1] = camPos.y + h - 4.0 + Math.random() * 4.0;
                pos[i3]     = camPos.x + (Math.random() - 0.5) * r * 2;
                pos[i3 + 2] = camPos.z + (Math.random() - 0.5) * r * 2;
            }

            // Wrap X around camera
            const dx = pos[i3] - camPos.x;
            if (dx > halfR) pos[i3] -= r * 2;
            else if (dx < -halfR) pos[i3] += r * 2;

            // Wrap Z around camera
            const dz = pos[i3 + 2] - camPos.z;
            if (dz > halfR) pos[i3 + 2] -= r * 2;
            else if (dz < -halfR) pos[i3 + 2] += r * 2;
        }

        this.rainPoints.geometry.attributes.position.needsUpdate = true;
    }

    _updateSnowParticles(delta, camPos) {
        const pos = this.snowPoints.geometry.attributes.position.array;
        const phases = this.snowPoints.geometry.attributes.phase.array;
        const speeds = this.snowPoints.geometry.attributes.fallSpeed.array;
        const count = this.snowParticleCount;
        const r = this.particleRadius;
        const h = this.particleHeight;
        const halfR = r;

        const time = performance.now() * 0.001;
        const windX = this.wind.x * 0.4;
        const windZ = this.wind.z * 0.4;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const ph = phases[i];
            const spd = speeds[i];

            // Gentle sinusoidal flutter
            const wobbleX = Math.sin(time * 2.2 + ph) * 0.75;
            const wobbleZ = Math.cos(time * 1.8 + ph * 1.3) * 0.75;

            pos[i3]     += (wobbleX + windX) * delta;
            pos[i3 + 1] -= spd * delta;
            pos[i3 + 2] += (wobbleZ + windZ) * delta;

            // Height check to prevent snowing underground
            if (this.world && typeof this.world.getHighestBlockY === "function") {
                const ceiling = this.world.getHighestBlockY(pos[i3], pos[i3 + 2]);
                if (pos[i3 + 1] < ceiling) {
                    pos[i3 + 1] += this.particleHeight;
                }
            }

            // Wrap Y around camera
            if (pos[i3 + 1] < camPos.y - 6.0) {
                pos[i3 + 1] = camPos.y + h - 4.0 + Math.random() * 4.0;
                pos[i3]     = camPos.x + (Math.random() - 0.5) * r * 2;
                pos[i3 + 2] = camPos.z + (Math.random() - 0.5) * r * 2;
            }

            // Wrap X around camera
            const dx = pos[i3] - camPos.x;
            if (dx > halfR) pos[i3] -= r * 2;
            else if (dx < -halfR) pos[i3] += r * 2;

            // Wrap Z around camera
            const dz = pos[i3 + 2] - camPos.z;
            if (dz > halfR) pos[i3 + 2] -= r * 2;
            else if (dz < -halfR) pos[i3 + 2] += r * 2;
        }

        this.snowPoints.geometry.attributes.position.needsUpdate = true;
    }

    // ==========================================
    // 6. ATMOSPHERIC SKY & FOG INTEGRATION
    // ==========================================

    applyAtmosphericEffects(camPos) {
        if (!this.scene) return;

        // Underwater visual override check
        let isUnderwater = false;
        if (this.world && typeof this.world.getBlock === "function") {
            const headBlock = this.world.getBlock(Math.floor(camPos.x), Math.floor(camPos.y), Math.floor(camPos.z));
            isUnderwater = (headBlock === 8 || headBlock === 9); // BLOCKS.WATER or WATER_FLOWING
        }

        if (isUnderwater) {
            // Underwater fog is handled by main loop
            return;
        }

        // 1. Determine Day/Night factor
        let isDay = true;
        let dayFactor = 1.0;
        if (this.dayNightCycle) {
            const time = this.dayNightCycle.getTime();
            // Daytime [1500, 11500] = 1.0, Nighttime [13500, 22500] = 0.0, Smooth twilight transitions
            if (time >= 1500 && time <= 11500) {
                dayFactor = 1.0;
            } else if (time >= 13500 && time <= 22500) {
                dayFactor = 0.0;
            } else if (time > 11500 && time < 13500) {
                dayFactor = 1.0 - (time - 11500) / 2000;
            } else {
                dayFactor = (time >= 22500) ? (time - 22500) / 3000 : (time + 1500) / 3000;
            }
        }

        // 2. Base Sky & Fog colors from DayNightCycle or fallback
        if (this.dayNightCycle && this.dayNightCycle._currentSkyColor) {
            this._clearSkyColor.copy(this.dayNightCycle._currentSkyColor);
            this._clearFogColor.copy(this.dayNightCycle._currentFogColor);
        }

        // 3. Compute Weather Overcast Target Colors
        const overcastSky = this._tempSkyColor.copy(this._overcastSkyNight).lerp(this._overcastSkyDay, dayFactor);
        const overcastFog = this._tempFogColor.copy(this._overcastFogNight).lerp(this._overcastFogDay, dayFactor);

        const stormSky = this._stormSkyNight.clone().lerp(this._stormSkyDay, dayFactor);
        const stormFog = this._stormFogNight.clone().lerp(this._stormFogDay, dayFactor);

        // Final Blended Sky Color
        const finalSky = this._clearSkyColor.clone();
        if (this.rainStrength > 0) {
            finalSky.lerp(overcastSky, this.rainStrength * 0.82);
        }
        if (this.thunderStrength > 0) {
            finalSky.lerp(stormSky, this.thunderStrength * 0.90);
        }
        if (this.flashIntensity > 0) {
            finalSky.lerp(this.flashColor, this.flashIntensity * 0.95);
        }

        // Final Blended Fog Color
        const finalFog = this._clearFogColor.clone();
        if (this.rainStrength > 0) {
            finalFog.lerp(overcastFog, this.rainStrength * 0.85);
        }
        if (this.thunderStrength > 0) {
            finalFog.lerp(stormFog, this.thunderStrength * 0.92);
        }
        if (this.flashIntensity > 0) {
            finalFog.lerp(this.flashColor, this.flashIntensity * 0.95);
        }

        // Apply to Scene background & fog
        if (this.scene.background && typeof this.scene.background.copy === "function") {
            this.scene.background.copy(finalSky);
        }
        if (this.scene.fog && this.scene.fog.color) {
            this.scene.fog.color.copy(finalFog);

            // Volumetric Fog Density Scaling
            if (this.scene.fog.isFogExp2 || this.scene.fog.density !== undefined) {
                const targetDensity = this.baseFogDensity 
                    + (this.maxRainFogDensity - this.baseFogDensity) * this.rainStrength
                    + (this.maxStormFogDensity - this.maxRainFogDensity) * this.thunderStrength;
                this.scene.fog.density = targetDensity;
            }
        }

        // 4. Modulate Directional Sun/Moon Lighting Intensity
        if (this.dayNightCycle && this.dayNightCycle.sunLight) {
            const lightDimFactor = 1.0 - (this.rainStrength * 0.45 + this.thunderStrength * 0.35);
            // Ambient light cooler tint
            if (this.dayNightCycle.ambientLight && this.rainStrength > 0.1) {
                this.dayNightCycle.ambientLight.intensity *= Math.max(0.4, lightDimFactor);
            }
        }
    }

    // ==========================================
    // 7. CLEANUP & DISPOSAL
    // ==========================================

    dispose() {
        if (this.scene) {
            if (this.rainPoints) {
                this.scene.remove(this.rainPoints);
                if (this.rainPoints.geometry) this.rainPoints.geometry.dispose();
                if (this.rainPoints.material) this.rainPoints.material.dispose();
            }
            if (this.snowPoints) {
                this.scene.remove(this.snowPoints);
                if (this.snowPoints.geometry) this.snowPoints.geometry.dispose();
                if (this.snowPoints.material) this.snowPoints.material.dispose();
            }
            for (const bolt of this.activeLightningBolts) {
                if (bolt.mesh) {
                    this.scene.remove(bolt.mesh);
                    bolt.mesh.geometry.dispose();
                    bolt.mesh.material.dispose();
                }
                if (bolt.light) {
                    this.scene.remove(bolt.light);
                    bolt.light.dispose();
                }
            }
        }

        if (this.rainTexture) this.rainTexture.dispose();
        if (this.snowTexture) this.snowTexture.dispose();

        if (this.rainSource) {
            try { this.rainSource.stop(); } catch (e) {}
            this.rainSource.disconnect();
        }
        if (this.rainGain) this.rainGain.disconnect();
    }
}

export default WeatherSystem;
