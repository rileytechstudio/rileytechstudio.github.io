import re

with open('src/core/mesher.js', 'r') as f:
    code = f.read()

code = code.replace("    return geometry;", "    geometry.torches = torches;\n    return geometry;")

with open('src/core/mesher.js', 'w') as f:
    f.write(code)

