import { ShipColor } from "../../types";

export type LeaderboardScope = "local" | "online";

export type RunAuthority = "local" | "server";

export interface LeaderboardRunSession {
  runId: string;
  signedRunToken: string;
  seed: string;
  startedAt: number;
  expiresAt: number;
  gameVersion: string;
  rulesVersion: string;
  authority: RunAuthority;
}

export interface CompletedRunSummary {
  score: number;
  stage: number;
  shipColor: ShipColor;
  durationMs: number;
  finishedAt: number;
  runSession: LeaderboardRunSession;
  isNewHighScore?: boolean;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  stage: number;
  shipColor: ShipColor;
  durationMs: number;
  gameVersion: string;
  rulesVersion: string;
  runId: string;
  createdAt: string;
  verified: boolean;
  source: LeaderboardScope;
}

export interface ScoreSubmission {
  playerName: string;
  score: number;
  stage: number;
  shipColor: ShipColor;
  durationMs: number;
  gameVersion: string;
  rulesVersion: string;
  runId: string;
  signedRunToken: string;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export interface LeaderboardRepository {
  readonly scope: LeaderboardScope;
  isConfigured(): boolean;
  getTopScores(limit: number): Promise<LeaderboardEntry[]>;
  getBestEntryForPlayer(playerName: string): Promise<LeaderboardEntry | null>;
  submitScore(submission: ScoreSubmission): Promise<LeaderboardEntry>;
  getRank(score: number): Promise<number | null>;
}
