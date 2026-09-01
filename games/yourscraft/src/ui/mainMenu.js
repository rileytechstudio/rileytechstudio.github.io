import { GENERATORS } from '../assets/textureGen.js';
export class MainMenu {
    constructor(onStartGame, onLoadGame, onOptions, onQuit) {
        this.onStartGame = onStartGame;
        this.onLoadGame = onLoadGame;
        this.onOptions = onOptions;
        this.onQuit = onQuit;
        this.element = this.createMenu();
    }

    createMenu() {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.zIndex = '100';
        container.style.backgroundColor = '#5c5c5c'; 
        container.style.backgroundImage = `url("${GENERATORS.dirt().toDataURL()}")`;
        container.style.backgroundSize = '64px 64px';
        container.style.imageRendering = 'pixelated';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.fontFamily = 'monospace'; 

        const title = document.createElement('h1');
        title.textContent = 'MINECRAFT';
        title.style.color = 'white';
        title.style.textShadow = '4px 4px 0px #333';
        title.style.fontSize = '48px';
        title.style.marginBottom = '40px';
        container.appendChild(title);

        const buttonStyle = `
            width: 400px;
            height: 40px;
            margin: 5px;
            background-color: #7b7b7b;
            border: 2px solid;
            border-color: #a8a8a8 #3b3b3b #3b3b3b #a8a8a8;
            color: white;
            font-size: 16px;
            font-family: monospace;
            text-shadow: 2px 2px 0px #333;
            cursor: pointer;
        `;

        const createButton = (text, onClick) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.style.cssText = buttonStyle;
            btn.onmouseover = () => {
                btn.style.backgroundColor = '#8b9bb4'; 
                btn.style.borderColor = '#c6d6f2 #4a5a74 #4a5a74 #c6d6f2';
                btn.style.color = '#fffbaa'; 
            };
            btn.onmouseout = () => {
                btn.style.cssText = buttonStyle;
            };
            btn.onclick = onClick;
            return btn;
        };

        const singleplayerBtn = createButton('Singleplayer', () => {
            if (localStorage.getItem('minecraft_save')) {
                this.showModal('A saved game exists. Starting a new game will overwrite it. Are you sure?', 'confirm', () => {
                    this.onStartGame();
                });
            } else {
                this.onStartGame();
            }
        });
        const loadGameBtn = createButton('Load Game', () => {
            if (!localStorage.getItem('minecraft_save')) {
                this.showModal('No save game found!', 'alert');
            } else {
                this.onLoadGame();
            }
        });
        const optionsBtn = createButton('Options', this.onOptions);
        const quitBtn = createButton('Quit Game', this.onQuit);

        container.appendChild(singleplayerBtn);
        container.appendChild(loadGameBtn);
        container.appendChild(optionsBtn);
        container.appendChild(quitBtn);

        return container;
    }

    showModal(message, type, onConfirm) {
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.zIndex = '200';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.fontFamily = 'monospace';

        const dialog = document.createElement('div');
        dialog.style.backgroundColor = '#5c5c5c';
        dialog.style.border = '2px solid #000';
        dialog.style.padding = '20px';
        dialog.style.textAlign = 'center';
        dialog.style.color = 'white';
        dialog.style.textShadow = '2px 2px 0px #333';
        dialog.style.maxWidth = '500px';
        dialog.style.boxShadow = '0px 0px 20px rgba(0,0,0,0.8)';

        const msgEl = document.createElement('p');
        msgEl.textContent = message;
        msgEl.style.fontSize = '16px';
        msgEl.style.lineHeight = '1.5';
        msgEl.style.marginBottom = '30px';
        dialog.appendChild(msgEl);

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'center';
        btnContainer.style.gap = '20px';

        const buttonStyle = `
            width: 150px;
            height: 40px;
            background-color: #7b7b7b;
            border: 2px solid;
            border-color: #a8a8a8 #3b3b3b #3b3b3b #a8a8a8;
            color: white;
            font-size: 16px;
            font-family: monospace;
            text-shadow: 2px 2px 0px #333;
            cursor: pointer;
        `;

        const createModalBtn = (text, onClick) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.style.cssText = buttonStyle;
            btn.onmouseover = () => {
                btn.style.backgroundColor = '#8b9bb4'; 
                btn.style.borderColor = '#c6d6f2 #4a5a74 #4a5a74 #c6d6f2';
                btn.style.color = '#fffbaa'; 
            };
            btn.onmouseout = () => {
                btn.style.cssText = buttonStyle;
            };
            btn.onclick = onClick;
            return btn;
        };

        if (type === 'confirm') {
            btnContainer.appendChild(createModalBtn('Yes', () => {
                document.body.removeChild(overlay);
                if (onConfirm) onConfirm();
            }));
            btnContainer.appendChild(createModalBtn('No', () => {
                document.body.removeChild(overlay);
            }));
        } else {
            btnContainer.appendChild(createModalBtn('OK', () => {
                document.body.removeChild(overlay);
                if (onConfirm) onConfirm();
            }));
        }

        dialog.appendChild(btnContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    show() {
        document.body.appendChild(this.element);
    }

    hide() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
