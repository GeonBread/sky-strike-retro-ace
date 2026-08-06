Chapter 1 ZIP Patch Runner v3
=============================

Purpose
-------
Apply ZIP-based project patches with automatic comparison and validation.
The runner compares file hashes, applies only changed paths, scans for common
source corruption, validates package JSON, and runs available npm checks/build.

Recommended location
--------------------
<project>\tools\chapter1_patch_runner_v3\

The CMD file assumes the Git project is two folders above its own location and
passes that path explicitly to PowerShell. This avoids failures caused by the
current terminal directory or drag-and-drop launch directory.

Usage
-----
1. Commit the runner itself so the working tree is clean.
2. Keep the patch ZIP in Downloads when possible.
3. Drag the patch ZIP onto APPLY_PATCH.cmd.
4. Review the patch plan and validation result.
5. Press Enter to keep changes uncommitted, C to commit, or P to commit and push.

Manual command
--------------
From the project root:

powershell.exe -NoProfile -ExecutionPolicy Bypass -STA `
  -File ".\tools\chapter1_patch_runner_v3\APPLY_PATCH.ps1" `
  -ProjectPath (Get-Location).Path `
  -ZipPath "C:\path\to\patch.zip"

Safety behavior
---------------
- Existing project changes cause an immediate stop before mutation.
- The selected ZIP may be inside the repository; it is ignored for the clean
  tree check and is never staged by the runner.
- No automatic git reset --hard is used.
- No automatic git clean is used.
- On post-apply validation failure, tracked files are restored and only NEW
  paths from the current ZIP plan are removed.
- Commits stage only paths listed in the current patch plan.

Limitations
-----------
Build/type/lint checks cannot judge visual quality, gameplay balance, or story
flow. Run the game and inspect the changed scene before choosing commit/push.
