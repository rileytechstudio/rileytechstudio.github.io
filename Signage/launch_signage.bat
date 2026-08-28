@echo off
echo Launching Riley Tech Studio Digital Signage...
echo.
echo Press Alt+F4 on the keyboard to exit Kiosk Mode.
echo.

:: Launch Edge in kiosk mode (Edge is built into all modern Windows)
start msedge --kiosk "https://rileytechstudio.github.io/signage/"

:: If you prefer Chrome, you can delete the line above and uncomment the line below:
:: start chrome --kiosk "https://rileytechstudio.github.io/signage/"
