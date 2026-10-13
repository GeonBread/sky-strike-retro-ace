@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0make_ai_context.ps1"
set "EXITCODE=%ERRORLEVEL%"

echo.
if not "%EXITCODE%"=="0" (
    echo [FAILED] AI context creation failed. Exit code: %EXITCODE%
    echo Check the message above.
) else (
    echo [DONE] AI context ZIP and project index were created successfully.
)

echo.
pause
exit /b %EXITCODE%
