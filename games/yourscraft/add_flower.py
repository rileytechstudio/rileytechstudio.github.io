import re

with open('src/assets/textureGen.js', 'r') as f:
    code = f.read()

flower_func = """
export function generateFlowerCanvas(type = "dandelion", seed = 9999) {
    const { canvas, ctx } = createPixelCanvas();
    const rng = createRNG(seed);
    
    // Transparent background
    ctx.clearRect(0, 0, 16, 16);
    
    const stemColor = "#2d7b1a";
    const leafColor = "#3c9e25";
    const headColor = type === "dandelion" ? "#ffec30" : "#d12222";
    const coreColor = type === "dandelion" ? "#d1a815" : "#871111";
    
    // Draw stem
    ctx.fillStyle = stemColor;
    ctx.fillRect(7, 8, 2, 8);
    
    // Draw leaves
    ctx.fillStyle = leafColor;
    ctx.fillRect(5, 12, 2, 2);
    ctx.fillRect(9, 10, 2, 2);
    
    // Draw head
    ctx.fillStyle = headColor;
    ctx.fillRect(5, 4, 6, 5);
    ctx.fillRect(6, 3, 4, 1);
    ctx.fillRect(4, 5, 1, 3);
    ctx.fillRect(11, 5, 1, 3);
    
    // Draw core
    ctx.fillStyle = coreColor;
    ctx.fillRect(7, 5, 2, 2);
    
    return canvas;
}
"""

code = code.replace("export function generateDestroyStageCanvas", flower_func + "\nexport function generateDestroyStageCanvas")

code = code.replace("redstone_ore: (seed) => generateOreCanvas(\"redstone\", seed),", "redstone_ore: (seed) => generateOreCanvas(\"redstone\", seed),\n    dandelion: () => generateFlowerCanvas(\"dandelion\", 11),\n    poppy: () => generateFlowerCanvas(\"poppy\", 12),")

with open('src/assets/textureGen.js', 'w') as f:
    f.write(code)

