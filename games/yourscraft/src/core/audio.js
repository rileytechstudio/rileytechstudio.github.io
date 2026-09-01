

import * as THREE from 'three';

export function createPopBuffer(context, baseFreq = 420, endFreq = 960, duration = 0.09) {
    const sampleRate = context.sampleRate || 44100;
    const numSamples = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = context.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const progress = t / duration;

        // Upward pitch sweep
        const freq = baseFreq + (endFreq - baseFreq) * Math.pow(progress, 0.65);
        phase += (2 * Math.PI * freq) / sampleRate;

        // Square + sine chiptune wave
        const sine = Math.sin(phase);
        const square = sine >= 0 ? 0.75 : -0.75;
        const raw = 0.6 * square + 0.4 * sine;

        // Attack & decay envelope
        let env = 1.0;
        if (t < 0.003) {
            env = t / 0.003;
        } else {
            env = Math.exp(-(t - 0.003) * 42);
        }

        // 8-bit quantization
        let sample = raw * env * 0.8;
        sample = Math.round(sample * 128) / 128;
        data[i] = sample;
    }

    return buffer;
}

export function createCrunchBuffer(context, duration = 0.20, pitchScale = 1.0) {
    const sampleRate = context.sampleRate || 44100;
    const numSamples = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = context.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    let lastNoise = 0;
    const filterCoeff = 0.4;

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const progress = t / duration;

        // 1. Low frequency impact thud (160Hz -> 35Hz)
        const thudFreq = (160 - 125 * progress) * pitchScale;
        phase += (2 * Math.PI * thudFreq) / sampleRate;
        const thud = Math.sin(phase) * Math.exp(-t * 28);

        // 2. Filtered noise with granular crackles
        const rawNoise = (Math.random() * 2 - 1);
        lastNoise = lastNoise * filterCoeff + rawNoise * (1 - filterCoeff);

        // Stepped irregular crackle spikes
        const crackle = 0.5 + 0.5 * Math.sin(t * 220 * pitchScale + Math.sin(t * 680));
        const noiseEnv = Math.pow(1 - progress, 2.0) * (0.65 + 0.35 * crackle);

        // Combine
        let mixed = (thud * 0.45 + lastNoise * noiseEnv * 0.75);

        // Bitcrush (6-bit quantization)
        mixed = Math.round(mixed * 32) / 32;

        data[i] = Math.max(-1, Math.min(1, mixed * 0.85));
    }

    return buffer;
}

export function createStepBuffer(context, duration = 0.075, pitch = 1.0) {
    const sampleRate = context.sampleRate || 44100;
    const numSamples = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = context.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    let noiseFilter = 0;

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const progress = t / duration;

        // 1. Low muffled thud (115Hz -> 45Hz)
        const freq = (115 - 70 * progress) * pitch;
        phase += (2 * Math.PI * freq) / sampleRate;
        const thud = Math.sin(phase) * Math.exp(-t * 58);

        // 2. High-frequency tap noise
        const rawNoise = Math.random() * 2 - 1;
        noiseFilter = noiseFilter * 0.55 + rawNoise * 0.45;
        const tapEnv = Math.exp(-t * 85);
        const tap = noiseFilter * tapEnv;

        // Mix & 8-bit quantization
        let sample = (thud * 0.62 + tap * 0.38);
        sample = Math.round(sample * 64) / 64;

        data[i] = Math.max(-1, Math.min(1, sample * 0.75));
    }

    return buffer;
}

export function createHissBuffer(context, duration = 1.5) {
    const sampleRate = context.sampleRate || 44100;
    const numSamples = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = context.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let x1 = 0, x2 = 0;

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const progress = t / duration;

        const noise = Math.random() * 2 - 1;

        // Highpass filter for sizzle (suppresses low rumble, keeps 2kHz-8kHz)
        const highpassed = noise - 0.72 * x1 + 0.22 * x2;
        x2 = x1;
        x1 = noise;

        // Burning black powder flutter modulation (30-50Hz)
        const flutter = 0.75 + 0.25 * Math.sin(2 * Math.PI * 46 * t) * Math.sin(2 * Math.PI * 19 * t);

        // Random micro-spark pops
        const spark = Math.random() > 0.994 ? (Math.random() * 0.65) : 0.0;

        // Crescendo curve
        const volumeRamp = 0.65 + 0.35 * Math.pow(progress, 1.4);

        let sample = (highpassed * flutter * 0.6 + spark) * volumeRamp;
        sample = Math.round(sample * 128) / 128;

        data[i] = Math.max(-1, Math.min(1, sample * 0.72));
    }

    return buffer;
}

