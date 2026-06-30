import { validateScoreSubmission } from "./antiCheat";
import { LeaderboardEntry, LeaderboardRepository, ScoreSubmission } from "./types";

const STORAGE_KEY = "retro_shooter_leaderboard_v1";
const MAX_STORED_ENTRIES = 50;

export class LocalLeaderboardRepository implements LeaderboardRepository {
  readonly scope = "local" as const;

  isConfigured(): boolean {
    return typeof localStorage !== "undefined";
  }

  async getTopScores(limit: number): Promise<LeaderboardEntry[]> {
    return readEntries().slice(0, limit);
  }

  async getBestEntryForPlayer(playerName: string): Promise<LeaderboardEntry | null> {
    return readEntries().find((entry) => entry.playerName === playerName) ?? null;
  }

  async submitScore(submission: ScoreSubmission): Promise<LeaderboardEntry> {
    const validation = validateScoreSubmission(submission);
    if (!validation.ok) {
      throw new Error(validation.reason ?? "랭킹 등록에 실패했습니다.");
    }

    const entries = readEntries().filter((entry) => entry.runId !== submission.runId);
    const entry: LeaderboardEntry = {
      id: createId(),
      playerName: submission.playerName,
      score: submission.score,
      stage: submission.stage,
      shipColor: submission.shipColor,
      durationMs: submission.durationMs,
      gameVersion: submission.gameVersion,
      rulesVersion: submission.rulesVersion,
      runId: submission.runId,
      createdAt: new Date().toISOString(),
      verified: submission.signedRunToken.startsWith("local."),
      source: "local"
    };

    entries.push(entry);
    const sorted = sortEntries(entries).slice(0, MAX_STORED_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    return entry;
  }

  async getRank(score: number): Promise<number | null> {
    const entries = readEntries();
    const higher = entries.filter((entry) => entry.score > score).length;
    return higher + 1;
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const localLeaderboard = new LocalLeaderboardRepository();

function readEntries(): LeaderboardEntry[] {
  if (typeof localStorage === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortEntries(parsed.filter(isEntry));
  } catch {
    return [];
  }
}

function sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function isEntry(value: unknown): value is LeaderboardEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<LeaderboardEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.playerName === "string" &&
    typeof entry.score === "number" &&
    typeof entry.stage === "number" &&
    typeof entry.durationMs === "number" &&
    typeof entry.runId === "string" &&
    typeof entry.createdAt === "string"
  );
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
