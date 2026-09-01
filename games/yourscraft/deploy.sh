#!/bin/bash
echo "1. Building distribution..."
python3 build.py

echo "2. Syncing entire project to GitHub Pages repo..."
rsync -av --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.system_generated' \
    --exclude '.tools' \
    /Users/rileystudio/Documents/antigravity/proud-newton/ \
    /Users/rileystudio/Documents/antigravity/rileytechstudio.github.io/games/yourscraft/

echo "3. Overwriting live public/index.html with the bundled single-file version..."
cp /Users/rileystudio/Documents/antigravity/proud-newton/dist/index.html /Users/rileystudio/Documents/antigravity/rileytechstudio.github.io/games/yourscraft/public/index.html

echo "4. Committing to live repo..."
cd /Users/rileystudio/Documents/antigravity/rileytechstudio.github.io
git add games/yourscraft
git commit -m "Deploy: Keep full source, but use bundled index.html for webpage deployment"
echo "Done!"
