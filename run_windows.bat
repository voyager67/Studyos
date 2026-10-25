@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "StudyOS local server" cmd /k "cd /d ""%~dp0"" && py -m http.server 8080"
) else (
  start "StudyOS local server" cmd /k "cd /d ""%~dp0"" && python -m http.server 8080"
)
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8080
endlocal
