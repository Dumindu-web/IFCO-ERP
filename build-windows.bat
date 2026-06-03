@echo off
echo Installing dependencies...
call npm install
echo.
echo Building Windows Executable...
call npm run electron:build
echo.
echo Build complete! You can find the .exe file in the dist_electron folder.
pause
