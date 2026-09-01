import re

with open('src/core/mesher.js', 'r') as f:
    code = f.read()

old_cpos = """                            const c = face.corners[i];
                            positions.push(
                                c.pos[0] === 0 ? minX : maxX,
                                c.pos[1] === 0 ? minY : maxY,
                                c.pos[2] === 0 ? minZ : maxZ
                            );"""

new_cpos = """                            const c = face.corners[i];
                            positions.push(
                                c[0] === 0 ? minX : maxX,
                                c[1] === 0 ? minY : maxY,
                                c[2] === 0 ? minZ : maxZ
                            );"""

code = code.replace(old_cpos, new_cpos)

with open('src/core/mesher.js', 'w') as f:
    f.write(code)

