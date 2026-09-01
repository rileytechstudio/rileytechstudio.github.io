import re

with open('src/core/mesher.js', 'r') as f:
    code = f.read()

code = code.replace("    chunk.mesh = mesh;\n    return mesh;", "    chunk.mesh = mesh;\n    mesh.userData = { torches: geometry.torches };\n    return mesh;")

with open('src/core/mesher.js', 'w') as f:
    f.write(code)

