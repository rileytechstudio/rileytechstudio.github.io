import os
import subprocess

print("Bundling Javascript with esbuild...")
subprocess.run([
    "./.tools/esbuild", "src/core/main.js",
    "--bundle", "--minify",
    "--outfile=dist/bundle.js",
    "--format=esm",
    "--external:three",
    "--external:three/addons/*"
], check=True)

print("Reading index.html...")
with open("public/index.html", "r") as f:
    html = f.read()

with open("dist/bundle.js", "r") as f:
    bundle_js = f.read()

# Replace the script tag
html = html.replace('<script type="module" src="../src/core/main.js?v=2"></script>', f'<script type="module">\n{bundle_js}\n</script>')

print("Writing dist/index.html...")
with open("dist/index.html", "w") as f:
    f.write(html)

print("Build complete! Your entire game is now in dist/index.html")
