import re

with open('src/physics/player.js', 'r') as f:
    code = f.read()

old_sneak = "const sneak = Boolean(input.down || input.sneak || input.shift || input.ShiftLeft);"
new_sneak = "const sneak = Boolean(input.down || input.sneak || input.ctrl || input.ControlLeft);"

old_sprint = "const sprint = Boolean(input.sprint || input.ctrl || input.ControlLeft);"
new_sprint = "const sprint = Boolean(input.sprint || input.shift || input.ShiftLeft);"

code = code.replace(old_sneak, new_sneak)
code = code.replace(old_sprint, new_sprint)

with open('src/physics/player.js', 'w') as f:
    f.write(code)

