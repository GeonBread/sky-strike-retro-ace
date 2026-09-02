Chapter 1 ZIP Patch Runner v7
==============================

v7 supports both full-project ZIP patches and partial ZIP patches, and fixes false-positive validation from unrelated project files.

Supported examples
------------------
- patch-name/src/App.tsx
- patch-name/src/components/story/chapter1StoryPlayer.css
- patch-name/public/assets/.../image.png
- patch-name/src/... plus public/...
- src/App.tsx directly at ZIP root
- root-file-only patches such as vite.config.ts, tsconfig.json, or README_*.md
- delete-only patches using PATCH_DELETE.txt

Important
---------
Partial ZIPs must preserve project-relative paths. For example, App.tsx must be stored as
src/App.tsx rather than as a loose App.tsx with no path information.

Validation
----------
- Requires a clean Git working tree before applying the ZIP.
- Rejects unsafe ZIP paths and protected folders.
- Compares files by SHA-256 and applies only files that actually differ.
- Runs git diff --check.
- Scans only files touched by the current ZIP for merge markers and accidental shell/Git commands.
- Git conflict markers are matched strictly; decorative separator lines made of many = characters are not treated as conflicts.
- Validates package metadata.
- Runs available typecheck/lint/build scripts.
- On failure, restores only paths touched by the ZIP.
- Never runs automatic git reset --hard or git clean.

Commit message
--------------
Priority:
1) explicit -CommitMessage
2) PATCH_MANIFEST.json commitMessage
3) descriptive patch folder name
4) ZIP filename

When the ZIP uses only the generic repository folder sky-strike_-retro-ace as its wrapper,
v7 uses the descriptive ZIP filename instead. A trailing browser duplicate suffix such as (1)
is removed from the automatic commit message.

Interactive result
------------------
Enter : leave validated changes uncommitted
C     : commit
P     : commit and push
M     : enter a custom commit message and commit
