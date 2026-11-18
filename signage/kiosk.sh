#!/usr/bin/env bash

sleep 5

# Reset crash bubble flags
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/'Local State' 2>/dev/null
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences 2>/dev/null

# Launch Chromium in Wayland Kiosk mode
chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-translate \
  --disable-features=Translate \
  --no-first-run \
  --ozone-platform=wayland \
  --enable-features=OverlayScrollbar \
  "https://rileytechstudio.github.io/signage"
