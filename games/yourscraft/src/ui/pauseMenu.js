/**
 * Pause Menu & Options UI for Minecraft 1.5 WebGL Engine
 * 
 * Features:
 * - Authentic Minecraft 1.5 Pause Screen ("Game menu")
 * - Sub-view for Options Screen ("Options")
 * - Interactive Minecraft-styled Sliders:
 *   * FOV (Field of View: 30° to 110° / Normal to Quake Pro)
 *   * Render Distance (2 to 16 chunks with Tiny/Short/Normal/Far presets)
 *   * Mouse Sensitivity (20% to 200% / Slow to Hyperspeed)
 *   * Music & Sound Volume (0% to 100% / OFF to Loud)
 * - Toggle Buttons for Difficulty (Peaceful/Easy/Normal/Hard) & Invert Mouse
 * - Automatic persistence to localStorage ('minecraft_options')
 * - Full callbacks dispatch to engine subsystems
 */

export class PauseMenu {
    /**
     * @param {Function} [onResume] Callback when returning to game
     * @param {Function} [onAchievements] Callback for achievements
     * @param {Function} [onStatistics] Callback for statistics
     * @param {Function} [onOptions] Optional custom callback when Options is clicked
     * @param {Function} [onQuit] Callback when quitting to title
     * @param {Object} [config={}] Configuration & event handlers
     */
    constructor(onResume, onAchievements, onStatistics, onOptions, onQuit, config = {}) {
        this.onResume = onResume || (() => {});
        this.onAchievements = onAchievements || (() => {});
        this.onStatistics = onStatistics || (() => {});
        this.onOptions = onOptions || null;
        this.onQuit = onQuit || (() => {});
        this.config = config;

        // Load saved options from localStorage
        let savedOptions = {};
        try {
            const raw = localStorage.getItem('minecraft_options');
            if (raw) savedOptions = JSON.parse(raw);
        } catch (e) {
            console.warn('Failed to parse minecraft_options from localStorage:', e);
        }

        this.settings = {
            fov: config.initialFov !== undefined ? config.initialFov : (savedOptions.fov !== undefined ? Number(savedOptions.fov) : 70),
            renderDistance: config.initialRenderDistance !== undefined ? config.initialRenderDistance : (savedOptions.renderDistance !== undefined ? Number(savedOptions.renderDistance) : 6),
            sensitivity: config.initialSensitivity !== undefined ? config.initialSensitivity : (savedOptions.sensitivity !== undefined ? Number(savedOptions.sensitivity) : 1.0),
            volume: config.initialVolume !== undefined ? config.initialVolume : (savedOptions.volume !== undefined ? Number(savedOptions.volume) : 1.0),
            difficulty: config.initialDifficulty || savedOptions.difficulty || 'Normal',
            invertMouse: config.initialInvertMouse !== undefined ? config.initialInvertMouse : Boolean(savedOptions.invertMouse)
        };

        this.element = this.createRootContainer();
        this.mainMenuPanel = this.createMainMenuPanel();
        this.optionsPanel = this.createOptionsPanel();

        this.element.appendChild(this.mainMenuPanel);
        this.element.appendChild(this.optionsPanel);

        // Initial view is the main pause menu
        this.showMainMenu();
    }

