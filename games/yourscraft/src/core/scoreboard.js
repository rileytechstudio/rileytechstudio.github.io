

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

export const DisplaySlot = Object.freeze({
    SIDEBAR: 'sidebar',
    LIST: 'list',
    BELOW_NAME: 'belowName'
});

export class ScoreboardObjective {
    
    constructor(name, criteria = ScoreboardCriteria.DUMMY, displayName = null, scoreboard = null) {
        if (!name || typeof name !== 'string') {
            throw new Error('ScoreboardObjective requires a valid string name.');
        }

        this.name = name;
        this.criteria = criteria || ScoreboardCriteria.DUMMY;
        this.displayName = displayName !== null && displayName !== undefined ? String(displayName) : name;
        this.renderType = 'integer'; // 'integer' | 'hearts'

        this.scores = new Map();

        this.scoreboard = scoreboard;
    }

    getName() {
        return this.name;
    }

    getCriteria() {
        return this.criteria;
    }

    getDisplayName() {
        return this.displayName;
    }

    setDisplayName(displayName) {
        this.displayName = String(displayName);
        this._notifyChange();
        return this;
    }

    getRenderType() {
        return this.renderType;
    }

    setRenderType(renderType) {
        if (renderType === 'hearts' || renderType === 'integer') {
            this.renderType = renderType;
            this._notifyChange();
        }
        return this;
    }

    hasScore(player) {
        return this.scores.has(player);
    }

    getScore(player) {
        return this.scores.get(player) ?? 0;
    }

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

    addScore(player, amount = 1) {
        const current = this.getScore(player);
        return this.setScore(player, current + amount);
    }

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

    removeScore(player) {
        return this.resetScore(player);
    }

    getScores() {
        const result = [];
        for (const [player, score] of this.scores.entries()) {
            result.push({ player, score });
        }
        return result;
    }

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

    getEntries() {
        return Array.from(this.scores.keys());
    }

    clearScores() {
        this.scores.clear();
        this._notifyChange();
    }

    setDisplaySlot(slot) {
        if (this.scoreboard) {
            this.scoreboard.setDisplaySlot(slot, this);
        }
        return this;
    }

    _notifyChange() {
        if (this.scoreboard) {
            this.scoreboard.emit('objectiveUpdate', this);
            this.scoreboard.emit('change', { type: 'objectiveUpdate', objective: this });
        }
    }
}

export class ScoreboardTeam {
    
    constructor(name, displayName = null) {
        this.name = name;
        this.displayName = displayName || name;
        this.prefix = '';
        this.suffix = '';
        this.color = 'reset';
        this.friendlyFire = true;
        this.seeFriendlyInvisibles = false;
        
        this.members = new Set();
        
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

export class ScoreboardManager {
    constructor() {
        
        this.objectives = new Map();

        this.displaySlots = new Map([
            [DisplaySlot.SIDEBAR, null],
            [DisplaySlot.LIST, null],
            [DisplaySlot.BELOW_NAME, null]
        ]);

        this.teams = new Map();

        this.listeners = new Map();
    }

    // ==========================================
    // 1. EVENT SYSTEM
    // ==========================================

    on(event, callback) {
        if (typeof callback !== 'function') return () => {};
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

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

    getObjective(name) {
        return this.objectives.get(name) || null;
    }

    hasObjective(name) {
        return this.objectives.has(name);
    }

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

    getObjectives() {
        return Array.from(this.objectives.values());
    }

    clearObjectives() {
        for (const objective of Array.from(this.objectives.values())) {
            this.removeObjective(objective);
        }
    }

    // ==========================================
    // 3. DISPLAY SLOTS MANAGEMENT
    // ==========================================

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

    getDisplaySlot(slot) {
        return this.displaySlots.get(slot) || null;
    }

    clearDisplaySlot(slot) {
        this.setDisplaySlot(slot, null);
    }

    // ==========================================
    // 4. SCORE HELPERS
    // ==========================================

    setScore(objectiveName, player, score) {
        const obj = this.getObjective(objectiveName);
        if (!obj) {
            throw new Error(`Objective '${objectiveName}' does not exist.`);
        }
        return obj.setScore(player, score);
    }

    getScore(objectiveName, player) {
        const obj = this.getObjective(objectiveName);
        return obj ? obj.getScore(player) : 0;
    }

    addScore(objectiveName, player, amount = 1) {
        const obj = this.getObjective(objectiveName);
        if (!obj) {
            throw new Error(`Objective '${objectiveName}' does not exist.`);
        }
        return obj.addScore(player, amount);
    }

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

    getTeam(name) {
        return this.teams.get(name) || null;
    }

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

    getPlayerTeam(player) {
        for (const team of this.teams.values()) {
            if (team.hasMember(player)) return team;
        }
        return null;
    }

    getTeams() {
        return Array.from(this.teams.values());
    }

    // ==========================================
    // 6. SERIALIZATION
    // ==========================================

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
