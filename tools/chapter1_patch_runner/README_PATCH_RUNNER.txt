CHAPTER 1 ZIP PATCH RUNNER
==========================

PURPOSE
-------
This tool applies future ZIP patch files to the Git project in one workflow.
It compares files, creates a safety branch, applies only changed/new files,
checks for common corruption, installs dependencies when needed, runs project
validation scripts, and can optionally commit/push after validation succeeds.

INSTALL ONCE
------------
1. Copy this entire folder into the project, for example:

   sky-strike-retro-ace\tools\chapter1_patch_runner\

2. Commit and push these runner files once so both computers receive them.

NORMAL USE
----------
Method A: Drag a ZIP patch onto APPLY_PATCH.cmd.

Method B: Double-click APPLY_PATCH.cmd and choose the ZIP in the file picker.

The runner must be stored somewhere inside the Git project. It automatically
finds the repository root even when launched from the tools subfolder.

WHAT IT CHECKS
--------------
- Git working tree must be clean before patching.
- ZIP paths cannot contain absolute paths or '..' traversal.
- .git, node_modules, dist, coverage, .vite, and secret .env files are blocked.
- A local safety branch is created before any file is changed.
- Only files whose SHA-256 differs are copied.
- git diff --check must pass.
- Merge conflict markers are scanned.
- Accidental terminal commands inside source files are scanned.
- package.json and package-lock.json are JSON-validated.
- npm dependencies are installed/synchronized when necessary.
- npm run typecheck runs when that script exists.
- npm run lint runs when that script exists.
- npm run build runs when that script exists.
- A report is stored under .git\patch-runner\.

FAILURE BEHAVIOR
----------------
If validation fails, the runner automatically restores the original clean Git
commit and removes new untracked patch files. The safety branch remains so the
pre-patch state can always be recovered.

SUCCESS OPTIONS
---------------
After successful validation:

- Press Enter: leave changes uncommitted for manual review.
- Enter C: commit the validated changes.
- Enter P: commit and push the current branch.

The default commit message is:

  wip(chapter1): apply validated ZIP patch

COMMAND-LINE EXAMPLES
---------------------
Apply and validate, then ask what to do:

  powershell.exe -ExecutionPolicy Bypass -File .\tools\chapter1_patch_runner\APPLY_PATCH.ps1 -ZipPath "C:\path\patch.zip"

Apply, validate, and commit:

  powershell.exe -ExecutionPolicy Bypass -File .\tools\chapter1_patch_runner\APPLY_PATCH.ps1 -ZipPath "C:\path\patch.zip" -Commit -CommitMessage "fix(chapter1): refine boss flow"

Apply, validate, commit, and push:

  powershell.exe -ExecutionPolicy Bypass -File .\tools\chapter1_patch_runner\APPLY_PATCH.ps1 -ZipPath "C:\path\patch.zip" -Push -CommitMessage "fix(chapter1): refine boss flow"

PATCH ZIP FORMAT
----------------
Preferred format: include only changed/new files while preserving project paths.
Example:

  src\game\chapter1\chapter1WaveSystem.ts
  public\assets\chapter1\waves\enemies\monster_01_attendance.png
  PATCH_MANIFEST.json

Full project snapshots are also accepted. Without a manifest, the runner only
considers supported project locations:

  src\
  public\
  docs\
  supabase\
  package.json
  package-lock.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
  tsconfig.json
  vite.config.ts / vite.config.js
  README*.md / README*.txt
  .env.example

RECOMMENDED PATCH_MANIFEST.json
-------------------------------
A future ZIP may include this file at its project root:

{
  "files": [
    "src/game/chapter1/chapter1WaveSystem.ts",
    "public/assets/chapter1/waves/enemies/monster_01_attendance.png"
  ],
  "delete": [
    "src/obsolete/oldTestFeature.ts"
  ],
  "commitMessage": "fix(chapter1): adjust wave behavior"
}

The manifest makes the patch exact and is the safest format.

DELETING FILES WITHOUT A MANIFEST
---------------------------------
Add PATCH_DELETE.txt at the ZIP project root. Put one project-relative file or
folder path per line. Blank lines and lines beginning with # are ignored.

Example:

  src/obsolete/oldTestFeature.ts
  public/assets/story/chapter1/unused_old_image.png

IMPORTANT LIMITATION
--------------------
Automated checks can detect build/type/lint problems and common source damage,
but they cannot prove that game balance, visual timing, story sequencing, or
artwork placement feels correct. After a successful run, launch the game and
briefly test the changed scene before choosing P to push.
