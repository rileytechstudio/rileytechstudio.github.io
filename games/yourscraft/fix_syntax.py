import re

with open('src/entity/ai.js', 'r') as f:
    ai_code = f.read()

ai_code = ai_code.replace("this.key = ;", "this.key = `${x},${y},${z}`;")
ai_code = ai_code.replace("const stepKey = ;", "const stepKey = `${nx},${ny},${nz}`;")

with open('src/entity/ai.js', 'w') as f:
    f.write(ai_code)

with open('src/entity/mobRenderer.js', 'r') as f:
    mob_code = f.read()

mob_code = mob_code.replace("this.mesh.name = ;", "this.mesh.name = `mob_${this.mobType}_${mob.id}`;")

with open('src/entity/mobRenderer.js', 'w') as f:
    f.write(mob_code)
