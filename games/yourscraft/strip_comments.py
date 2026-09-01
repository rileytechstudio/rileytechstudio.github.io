import os
import re

def strip_block_comments(code):
    # Match block comments, but preserve the copyright/header if needed.
    # We will just strip all /* ... */
    # Be careful not to strip string literals that contain /*
    # For a simple pass, regex is usually fine for this codebase
    return re.sub(r'/\*[\s\S]*?\*/', '', code)

for root, dirs, files in os.walk('src'):
    for f in files:
        if f.endswith('.js'):
            path = os.path.join(root, f)
            with open(path, 'r') as file:
                code = file.read()
            
            new_code = strip_block_comments(code)
            
            # Also strip multiple blank lines to save a bit more space
            new_code = re.sub(r'\n\s*\n\s*\n', '\n\n', new_code)
            
            with open(path, 'w') as file:
                file.write(new_code)

print("Stripped block comments from all JS files.")
