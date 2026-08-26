import re

with open('src/core/world.js', 'r') as f:
    world_code = f.read()

old_update = """        const requiredKeys = new Set();
        const loadedChunks = [];
        const unloadedChunks = [];

        // 1. Determine all chunk keys that must be loaded within the radius
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const cx = playerChunkX + dx;
                const cz = playerChunkZ + dz;

                if (this.isChunkInRadius(cx, cz, playerChunkX, playerChunkZ, radius)) {
                    const key = this.getChunkKey(cx, cz);
                    requiredKeys.add(key);

                    // If chunk is not yet loaded, load and populate it
                    if (!this.chunks.has(key)) {
                        const chunk = this.loadChunk(cx, cz);
                        loadedChunks.push(chunk);
                    }
                }
            }
        }

        // 2. Identify and unload any currently loaded chunks outside the radius
        for (const [key, chunk] of this.chunks.entries()) {
            if (!requiredKeys.has(key)) {
                unloadedChunks.push(chunk);
                this.unloadChunk(chunk.x, chunk.z);
            }
        }"""

new_update = """        const requiredKeys = new Set();
        const toLoad = [];
        const unloadedChunks = [];

        // 1. Determine all chunk keys that must be loaded within the radius
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const cx = playerChunkX + dx;
                const cz = playerChunkZ + dz;

                if (this.isChunkInRadius(cx, cz, playerChunkX, playerChunkZ, radius)) {
                    const key = this.getChunkKey(cx, cz);
                    requiredKeys.add(key);

                    // If chunk is not yet loaded, queue it
                    if (!this.chunks.has(key)) {
                        toLoad.push({ cx, cz, dist: dx*dx + dz*dz });
                    }
                }
            }
        }

        // 2. Identify and unload any currently loaded chunks outside the radius
        for (const [key, chunk] of this.chunks.entries()) {
            if (!requiredKeys.has(key)) {
                unloadedChunks.push(chunk);
                this.unloadChunk(chunk.x, chunk.z);
            }
        }
        
        // 3. Load chunks asynchronously (max 1 per frame) to prevent stutter
        const loadedChunks = [];
        if (toLoad.length > 0) {
            toLoad.sort((a, b) => a.dist - b.dist);
            // Time-slice: only generate the closest chunk this frame
            const closest = toLoad[0];
            const chunk = this.loadChunk(closest.cx, closest.cz);
            loadedChunks.push(chunk);
        }"""

world_code = world_code.replace(old_update, new_update)

with open('src/core/world.js', 'w') as f:
    f.write(world_code)

with open('src/core/main.js', 'r') as f:
    main_code = f.read()

# Increase render distance
main_code = main_code.replace("world.update(camera.position.x, camera.position.z, 2);", "world.update(camera.position.x, camera.position.z, 6);")

# Add fog
add_fog = """scene.background = new THREE.Color('#99b3ff');
scene.fog = new THREE.Fog('#99b3ff', 20, 6 * 16);
"""
main_code = main_code.replace("scene.background = new THREE.Color(0x87CEEB);", add_fog)

with open('src/core/main.js', 'w') as f:
    f.write(main_code)

