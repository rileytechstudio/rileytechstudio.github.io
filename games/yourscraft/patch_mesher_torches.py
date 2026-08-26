import re

with open('src/core/mesher.js', 'r') as f:
    code = f.read()

# Add torch storage to geometry
target = """    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];"""

new_target = """    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];
    const torches = [];"""
code = code.replace(target, new_target)

# Store torch coords
torch_target = """                // Custom Meshing for Torches (Tiny Cube)
                if (blockId === 50) { // TORCH"""

new_torch_target = """                // Custom Meshing for Torches (Tiny Cube)
                if (blockId === 50) { // TORCH
                    torches.push({ x: (chunk ? chunk.x * sizeX : 0) + x, y, z: (chunk ? chunk.z * sizeZ : 0) + z });"""
code = code.replace(torch_target, new_torch_target)

# Return torches in geometry
return_target = """    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices)
    };"""

new_return = """    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices),
        torches
    };"""
code = code.replace(return_target, new_return)

with open('src/core/mesher.js', 'w') as f:
    f.write(code)

