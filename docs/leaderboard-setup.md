# Leaderboard setup

## Local leaderboard

The app stores local scores in `localStorage` under:

```text
retro_shooter_leaderboard_v1
```

Local entries are validated with the same basic score sanity rules used before online submission.

## Supabase online leaderboard

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Add Edge Function secrets:

```text
SUPABASE_SERVICE_ROLE_KEY
RUN_SIGNING_SECRET
```

4. Deploy the Edge Functions:

```text
supabase functions deploy start-run
supabase functions deploy submit-score
```

5. Add browser environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

## Security model

- Browsers can read leaderboard rows through RLS.
- Browsers cannot insert scores directly.
- Game start calls `start-run` to receive a signed run token.
- Game over calls `submit-score`.
- `submit-score` verifies token signature, duplicate `runId`, score bounds, run duration, game version, and rules version before inserting.

This blocks simple DevTools score edits and direct DB insert attempts. Full anti-cheat still requires deterministic replay verification.
