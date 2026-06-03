@echo off
echo Starting IFCO ERP Desktop App...
call npm install
echo.
call npm run electron:dev
pause
