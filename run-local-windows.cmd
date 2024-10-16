@echo off

echo.
echo You can access the app with your internet 
echo browser by typing the following address:
echo.
echo     http://localhost:8000
echo.
echo Close this window to stop the local web server.
echo.
echo -----------------------------------------------
echo.

cd %~dp0
start /b explorer "http://localhost:8000"
bin\mongoose.exe -l http://0.0.0.0:8000 -v 1
