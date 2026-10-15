HOBANWOO_REMOVE_ALL_RANKING_SUPABASE_V2
======================================

Purpose
- Removes the entire ranking system, both local and online.
- Includes the previous Supabase-removal work in this single patch.
- Keeps the in-game score/high-score value because it is still used by gameplay/UI/unlock logic.

Removed
- supabase/ backend folder, schema, edge functions and temp metadata
- src/services/leaderboard/ (local + online + validation/session code)
- LeaderboardPanel and its CSS
- LEADERBOARD / PROFILE screen states used by ranking
- nickname/player-id ranking profile code
- local/online score submission and rank display from Game Over
- ranking-specific sprite-button variants and overlay CSS
- ranking-specific image assets
- Supabase-specific patch-runner path handling and tsconfig exclusion

Game Over after patch
- Final score remains visible.
- Retry, Main Menu and Share remain.
- No nickname, local rank, online rank, upload or ranking button remains.

Compatibility
- Delete entries are ignored by the patch runner when the path is already absent.
  Therefore this combined patch can also be applied if the earlier Supabase-only
  patch or public-asset cleanup already removed some of these paths.
