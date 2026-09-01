export function generateRailNormalCanvas() {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.fillStyle = "#5c4028";
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = "#888888"; 
    ctx.fillRect(4, 0, 2, 16);
    ctx.fillRect(10, 0, 2, 16);
    ctx.fillStyle = "#cccccc"; 
    ctx.fillRect(4, 0, 1, 16);
    ctx.fillRect(10, 0, 1, 16);
    return canvas;
}

export function generateRailGoldenCanvas() {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.fillStyle = "#5c4028";
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = "#d4af37"; 
    ctx.fillRect(4, 0, 2, 16);
    ctx.fillRect(10, 0, 2, 16);
    ctx.fillStyle = "#f3e5ab"; 
    ctx.fillRect(4, 0, 1, 16);
    ctx.fillRect(10, 0, 1, 16);
    ctx.fillStyle = "#4a0000";
    ctx.fillRect(7, 0, 2, 16);
    return canvas;
}

export function generateRailGoldenPoweredCanvas() {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.fillStyle = "#5c4028";
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = "#d4af37"; 
    ctx.fillRect(4, 0, 2, 16);
    ctx.fillRect(10, 0, 2, 16);
    ctx.fillStyle = "#f3e5ab"; 
    ctx.fillRect(4, 0, 1, 16);
    ctx.fillRect(10, 0, 1, 16);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(7, 0, 2, 16);
    return canvas;
}

export function generateRailDetectorCanvas() {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.fillStyle = "#5c4028";
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = "#777777";
    ctx.fillRect(4, 5, 8, 6);
    ctx.fillStyle = "#888888"; 
    ctx.fillRect(4, 0, 2, 16);
    ctx.fillRect(10, 0, 2, 16);
    ctx.fillStyle = "#cccccc"; 
    ctx.fillRect(4, 0, 1, 16);
    ctx.fillRect(10, 0, 1, 16);
    return canvas;
}

export function generateRailActivatorCanvas() {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.fillStyle = "#5c4028";
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = "#888888"; 
    ctx.fillRect(4, 0, 2, 16);
    ctx.fillRect(10, 0, 2, 16);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(7, 4, 2, 2);
    ctx.fillRect(7, 10, 2, 2);
    return canvas;
}
