import re

with open('/Users/rileystudio/Documents/antigravity/rileytechstudio.github.io/games/index.html', 'r') as f:
    code = f.read()

new_game_card = """
    <!-- YOURSCRAFT -->
    <a href="yourscraft/public/index.html" class="game-card game-yourscraft">
      <div class="card-icon">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#ffffff" stroke-width="2" fill="none" />
          <path d="M7 8h10M7 12h10M7 16h10" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>
      <div class="card-content">
        <div class="card-title">Yourscraft</div>
        <div class="card-desc">A WebGL block-building adventure</div>
      </div>
      <div class="play-btn">
        <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
      </div>
    </a>
"""

code = code.replace("  </main>", new_game_card + "\n  </main>")

# Add CSS for .game-yourscraft background
css_addition = """
    .game-yourscraft { background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); }
    .game-yourscraft:hover { background: linear-gradient(135deg, #66bb6a 0%, #388e3c 100%); }
"""
code = code.replace("  </style>", css_addition + "  </style>")

with open('/Users/rileystudio/Documents/antigravity/rileytechstudio.github.io/games/index.html', 'w') as f:
    f.write(code)