export function createExplosionBuffer(context, duration = 1.2) {
    const sampleRate = context.sampleRate || 44100;
    const numSamples = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = context.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    let noiseFilter = 0;

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const progress = t / duration;

        // Sub bass thump
        const freq = 65 * Math.exp(-t * 6);
        phase += (2 * Math.PI * freq) / sampleRate;
        const thump = Math.sin(phase) * Math.exp(-t * 4);

        // Heavy distorted noise
        const rawNoise = (Math.random() * 2 - 1);
        noiseFilter = noiseFilter * 0.3 + rawNoise * 0.7;
        const noiseDecay = Math.pow(1 - progress, 2.5);

        let mixed = thump * 0.6 + noiseFilter * noiseDecay * 0.8;
        // Overdrive clipping
        mixed = Math.tanh(mixed * 2.2);
        // Bitcrush
        mixed = Math.round(mixed * 32) / 32;

        data[i] = Math.max(-1, Math.min(1, mixed * 0.9));
    }

    return buffer;
}

export function createClickBuffer(context, duration = 0.02) {
    const sampleRate = context.sampleRate || 44100;
    const numSamples = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = context.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        phase += (2 * Math.PI * 1200) / sampleRate;
        const square = Math.sin(phase) >= 0 ? 0.7 : -0.7;
        const env = Math.exp(-t * 180);
        let sample = square * env * 0.5;
        sample = Math.round(sample * 64) / 64;
        data[i] = sample;
    }

    return buffer;
}

export function createHurtBuffer(context, duration = 0.18) {
    const sampleRate = context.sampleRate || 44100;
    const numSamples = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = context.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const progress = t / duration;
        const freq = 340 - 220 * Math.pow(progress, 0.7);
        phase += (2 * Math.PI * freq) / sampleRate;
        const square = Math.sin(phase) >= 0 ? 0.75 : -0.75;
        const env = Math.exp(-t * 16);
        let sample = square * env * 0.65;
        sample = Math.round(sample * 64) / 64;
        data[i] = sample;
    }

    return buffer;
}

export class SoundManager {
    
    constructor(camera = null, options = {}) {
        this.camera = null;
        this.scene = options.scene || null;
        this.masterVolume = options.masterVolume !== undefined ? options.masterVolume : 1.0;
        this.sfxVolume = options.sfxVolume !== undefined ? options.sfxVolume : 1.0;
        this.isMutedState = false;

        // Positional audio defaults
        this.refDistance = options.refDistance || 1.5;
        this.maxDistance = options.maxDistance || 32.0;
        this.rolloffFactor = options.rolloffFactor || 1.0;

        // Active positional audio instances for cleanup tracking
        this.activePositionalSounds = new Set();

        // 1. Create AudioListener & retrieve Web Audio context
        this.listener = new THREE.AudioListener();
        this.context = this.listener.context;

        // 2. Initialize sound buffer cache with variations
        this.bufferCache = new Map();
        this.generateSoundCache();

        // 3. Attach to camera if supplied
        if (camera) {
            this.setCamera(camera);
        }

        // 4. Register automatic audio context unlocking on first user interaction
        this._setupAutoUnlock();
    }

    setCamera(camera) {
        if (!camera) return;
        if (this.camera && this.listener.parent === this.camera) {
            this.camera.remove(this.listener);
        }
        this.camera = camera;
        this.camera.add(this.listener);
    }

    setScene(scene) {
        this.scene = scene;
    }

