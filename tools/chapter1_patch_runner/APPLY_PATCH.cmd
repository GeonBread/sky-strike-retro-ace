@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "ZIP_PATH=%~1"

if "%ZIP_PATH%"=="" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File "%SCRIPT_DIR%APPLY_PATCH.ps1"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File "%SCRIPT_DIR%APPLY_PATCH.ps1" -ZipPath "%ZIP_PATH%"
)

set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" (
  echo Patch processing failed. Review the message above.
) else (
  echo Patch processing finished.
)
echo.
pause
exit /b %EXIT_CODE%
