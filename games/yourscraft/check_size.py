import os
import re

total_raw = 0
total_min = 0

def minify(code):
    # Remove block comments
    code = re.sub(r'/\*[\s\S]*?\*/', '', code)
    # Remove single line comments (careful with URLs)
    code = re.sub(r'(?<!: )//.*', '', code)
    return code

for root, dirs, files in os.walk('src'):
    for f in files:
        if f.endswith('.js'):
            path = os.path.join(root, f)
            with open(path, 'r') as file:
                code = file.read()
                total_raw += len(code)
                total_min += len(minify(code))

print(f"Raw: {total_raw / 1024:.2f} KB")
print(f"No Comments: {total_min / 1024:.2f} KB")
