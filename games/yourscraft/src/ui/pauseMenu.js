export class PauseMenu {
    constructor(onResume, onAchievements, onStatistics, onOptions, onQuit) {
        this.onResume = onResume;
        this.onAchievements = onAchievements;
        this.onStatistics = onStatistics;
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
        container.style.zIndex = '90';
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'; // Translucent black
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.fontFamily = 'monospace';

        const title = document.createElement('h2');
        title.textContent = 'Game menu';
        title.style.color = 'white';
        title.style.textShadow = '2px 2px 0px #333';
        title.style.marginBottom = '20px';
        title.style.fontSize = '24px';
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
        
        const smallButtonStyle = `
            width: 195px;
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

        const createButton = (text, style, onClick) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.style.cssText = style;
            btn.onmouseover = () => {
                btn.style.backgroundColor = '#8b9bb4';
                btn.style.borderColor = '#c6d6f2 #4a5a74 #4a5a74 #c6d6f2';
                btn.style.color = '#fffbaa';
            };
            btn.onmouseout = () => {
                btn.style.cssText = style;
            };
            btn.onclick = onClick;
            return btn;
        };

        const backBtn = createButton('Back to Game', buttonStyle, this.onResume);
        
        const row1 = document.createElement('div');
        row1.style.display = 'flex';
        row1.style.justifyContent = 'space-between';
        row1.style.width = '410px'; 

        const achievementsBtn = createButton('Achievements', smallButtonStyle, this.onAchievements);
        const statsBtn = createButton('Statistics', smallButtonStyle, this.onStatistics);
        row1.appendChild(achievementsBtn);
        row1.appendChild(statsBtn);

        const optionsBtn = createButton('Options...', buttonStyle, this.onOptions);
        const quitBtn = createButton('Save and Quit to Title', buttonStyle, this.onQuit);

        container.appendChild(backBtn);
        container.appendChild(row1);
        container.appendChild(optionsBtn);
        container.appendChild(quitBtn);

        return container;
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
