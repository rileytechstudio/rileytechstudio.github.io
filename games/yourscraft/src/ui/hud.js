

import { BLOCKS } from '../core/chunk.js';
import { renderBlockIcon, is3DBlock } from '../assets/iconRenderer.js';

// ==========================================
// 1. PROCEDURAL SVG / PIXEL ART ASSETS
// ==========================================

function createSvgDataUri(svgContent) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
}

// 16x16 Pixel Art SVGs for HUD Elements
export const HUD_ICONS = {
    crosshair: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges">
            <rect x="7" y="1" width="2" height="14" fill="#ffffff"/>
            <rect x="1" y="7" width="14" height="2" fill="#ffffff"/>
            <rect x="7" y="7" width="2" height="2" fill="#ffffff"/>
        </svg>
    `),
    heart_empty: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" shape-rendering="crispEdges">
            <path d="M2,0 h2 v1 h1 v-1 h2 v1 h1 v2 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-2 h1 v-1 z" fill="#000000"/>
            <rect x="2" y="1" width="2" height="3" fill="#ffffff"/>
            <rect x="5" y="1" width="2" height="3" fill="#ffffff"/>
            <rect x="3" y="4" width="3" height="1" fill="#ffffff"/>
            <rect x="4" y="5" width="1" height="1" fill="#ffffff"/>
            <rect x="2" y="2" width="2" height="2" fill="#4d0000"/>
            <rect x="5" y="2" width="2" height="2" fill="#4d0000"/>
            <rect x="3" y="3" width="3" height="1" fill="#4d0000"/>
        </svg>
    `),
    heart_full: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" shape-rendering="crispEdges">
            <path d="M2,0 h2 v1 h1 v-1 h2 v1 h1 v2 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-2 h1 v-1 z" fill="#000000"/>
            <rect x="2" y="1" width="2" height="3" fill="#ff2222"/>
            <rect x="5" y="1" width="2" height="3" fill="#ff2222"/>
            <rect x="3" y="4" width="3" height="1" fill="#ff2222"/>
            <rect x="4" y="5" width="1" height="1" fill="#ff2222"/>
            <rect x="2" y="1" width="1" height="1" fill="#ffffff"/>
            <rect x="3" y="2" width="1" height="1" fill="#cc0000"/>
            <rect x="6" y="2" width="1" height="1" fill="#cc0000"/>
            <rect x="4" y="3" width="1" height="1" fill="#990000"/>
        </svg>
    `),
    heart_half: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" shape-rendering="crispEdges">
            <path d="M2,0 h2 v1 h1 v-1 h2 v1 h1 v2 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-2 h1 v-1 z" fill="#000000"/>
            <rect x="2" y="1" width="2" height="3" fill="#ff2222"/>
            <rect x="5" y="1" width="2" height="3" fill="#4d0000"/>
            <rect x="3" y="4" width="1" height="1" fill="#ff2222"/>
            <rect x="4" y="4" width="2" height="1" fill="#4d0000"/>
            <rect x="4" y="5" width="1" height="1" fill="#4d0000"/>
            <rect x="2" y="1" width="1" height="1" fill="#ffffff"/>
            <rect x="3" y="2" width="1" height="1" fill="#cc0000"/>
        </svg>
    `),
    heart_flash: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" shape-rendering="crispEdges">
            <path d="M2,0 h2 v1 h1 v-1 h2 v1 h1 v2 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-2 h1 v-1 z" fill="#ffffff"/>
            <rect x="2" y="1" width="2" height="3" fill="#ffffff"/>
            <rect x="5" y="1" width="2" height="3" fill="#ffffff"/>
            <rect x="3" y="4" width="3" height="1" fill="#ffffff"/>
            <rect x="4" y="5" width="1" height="1" fill="#ffffff"/>
        </svg>
    `),
    hunger_empty: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" shape-rendering="crispEdges">
            <path d="M4,1 h3 v1 h1 v3 h-1 v2 h-2 v1 h-2 v-1 h-1 v-2 h1 v-3 h1 z" fill="#000000"/>
            <rect x="4" y="2" width="3" height="3" fill="#4a3728"/>
            <rect x="3" y="5" width="2" height="2" fill="#4a3728"/>
            <rect x="1" y="6" width="2" height="2" fill="#c0c0c0"/>
            <rect x="0" y="7" width="1" height="1" fill="#000000"/>
        </svg>
    `),
    hunger_full: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" shape-rendering="crispEdges">
            <path d="M4,1 h3 v1 h1 v3 h-1 v2 h-2 v1 h-2 v-1 h-1 v-2 h1 v-3 h1 z" fill="#000000"/>
            <rect x="4" y="2" width="3" height="3" fill="#bd682a"/>
            <rect x="3" y="5" width="2" height="2" fill="#8f4a17"/>
            <rect x="5" y="2" width="1" height="1" fill="#e59b63"/>
            <rect x="1" y="6" width="2" height="2" fill="#eaeaea"/>
            <rect x="0" y="7" width="1" height="1" fill="#000000"/>
        </svg>
    `),
    hunger_half: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" shape-rendering="crispEdges">
            <path d="M4,1 h3 v1 h1 v3 h-1 v2 h-2 v1 h-2 v-1 h-1 v-2 h1 v-3 h1 z" fill="#000000"/>
            <rect x="4" y="2" width="2" height="3" fill="#bd682a"/>
            <rect x="6" y="2" width="1" height="3" fill="#4a3728"/>
            <rect x="3" y="5" width="2" height="2" fill="#8f4a17"/>
            <rect x="1" y="6" width="2" height="2" fill="#eaeaea"/>
            <rect x="0" y="7" width="1" height="1" fill="#000000"/>
        </svg>
    `),
    armor_full: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" shape-rendering="crispEdges">
            <path d="M1,1 h2 v2 h3 v-2 h2 v5 h-1 v1 h-1 v1 h-3 v-1 h-1 v-1 h-1 z" fill="#000000"/>
            <rect x="2" y="2" width="1" height="3" fill="#c4c4c4"/>
            <rect x="6" y="2" width="1" height="3" fill="#8c8c8c"/>
            <rect x="3" y="3" width="3" height="4" fill="#a4a4a4"/>
            <rect x="3" y="3" width="1" height="1" fill="#ffffff"/>
        </svg>
    `),
    bubble: createSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" shape-rendering="crispEdges">
            <circle cx="4.5" cy="4.5" r="3.5" fill="#2d68c4" stroke="#000000" stroke-width="1"/>
            <rect x="3" y="2" width="1" height="1" fill="#ffffff"/>
        </svg>
    `)
};

