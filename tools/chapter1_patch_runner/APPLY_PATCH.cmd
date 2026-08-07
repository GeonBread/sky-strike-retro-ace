@rem Chapter 1 ZIP Patch Runner v4
@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..\..") do set "DEFAULT_PROJECT=%%~fI"

set "ZIP_PATH=%~1"
set "PROJECT_PATH=%~2"
if not defined PROJECT_PATH set "PROJECT_PATH=%DEFAULT_PROJECT%"

if not exist "%PROJECT_PATH%\.git" (
  echo.
  echo [WARN] Git project marker was not found at:
  echo        %PROJECT_PATH%
  echo.
  set /p "PROJECT_PATH=Paste the full Git project folder path: "
)

if not exist "%PROJECT_PATH%\.git" (
  echo.
  echo [ERROR] The selected folder does not contain .git:
  echo         %PROJECT_PATH%
  echo.
  pause
  exit /b 1
)

if "%ZIP_PATH%"=="" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File "%SCRIPT_DIR%APPLY_PATCH.ps1" -ProjectPath "%PROJECT_PATH%"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File "%SCRIPT_DIR%APPLY_PATCH.ps1" -ProjectPath "%PROJECT_PATH%" -ZipPath "%ZIP_PATH%"
)

set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" (
  echo Patch processing failed. No automatic hard reset or git clean was used.
) else (
  echo Patch processing finished.
)
echo.
pause
exit /b %EXIT_CODE%