    generateSoundCache() {
        if (!this.context) return;

        // 'pop': Variations with subtle pitch differences
        this.bufferCache.set('pop', [
            createPopBuffer(this.context, 420, 960, 0.09),
            createPopBuffer(this.context, 450, 1020, 0.085),
            createPopBuffer(this.context, 390, 900, 0.095)
        ]);

        // 'crunch': Variations with different crackle modulations & pitches
        this.bufferCache.set('crunch', [
            createCrunchBuffer(this.context, 0.20, 1.0),
            createCrunchBuffer(this.context, 0.18, 1.15),
            createCrunchBuffer(this.context, 0.22, 0.88),
            createCrunchBuffer(this.context, 0.19, 1.05)
        ]);

        // 'step': Left/right footstep variations
        this.bufferCache.set('step', [
            createStepBuffer(this.context, 0.075, 1.0),
            createStepBuffer(this.context, 0.070, 1.12),
            createStepBuffer(this.context, 0.080, 0.92),
            createStepBuffer(this.context, 0.072, 1.05)
        ]);

        // 'hiss': Creeper fuse
        this.bufferCache.set('hiss', [
            createHissBuffer(this.context, 1.5)
        ]);

        // 'explode': TNT / creeper detonation
        this.bufferCache.set('explode', [
            createExplosionBuffer(this.context, 1.2)
        ]);

        // 'click': UI click
        this.bufferCache.set('click', [
            createClickBuffer(this.context, 0.02)
        ]);

        // 'hurt': Damage sound
        this.bufferCache.set('hurt', [
            createHurtBuffer(this.context, 0.18)
        ]);
    }

    getBuffer(soundName, variation = null) {
        const buffers = this.bufferCache.get(soundName);
        if (!buffers || buffers.length === 0) {
            return null;
        }

        if (variation !== null && variation >= 0 && variation < buffers.length) {
            return buffers[variation];
        }

        // Random variation
        const index = Math.floor(Math.random() * buffers.length);
        return buffers[index];
    }

    _setupAutoUnlock() {
        const unlock = () => {
            this.unlockAudio();
            ['click', 'keydown', 'touchstart', 'pointerdown', 'mousedown'].forEach(event => {
                window.removeEventListener(event, unlock);
            });
        };

        if (typeof window !== 'undefined') {
            ['click', 'keydown', 'touchstart', 'pointerdown', 'mousedown'].forEach(event => {
                window.addEventListener(event, unlock, { once: true });
            });
        }
    }

