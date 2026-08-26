import re

with open('src/core/world.js', 'r') as f:
    world_code = f.read()

old_logic = """        // 3. Load chunks asynchronously (max 1 per frame) to prevent stutter
        const loadedChunks = [];
        if (toLoad.length > 0) {
            toLoad.sort((a, b) => a.dist - b.dist);
            // Time-slice: only generate the closest chunk this frame
            const closest = toLoad[0];
            const chunk = this.loadChunk(closest.cx, closest.cz);
            loadedChunks.push(chunk);
        }"""

new_logic = """        // 3. Load chunks asynchronously (max 2 per frame) to prevent stutter
        const loadedChunks = [];
        if (toLoad.length > 0) {
            toLoad.sort((a, b) => a.dist - b.dist);
            // Time-slice: generate closest chunks this frame
            const maxPerFrame = Math.min(2, toLoad.length);
            for (let i = 0; i < maxPerFrame; i++) {
                const closest = toLoad[i];
                const chunk = this.loadChunk(closest.cx, closest.cz);
                loadedChunks.push(chunk);
            }
        }"""

world_code = world_code.replace(old_logic, new_logic)

with open('src/core/world.js', 'w') as f:
    f.write(world_code)

