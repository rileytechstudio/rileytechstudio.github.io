/**
 * Scoreboard System for Minecraft 1.5 WebGL Engine
 * 
 * Provides:
 * - ScoreboardManager: central manager for objectives, display slots, and teams
 * - ScoreboardObjective: individual tracked objective (e.g. 'dummy', 'playerKillCount', 'deathCount', 'health')
 * - ScoreboardTeam: teams with prefixes, suffixes, colors, and player assignments
 * - Full event emission for reactive UI / HUD data binding
 */

/**
 * Standard Minecraft Scoreboard Criteria Types
 */
export const ScoreboardCriteria = Object.freeze({
    DUMMY: 'dummy',
    TRIGGER: 'trigger',
    DEATH_COUNT: 'deathCount',
    PLAYER_KILL_COUNT: 'playerKillCount',
    TOTAL_KILL_COUNT: 'totalKillCount',
    HEALTH: 'health',
    LEVEL: 'level',
    FOOD: 'food',
    XP: 'xp',
    AIR: 'air',
    ARMOR: 'armor'
});

/**
 * Valid Display Slot Names
 */
export const DisplaySlot = Object.freeze({
    SIDEBAR: 'sidebar',
    LIST: 'list',
    BELOW_NAME: 'belowName'
});

/**
 * Individual Scoreboard Objective
 */
export class ScoreboardObjective {
    /**
     * @param {string} name Unique identifier for the objective
     * @param {string} [criteria='dummy'] Criteria type (e.g. 'dummy', 'playerKillCount')
     * @param {string} [displayName=null] Formatted display title (defaults to name)
     * @param {ScoreboardManager} [scoreboard=null] Reference to parent scoreboard manager
     */
    constructor(name, criteria = ScoreboardCriteria.DUMMY, displayName = null, scoreboard = null) {
        if (!name || typeof name !== 'string') {
            throw new Error('ScoreboardObjective requires a valid string name.');
        }

        this.name = name;
        this.criteria = criteria || ScoreboardCriteria.DUMMY;
        this.displayName = displayName !== null && displayName !== undefined ? String(displayName) : name;
        this.renderType = 'integer'; // 'integer' | 'hearts'
        
        /** @type {Map<string, number>} Player Name -> Score */
        this.scores = new Map();
        
        /** @type {ScoreboardManager|null} */
        this.scoreboard = scoreboard;
    }

    /**
     * Get unique objective name
     * @returns {string}
     */
    getName() {
        return this.name;
    }

    /**
     * Get objective criteria
     * @returns {string}
     */
    getCriteria() {
        return this.criteria;
    }

    /**
     * Get objective display name
     * @returns {string}
     */
    getDisplayName() {
        return this.displayName;
    }

    /**
     * Set display title shown on HUD
     * @param {string} displayName 
     * @returns {this}
     */
    setDisplayName(displayName) {
        this.displayName = String(displayName);
        this._notifyChange();
        return this;
    }

    /**
     * Get score render type ('integer' | 'hearts')
     * @returns {'integer'|'hearts'}
     */
    getRenderType() {
        return this.renderType;
    }

    /**
     * Set score render type
     * @param {'integer'|'hearts'} renderType 
     * @returns {this}
     */
    setRenderType(renderType) {
        if (renderType === 'hearts' || renderType === 'integer') {
            this.renderType = renderType;
            this._notifyChange();
        }
        return this;
    }

    /**
     * Check if player has a recorded score in this objective
     * @param {string} player 
     * @returns {boolean}
     */
    hasScore(player) {
        return this.scores.has(player);
    }

    /**
     * Get player's score (defaults to 0 if not set)
     * @param {string} player 
     * @returns {number}
     */
    getScore(player) {
        return this.scores.get(player) ?? 0;
    }

    /**
     * Set player's score
     * @param {string} player 
     * @param {number} value 
     * @returns {number} The updated score
     */
    setScore(player, value) {
        const parsed = Math.floor(Number(value) || 0);
        const prev = this.scores.get(player);
        this.scores.set(player, parsed);

        if (this.scoreboard) {
            this.scoreboard.emit('scoreChange', {
                objective: this,
                player,
                score: parsed,
                previousScore: prev
            });
            this.scoreboard.emit('change', { type: 'scoreChange', objective: this, player });
        }
        return parsed;
    }

