HOBANWOO_REMOVE_SCORE_RANKING_SUPABASE_V3

This is the cumulative cleanup patch.
You do NOT need to apply V1 or V2 first.

Removes:
- Supabase integration and supabase/ tree
- online/local leaderboard services and UI
- global game score state and high-score persistence
- score HUD / FINAL SCORE display
- score awards from enemies, bosses, smart bombs, powerups, bullets, rewards
- score-based boss thresholds
- score-based Vanguard unlock condition

Behavior after cleanup:
- Vanguard is always selectable.
- Legacy non-story boss timing uses elapsed stage time instead of score thresholds.
- Story combat flow remains time/story-driven.
- Game over share text no longer includes a score.

The patch runner's internal PowerShell variable named $score is unrelated to game score;
it ranks candidate patch folders and is intentionally preserved.
