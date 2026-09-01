import { World } from './src/core/world.js';
import { Chunk, BLOCKS } from './src/core/chunk.js';
import { createChunkMesh } from './src/core/mesher.js';

const chunk = new Chunk(0, 0, 16, 16, 16);
chunk.setBlock(8, 8, 8, BLOCKS.TORCH);
console.log("Chunk created.");
try {
    const mesh = createChunkMesh(chunk);
    console.log("Mesh created successfully. UserData:", mesh.userData);
} catch (e) {
    console.error("Error creating mesh:", e.stack);
}
