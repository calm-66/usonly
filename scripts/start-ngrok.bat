@echo off
echo =======================================
echo   Starting ngrok tunnel...
echo ========================================
echo.
echo This will expose http://localhost:3000 to the public internet
echo.
echo Press Ctrl+C to stop
echo.
npx ngrok http 3000