    createRootContainer() {
        const container = document.createElement('div');
        container.id = 'minecraft-pause-menu';
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.zIndex = '90';
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.65)'; // Authentic dark translucent overlay
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.fontFamily = 'monospace';
        container.style.userSelect = 'none';
        return container;
    }

    createButtonStyle(isSmall = false) {
        return `
            width: ${isSmall ? '195px' : '400px'};
            height: 40px;
            margin: 5px;
            background-color: #7b7b7b;
            border: 2px solid;
            border-color: #a8a8a8 #3b3b3b #3b3b3b #a8a8a8;
            color: white;
            font-size: 15px;
            font-family: monospace;
            text-shadow: 2px 2px 0px #333;
            cursor: pointer;
            box-sizing: border-box;
            outline: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        `;
    }

    createButton(text, isSmall, onClick) {
        const btn = document.createElement('button');
        const style = this.createButtonStyle(isSmall);
        btn.textContent = text;
        btn.style.cssText = style;
        btn.onmouseover = () => {
            btn.style.backgroundColor = '#8b9bb4';
            btn.style.borderColor = '#c6d6f2 #4a5a74 #4a5a74 #c6d6f2';
            btn.style.color = '#fffbaa';
        };
        btn.onmouseout = () => {
            btn.style.cssText = style;
        };
        btn.onclick = onClick;
        return btn;
    }

    /**
     * Create custom pixel-art Minecraft Range Slider
     */
    createSlider({ labelPrefix = '', min = 0, max = 100, step = 1, value = 50, isSmall = true, format = (v) => `${labelPrefix}: ${v}`, onChange = () => {} }) {
        const container = document.createElement('div');
        container.className = 'mc-slider';
        const width = isSmall ? 195 : 400;
        container.style.position = 'relative';
        container.style.width = `${width}px`;
        container.style.height = '40px';
        container.style.margin = '5px';
        container.style.backgroundColor = '#4a4a4a';
        container.style.border = '2px solid';
        container.style.borderColor = '#222222 #777777 #777777 #222222';
        container.style.boxSizing = 'border-box';
        container.style.overflow = 'hidden';
        container.style.userSelect = 'none';
        container.style.cursor = 'pointer';
        container.style.display = 'inline-flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';

        const thumb = document.createElement('div');
        thumb.style.position = 'absolute';
        thumb.style.top = '0';
        thumb.style.width = '24px';
        thumb.style.height = '100%';
        thumb.style.backgroundColor = '#7b7b7b';
        thumb.style.border = '2px solid';
        thumb.style.borderColor = '#a8a8a8 #3b3b3b #3b3b3b #a8a8a8';
        thumb.style.boxSizing = 'border-box';
        thumb.style.pointerEvents = 'none';
        thumb.style.zIndex = '1';

        const textLabel = document.createElement('span');
        textLabel.style.position = 'relative';
        textLabel.style.zIndex = '3';
        textLabel.style.width = '100%';
        textLabel.style.height = '100%';
        textLabel.style.display = 'flex';
        textLabel.style.alignItems = 'center';
        textLabel.style.justifyContent = 'center';
        textLabel.style.color = 'white';
        textLabel.style.fontFamily = 'monospace';
        textLabel.style.fontSize = '14px';
        textLabel.style.textShadow = '2px 2px 0px #333';
        textLabel.style.pointerEvents = 'none';
        textLabel.style.whiteSpace = 'nowrap';

        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = value;
        input.style.position = 'absolute';
        input.style.top = '0';
        input.style.left = '0';
        input.style.width = '100%';
        input.style.height = '100%';
        input.style.opacity = '0';
        input.style.cursor = 'pointer';
        input.style.zIndex = '2';
        input.style.margin = '0';

        const updateVisuals = (val) => {
            const numVal = Number(val);
            const pct = Math.max(0, Math.min(1, (numVal - min) / (max - min)));
            const thumbWidth = 24;
            const availableWidth = width - 4 - thumbWidth;
            const left = Math.round(pct * availableWidth);
            thumb.style.left = `${left}px`;
            textLabel.textContent = format(numVal);
        };

        input.oninput = (e) => {
            const val = Number(e.target.value);
            updateVisuals(val);
            onChange(val);
        };

        container.onmouseover = () => {
            thumb.style.backgroundColor = '#8b9bb4';
            thumb.style.borderColor = '#c6d6f2 #4a5a74 #4a5a74 #c6d6f2';
            textLabel.style.color = '#fffbaa';
        };
        container.onmouseout = () => {
            thumb.style.backgroundColor = '#7b7b7b';
            thumb.style.borderColor = '#a8a8a8 #3b3b3b #3b3b3b #a8a8a8';
            textLabel.style.color = 'white';
        };

        updateVisuals(value);

        container.appendChild(thumb);
        container.appendChild(input);
        container.appendChild(textLabel);

        return {
            element: container,
            input,
            setValue: (val) => {
                input.value = val;
                updateVisuals(val);
            },
            getValue: () => Number(input.value)
        };
    }

    createMainMenuPanel() {
        const panel = document.createElement('div');
        panel.style.display = 'flex';
        panel.style.flexDirection = 'column';
        panel.style.alignItems = 'center';
        panel.style.justifyContent = 'center';

        const title = document.createElement('h2');
        title.textContent = 'Game menu';
        title.style.color = 'white';
        title.style.textShadow = '2px 2px 0px #333';
        title.style.marginBottom = '20px';
        title.style.fontSize = '24px';
        panel.appendChild(title);

        const backBtn = this.createButton('Back to Game', false, () => {
            if (this.onResume) this.onResume();
        });

        const row1 = document.createElement('div');
        row1.style.display = 'flex';
        row1.style.justifyContent = 'space-between';
        row1.style.width = '410px';

        const achievementsBtn = this.createButton('Achievements', true, () => {
            if (this.onAchievements) this.onAchievements();
        });
        const statsBtn = this.createButton('Statistics', true, () => {
            if (this.onStatistics) this.onStatistics();
        });
        row1.appendChild(achievementsBtn);
        row1.appendChild(statsBtn);

        const optionsBtn = this.createButton('Options...', false, () => {
            if (this.onOptions && typeof this.onOptions === 'function') {
                const handled = this.onOptions();
                if (handled === false) return;
            }
            this.showOptionsMenu();
        });

        const quitBtn = this.createButton('Save and Quit to Title', false, () => {
            if (window.player && window.inventory && window.world) {
                const playerData = {
                    position: { x: window.player.position.x, y: window.player.position.y, z: window.player.position.z },
                    inventory: window.inventory.serialize()
                };

                const chunkData = [];
                window.world.chunks.forEach((chunk, key) => {
                    chunkData.push({ key, blocks: Array.from(chunk.blocks) });
                });

                try {
                    localStorage.setItem('minecraft_save', JSON.stringify({ player: playerData, chunks: chunkData }));
                } catch (e) {
                    console.warn("Could not save full chunks to localStorage:", e);
                    localStorage.setItem('minecraft_save', JSON.stringify({ player: playerData, chunks: [] }));
                }
            }
            if (this.onQuit) this.onQuit();
        });

        panel.appendChild(backBtn);
        panel.appendChild(row1);
        panel.appendChild(optionsBtn);
        panel.appendChild(quitBtn);

        return panel;
    }

    createOptionsPanel() {
        const panel = document.createElement('div');
        panel.style.display = 'flex';
        panel.style.flexDirection = 'column';
        panel.style.alignItems = 'center';
        panel.style.justifyContent = 'center';

        const title = document.createElement('h2');
        title.textContent = 'Options';
        title.style.color = 'white';
        title.style.textShadow = '2px 2px 0px #333';
        title.style.marginBottom = '20px';
        title.style.fontSize = '24px';
        panel.appendChild(title);

        // Row 1: Music/Volume + Sensitivity
        const row1 = document.createElement('div');
        row1.style.display = 'flex';
        row1.style.justifyContent = 'space-between';
        row1.style.width = '410px';

        const volSlider = this.createSlider({
            min: 0,
            max: 100,
            step: 5,
            value: Math.round(this.settings.volume * 100),
            isSmall: true,
            format: (v) => v === 0 ? 'Music: OFF' : `Music: ${v}%`,
            onChange: (v) => {
                this.settings.volume = v / 100;
                if (this.config.onVolumeChange) {
                    this.config.onVolumeChange(this.settings.volume);
                }
                this.saveSettings();
            }
        });

        const sensSlider = this.createSlider({
            min: 20,
            max: 200,
            step: 5,
            value: Math.round(this.settings.sensitivity * 100),
            isSmall: true,
            format: (v) => {
                if (v >= 200) return 'Sensitivity: *HYPERSPEED*';
                if (v <= 20) return 'Sensitivity: *SLOW*';
                return `Sensitivity: ${v}%`;
            },
            onChange: (v) => {
                this.settings.sensitivity = v / 100;
                if (this.config.onSensitivityChange) {
                    this.config.onSensitivityChange(this.settings.sensitivity);
                }
                this.saveSettings();
            }
        });

        row1.appendChild(volSlider.element);
        row1.appendChild(sensSlider.element);
        this.volSlider = volSlider;
        this.sensSlider = sensSlider;

        // Row 2: FOV + Render Distance
        const row2 = document.createElement('div');
        row2.style.display = 'flex';
        row2.style.justifyContent = 'space-between';
        row2.style.width = '410px';

        const fovSlider = this.createSlider({
            min: 30,
            max: 110,
            step: 1,
            value: Math.round(this.settings.fov),
            isSmall: true,
            format: (v) => {
                if (v === 70) return 'FOV: Normal (70)';
                if (v === 110) return 'FOV: Quake Pro';
                return `FOV: ${v}°`;
            },
            onChange: (v) => {
                this.settings.fov = v;
                if (this.config.onFovChange) {
                    this.config.onFovChange(this.settings.fov);
                }
                this.saveSettings();
            }
        });

        const renderDistSlider = this.createSlider({
            min: 2,
            max: 16,
            step: 1,
            value: Math.round(this.settings.renderDistance),
            isSmall: true,
            format: (v) => {
                let note = '';
                if (v <= 2) note = ' (Tiny)';
                else if (v <= 4) note = ' (Short)';
                else if (v === 8) note = ' (Normal)';
                else if (v === 12) note = ' (Far)';
                else if (v >= 16) note = ' (Extreme)';
                return `Render Distance: ${v}${note}`;
            },
            onChange: (v) => {
                this.settings.renderDistance = v;
                if (this.config.onRenderDistanceChange) {
                    this.config.onRenderDistanceChange(this.settings.renderDistance);
                }
                this.saveSettings();
            }
        });

        row2.appendChild(fovSlider.element);
        row2.appendChild(renderDistSlider.element);
        this.fovSlider = fovSlider;
        this.renderDistSlider = renderDistSlider;

        // Row 3: Difficulty + Invert Mouse
        const row3 = document.createElement('div');
        row3.style.display = 'flex';
        row3.style.justifyContent = 'space-between';
        row3.style.width = '410px';

        const difficulties = ['Peaceful', 'Easy', 'Normal', 'Hard'];
        let diffIndex = difficulties.indexOf(this.settings.difficulty);
        if (diffIndex === -1) diffIndex = 2;

        const diffBtn = this.createButton(`Difficulty: ${difficulties[diffIndex]}`, true, () => {
            diffIndex = (diffIndex + 1) % difficulties.length;
            this.settings.difficulty = difficulties[diffIndex];
            diffBtn.textContent = `Difficulty: ${this.settings.difficulty}`;
            if (this.config.onDifficultyChange) {
                this.config.onDifficultyChange(this.settings.difficulty);
            }
            this.saveSettings();
        });

        const invertBtn = this.createButton(`Invert Mouse: ${this.settings.invertMouse ? 'ON' : 'OFF'}`, true, () => {
            this.settings.invertMouse = !this.settings.invertMouse;
            invertBtn.textContent = `Invert Mouse: ${this.settings.invertMouse ? 'ON' : 'OFF'}`;
            if (this.config.onInvertMouseChange) {
                this.config.onInvertMouseChange(this.settings.invertMouse);
            }
            this.saveSettings();
        });

        row3.appendChild(diffBtn);
        row3.appendChild(invertBtn);

        // Done button
        const doneBtn = this.createButton('Done', false, () => {
            this.saveSettings();
            if (this.config.onDone) {
                this.config.onDone();
            } else {
                this.showMainMenu();
            }
        });

        panel.appendChild(row1);
        panel.appendChild(row2);
        panel.appendChild(row3);
        panel.appendChild(doneBtn);

        return panel;
    }

    showMainMenu() {
        this.mainMenuPanel.style.display = 'flex';
        this.optionsPanel.style.display = 'none';
    }

    showOptionsMenu() {
        this.mainMenuPanel.style.display = 'none';
        this.optionsPanel.style.display = 'flex';
    }

    saveSettings() {
        try {
            localStorage.setItem('minecraft_options', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Failed to save minecraft_options:', e);
        }
    }

    getSettings() {
        return { ...this.settings };
    }

    setSettings(newSettings = {}) {
        Object.assign(this.settings, newSettings);
        if (this.fovSlider && this.settings.fov !== undefined) this.fovSlider.setValue(this.settings.fov);
        if (this.renderDistSlider && this.settings.renderDistance !== undefined) this.renderDistSlider.setValue(this.settings.renderDistance);
        if (this.sensSlider && this.settings.sensitivity !== undefined) this.sensSlider.setValue(Math.round(this.settings.sensitivity * 100));
        if (this.volSlider && this.settings.volume !== undefined) this.volSlider.setValue(Math.round(this.settings.volume * 100));
        this.saveSettings();
    }

    show() {
        this.showMainMenu();
        if (!this.element.parentNode) {
            document.body.appendChild(this.element);
        }
        this.element.style.display = 'flex';
    }

    hide() {
        this.element.style.display = 'none';
    }
}