// ==========================================
// 2. ITEM ICON GENERATION HELPER
// ==========================================

const ICON_CACHE = new Map();

export function getItemIconDataUri(blockOrItemId) {
    const id = Number(blockOrItemId);
    if (!id || id <= 0) return '';
    if (ICON_CACHE.has(id)) {
        return ICON_CACHE.get(id);
    }

    // 1. If 3D block, render with Three.js offscreen isometric snapshot renderer
    if (is3DBlock(id)) {
        const uri = renderBlockIcon(id);
        if (uri) {
            ICON_CACHE.set(id, uri);
            return uri;
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Palette & isometric 3D cube helper for block items
    function drawIsometricCube(topColor, leftColor, rightColor) {
        // Top Face
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(16, 4);
        ctx.lineTo(28, 10);
        ctx.lineTo(16, 16);
        ctx.lineTo(4, 10);
        ctx.closePath();
        ctx.fill();

        // Left Face
        ctx.fillStyle = leftColor;
        ctx.beginPath();
        ctx.moveTo(4, 10);
        ctx.lineTo(16, 16);
        ctx.lineTo(16, 28);
        ctx.lineTo(4, 22);
        ctx.closePath();
        ctx.fill();

        // Right Face
        ctx.fillStyle = rightColor;
        ctx.beginPath();
        ctx.moveTo(16, 16);
        ctx.lineTo(28, 10);
        ctx.lineTo(28, 22);
        ctx.lineTo(16, 28);
        ctx.closePath();
        ctx.fill();

        // Edges outline
        ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(16, 4); ctx.lineTo(28, 10); ctx.lineTo(16, 16); ctx.lineTo(4, 10); ctx.closePath();
        ctx.moveTo(4, 10); ctx.lineTo(4, 22); ctx.lineTo(16, 28); ctx.lineTo(28, 22); ctx.lineTo(28, 10);
        ctx.moveTo(16, 16); ctx.lineTo(16, 28);
        ctx.stroke();
    }

    // Custom pixel-art drawings
    switch (id) {
        case BLOCKS.STONE:
            drawIsometricCube('#919191', '#757575', '#595959');
            break;
        case BLOCKS.GRASS:
            drawIsometricCube('#68a834', '#6b4c2b', '#573d22');
            // green grass trim on sides
            ctx.fillStyle = '#68a834';
            ctx.fillRect(4, 11, 12, 3);
            ctx.fillRect(16, 16, 12, 3);
            break;
        case BLOCKS.DIRT:
            drawIsometricCube('#866043', '#724f35', '#583c27');
            break;
        case BLOCKS.COBBLESTONE:
            drawIsometricCube('#787878', '#5e5e5e', '#484848');
            break;
        case BLOCKS.OAK_PLANKS:
        case 5:
            drawIsometricCube('#b88e52', '#9c7743', '#7c5e32');
            break;
        case BLOCKS.BEDROCK:
            drawIsometricCube('#3b3b3b', '#2b2b2b', '#1b1b1b');
            break;
        case BLOCKS.SAND:
            drawIsometricCube('#ded399', '#c4ba81', '#a89e6a');
            break;
        case BLOCKS.OAK_LOG:
        case 17:
            drawIsometricCube('#b5925e', '#5e4324', '#463118');
            break;
        case BLOCKS.OAK_LEAVES:
        case 18:
            drawIsometricCube('#418a28', '#34701f', '#255215');
            break;
        case BLOCKS.GLASS:
            drawIsometricCube('rgba(215,240,255,0.7)', 'rgba(180,210,230,0.7)', 'rgba(150,180,200,0.7)');
            break;
        case BLOCKS.GOLD_BLOCK:
        case 41:
            drawIsometricCube('#fed83d', '#e5bf26', '#bfa01a');
            break;
        case BLOCKS.IRON_BLOCK:
        case 42:
            drawIsometricCube('#e0e0e0', '#c2c2c2', '#a6a6a6');
            break;
        case BLOCKS.DIAMOND_BLOCK:
        case 57:
            drawIsometricCube('#6eedea', '#46cbc7', '#2ea8a5');
            break;
        case BLOCKS.REDSTONE_BLOCK:
        case 152:
            drawIsometricCube('#eb1e1e', '#c41010', '#9c0808');
            break;
        case BLOCKS.BRICKS:
        case 45:
            drawIsometricCube('#9c4436', '#82372b', '#692a20');
            break;
        case BLOCKS.TNT:
        case 46:
            drawIsometricCube('#db3823', '#b82a17', '#8f1c0d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(8, 14, 16, 4);
            break;
        case BLOCKS.BOOKSHELF:
        case 47:
            drawIsometricCube('#9c7743', '#853224', '#6e271a');
            break;
        case BLOCKS.OBSIDIAN:
        case 49:
            drawIsometricCube('#241938', '#1a1129', '#100a1a');
            break;
        case BLOCKS.CRAFTING_TABLE:
        case 58:
            drawIsometricCube('#b58348', '#8a5928', '#633c16');
            // grid on top
            ctx.strokeStyle = '#4a2c0f';
            ctx.lineWidth = 1;
            ctx.strokeRect(10, 7, 12, 6);
            break;
        case BLOCKS.FURNACE:
        case 61:
            drawIsometricCube('#707070', '#545454', '#3d3d3d');
            ctx.fillStyle = '#1c1c1c';
            ctx.fillRect(18, 18, 6, 6);
            break;
        case BLOCKS.TORCH:
        case 50:
            // Torch stick + flame
            ctx.fillStyle = '#8a5d2e';
            ctx.fillRect(14, 12, 4, 14);
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(13, 6, 6, 6);
            ctx.fillStyle = '#ff3300';
            ctx.fillRect(15, 8, 2, 2);
            break;
        case 280: // Stick
            ctx.save();
            ctx.translate(16, 16);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#8a5d2e';
            ctx.fillRect(-2, -12, 4, 24);
            ctx.fillStyle = '#b07c43';
            ctx.fillRect(-2, -12, 2, 24);
            ctx.restore();
            break;
        case 263: // Coal
            ctx.fillStyle = '#242424';
            ctx.beginPath();
            ctx.arc(16, 16, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#404040';
            ctx.fillRect(12, 11, 4, 4);
            break;
        case 265: // Iron Ingot
            ctx.fillStyle = '#dcdcdc';
            ctx.fillRect(8, 12, 16, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(8, 12, 16, 2);
            ctx.fillStyle = '#9e9e9e';
            ctx.fillRect(8, 18, 16, 2);
            break;
        case 266: // Gold Ingot
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(8, 12, 16, 8);
            ctx.fillStyle = '#fff080';
            ctx.fillRect(8, 12, 16, 2);
            ctx.fillStyle = '#c49c00';
            ctx.fillRect(8, 18, 16, 2);
            break;
        case 264: // Diamond
            ctx.fillStyle = '#55ffff';
            ctx.beginPath();
            ctx.moveTo(16, 6);
            ctx.lineTo(25, 14);
            ctx.lineTo(16, 26);
            ctx.lineTo(7, 14);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#b3ffff';
            ctx.fillRect(13, 10, 4, 4);
            break;
        case 331: // Redstone Dust
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(16, 16, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff8080';
            ctx.fillRect(14, 13, 3, 3);
            break;
        // Tools (Pickaxes)
        case 270: // Wood Pickaxe
        case 274: // Stone Pickaxe
        case 257: // Iron Pickaxe
        case 278: // Diamond Pickaxe
        case 285: // Gold Pickaxe
            const pickHead = id === 278 ? '#55ffff' : (id === 257 ? '#dcdcdc' : (id === 285 ? '#ffcc00' : (id === 274 ? '#8a8a8a' : '#9c7743')));
            ctx.save();
            ctx.translate(16, 16);
            ctx.rotate(Math.PI / 4);
            // Handle
            ctx.fillStyle = '#7a5126';
            ctx.fillRect(-2, -4, 4, 18);
            // Pick Head Arc
            ctx.fillStyle = pickHead;
            ctx.fillRect(-12, -10, 24, 5);
            ctx.fillRect(-14, -7, 4, 5);
            ctx.fillRect(10, -7, 4, 5);
            ctx.restore();
            break;
        // Swords
        case 268: // Wood Sword
        case 272: // Stone Sword
        case 267: // Iron Sword
        case 276: // Diamond Sword
        case 283: // Gold Sword
            const bladeCol = id === 276 ? '#55ffff' : (id === 267 ? '#e0e0e0' : (id === 283 ? '#ffcc00' : (id === 272 ? '#8a8a8a' : '#9c7743')));
            ctx.save();
            ctx.translate(16, 16);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#593816'; // Hilt
            ctx.fillRect(-2, 8, 4, 6);
            ctx.fillStyle = '#ffcc00'; // Guard
            ctx.fillRect(-7, 6, 14, 3);
            ctx.fillStyle = bladeCol; // Blade
            ctx.fillRect(-3, -12, 6, 18);
            ctx.beginPath();
            ctx.moveTo(-3, -12); ctx.lineTo(0, -15); ctx.lineTo(3, -12); ctx.fill();
            ctx.restore();
            break;
        // Food / Apple / Bread / Porkchop / Steak
        case 260: // Apple
            ctx.fillStyle = '#ff1111';
            ctx.beginPath();
            ctx.arc(16, 17, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#7a5126'; // stem
            ctx.fillRect(15, 5, 2, 4);
            ctx.fillStyle = '#68a834'; // leaf
            ctx.fillRect(17, 6, 3, 2);
            break;
        case 322: // Golden Apple
            ctx.fillStyle = '#fed83d';
            ctx.beginPath();
            ctx.arc(16, 17, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff080';
            ctx.fillRect(12, 11, 4, 4);
            ctx.fillStyle = '#7a5126'; // stem
            ctx.fillRect(15, 5, 2, 4);
            break;
        case 297: // Bread
            ctx.fillStyle = '#9c652e';
            ctx.fillRect(7, 12, 18, 9);
            ctx.fillStyle = '#c78a4a';
            ctx.fillRect(8, 10, 16, 4);
            ctx.fillStyle = '#7c4e20';
            ctx.fillRect(10, 14, 2, 5);
            ctx.fillRect(15, 14, 2, 5);
            ctx.fillRect(20, 14, 2, 5);
            break;
        case 320: // Cooked Porkchop
            ctx.fillStyle = '#a0522d';
            ctx.beginPath();
            ctx.arc(14, 16, 8, 0, Math.PI * 2);
            ctx.arc(20, 14, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(10, 14, 6, 4);
            ctx.fillRect(16, 12, 4, 6);
            ctx.fillStyle = '#f5deb3'; // bone / fat tip
            ctx.fillRect(22, 11, 4, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(24, 12, 2, 2);
            break;
        case 319: // Raw Porkchop
            ctx.fillStyle = '#f08080';
            ctx.beginPath();
            ctx.arc(14, 16, 8, 0, Math.PI * 2);
            ctx.arc(20, 14, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#cd5c5c';
            ctx.fillRect(10, 14, 6, 4);
            ctx.fillStyle = '#ffffff'; // bone
            ctx.fillRect(23, 11, 3, 3);
            break;
        case 37: // Dandelion (Yellow Flower)
            ctx.fillStyle = '#68a834'; ctx.fillRect(15, 16, 2, 8); // stem
            ctx.fillStyle = '#ffd700'; // yellow petals
            ctx.beginPath(); ctx.arc(16, 12, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ccaa00'; ctx.beginPath(); ctx.arc(16, 12, 3, 0, Math.PI * 2); ctx.fill();
            break;
        case 38: // Poppy (Red Flower)
            ctx.fillStyle = '#68a834'; ctx.fillRect(15, 16, 2, 8); // stem
            ctx.fillStyle = '#ff2222'; // red petals
            ctx.beginPath(); ctx.arc(16, 12, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#aa0000'; ctx.beginPath(); ctx.arc(16, 12, 3, 0, Math.PI * 2); ctx.fill();
            break;
        case 59:
        case 296: // Wheat Item
            ctx.fillStyle = '#d4c063'; // wheat gold
            ctx.fillRect(10, 8, 12, 16);
            ctx.fillStyle = '#ab9430'; // dark stalks
            ctx.fillRect(12, 6, 2, 20);
            ctx.fillRect(16, 4, 2, 22);
            ctx.fillRect(20, 6, 2, 20);
            break;
        case 295: // Seeds
            ctx.fillStyle = '#395c1c'; ctx.fillRect(12, 16, 4, 4); // green seed
            ctx.fillStyle = '#558230'; ctx.fillRect(13, 17, 2, 2);
            ctx.fillStyle = '#395c1c'; ctx.fillRect(18, 18, 4, 4);
            ctx.fillStyle = '#558230'; ctx.fillRect(19, 19, 2, 2);
            break;
        case 66: // Rail
        case 27: // Powered Rail
        case 28: // Detector Rail
        case 157: // Activator Rail
            const isGold = (id === 27 || id === 157);
            const railColor = isGold ? '#ffcc00' : '#888888';
            // Wood planks
            ctx.fillStyle = '#6b4c2a';
            ctx.fillRect(6, 10, 20, 2);
            ctx.fillRect(6, 16, 20, 2);
            ctx.fillRect(6, 22, 20, 2);
            // Rails
            ctx.fillStyle = railColor;
            ctx.fillRect(8, 6, 2, 22);
            ctx.fillRect(22, 6, 2, 22);
            if (id === 27 || id === 28) {
                // Redstone / pressure plate element
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(14, 15, 4, 4);
            }
            break;
        case 364: // Steak
            ctx.fillStyle = '#6e2617';
            ctx.fillRect(8, 10, 16, 12);
            ctx.fillStyle = '#8b3a27';
            ctx.fillRect(10, 12, 12, 8);
            ctx.fillStyle = '#c2a688'; // bone
            ctx.fillRect(6, 14, 3, 4);
            break;
        case 328: // Minecart
            ctx.fillStyle = '#5c5c5c';
            ctx.fillRect(6, 16, 20, 8);
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(8, 14, 16, 2);
            ctx.fillRect(6, 14, 2, 8);
            ctx.fillRect(24, 14, 2, 8);
            break;
        case 407: // Minecart TNT
            // Base cart
            ctx.fillStyle = '#5c5c5c'; ctx.fillRect(6, 16, 20, 8);
            ctx.fillStyle = '#3a3a3a'; ctx.fillRect(8, 14, 16, 2); ctx.fillRect(6, 14, 2, 8); ctx.fillRect(24, 14, 2, 8);
            // TNT payload
            ctx.fillStyle = '#e53935'; ctx.fillRect(10, 8, 12, 8);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 12, 12, 2);
            ctx.fillStyle = '#000000'; ctx.font = '6px monospace'; ctx.fillText('T', 12, 14); ctx.fillText('N', 15, 14); ctx.fillText('T', 18, 14);
            break;
        case 408: // Minecart Hopper
            // Base cart
            ctx.fillStyle = '#5c5c5c'; ctx.fillRect(6, 16, 20, 8);
            ctx.fillStyle = '#3a3a3a'; ctx.fillRect(8, 14, 16, 2); ctx.fillRect(6, 14, 2, 8); ctx.fillRect(24, 14, 2, 8);
            // Hopper payload
            ctx.fillStyle = '#424242'; ctx.fillRect(10, 8, 12, 6);
            ctx.fillStyle = '#212121'; ctx.fillRect(12, 10, 8, 4);
            break;
        default:
            drawIsometricCube('#9e9e9e', '#757575', '#545454');
            break;
    }

    const uri = canvas.toDataURL();
    ICON_CACHE.set(id, uri);
    return uri;
}

// ==========================================
// 3. HUD STYLES
// ==========================================

const HUD_CSS = `
#minecraft-hud {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    user-select: none;
    font-family: 'Minecraft', monospace, sans-serif;
    font-size: 12px;
    image-rendering: pixelated;
    z-index: 100;
}

#hud-crosshair {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 16px;
    transform: translate(-50%, -50%);
    background: url('${HUD_ICONS.crosshair}') no-repeat center;
    mix-blend-mode: difference;
}

#hud-bottom-bar {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

#hud-status-bars {
    display: flex;
    justify-content: space-between;
    width: 364px;
    margin-bottom: 2px;
}

.hud-stat-row {
    display: flex;
    gap: 1px;
}

.hud-icon {
    width: 18px;
    height: 18px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
}

#hud-exp-container {
    position: relative;
    width: 364px;
    height: 8px;
    background: #000000;
    border: 1px solid #1a1a1a;
    border-radius: 1px;
    box-shadow: inset 0 1px 1px rgba(0,0,0,0.8);
}

#hud-exp-bar {
    width: 0%;
    height: 100%;
    background: linear-gradient(to bottom, #8bf332, #55aa16);
    transition: width 0.15s ease;
}

#hud-exp-level {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    color: #80ff20;
    font-weight: bold;
    font-size: 14px;
    text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
}

#hud-hotbar-frame {
    display: flex;
    background: rgba(0, 0, 0, 0.45);
    border: 2px solid #3c3c3c;
    border-top-color: #8b8b8b;
    border-left-color: #8b8b8b;
    border-radius: 2px;
    padding: 2px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
}

.hud-slot {
    position: relative;
    width: 38px;
    height: 38px;
    background: #8b8b8b;
    border: 2px solid #373737;
    border-top-color: #373737;
    border-left-color: #373737;
    border-bottom-color: #ffffff;
    border-right-color: #ffffff;
    margin: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
}

.hud-slot.selected {
    outline: 2px solid #ffffff;
    border-color: #ffffff;
    z-index: 2;
    transform: scale(1.05);
}

.hud-slot-img {
    width: 28px;
    height: 28px;
    image-rendering: pixelated;
    pointer-events: none;
}

.hud-slot-count {
    position: absolute;
    bottom: 1px;
    right: 2px;
    color: #ffffff;
    font-size: 11px;
    font-weight: bold;
    text-shadow: 1px 1px 0 #000000;
    pointer-events: none;
}

.hud-slot-durability {
    position: absolute;
    bottom: 2px;
    left: 4px;
    width: 30px;
    height: 2px;
    background: #000;
}

.hud-slot-durability-fill {
    height: 100%;
    background: #00ff00;
}

#hud-item-tooltip {
    position: absolute;
    bottom: 64px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(16, 0, 16, 0.85);
    border: 2px solid #280050;
    color: #ffffff;
    padding: 4px 8px;
    font-size: 13px;
    border-radius: 2px;
    text-shadow: 1px 1px 0 #3f3f3f;
    opacity: 0;
    transition: opacity 0.25s ease-out;
    pointer-events: none;
    white-space: nowrap;
}

#hud-scoreboard-sidebar {
    position: absolute;
    top: 50%;
    right: 12px;
    transform: translateY(-50%);
    min-width: 140px;
    max-width: 280px;
    background: rgba(0, 0, 0, 0.4);
    color: #ffffff;
    font-family: 'Minecraft', monospace, sans-serif;
    font-size: 13px;
    line-height: 1.35;
    user-select: none;
    pointer-events: none;
    display: none;
    flex-direction: column;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    border-radius: 1px;
}

.hud-scoreboard-title {
    background: rgba(0, 0, 0, 0.45);
    color: #ffff55;
    font-weight: bold;
    text-align: center;
    padding: 4px 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    text-shadow: 1px 1px 0 #3f3f00, 1px 1px 2px rgba(0, 0, 0, 0.8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.hud-scoreboard-list {
    display: flex;
    flex-direction: column;
    padding: 2px 0;
}

.hud-scoreboard-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 8px;
    gap: 14px;
    white-space: nowrap;
}

.hud-scoreboard-name {
    color: #ffffff;
    text-shadow: 1px 1px 0 #000000;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
}

.hud-scoreboard-score {
    color: #ff5555;
    font-weight: bold;
    text-shadow: 1px 1px 0 #3f0000;
    margin-left: auto;
    text-align: right;
}

@keyframes hud-heart-damage {
    0% { transform: translateY(0); }
    25% { transform: translateY(-3px); }
    50% { transform: translateY(2px); }
    75% { transform: translateY(-1px); }
    100% { transform: translateY(0); }
}

.hud-shake {
    animation: hud-heart-damage 0.2s ease;
}
`;

// ==========================================
// 3.5. MINECRAFT TEXT FORMATTING HELPER
// ==========================================

const MC_COLOR_MAP = {
    '0': '#000000', '1': '#0000aa', '2': '#00aa00', '3': '#00aaaa',
    '4': '#aa0000', '5': '#aa00aa', '6': '#ffaa00', '7': '#aaaaaa',
    '8': '#555555', '9': '#5555ff', 'a': '#55ff55', 'b': '#55ffff',
    'c': '#ff5555', 'd': '#ff55ff', 'e': '#ffff55', 'f': '#ffffff'
};

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function formatMinecraftText(text) {
    if (!text) return '';
    const str = String(text);
    if (!str.includes('§')) {
        return escapeHtml(str);
    }

    let html = '';
    let currentColor = null;
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;
    let isStrikethrough = false;

    const parts = str.split(/(§[0-9a-fk-or])/gi);
    for (const part of parts) {
        if (!part) continue;
        if (part.startsWith('§') && part.length === 2) {
            const code = part[1].toLowerCase();
            if (MC_COLOR_MAP[code] !== undefined) {
                currentColor = MC_COLOR_MAP[code];
                isBold = false;
                isItalic = false;
                isUnderline = false;
                isStrikethrough = false;
            } else if (code === 'l') {
                isBold = true;
            } else if (code === 'o') {
                isItalic = true;
            } else if (code === 'n') {
                isUnderline = true;
            } else if (code === 'm') {
                isStrikethrough = true;
            } else if (code === 'r') {
                currentColor = null;
                isBold = false;
                isItalic = false;
                isUnderline = false;
                isStrikethrough = false;
            }
        } else {
            const styles = [];
            if (currentColor) styles.push(`color: ${currentColor}`);
            if (isBold) styles.push('font-weight: bold');
            if (isItalic) styles.push('font-style: italic');
            const decorations = [];
            if (isUnderline) decorations.push('underline');
            if (isStrikethrough) decorations.push('line-through');
            if (decorations.length > 0) styles.push(`text-decoration: ${decorations.join(' ')}`);

            const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
            html += `<span${styleAttr}>${escapeHtml(part)}</span>`;
        }
    }
    return html || escapeHtml(str);
}

// ==========================================
// 4. HUD CLASS CONTROLLER
// ==========================================

export class HUD {
    
    constructor(options = {}) {
        this.container = options.container || document.getElementById('ui-layer') || document.body;
        this.onSelectSlot = options.onSelectSlot || null;

        this.health = 20;
        this.maxHealth = 20;
        this.hunger = 20;
        this.maxHunger = 20;
        this.armor = 0;
        this.air = 20;
        this.maxAir = 20;
        this.exp = 0.0;
        this.level = 0;
        this.selectedSlot = 0;
        this.isVisible = true;

        // Scoreboard integration
        this.scoreboard = null;
        this._scoreboardUnsub = null;
        this.scoreboardSidebarVisible = true;

        // 9 Hotbar items: { id: number, count: number, name: string, durability?: number, maxDurability?: number }
        this.hotbar = new Array(9).fill(null);

        this.tooltipTimeout = null;
        this.domElements = {};

        this.initDOM();
        this.attachEventListeners();

        if (options.scoreboard) {
            this.setScoreboard(options.scoreboard);
        }

        this.render();
    }

    initDOM() {
        // Inject HUD CSS
        if (!document.getElementById('minecraft-hud-styles')) {
            const style = document.createElement('style');
            style.id = 'minecraft-hud-styles';
            style.textContent = HUD_CSS;
            document.head.appendChild(style);
        }

        // HUD Root
        const root = document.createElement('div');
        root.id = 'minecraft-hud';

        // Crosshair
        const crosshair = document.createElement('div');
        crosshair.id = 'hud-crosshair';
        root.appendChild(crosshair);

        // Scoreboard Sidebar
        const scoreboardSidebar = document.createElement('div');
        scoreboardSidebar.id = 'hud-scoreboard-sidebar';
        scoreboardSidebar.style.display = 'none';

        const scoreboardTitle = document.createElement('div');
        scoreboardTitle.className = 'hud-scoreboard-title';
        scoreboardSidebar.appendChild(scoreboardTitle);

        const scoreboardList = document.createElement('div');
        scoreboardList.className = 'hud-scoreboard-list';
        scoreboardSidebar.appendChild(scoreboardList);

        root.appendChild(scoreboardSidebar);

        // Bottom HUD container
        const bottomBar = document.createElement('div');
        bottomBar.id = 'hud-bottom-bar';

        // Tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'hud-item-tooltip';
        bottomBar.appendChild(tooltip);

        // Status bars row (Health & Hunger)
        const statusBars = document.createElement('div');
        statusBars.id = 'hud-status-bars';

        // Health column (with Armor on top)
        const healthCol = document.createElement('div');
        healthCol.className = 'hud-stat-col';
        const armorRow = document.createElement('div');
        armorRow.id = 'hud-armor-row';
        armorRow.className = 'hud-stat-row';
        const healthRow = document.createElement('div');
        healthRow.id = 'hud-health-row';
        healthRow.className = 'hud-stat-row';
        healthCol.appendChild(armorRow);
        healthCol.appendChild(healthRow);

        // Hunger column (with Air bubbles on top)
        const hungerCol = document.createElement('div');
        hungerCol.className = 'hud-stat-col';
        const airRow = document.createElement('div');
        airRow.id = 'hud-air-row';
        airRow.className = 'hud-stat-row';
        const hungerRow = document.createElement('div');
        hungerRow.id = 'hud-hunger-row';
        hungerRow.className = 'hud-stat-row';
        hungerCol.appendChild(airRow);
        hungerCol.appendChild(hungerRow);

        statusBars.appendChild(healthCol);
        statusBars.appendChild(hungerCol);
        bottomBar.appendChild(statusBars);

        // Experience bar
        const expContainer = document.createElement('div');
        expContainer.id = 'hud-exp-container';
        const expBar = document.createElement('div');
        expBar.id = 'hud-exp-bar';
        const expLevel = document.createElement('div');
        expLevel.id = 'hud-exp-level';
        expLevel.textContent = '0';
        expContainer.appendChild(expBar);
        expContainer.appendChild(expLevel);
        bottomBar.appendChild(expContainer);

        // Hotbar Frame (9 Slots)
        const hotbarFrame = document.createElement('div');
        hotbarFrame.id = 'hud-hotbar-frame';
        const slots = [];

        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = `hud-slot ${i === this.selectedSlot ? 'selected' : ''}`;
            slot.dataset.index = i;

            const img = document.createElement('img');
            img.className = 'hud-slot-img';
            img.style.display = 'none';

            const count = document.createElement('span');
            count.className = 'hud-slot-count';

            slot.appendChild(img);
            slot.appendChild(count);
            hotbarFrame.appendChild(slot);
            slots.push(slot);
        }

        bottomBar.appendChild(hotbarFrame);
        root.appendChild(bottomBar);
        this.container.appendChild(root);

        this.domElements = {
            root,
            crosshair,
            tooltip,
            scoreboardSidebar,
            scoreboardTitle,
            scoreboardList,
            healthRow,
            armorRow,
            hungerRow,
            airRow,
            expBar,
            expLevel,
            hotbarFrame,
            slots
        };
    }

    attachEventListeners() {
        this._onKeyDown = (e) => {
            // Number keys 1-9 (keyCodes 49-57)
            if (e.key >= '1' && e.key <= '9') {
                const index = parseInt(e.key, 10) - 1;
                this.setSelectedSlot(index);
            }
        };

        this._onWheel = (e) => {
            // Scroll down: next slot; scroll up: prev slot
            if (e.deltaY > 0) {
                this.setSelectedSlot((this.selectedSlot + 1) % 9);
            } else if (e.deltaY < 0) {
                this.setSelectedSlot((this.selectedSlot + 8) % 9);
            }
        };

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('wheel', this._onWheel, { passive: true });
    }

    setHealth(health, maxHealth = 20) {
        const prev = this.health;
        this.health = Math.max(0, Math.min(maxHealth, health));
        this.maxHealth = maxHealth;

        if (this.health < prev) {
            this.triggerDamageAnimation();
        }

        this.renderHealth();
    }

    triggerDamageAnimation() {
        if (this.domElements.healthRow) {
            this.domElements.healthRow.classList.remove('hud-shake');
            void this.domElements.healthRow.offsetWidth; // trigger reflow
            this.domElements.healthRow.classList.add('hud-shake');
        }
    }

    setHunger(hunger, maxHunger = 20) {
        this.hunger = Math.max(0, Math.min(maxHunger, hunger));
        this.maxHunger = maxHunger;
        this.renderHunger();
    }

    setArmor(armor) {
        this.armor = Math.max(0, Math.min(20, armor));
        this.renderArmor();
    }

    setAir(air, maxAir = 20) {
        this.air = Math.max(0, Math.min(maxAir, air));
        this.maxAir = maxAir;
        this.renderAir();
    }

    setExp(progress, level) {
        this.exp = Math.max(0, Math.min(1, progress));
        this.level = Math.max(0, Math.floor(level));
        if (this.domElements.expBar) {
            this.domElements.expBar.style.width = `${this.exp * 100}%`;
        }
        if (this.domElements.expLevel) {
            this.domElements.expLevel.textContent = this.level > 0 ? this.level : '';
        }
    }

    setSelectedSlot(index) {
        const clamped = Math.max(0, Math.min(8, Math.floor(index)));
        if (this.selectedSlot === clamped) return;

        this.selectedSlot = clamped;

        // Update slot highlighting
        if (this.domElements.slots) {
            this.domElements.slots.forEach((slot, i) => {
                slot.classList.toggle('selected', i === this.selectedSlot);
            });
        }

        // Show item name tooltip
        const activeItem = this.hotbar[this.selectedSlot];
        
        if (activeItem && activeItem.name) {
            this.showTooltip(activeItem.name);
        }

        if (typeof this.onSelectSlot === 'function') {
            this.onSelectSlot(this.selectedSlot, activeItem);
        }
    }

    setHotbarSlot(index, item) {
        if (index < 0 || index >= 9) return;
        this.hotbar[index] = item ? { ...item } : null;
        this.renderSlot(index);
    }

    updateHotbar(items) {
        if (!Array.isArray(items)) return;
        for (let i = 0; i < 9; i++) {
            this.hotbar[i] = items[i] ? { ...items[i] } : null;
            this.renderSlot(i);
        }
    }

    showTooltip(text) {
        if (!this.domElements.tooltip) return;
        this.domElements.tooltip.textContent = text;
        this.domElements.tooltip.style.opacity = '1';

        if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
        this.tooltipTimeout = setTimeout(() => {
            this.hideTooltip();
        }, 2200);
    }

    hideTooltip() {
        if (this.domElements.tooltip) {
            this.domElements.tooltip.style.opacity = '0';
        }
    }

    setCrosshairVisible(visible) {
        if (this.domElements.crosshair) {
            this.domElements.crosshair.style.display = visible ? 'block' : 'none';
        }
    }

    setVisible(visible) {
        this.isVisible = visible;
        if (this.domElements.root) {
            this.domElements.root.style.display = visible ? 'block' : 'none';
        }
        if (visible) {
            this.renderScoreboard();
        }
    }

    setScoreboard(scoreboard) {
        if (this._scoreboardUnsub) {
            this._scoreboardUnsub();
            this._scoreboardUnsub = null;
        }

        this.scoreboard = scoreboard || null;

        if (this.scoreboard && typeof this.scoreboard.on === 'function') {
            const unsubChange = this.scoreboard.on('change', () => this.renderScoreboard());
            const unsubSlot = this.scoreboard.on('displaySlotChange', () => this.renderScoreboard());
            this._scoreboardUnsub = () => {
                unsubChange();
                unsubSlot();
            };
        }

        this.renderScoreboard();
    }

    getScoreboard() {
        return this.scoreboard;
    }

    setScoreboardVisible(visible) {
        this.scoreboardSidebarVisible = Boolean(visible);
        this.renderScoreboard();
    }

    renderScoreboard() {
        const sidebarEl = this.domElements.scoreboardSidebar;
        const titleEl = this.domElements.scoreboardTitle;
        const listEl = this.domElements.scoreboardList;

        if (!sidebarEl || !titleEl || !listEl) return;

        if (!this.scoreboard || !this.isVisible || !this.scoreboardSidebarVisible) {
            sidebarEl.style.display = 'none';
            return;
        }

        const objective = typeof this.scoreboard.getDisplaySlot === 'function'
            ? this.scoreboard.getDisplaySlot('sidebar')
            : null;

        if (!objective) {
            sidebarEl.style.display = 'none';
            return;
        }

        // Active objective found -> display sidebar
        sidebarEl.style.display = 'flex';

        // Render Title
        const title = objective.displayName || objective.name || '';
        titleEl.innerHTML = formatMinecraftText(title);

        // Render Entries (up to 15 entries, sorted descending by score)
        listEl.innerHTML = '';
        const sortedScores = typeof objective.getSortedScores === 'function'
            ? objective.getSortedScores('desc')
            : [];

        const displayScores = sortedScores.slice(0, 15);

        for (const entry of displayScores) {
            const row = document.createElement('div');
            row.className = 'hud-scoreboard-row';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'hud-scoreboard-name';

            let playerName = entry.player;
            if (this.scoreboard.getPlayerTeam && typeof this.scoreboard.getPlayerTeam === 'function') {
                const team = this.scoreboard.getPlayerTeam(entry.player);
                if (team && typeof team.formatPlayerName === 'function') {
                    playerName = team.formatPlayerName(entry.player);
                }
            }

            nameSpan.innerHTML = formatMinecraftText(playerName);

            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'hud-scoreboard-score';
            scoreSpan.textContent = String(entry.score);

            row.appendChild(nameSpan);
            row.appendChild(scoreSpan);
            listEl.appendChild(row);
        }
    }

    // ==========================================
    // 5. INTERNAL RENDERING METHODS
    // ==========================================

    renderHealth() {
        if (!this.domElements.healthRow) return;
        this.domElements.healthRow.innerHTML = '';

        const totalHearts = Math.ceil(this.maxHealth / 2);
        for (let i = 0; i < totalHearts; i++) {
            const heartVal = this.health - (i * 2);
            const icon = document.createElement('div');
            icon.className = 'hud-icon';

            if (heartVal >= 2) {
                icon.style.backgroundImage = `url('${HUD_ICONS.heart_full}')`;
            } else if (heartVal === 1) {
                icon.style.backgroundImage = `url('${HUD_ICONS.heart_half}')`;
            } else {
                icon.style.backgroundImage = `url('${HUD_ICONS.heart_empty}')`;
            }

            this.domElements.healthRow.appendChild(icon);
        }
    }

    renderHunger() {
        if (!this.domElements.hungerRow) return;
        this.domElements.hungerRow.innerHTML = '';

        const totalDrumsticks = Math.ceil(this.maxHunger / 2);
        for (let i = 0; i < totalDrumsticks; i++) {
            const drumVal = this.hunger - (i * 2);
            const icon = document.createElement('div');
            icon.className = 'hud-icon';

            if (drumVal >= 2) {
                icon.style.backgroundImage = `url('${HUD_ICONS.hunger_full}')`;
            } else if (drumVal === 1) {
                icon.style.backgroundImage = `url('${HUD_ICONS.hunger_half}')`;
            } else {
                icon.style.backgroundImage = `url('${HUD_ICONS.hunger_empty}')`;
            }

            // Minecraft displays hunger from right to left
            this.domElements.hungerRow.insertBefore(icon, this.domElements.hungerRow.firstChild);
        }
    }

    renderArmor() {
        if (!this.domElements.armorRow) return;
        this.domElements.armorRow.innerHTML = '';
        if (this.armor <= 0) return;

        const totalArmor = Math.ceil(this.armor / 2);
        for (let i = 0; i < 10; i++) {
            if (i < totalArmor) {
                const icon = document.createElement('div');
                icon.className = 'hud-icon';
                icon.style.backgroundImage = `url('${HUD_ICONS.armor_full}')`;
                this.domElements.armorRow.appendChild(icon);
            }
        }
    }

    renderAir() {
        if (!this.domElements.airRow) return;
        this.domElements.airRow.innerHTML = '';
        if (this.air >= this.maxAir) return; // Only show bubbles underwater

        const totalBubbles = Math.ceil(this.air / 2);
        for (let i = 0; i < totalBubbles; i++) {
            const icon = document.createElement('div');
            icon.className = 'hud-icon';
            icon.style.backgroundImage = `url('${HUD_ICONS.bubble}')`;
            this.domElements.airRow.appendChild(icon);
        }
    }

    renderSlot(index) {
        if (!this.domElements.slots || !this.domElements.slots[index]) return;

        const slotEl = this.domElements.slots[index];
        const img = slotEl.querySelector('.hud-slot-img');
        const count = slotEl.querySelector('.hud-slot-count');
        const item = this.hotbar[index];

        if (item && item.id > 0 && item.count > 0) {
            img.src = item.icon || getItemIconDataUri(item.id);
            img.style.display = 'block';
            count.textContent = item.count > 1 ? item.count : '';
        } else {
            img.src = '';
            img.style.display = 'none';
            count.textContent = '';
        }
    }

    render() {
        this.renderHealth();
        this.renderHunger();
        this.renderArmor();
        this.renderAir();
        for (let i = 0; i < 9; i++) {
            this.renderSlot(i);
        }
        this.renderScoreboard();
    }

    destroy() {
        if (this._onKeyDown) window.removeEventListener('keydown', this._onKeyDown);
        if (this._onWheel) window.removeEventListener('wheel', this._onWheel);
        if (this._scoreboardUnsub) {
            this._scoreboardUnsub();
            this._scoreboardUnsub = null;
        }
        if (this.domElements.root && this.domElements.root.parentNode) {
            this.domElements.root.parentNode.removeChild(this.domElements.root);
        }
    }
}