    /**
     * Add amount to player's score
     * @param {string} player 
     * @param {number} [amount=1] 
     * @returns {number} The updated score
     */
    addScore(player, amount = 1) {
        const current = this.getScore(player);
        return this.setScore(player, current + amount);
    }

    /**
     * Reset/remove player's score from this objective
     * @param {string} player 
     * @returns {boolean} True if score was present and removed
     */
    resetScore(player) {
        if (this.scores.has(player)) {
            this.scores.delete(player);
            if (this.scoreboard) {
                this.scoreboard.emit('scoreReset', { objective: this, player });
                this.scoreboard.emit('change', { type: 'scoreReset', objective: this, player });
            }
            return true;
        }
        return false;
    }

    /**
     * Remove score alias
     * @param {string} player 
     * @returns {boolean}
     */
    removeScore(player) {
        return this.resetScore(player);
    }

    /**
     * Get all entries with their scores as an array of { player, score }
     * @returns {Array<{player: string, score: number}>}
     */
    getScores() {
        const result = [];
        for (const [player, score] of this.scores.entries()) {
            result.push({ player, score });
        }
        return result;
    }

    /**
     * Get sorted list of scores for UI/sidebar rendering.
     * Sorts descending by score value, breaking ties alphabetically by player name.
     * @param {'desc'|'asc'} [order='desc'] 
     * @returns {Array<{player: string, score: number}>}
     */
    getSortedScores(order = 'desc') {
        const list = this.getScores();
        list.sort((a, b) => {
            if (order === 'asc') {
                if (a.score !== b.score) return a.score - b.score;
                return a.player.localeCompare(b.player);
            } else {
                if (b.score !== a.score) return b.score - a.score;
                return a.player.localeCompare(b.player);
            }
        });
        return list;
    }

    /**
     * Get array of all player name entries in this objective
     * @returns {string[]}
     */
    getEntries() {
        return Array.from(this.scores.keys());
    }

    /**
     * Clear all player scores in this objective
     */
    clearScores() {
        this.scores.clear();
        this._notifyChange();
    }

    /**
     * Assign this objective directly to a display slot (e.g. 'sidebar')
     * @param {string} slot 
     * @returns {this}
     */
    setDisplaySlot(slot) {
        if (this.scoreboard) {
            this.scoreboard.setDisplaySlot(slot, this);
        }
        return this;
    }

    /**
     * Internal helper to notify parent scoreboard manager of changes
     */
    _notifyChange() {
        if (this.scoreboard) {
            this.scoreboard.emit('objectiveUpdate', this);
            this.scoreboard.emit('change', { type: 'objectiveUpdate', objective: this });
        }
    }
}

/**
 * Scoreboard Team
 */
export class ScoreboardTeam {
    /**
     * @param {string} name Unique team name
     * @param {string} [displayName=null] Formatted team title
     */
    constructor(name, displayName = null) {
        this.name = name;
        this.displayName = displayName || name;
        this.prefix = '';
        this.suffix = '';
        this.color = 'reset';
        this.friendlyFire = true;
        this.seeFriendlyInvisibles = false;
        /** @type {Set<string>} */
        this.members = new Set();
        /** @type {ScoreboardManager|null} */
        this.scoreboard = null;
    }

    getName() { return this.name; }
    getDisplayName() { return this.displayName; }
    setDisplayName(name) { this.displayName = name; this._notify(); return this; }
    getPrefix() { return this.prefix; }
    setPrefix(prefix) { this.prefix = prefix; this._notify(); return this; }
    getSuffix() { return this.suffix; }
    setSuffix(suffix) { this.suffix = suffix; this._notify(); return this; }
    getColor() { return this.color; }
    setColor(color) { this.color = color; this._notify(); return this; }
    getFriendlyFire() { return this.friendlyFire; }
    setFriendlyFire(enabled) { this.friendlyFire = Boolean(enabled); return this; }
    getSeeFriendlyInvisibles() { return this.seeFriendlyInvisibles; }
    setSeeFriendlyInvisibles(enabled) { this.seeFriendlyInvisibles = Boolean(enabled); return this; }

