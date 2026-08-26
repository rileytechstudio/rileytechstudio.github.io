export class BlockBreakingSystem {
    constructor() {
        this.reset();
    }

    reset() {
        this.isBreaking = false;
        this.targetX = null;
        this.targetY = null;
        this.targetZ = null;
        this.progress = 0; // 0.0 to 1.0
        this.stage = -1;   // -1 or 0 to 9
        this.hardness = 0;
        this.elapsedTime = 0;
    }

    startBreaking(x, y, z, hardness) {
        if (hardness < 0) return false; // Unbreakable

        this.isBreaking = true;
        this.targetX = x;
        this.targetY = y;
        this.targetZ = z;
        this.hardness = hardness;
        this.progress = 0;
        this.stage = 0;
        this.elapsedTime = 0;
        return true;
    }

    update(deltaSeconds, toolMultiplier = 1.0) {
        if (!this.isBreaking) return;

        // Base time calculation (very rough approximation of Minecraft breaking time)
        // time = hardness * 1.5 seconds (if can harvest) or * 5 (if cannot).
        // We'll simplify to just: timeToBreak = hardness / toolMultiplier.
        const timeToBreak = this.hardness / Math.max(0.1, toolMultiplier);

        this.elapsedTime += deltaSeconds;

        if (timeToBreak <= 0) {
            this.progress = 1.0;
        } else {
            this.progress = Math.min(1.0, this.elapsedTime / timeToBreak);
        }

        // Map progress 0.0-1.0 to stages 0-9
        let currentStage = Math.floor(this.progress * 10);
        if (currentStage > 9) currentStage = 9;

        this.stage = currentStage;
    }

    isFinished() {
        return this.isBreaking && this.progress >= 1.0;
    }

    stopBreaking() {
        this.reset();
    }
}
