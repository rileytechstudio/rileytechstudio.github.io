#!/usr/bin/env bash

# Wait for the desktop and network stack to fully settle
sleep 8

# Disable display blanking / power saving
xset s off 2>/dev/null
xset -dpms 2>/dev/null
xset s noblank 2>/dev/null

# Hide mouse cursor
unclutter -idle 0.5 -root &

# Clear crash flags so restore dialogs never trigger
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/'Local State' 2>/dev/null
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences 2>/dev/null

# Detect correct Chromium binary (chromium vs chromium-browser)
BROWSER_BIN=$(command -v chromium-browser || command -v chromium)

# Launch with flags tuned for Pi 3B+ / Canva embeds
$BROWSER_BIN \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-translate \
  --disable-features=Translate \
  --no-first-run \
  --fast \
  --fast-start \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --enable-features=OverlayScrollbar \
  --gpu-memory-buffer-compositor-resources \
  "https://rileytechstudio.github.io/signage" > ~/kiosk.log 2>&1
