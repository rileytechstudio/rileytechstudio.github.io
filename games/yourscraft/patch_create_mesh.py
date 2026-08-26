import re

with open('src/core/mesher.js', 'r') as f:
    code = f.read()

target = """    mesh.userData = { chunk };
    return mesh;"""

new_target = """    mesh.userData = { chunk, torches: geometry.torches };
    return mesh;"""
code = code.replace(target, new_target)

with open('src/core/mesher.js', 'w') as f:
    f.write(code)

