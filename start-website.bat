@echo off
echo Starting IFCO ERP Website...
call npm install
echo.
echo Website is starting. Please wait...
start http://localhost:3000
call npm run dev
pause
