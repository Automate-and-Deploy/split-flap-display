@echo off
echo ==========================================
echo  Enhanced Display - Windows Launcher
echo ==========================================
echo.

REM Check if node_modules exists
if not exist "server\node_modules" (
    echo Installing server dependencies...
    cd server
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies!
        pause
        exit /b 1
    )
    cd ..
)

echo.
echo Starting Display Server...
echo.
echo Display will be available at: http://localhost:3000
echo Admin panel at: http://localhost:3000/admin
echo.
echo Press Ctrl+C to stop the server
echo.

cd server
node server.js