    unlockAudio() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume().catch(() => {});
        }
    }

    getEffectiveVolume(localVolume = 1.0) {
        if (this.isMutedState) return 0;
        return Math.max(0, Math.min(1, localVolume * this.masterVolume * this.sfxVolume));
    }

    play(soundName, options = {}) {
        this.unlockAudio();
        const buffer = this.getBuffer(soundName, options.variation);
        if (!buffer) return null;

        const volume = options.volume !== undefined ? options.volume : 1.0;
        const pitch = options.pitch !== undefined ? options.pitch : 1.0;
        const loop = options.loop || false;

        const sound = new THREE.Audio(this.listener);
        sound.setBuffer(buffer);
        sound.setVolume(this.getEffectiveVolume(volume));
        if (pitch !== 1.0) {
            sound.setPlaybackRate(pitch);
        }
        sound.setLoop(loop);

        sound.play();

        if (!loop) {
            sound.onEnded = () => {
                sound.disconnect();
            };
        }

        return sound;
    }

    playPositional(soundName, target, options = {}) {
        this.unlockAudio();
        const buffer = this.getBuffer(soundName, options.variation);
        if (!buffer) return null;

        const volume = options.volume !== undefined ? options.volume : 1.0;
        const pitch = options.pitch !== undefined ? options.pitch : 1.0;
        const refDist = options.refDistance || this.refDistance;
        const maxDist = options.maxDistance || this.maxDistance;
        const rolloff = options.rolloffFactor || this.rolloffFactor;
        const distModel = options.distanceModel || 'linear';
        const loop = options.loop || false;
        const activeScene = options.scene || this.scene;

        const sound = new THREE.PositionalAudio(this.listener);
        sound.setBuffer(buffer);
        sound.setRefDistance(refDist);
        sound.setMaxDistance(maxDist);
        sound.setRolloffFactor(rolloff);
        sound.setDistanceModel(distModel);
        sound.setVolume(this.getEffectiveVolume(volume));
        if (pitch !== 1.0) {
            sound.setPlaybackRate(pitch);
        }
        sound.setLoop(loop);

        let container = null;

        if (target instanceof THREE.Object3D) {
            // Target is an existing scene object (e.g. Mob, Player mesh)
            target.add(sound);
        } else if (target && typeof target === 'object' && ('x' in target || 'y' in target || 'z' in target)) {
            // Target is a coordinate {x, y, z}
            container = new THREE.Object3D();
            container.position.set(target.x || 0, target.y || 0, target.z || 0);
            container.add(sound);

            if (activeScene) {
                activeScene.add(container);
            } else if (this.camera && this.camera.parent) {
                this.camera.parent.add(container);
            }
        } else {
            // Fallback to listener position if no target supplied
            this.listener.add(sound);
        }

        this.activePositionalSounds.add(sound);
        sound.play();

        const cleanup = () => {
            sound.disconnect();
            this.activePositionalSounds.delete(sound);

            if (container) {
                container.remove(sound);
                if (container.parent) {
                    container.parent.remove(container);
                }
            } else if (sound.parent) {
                sound.parent.remove(sound);
            }
        };

        if (!loop) {
            sound.onEnded = cleanup;
        }

        // Store reference for manual stopping / cleanup
        sound._stopAndCleanup = () => {
            if (sound.isPlaying) sound.stop();
            cleanup();
        };

        return sound;
    }

    playSound(soundName, positionOrTarget = null, options = {}) {
        if (positionOrTarget) {
            return this.playPositional(soundName, positionOrTarget, options);
        }
        return this.play(soundName, options);
    }

    // ==========================================
    // Specific Synthesized Sound Helper Methods
    // ==========================================

    pop(position = null, options = {}) {
        const pitch = options.pitch || (0.95 + Math.random() * 0.1);
        return this.playSound('pop', position, { pitch, ...options });
    }

    crunch(position = null, options = {}) {
        const pitch = options.pitch || (0.92 + Math.random() * 0.16);
        return this.playSound('crunch', position, { pitch, ...options });
    }

    step(position = null, options = {}) {
        const pitch = options.pitch || (0.90 + Math.random() * 0.20);
        return this.playSound('step', position, { volume: 0.8, pitch, ...options });
    }

    hiss(position = null, options = {}) {
        return this.playSound('hiss', position, { volume: 1.0, refDistance: 3, maxDistance: 24, ...options });
    }

    explode(position = null, options = {}) {
        return this.playSound('explode', position, { volume: 1.0, refDistance: 5, maxDistance: 48, ...options });
    }

    click(options = {}) {
        return this.play('click', { volume: 0.7, ...options });
    }

    hurt(position = null, options = {}) {
        return this.playSound('hurt', position, { volume: 0.9, ...options });
    }

    // ==========================================
    // Volume & State Controls
    // ==========================================

    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.listener && this.listener.setMasterVolume) {
            this.listener.setMasterVolume(this.masterVolume);
        }
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    mute() {
        this.isMutedState = true;
        if (this.listener && this.listener.setMasterVolume) {
            this.listener.setMasterVolume(0);
        }
    }

    unmute() {
        this.isMutedState = false;
        if (this.listener && this.listener.setMasterVolume) {
            this.listener.setMasterVolume(this.masterVolume);
        }
    }

    toggleMute() {
        if (this.isMutedState) {
            this.unmute();
        } else {
            this.mute();
        }
        return this.isMutedState;
    }

    isMuted() {
        return this.isMutedState;
    }

    dispose() {
        this.activePositionalSounds.forEach(sound => {
            if (sound._stopAndCleanup) {
                sound._stopAndCleanup();
            }
        });
        this.activePositionalSounds.clear();
        this.bufferCache.clear();

        if (this.camera && this.listener.parent === this.camera) {
            this.camera.remove(this.listener);
        }
    }
}

export default SoundManager;