    addMember(playerName) {
        this.members.add(playerName);
        this._notify();
        return this;
    }

    removeMember(playerName) {
        const removed = this.members.delete(playerName);
        if (removed) this._notify();
        return removed;
    }

    hasMember(playerName) {
        return this.members.has(playerName);
    }

    getMembers() {
        return Array.from(this.members);
    }

    /**
     * Formats player name with team prefix, suffix, and color
     * @param {string} playerName 
     * @returns {string}
     */
    formatPlayerName(playerName) {
        return `${this.prefix}${playerName}${this.suffix}`;
    }

    _notify() {
        if (this.scoreboard) {
            this.scoreboard.emit('teamUpdate', this);
            this.scoreboard.emit('change', { type: 'teamUpdate', team: this });
        }
    }
}

/**
 * Scoreboard Manager
 * Holds objectives, manages display slots, and coordinates updates with UI/HUD.
 */
export class ScoreboardManager {
    constructor() {
        /** @type {Map<string, ScoreboardObjective>} */
        this.objectives = new Map();

        /** @type {Map<string, ScoreboardObjective|null>} */
        this.displaySlots = new Map([
            [DisplaySlot.SIDEBAR, null],
            [DisplaySlot.LIST, null],
            [DisplaySlot.BELOW_NAME, null]
        ]);

        /** @type {Map<string, ScoreboardTeam>} */
        this.teams = new Map();

        /** @type {Map<string, Set<Function>>} */
        this.listeners = new Map();
    }

    // ==========================================
    // 1. EVENT SYSTEM
    // ==========================================

    /**
     * Register an event listener
     * @param {string} event 
     * @param {Function} callback 
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (typeof callback !== 'function') return () => {};
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    /**
     * Remove an event listener
     * @param {string} event 
     * @param {Function} callback 
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event 
     * @param {...any} args 
     */
    emit(event, ...args) {
        if (this.listeners.has(event)) {
            for (const cb of this.listeners.get(event)) {
                try {
                    cb(...args);
                } catch (err) {
                    console.error(`[ScoreboardManager] Error in listener for "${event}":`, err);
                }
            }
        }
    }

    // ==========================================
    // 2. OBJECTIVES MANAGEMENT
    // ==========================================

    /**
     * Add a new objective
     * @param {string} name Unique identifier
     * @param {string} [criteria='dummy'] Criteria type
     * @param {string} [displayName=null] Display title
     * @returns {ScoreboardObjective}
     */
    addObjective(name, criteria = ScoreboardCriteria.DUMMY, displayName = null) {
        if (!name || typeof name !== 'string') {
            throw new Error('addObjective requires a valid string name.');
        }

        if (this.objectives.has(name)) {
            throw new Error(`An objective with the name '${name}' already exists.`);
        }

        const objective = new ScoreboardObjective(name, criteria, displayName, this);
        this.objectives.set(name, objective);

        this.emit('objectiveAdd', objective);
        this.emit('change', { type: 'objectiveAdd', objective });

        return objective;
    }

    /**
     * Get objective by name
     * @param {string} name 
     * @returns {ScoreboardObjective|null}
     */
    getObjective(name) {
        return this.objectives.get(name) || null;
    }

    /**
     * Check if an objective exists
     * @param {string} name 
     * @returns {boolean}
     */
    hasObjective(name) {
        return this.objectives.has(name);
    }

    /**
     * Remove an objective by name or reference
     * @param {string|ScoreboardObjective} objectiveOrName 
     * @returns {boolean} True if removed
     */
    removeObjective(objectiveOrName) {
        const name = typeof objectiveOrName === 'string' ? objectiveOrName : objectiveOrName?.name;
        if (!name || !this.objectives.has(name)) return false;

        const objective = this.objectives.get(name);
        this.objectives.delete(name);

        // Clear display slot if this objective is currently assigned
        for (const [slot, obj] of this.displaySlots.entries()) {
            if (obj === objective) {
                this.displaySlots.set(slot, null);
                this.emit('displaySlotChange', { slot, objective: null, previous: objective });
            }
        }

        this.emit('objectiveRemove', objective);
        this.emit('change', { type: 'objectiveRemove', objective });
        return true;
    }

