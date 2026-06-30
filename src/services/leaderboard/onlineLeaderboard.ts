import { createLocalRunSession, GAME_VERSION, RULES_VERSION, validateScoreSubmission } from "./antiCheat";
import { LeaderboardEntry, LeaderboardRepository, LeaderboardRunSession, ScoreSubmission } from "./types";

interface SupabaseScoreRow {
  id: string;
  player_name: string;
  score: number;
  stage: number;
  ship_color: LeaderboardEntry["shipColor"];
  duration_ms: number;
  game_version: string;
  rules_version: string;
  run_id: string;
  created_at: string;
  verified: boolean;
}

export class OnlineLeaderboardRepository implements LeaderboardRepository {
  readonly scope = "online" as const;

  isConfigured(): boolean {
    return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
  }

  async startRun(): Promise<LeaderboardRunSession> {
    if (!this.isConfigured()) {
      return createLocalRunSession();
    }

    const response = await fetch(`${getSupabaseUrl()}/functions/v1/start-run`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${getSupabaseAnonKey()}`,
        apikey: getSupabaseAnonKey()
      },
      body: JSON.stringify({
        gameVersion: GAME_VERSION,
        rulesVersion: RULES_VERSION
      })
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(message || "온라인 실행 세션을 발급받지 못했습니다.");
    }

    const data = await response.json();
    return {
      runId: data.runId,
      signedRunToken: data.signedRunToken,
      seed: data.seed,
      startedAt: Date.parse(data.startedAt),
      expiresAt: Date.parse(data.expiresAt),
      gameVersion: data.gameVersion,
      rulesVersion: data.rulesVersion,
      authority: "server"
    };
  }

  async getTopScores(limit: number): Promise<LeaderboardEntry[]> {
    if (!this.isConfigured()) return [];

    const params = new URLSearchParams({
      select: "id,player_name,score,stage,ship_color,duration_ms,game_version,rules_version,run_id,created_at,verified",
      order: "score.desc,created_at.asc",
      limit: String(limit)
    });

    const response = await fetch(`${getSupabaseUrl()}/rest/v1/leaderboard_scores?${params.toString()}`, {
      headers: {
        apikey: getSupabaseAnonKey(),
        authorization: `Bearer ${getSupabaseAnonKey()}`
      }
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(message || "온라인 랭킹을 불러오지 못했습니다.");
    }

    const rows = (await response.json()) as SupabaseScoreRow[];
    return rows.map(mapRow);
  }

  async getBestEntryForPlayer(playerName: string): Promise<LeaderboardEntry | null> {
    if (!this.isConfigured()) return null;

    const params = new URLSearchParams({
      select: "id,player_name,score,stage,ship_color,duration_ms,game_version,rules_version,run_id,created_at,verified",
      player_name: `eq.${playerName}`,
      order: "score.desc,created_at.asc",
      limit: "1"
    });

    const response = await fetch(`${getSupabaseUrl()}/rest/v1/leaderboard_scores?${params.toString()}`, {
      headers: {
        apikey: getSupabaseAnonKey(),
        authorization: `Bearer ${getSupabaseAnonKey()}`
      }
    });

    if (!response.ok) return null;
    const rows = (await response.json()) as SupabaseScoreRow[];
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async submitScore(submission: ScoreSubmission): Promise<LeaderboardEntry> {
    if (!this.isConfigured()) {
      throw new Error("온라인 랭킹 환경변수가 설정되지 않았습니다.");
    }

    const validation = validateScoreSubmission(submission);
    if (!validation.ok) {
      throw new Error(validation.reason ?? "온라인 랭킹 등록에 실패했습니다.");
    }

    const response = await fetch(`${getSupabaseUrl()}/functions/v1/submit-score`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${getSupabaseAnonKey()}`,
        apikey: getSupabaseAnonKey()
      },
      body: JSON.stringify(submission)
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(message || "온라인 랭킹 등록에 실패했습니다.");
    }

    const row = (await response.json()) as SupabaseScoreRow;
    return mapRow(row);
  }

  async getRank(score: number): Promise<number | null> {
    if (!this.isConfigured()) return null;

    const params = new URLSearchParams({
      select: "id",
      score: `gt.${Math.floor(score)}`
    });

    const response = await fetch(`${getSupabaseUrl()}/rest/v1/leaderboard_scores?${params.toString()}`, {
      method: "HEAD",
      headers: {
        apikey: getSupabaseAnonKey(),
        authorization: `Bearer ${getSupabaseAnonKey()}`,
        prefer: "count=exact"
      }
    });

    if (!response.ok) return null;
    const total = Number(response.headers.get("content-range")?.split("/")?.[1]);
    return Number.isFinite(total) ? total + 1 : null;
  }
}

export const onlineLeaderboard = new OnlineLeaderboardRepository();

function mapRow(row: SupabaseScoreRow): LeaderboardEntry {
  return {
    id: row.id,
    playerName: row.player_name,
    score: row.score,
    stage: row.stage,
    shipColor: row.ship_color,
    durationMs: row.duration_ms,
    gameVersion: row.game_version,
    rulesVersion: row.rules_version,
    runId: row.run_id,
    createdAt: row.created_at,
    verified: row.verified,
    source: "online"
  };
}

async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    const data = await response.json();
    return typeof data?.error === "string" ? data.error : null;
  } catch {
    return null;
  }
}

function getSupabaseUrl(): string {
  return getEnv("VITE_SUPABASE_URL").replace(/\/$/, "");
}

function getSupabaseAnonKey(): string {
  return getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || getEnv("VITE_SUPABASE_ANON_KEY");
}

function getEnv(key: string): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.[key] ?? "";
}
