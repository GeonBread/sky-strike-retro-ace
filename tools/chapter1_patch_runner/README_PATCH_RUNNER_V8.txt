ZIP Patch Runner v8
===================

v8 keeps the full/partial ZIP support and safe validation behavior from v7, but changes the successful default workflow.

Default successful workflow
---------------------------
ZIP apply
-> validate
-> automatic Git commit
-> automatic Git push

There is no C/P selection prompt anymore. A validated patch is committed and pushed automatically.

Commit message
--------------
Priority:
1) explicit -CommitMessage
2) PATCH_MANIFEST.json commitMessage
3) descriptive patch folder name
4) ZIP filename

A trailing browser duplicate suffix such as (1) is removed from the automatic commit message.

Push safety
-----------
The runner uses a normal Git push only.
It never force-pushes and it never automatically rebases remote work.

If the remote branch contains commits that are not available locally, the push can be rejected. In that case:
- the patch remains committed locally;
- the new commit is NOT rolled back;
- no patched files are restored;
- the runner exits with code 2 and tells you to fetch/rebase and push again.

This specifically avoids the old behavior where a successful local commit could be followed by a push failure and then a path-scoped patch rollback.

Validation and recovery
-----------------------
- Requires a clean Git working tree before applying a ZIP.
- Supports full-project and partial-project ZIP patches.
- Partial ZIPs must preserve project-relative paths such as src/... or public/....
- Rejects unsafe ZIP paths and protected folders.
- Compares files by SHA-256 and applies only actual differences.
- Runs git diff --check.
- Scans only files touched by the ZIP for contamination/conflict markers.
- Validates package metadata.
- Runs available lint/typecheck/build validation.
- Validation/apply failures restore only paths touched by the ZIP.
- Never automatically runs git reset --hard or git clean.

Recommended multi-PC workflow
-----------------------------
Because successful patches now push automatically, another PC normally only needs:
  git fetch origin
  git switch <branch>
  git pull --ff-only origin <branch>

If push is rejected because another PC pushed first, resolve the remote divergence before continuing with more patches.
