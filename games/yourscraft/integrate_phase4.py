import re

with open('src/core/main.js', 'r') as f:
    code = f.read()

# Add imports
imports = """import { SoundManager } from './audio.js';
import { ParticleSystem } from './particles.js';
"""
code = code.replace("import { InventoryManager } from '../ui/inventory.js';", "import { InventoryManager } from '../ui/inventory.js';\n" + imports)

# Init Audio and Particles
init_str = """const dayNightCycle = new DayNightCycle(scene, ambientLight, sunLight, fillLight);
const audio = new SoundManager(camera);
const particles = new ParticleSystem(scene);
"""
code = code.replace("const dayNightCycle = new DayNightCycle(scene, ambientLight, sunLight, fillLight);", init_str)

# Add to animate
animate_str = """    dayNightCycle.update(delta);
    particles.update(delta);"""
code = code.replace("    dayNightCycle.update(delta);", animate_str)

# Hook up audio and particles to block breaking
# find: world.setBlock(bx, by, bz, BLOCKS.AIR, true); inside handleMining
break_str = """world.setBlock(bx, by, bz, BLOCKS.AIR, true);
                audio.play('crunch', breakPt);
                particles.emitBlockDebris(bx, by, bz, world.getBlock(bx, by, bz), 15);"""
code = code.replace("world.setBlock(bx, by, bz, BLOCKS.AIR, true);", break_str)

# Hook up to block placing
# find: world.setBlock(px, py, pz, activeBlock, true);
place_str = """world.setBlock(px, py, pz, activeBlock, true);
                audio.play('pop', placePt);"""
code = code.replace("world.setBlock(px, py, pz, activeBlock, true);", place_str)

with open('src/core/main.js', 'w') as f:
    f.write(code)

print("Phase 4 integration complete")
