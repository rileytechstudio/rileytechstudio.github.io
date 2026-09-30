#!/usr/bin/env bash

# Prevent display from turning off or sleeping
xset s off 2>/dev/null
xset -dpms 2>/dev/null
xset s noblank 2>/dev/null

# Hide the mouse cursor after 0.5s idle
unclutter -idle 0.5 -root &

# Reset crash bubble flags in Chromium profile so it launches cleanly without "Restore pages" popups
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/'Local State' 2>/dev/null
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences 2>/dev/null

# Start Chromium in fullscreen kiosk mode
chromium-browser \
  --noerrdialogs \
  --disable-infobars \
  --kiosk \
  --check-for-update-interval=31536000 \
  --disable-session-crashed-bubble \
  --disable-translate \
  --disable-features=Translate \
  --fast \
  --fast-start \
  "https://rileytechstudio.github.io/signage"
