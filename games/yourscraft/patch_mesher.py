import re

with open('src/core/mesher.js', 'r') as f:
    code = f.read()

# Add SPRITE_BLOCKS definition at the top
sprite_blocks_def = """export const SPRITE_BLOCKS = new Set([6, 31, 32, 37, 38, 39, 40, 51, 59, 83]); // Plants, fire, etc."""
code = code.replace("export const BLOCK_COLORS", sprite_blocks_def + "\nexport const BLOCK_COLORS")

# Find the start of the block loop
loop_target = """                const blockId = getBlock(x, y, z);
                if (blockId === 0) continue; // Skip air"""

new_loop_logic = """                const blockId = getBlock(x, y, z);
                if (blockId === 0) continue; // Skip air

                // Custom Meshing for Sprite Blocks (Crossed Squares)
                if (SPRITE_BLOCKS.has(blockId)) {
                    const uvInfo = getBlockFaceUV(blockId, 'side', atlas);
                    const shade = [1.0, 1.0, 1.0]; // No fake lighting for sprites
                    
                    // Cross plane 1 (diag 1)
                    const p1 = [
                        [x, y, z], [x+1, y, z+1], [x+1, y+1, z+1], [x, y+1, z]
                    ];
                    // Cross plane 2 (diag 2)
                    const p2 = [
                        [x+1, y, z], [x, y, z+1], [x, y+1, z+1], [x+1, y+1, z]
                    ];
                    
                    const addSpritePlane = (pts) => {
                        // Front face
                        positions.push(...pts[0], ...pts[1], ...pts[2], ...pts[3]);
                        normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0); // upward normals
                        uvs.push(uvInfo.u0, uvInfo.v0, uvInfo.u1, uvInfo.v0, uvInfo.u1, uvInfo.v1, uvInfo.u0, uvInfo.v1);
                        colors.push(...shade, ...shade, ...shade, ...shade);
                        indices.push(vertexCount, vertexCount+1, vertexCount+2, vertexCount, vertexCount+2, vertexCount+3);
                        vertexCount += 4;
                        
                        // Back face
                        positions.push(...pts[1], ...pts[0], ...pts[3], ...pts[2]);
                        normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
                        uvs.push(uvInfo.u1, uvInfo.v0, uvInfo.u0, uvInfo.v0, uvInfo.u0, uvInfo.v1, uvInfo.u1, uvInfo.v1);
                        colors.push(...shade, ...shade, ...shade, ...shade);
                        indices.push(vertexCount, vertexCount+1, vertexCount+2, vertexCount, vertexCount+2, vertexCount+3);
                        vertexCount += 4;
                    };
                    
                    addSpritePlane(p1);
                    addSpritePlane(p2);
                    continue;
                }
                
                // Custom Meshing for Torches (Tiny Cube)
                if (blockId === 50) { // TORCH
                    const uvsT = getBlockFaceUV(blockId, 'top', atlas);
                    const uvsS = getBlockFaceUV(blockId, 'side', atlas);
                    const shade = [1.0, 1.0, 1.0];
                    
                    // Tiny Box bounds
                    const minX = x + 0.4375, maxX = x + 0.5625;
                    const minY = y, maxY = y + 0.625;
                    const minZ = z + 0.4375, maxZ = z + 0.5625;
                    
                    // Simple manual box (no AO) for torch
                    for (let f = 0; f < FACES.length; f++) {
                        const face = FACES[f];
                        const uvI = face.dir[1] !== 0 ? uvsT : uvsS;
                        
                        // Map 0,1 to tiny box bounds
                        for(let i=0; i<4; i++) {
                            const c = face.corners[i];
                            positions.push(
                                c.pos[0] === 0 ? minX : maxX,
                                c.pos[1] === 0 ? minY : maxY,
                                c.pos[2] === 0 ? minZ : maxZ
                            );
                            normals.push(...face.dir);
                            colors.push(...shade);
                        }
                        uvs.push(uvI.u0, uvI.v0, uvI.u1, uvI.v0, uvI.u1, uvI.v1, uvI.u0, uvI.v1);
                        indices.push(vertexCount, vertexCount+1, vertexCount+2, vertexCount, vertexCount+2, vertexCount+3);
                        vertexCount += 4;
                    }
                    continue;
                }
"""

code = code.replace(loop_target, new_loop_logic)

with open('src/core/mesher.js', 'w') as f:
    f.write(code)

