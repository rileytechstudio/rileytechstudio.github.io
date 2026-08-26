import json

with open("/Users/rileystudio/.gemini/antigravity/brain/c38f630f-3a61-4fb4-9e8a-fb4679ef4482/.system_generated/logs/transcript_full.jsonl", "r") as f:
    for line in f:
        data = json.loads(line)
        for tool_call in data.get("tool_calls", []):
            if tool_call.get("name") == "default_api:write_to_file":
                args = tool_call.get("arguments", {})
                target = args.get("TargetFile", "")
                content = args.get("CodeContent", "")
                print(f"Found write to {target}")
                if "raycast.js" in target or "controller.js" in target:
                    filename = target.split("/")[-1]
                    import os
                    os.makedirs("src/physics", exist_ok=True)
                    with open(f"src/physics/{filename}", "w") as out:
                        out.write(content)
                    print(f"Extracted {filename}")
