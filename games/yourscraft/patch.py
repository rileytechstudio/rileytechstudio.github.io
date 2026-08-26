import re

with open('src/assets/textureGen.js', 'r') as f:
    content = f.read()

func_code = """
/**
 * Procedural 16x16 Destroy Stage Canvas (0-9)
 */
export function generateDestroyStageCanvas(stage = 0) {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.clearRect(0, 0, 16, 16);
    const rng = createRNG(12345 + stage * 10);
    
    // Crack properties based on stage (0 = barely cracked, 9 = almost destroyed)
    const crackColor = "rgba(0, 0, 0, 0.75)";
    const numCracks = 2 + stage * 3;
    const maxCrackLength = 3 + stage * 2;
    
    ctx.fillStyle = crackColor;
    
    // Generate random walking cracks
    for (let i = 0; i < numCracks; i++) {
        let x = Math.floor(rng() * 16);
        let y = Math.floor(rng() * 16);
        
        let length = Math.floor(rng() * maxCrackLength) + 1;
        for (let j = 0; j < length; j++) {
            if (x >= 0 && x < 16 && y >= 0 && y < 16) {
                setPixel(ctx, x, y, crackColor);
            }
            // Move randomly
            const dir = rng();
            if (dir < 0.25) x++;
            else if (dir < 0.5) x--;
            else if (dir < 0.75) y++;
            else y--;
        }
    }
    
    return canvas;
}

"""

if 'export function generateDestroyStageCanvas' not in content:
    content = content.replace('export const GENERATORS = {', func_code + 'export const GENERATORS = {\n' + '\n'.join([f'    destroy_stage_{i}: () => generateDestroyStageCanvas({i}),' for i in range(10)]))
    
    # We also need to add generateDestroyStageCanvas to the final exports at the bottom if it's there.
    # We can skip it if they are just exported in the object. Wait, GENERATORS itself is exported, but is generateDestroyStageCanvas exported? It is exported inline.
    
    with open('src/assets/textureGen.js', 'w') as f:
        f.write(content)
        
print("Done")
