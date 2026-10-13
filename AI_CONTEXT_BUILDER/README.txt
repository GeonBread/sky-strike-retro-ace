Hobanwoo Graduation Operation - AI Context Builder (Restored)
=============================================================

[Recommended placement]
Put this whole folder INSIDE the game project root:

  hobanwoo-graduation-operation/
  |-- AI_CONTEXT_BUILDER/
  |   |-- MAKE_AI_CONTEXT.bat
  |   |-- make_ai_context.ps1
  |   `-- README.txt
  |-- package.json
  |-- src/
  `-- public/

[Double-click]
Double-click:
  MAKE_AI_CONTEXT.bat

[What it creates]
Two timestamped files are created OUTSIDE the Git repository, next to the project folder:

  hobanwoo-graduation-operation-AI_CONTEXT-YYYYMMDD-HHMMSS.zip
  hobanwoo-graduation-operation-PROJECT_FILE_INDEX-YYYYMMDD-HHMMSS.txt

[AI_CONTEXT ZIP]
- Includes source/code/config/text files.
- Excludes PNG/JPG/WebP/audio/video/font and other binary assets to keep size small.
- Excludes .env, private keys, credentials, and common secret files.
- Excludes generated/vendor folders such as .git, node_modules, dist, build, coverage, .vite, .cache, .next, out, __pycache__.
- Includes __CHAT_CONTEXT__ metadata with Git branch/HEAD/status, included file list, full project index, and manifest.

[PROJECT_FILE_INDEX TXT]
- Contains a filtered tree-style project structure.
- Lists ALL project-owned file paths, including image/audio/font asset filenames.
- Binary contents are not copied into the AI_CONTEXT ZIP.

[Supported locations]
1. Recommended: inside project root under AI_CONTEXT_BUILDER (or another subfolder).
2. Also supported: directly inside project root.
3. Legacy mode: next to the project folder.

[Git safety]
Generated ZIP/TXT outputs are written outside the repository, so running the tool does not create snapshot files inside the Git working tree.
