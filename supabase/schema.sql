create extension if not exists pgcrypto;

create table if not exists public.leaderboard_runs (
  id uuid primary key,
  run_token_hash text not null unique,
  seed text not null,
  game_version text not null,
  rules_version text not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  client_id_hash text,
  ip_hash text
);

create table if not exists public.leaderboard_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 16),
  score integer not null check (score >= 0 and score <= 5000000),
  stage integer not null check (stage >= 1 and stage <= 99),
  ship_color text not null,
  duration_ms integer not null check (duration_ms >= 0 and duration_ms <= 14400000),
  game_version text not null,
  rules_version text not null,
  run_id uuid not null unique references public.leaderboard_runs(id),
  verified boolean not null default true,
  created_at timestamptz not null default now(),
  ip_hash text
);

create index if not exists leaderboard_scores_rank_idx
  on public.leaderboard_scores (score desc, created_at asc);

create index if not exists leaderboard_scores_created_at_idx
  on public.leaderboard_scores (created_at desc);

alter table public.leaderboard_runs enable row level security;
alter table public.leaderboard_scores enable row level security;

drop policy if exists "leaderboard scores are readable" on public.leaderboard_scores;
create policy "leaderboard scores are readable"
  on public.leaderboard_scores
  for select
  to anon, authenticated
  using (true);

-- Intentionally no public insert/update policies.
-- Edge Functions use the service role key after validating run tokens.
