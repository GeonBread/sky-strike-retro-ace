@echo off
setlocal
cd /d "%~dp0"
if not exist "src\components\story\Chapter1StoryPlayer.tsx" (
  echo [ERROR] React story integration files are missing.
  pause
  exit /b 1
)
if exist "public\story" (
  echo Removing obsolete standalone iframe story folder...
  rmdir /s /q "public\story"
)
echo Chapter 1 final story cleanup completed.
pause