    /**
     * Get all registered objectives
     * @returns {ScoreboardObjective[]}
     */
    getObjectives() {
        return Array.from(this.objectives.values());
    }

    /**
     * Clear all objectives and reset display slots
     */
    clearObjectives() {
        for (const objective of Array.from(this.objectives.values())) {
            this.removeObjective(objective);
        }
    }

    // ==========================================
    // 3. DISPLAY SLOTS MANAGEMENT
    // ==========================================

    /**
     * Assign an objective to a display slot (e.g. 'sidebar', 'list', 'belowName')
     * @param {string} slot Target display slot name
     * @param {string|ScoreboardObjective|null} objectiveOrName Objective to show or null to clear
     * @returns {ScoreboardObjective|null} The assigned objective or null
     */
    setDisplaySlot(slot, objectiveOrName) {
        const previous = this.displaySlots.get(slot) || null;

        if (!objectiveOrName) {
            this.displaySlots.set(slot, null);
            this.emit('displaySlotChange', { slot, objective: null, previous });
            this.emit('change', { type: 'displaySlotChange', slot, objective: null, previous });
            return null;
        }

        let objective = null;
        if (typeof objectiveOrName === 'string') {
            objective = this.getObjective(objectiveOrName);
            if (!objective) {
                throw new Error(`Objective '${objectiveOrName}' does not exist.`);
            }
        } else if (objectiveOrName instanceof ScoreboardObjective) {
            objective = objectiveOrName;
            if (!this.objectives.has(objective.name)) {
                this.objectives.set(objective.name, objective);
                objective.scoreboard = this;
            }
        }

        this.displaySlots.set(slot, objective);
        this.emit('displaySlotChange', { slot, objective, previous });
        this.emit('change', { type: 'displaySlotChange', slot, objective, previous });

        return objective;
    }

    /**
     * Get active objective in a display slot
     * @param {string} slot 
     * @returns {ScoreboardObjective|null}
     */
    getDisplaySlot(slot) {
        return this.displaySlots.get(slot) || null;
    }

    /**
     * Clear active objective in a display slot
     * @param {string} slot 
     */
    clearDisplaySlot(slot) {
        this.setDisplaySlot(slot, null);
    }

    // ==========================================
    // 4. SCORE HELPERS
    // ==========================================

    /**
     * Set score for a player in a specific objective
     * @param {string} objectiveName 
     * @param {string} player 
     * @param {number} score 
     * @returns {number}
     */
    setScore(objectiveName, player, score) {
        const obj = this.getObjective(objectiveName);
        if (!obj) {
            throw new Error(`Objective '${objectiveName}' does not exist.`);
        }
        return obj.setScore(player, score);
    }

    /**
     * Get score for a player in a specific objective
     * @param {string} objectiveName 
     * @param {string} player 
     * @returns {number}
     */
    getScore(objectiveName, player) {
        const obj = this.getObjective(objectiveName);
        return obj ? obj.getScore(player) : 0;
    }

    /**
     * Add score for a player in a specific objective
     * @param {string} objectiveName 
     * @param {string} player 
     * @param {number} [amount=1] 
     * @returns {number}
     */
    addScore(objectiveName, player, amount = 1) {
        const obj = this.getObjective(objectiveName);
        if (!obj) {
            throw new Error(`Objective '${objectiveName}' does not exist.`);
        }
        return obj.addScore(player, amount);
    }

    /**
     * Reset a player's scores across all objectives or a single objective
     * @param {string} player 
     * @param {string} [objectiveName=null] 
     */
    resetPlayerScores(player, objectiveName = null) {
        if (objectiveName) {
            const obj = this.getObjective(objectiveName);
            if (obj) obj.resetScore(player);
        } else {
            for (const obj of this.objectives.values()) {
                obj.resetScore(player);
            }
        }
    }

    /**
     * Get all unique player names with scores across all objectives
     * @returns {string[]}
     */
    getPlayers() {
        const set = new Set();
        for (const obj of this.objectives.values()) {
            for (const player of obj.scores.keys()) {
                set.add(player);
            }
        }
        return Array.from(set);
    }

