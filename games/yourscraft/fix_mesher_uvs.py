import re

with open('src/core/mesher.js', 'r') as f:
    code = f.read()

# Fix Sprite UVs
code = code.replace("uvInfo.u0, uvInfo.v0, uvInfo.u1, uvInfo.v0, uvInfo.u1, uvInfo.v1, uvInfo.u0, uvInfo.v1", 
                    "uvInfo.uMin, uvInfo.vMin, uvInfo.uMax, uvInfo.vMin, uvInfo.uMax, uvInfo.vMax, uvInfo.uMin, uvInfo.vMax")

code = code.replace("uvInfo.u1, uvInfo.v0, uvInfo.u0, uvInfo.v0, uvInfo.u0, uvInfo.v1, uvInfo.u1, uvInfo.v1", 
                    "uvInfo.uMax, uvInfo.vMin, uvInfo.uMin, uvInfo.vMin, uvInfo.uMin, uvInfo.vMax, uvInfo.uMax, uvInfo.vMax")

# Fix Torch UVs
code = code.replace("uvI.u0, uvI.v0, uvI.u1, uvI.v0, uvI.u1, uvI.v1, uvI.u0, uvI.v1", 
                    "uvI.uMin, uvI.vMin, uvI.uMax, uvI.vMin, uvI.uMax, uvI.vMax, uvI.uMin, uvI.vMax")

with open('src/core/mesher.js', 'w') as f:
    f.write(code)

