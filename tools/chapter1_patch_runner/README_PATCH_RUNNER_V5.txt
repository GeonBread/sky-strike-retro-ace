Chapter 1 ZIP Patch Runner v5

Changes in v5
- When no explicit commit message is supplied, the runner uses the extracted patch folder name as the Git commit message.
- If that folder name is only the temporary extraction directory, the ZIP filename without .zip is used instead.
- PATCH_MANIFEST.json commitMessage still takes priority over the automatic folder-name fallback.
- The success screen shows the commit message before committing.
- Interactive option M lets you enter a custom commit message.

Commit-message priority
1. -CommitMessage argument
2. PATCH_MANIFEST.json commitMessage
3. Patch folder name
4. ZIP filename without .zip

Examples
ZIP: sky-strike_-retro-ace_chapter1_phase2_fullscreen_bomb_fix_v5.zip
Inner patch folder: sky-strike_-retro-ace_chapter1_phase2_fullscreen_bomb_fix_v5
Default commit message:
sky-strike_-retro-ace_chapter1_phase2_fullscreen_bomb_fix_v5

Interactive choices after validation
Enter : leave changes uncommitted
C     : commit using the displayed default message
P     : commit using the displayed default message and push
M     : enter a custom commit message and commit

All v4 safety behavior is retained.
