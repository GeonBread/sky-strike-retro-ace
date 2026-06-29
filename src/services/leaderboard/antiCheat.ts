import { LeaderboardRunSession, ScoreSubmission, ValidationResult } from "./types";

export const GAME_VERSION = "0.1.0";
export const RULES_VERSION = "leaderboard-v1";

const MAX_PLAYER_NAME_LENGTH = 16;
const MAX_SCORE = 5_000_000;
const MAX_STAGE = 99;
const MAX_DURATION_MS = 4 * 60 * 60 * 1000;
const HIGH_SCORE_SHORT_RUN_THRESHOLD = 10_000;
const MIN_HIGH_SCORE_DURATION_MS = 10_000;
const MAX_REASONABLE_SCORE_PER_SECOND = 7_500;

export function sanitizePlayerName(value: string): string {
  const normalized = value
    .replace(/[^\p{L}\p{N}_ -]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PLAYER_NAME_LENGTH);

  return normalized || "ACE";
}

export function createLocalRunSession(now = Date.now()): LeaderboardRunSession {
  const runId = createId();
  const seed = createId();
  const expiresAt = now + MAX_DURATION_MS;

  return {
    runId,
    seed,
    startedAt: now,
    expiresAt,
    gameVersion: GAME_VERSION,
    rulesVersion: RULES_VERSION,
    signedRunToken: `local.${runId}.${seed}.${now}`,
    authority: "local"
  };
}

export function validateScoreSubmission(submission: ScoreSubmission): ValidationResult {
  if (!submission.runId || !submission.signedRunToken) {
    return { ok: false, reason: "실행 세션 정보가 없습니다." };
  }

  if (sanitizePlayerName(submission.playerName) !== submission.playerName) {
    return { ok: false, reason: "플레이어 이름에 사용할 수 없는 문자가 있습니다." };
  }

  if (!Number.isInteger(submission.score) || submission.score < 0 || submission.score > MAX_SCORE) {
    return { ok: false, reason: "점수 범위가 비정상입니다." };
  }

  if (!Number.isInteger(submission.stage) || submission.stage < 1 || submission.stage > MAX_STAGE) {
    return { ok: false, reason: "스테이지 값이 비정상입니다." };
  }

  if (!Number.isFinite(submission.durationMs) || submission.durationMs < 0 || submission.durationMs > MAX_DURATION_MS) {
    return { ok: false, reason: "플레이 시간이 비정상입니다." };
  }

  if (submission.score >= HIGH_SCORE_SHORT_RUN_THRESHOLD && submission.durationMs < MIN_HIGH_SCORE_DURATION_MS) {
    return { ok: false, reason: "플레이 시간 대비 점수가 너무 높습니다." };
  }

  const durationSeconds = Math.max(1, submission.durationMs / 1000);
  const scoreCeiling = 100_000 + submission.stage * 35_000 + durationSeconds * MAX_REASONABLE_SCORE_PER_SECOND;
  if (submission.score > scoreCeiling) {
    return { ok: false, reason: "점수 증가 속도가 비정상입니다." };
  }

  if (submission.gameVersion !== GAME_VERSION || submission.rulesVersion !== RULES_VERSION) {
    return { ok: false, reason: "랭킹 규칙 버전이 맞지 않습니다." };
  }

  return { ok: true };
}

export function buildSubmission(playerName: string, run: {
  score: number;
  stage: number;
  shipColor: ScoreSubmission["shipColor"];
  durationMs: number;
  runSession: LeaderboardRunSession;
}): ScoreSubmission {
  return {
    playerName: sanitizePlayerName(playerName),
    score: Math.max(0, Math.floor(run.score)),
    stage: Math.max(1, Math.floor(run.stage)),
    shipColor: run.shipColor,
    durationMs: Math.max(0, Math.floor(run.durationMs)),
    gameVersion: run.runSession.gameVersion,
    rulesVersion: run.runSession.rulesVersion,
    runId: run.runSession.runId,
    signedRunToken: run.runSession.signedRunToken
  };
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const nibble = char === "x" ? value : (value & 0x3) | 0x8;
    return nibble.toString(16);
  });
}
