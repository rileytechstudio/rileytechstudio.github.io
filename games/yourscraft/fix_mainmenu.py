import re

with open('src/ui/mainMenu.js', 'r') as f:
    code = f.read()

code = "import { GENERATORS } from '../assets/textureGen.js';\n" + code
code = code.replace(
    'container.style.backgroundImage = \'url("assets/dirt.png")\'; // Requires a dirt.png texture in assets',
    'container.style.backgroundImage = `url("${GENERATORS.dirt().toDataURL()}")`;'
)

with open('src/ui/mainMenu.js', 'w') as f:
    f.write(code)