    // ==========================================
    // 5. TEAMS MANAGEMENT
    // ==========================================

    /**
     * Add a team
     * @param {string} name 
     * @param {string} [displayName=null] 
     * @returns {ScoreboardTeam}
     */
    addTeam(name, displayName = null) {
        if (!name || this.teams.has(name)) {
            throw new Error(`Team '${name}' already exists or invalid.`);
        }
        const team = new ScoreboardTeam(name, displayName);
        team.scoreboard = this;
        this.teams.set(name, team);
        this.emit('teamAdd', team);
        this.emit('change', { type: 'teamAdd', team });
        return team;
    }

    /**
     * Get a team by name
     * @param {string} name 
     * @returns {ScoreboardTeam|null}
     */
    getTeam(name) {
        return this.teams.get(name) || null;
    }

    /**
     * Remove a team
     * @param {string} name 
     * @returns {boolean}
     */
    removeTeam(name) {
        if (this.teams.has(name)) {
            const team = this.teams.get(name);
            this.teams.delete(name);
            this.emit('teamRemove', team);
            this.emit('change', { type: 'teamRemove', team });
            return true;
        }
        return false;
    }

    /**
     * Find the team a player belongs to
     * @param {string} player 
     * @returns {ScoreboardTeam|null}
     */
    getPlayerTeam(player) {
        for (const team of this.teams.values()) {
            if (team.hasMember(player)) return team;
        }
        return null;
    }

    /**
     * Get all teams
     * @returns {ScoreboardTeam[]}
     */
    getTeams() {
        return Array.from(this.teams.values());
    }

    // ==========================================
    // 6. SERIALIZATION
    // ==========================================

    /**
     * Serialize scoreboard to JSON-compatible object
     * @returns {Object}
     */
    toJSON() {
        const objData = [];
        for (const obj of this.objectives.values()) {
            objData.push({
                name: obj.name,
                criteria: obj.criteria,
                displayName: obj.displayName,
                renderType: obj.renderType,
                scores: Array.from(obj.scores.entries())
            });
        }

        const slotData = {};
        for (const [slot, obj] of this.displaySlots.entries()) {
            slotData[slot] = obj ? obj.name : null;
        }

        const teamData = [];
        for (const team of this.teams.values()) {
            teamData.push({
                name: team.name,
                displayName: team.displayName,
                prefix: team.prefix,
                suffix: team.suffix,
                color: team.color,
                friendlyFire: team.friendlyFire,
                seeFriendlyInvisibles: team.seeFriendlyInvisibles,
                members: Array.from(team.members)
            });
        }

        return {
            objectives: objData,
            displaySlots: slotData,
            teams: teamData
        };
    }

    /**
     * Restore scoreboard from serialized object
     * @param {Object} data 
     */
    fromJSON(data) {
        if (!data) return;
        this.clearObjectives();
        this.teams.clear();

        if (Array.isArray(data.objectives)) {
            for (const item of data.objectives) {
                const obj = this.addObjective(item.name, item.criteria, item.displayName);
                if (item.renderType) obj.setRenderType(item.renderType);
                if (Array.isArray(item.scores)) {
                    for (const [player, score] of item.scores) {
                        obj.setScore(player, score);
                    }
                }
            }
        }

        if (data.displaySlots && typeof data.displaySlots === 'object') {
            for (const [slot, objName] of Object.entries(data.displaySlots)) {
                if (objName && this.hasObjective(objName)) {
                    this.setDisplaySlot(slot, objName);
                }
            }
        }

        if (Array.isArray(data.teams)) {
            for (const item of data.teams) {
                const team = this.addTeam(item.name, item.displayName);
                team.prefix = item.prefix || '';
                team.suffix = item.suffix || '';
                team.color = item.color || 'reset';
                team.friendlyFire = item.friendlyFire ?? true;
                team.seeFriendlyInvisibles = item.seeFriendlyInvisibles ?? false;
                if (Array.isArray(item.members)) {
                    for (const m of item.members) team.addMember(m);
                }
            }
        }
    }
}

export default ScoreboardManager;
