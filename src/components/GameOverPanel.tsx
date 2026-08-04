import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Share2,
  UploadCloud,
} from "lucide-react";
import { useAppStore } from "../store";
import {
  buildSubmission,
  localLeaderboard,
  onlineLeaderboard,
  sanitizePlayerName,
} from "../services/leaderboard";
import { CompletedRunSummary } from "../services/leaderboard";
import "./gameOverPanel.css";

interface GameOverPanelProps {
  onShare: () => void;
  onLeaderboard: () => void;
}

type SubmitStatus = "idle" | "submitting" | "done" | "error";
type ChannelStatus = "idle" | "done" | "skipped" | "error";

interface SubmitResult {
  local: ChannelStatus;
  online: ChannelStatus;
  message: string;
  localRank: number | null;
  onlineRank: number | null;
}

const GAME_OVER_ASSET_BASE = "/assets/ui";

/**
 * 이미지 기반 게임 오버 화면입니다.
 * 기록 등록 로직은 기존 구현을 유지하고, 표시 패널과 주요 이동 버튼만 새 UI 자산으로 교체합니다.
 */
export function GameOverPanel({ onShare, onLeaderboard }: GameOverPanelProps) {
  const { score, lastRun, setGameState } = useAppStore();
  const [playerName] = useState(() => getSavedPlayerName());
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [localSubmittedRunId, setLocalSubmittedRunId] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult>({
    local: "idle",
    online: "idle",
    message: "",
    localRank: null,
    onlineRank: null,
  });

  const onlineReady = onlineLeaderboard.isConfigured();
  const isSubmitting = status === "submitting";
  const canUploadOnline = Boolean(lastRun?.isNewHighScore && onlineReady);

  useEffect(() => {
    setStatus("idle");
    setResult({
      local: "idle",
      online: onlineReady ? "idle" : "skipped",
      message: "",
      localRank: null,
      onlineRank: null,
    });
    setLocalSubmittedRunId(null);
  }, [lastRun?.runSession.runId, score, onlineReady]);

  useEffect(() => {
    if (!lastRun || localSubmittedRunId === lastRun.runSession.runId) return;
    void submitLocalScore();
  }, [lastRun, localSubmittedRunId]);

  const submitLocalScore = async () => {
    if (!lastRun) return;

    const normalizedName = sanitizePlayerName(playerName);
    savePlayerName(normalizedName);
    setResult((prev) => ({ ...prev, local: "idle", message: "로컬 기록 등록 중..." }));

    try {
      const localSubmission = buildSubmission(normalizedName, lastRun);
      const localEntry = await localLeaderboard.submitScore(localSubmission);
      const localRank = await localLeaderboard.getRank(localEntry.score);
      setLocalSubmittedRunId(lastRun.runSession.runId);
      setResult((prev) => ({
        ...prev,
        local: "done",
        localRank,
        message: lastRun.isNewHighScore
          ? "로컬 기록 등록 완료. 신기록입니다."
          : "로컬 기록 등록 완료.",
      }));
    } catch (error) {
      setResult((prev) => ({
        ...prev,
        local: "error",
        message: error instanceof Error ? `로컬 등록 실패: ${error.message}` : "로컬 등록 실패",
      }));
    }
  };

  const submitOnlineScore = async () => {
    if (!lastRun || !canUploadOnline) return;

    const normalizedName = sanitizePlayerName(playerName);
    savePlayerName(normalizedName);
    setStatus("submitting");
    setResult((prev) => ({ ...prev, online: "idle", message: "온라인 등록 중..." }));

    try {
      const previousBest = await onlineLeaderboard.getBestEntryForPlayer(normalizedName);
      if (previousBest && previousBest.score >= lastRun.score) {
        setStatus("done");
        setResult((prev) => ({
          ...prev,
          online: "skipped",
          onlineRank: null,
          message: "이미 온라인 최고 기록이 더 높습니다.",
        }));
        return;
      }

      if (previousBest && "deleteEntriesForPlayer" in onlineLeaderboard) {
        await onlineLeaderboard.deleteEntriesForPlayer(normalizedName);
      }

      const onlineRun = await ensureOnlineRun(lastRun);
      const onlineSubmission = buildSubmission(normalizedName, onlineRun);
      const onlineEntry = await onlineLeaderboard.submitScore(onlineSubmission);
      const onlineRank = await onlineLeaderboard.getRank(onlineEntry.score);
      setStatus("done");
      setResult((prev) => ({
        ...prev,
        online: "done",
        onlineRank,
        message: "온라인 최고 기록을 업데이트했습니다.",
      }));
    } catch (error) {
      setStatus("error");
      setResult((prev) => ({
        ...prev,
        online: "error",
        message: error instanceof Error ? `온라인 등록 실패: ${error.message}` : "온라인 등록 실패",
      }));
    }
  };

  return (
    <div className="hobanwooGameOverRoot">
      <section className="hobanwooGameOverPanel" aria-label="게임 오버 결과">
        <img
          className="hobanwooGameOverPanelImage"
          src={`${GAME_OVER_ASSET_BASE}/panels/game-over-panel.png`}
          alt=""
          aria-hidden="true"
          draggable={false}
        />

        <div className="hobanwooGameOverContent">
          <div className="hobanwooGameOverScoreBlock">
            <div className="hobanwooGameOverScoreLabel">FINAL SCORE</div>
            <div className="hobanwooGameOverScore">
              {score.toString().padStart(6, "0")}
            </div>
          </div>

          <div className="hobanwooGameOverNicknameCard">
            <div className="hobanwooGameOverSmallLabel">NICKNAME</div>
            <div className="hobanwooGameOverNickname">
              {sanitizePlayerName(playerName)}
            </div>
          </div>

          {lastRun?.isNewHighScore && (
            <div className="hobanwooGameOverNewRecord">
              온라인 최고 기록으로 등록할 수 있습니다.
            </div>
          )}

          {canUploadOnline && (
            <button
              type="button"
              onClick={submitOnlineScore}
              disabled={isSubmitting || status === "done"}
              className="hobanwooGameOverUploadButton"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <UploadCloud size={16} />
              )}
              온라인 최고 기록 등록
            </button>
          )}

          <div className="hobanwooGameOverStatusArea">
            {result.message && (
              <div
                className={[
                  "hobanwooGameOverMessage",
                  status === "error" || result.local === "error"
                    ? "is-error"
                    : "is-success",
                ].join(" ")}
              >
                {status === "error" || result.local === "error" ? (
                  <AlertTriangle size={14} />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                <span>{result.message}</span>
              </div>
            )}

            <div className="hobanwooGameOverStatusGrid">
              <StatusBadge label="LOCAL" status={result.local} rank={result.localRank} />
              <StatusBadge label="ONLINE" status={result.online} rank={result.onlineRank} />
            </div>

            {!onlineReady && (
              <div className="hobanwooGameOverOfflineNote">
                온라인 랭킹은 Supabase 설정 후 사용할 수 있습니다.
              </div>
            )}
          </div>

          <div className="hobanwooGameOverActionGrid">
            <ImageActionButton
              src={`${GAME_OVER_ASSET_BASE}/buttons/game-over-retry.png`}
              label="다시하기"
              onClick={() => setGameState("PLAYING")}
            />
            <ImageActionButton
              src={`${GAME_OVER_ASSET_BASE}/buttons/game-over-main-menu.png`}
              label="메인화면"
              onClick={() => setGameState("MENU")}
            />
            <ImageActionButton
              src={`${GAME_OVER_ASSET_BASE}/buttons/game-over-ranking.png`}
              label="순위"
              onClick={onLeaderboard}
            />
            <button
              type="button"
              onClick={onShare}
              className="hobanwooGameOverShareButton"
            >
              <Share2 size={17} />
              공유하기
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ImageActionButton({
  src,
  label,
  onClick,
}: {
  src: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hobanwooGameOverImageButton"
      aria-label={label}
    >
      <img src={src} alt="" aria-hidden="true" draggable={false} />
    </button>
  );
}

function StatusBadge({
  label,
  status,
  rank,
}: {
  label: string;
  status: ChannelStatus;
  rank: number | null;
}) {
  const text =
    status === "done"
      ? "DONE"
      : status === "error"
        ? "FAIL"
        : status === "skipped"
          ? "SKIP"
          : "READY";

  return (
    <div className={`hobanwooGameOverStatusBadge status-${status}`}>
      <span>{label}</span>
      <span>{text}</span>
      {rank !== null && <strong>#{rank}</strong>}
    </div>
  );
}

async function ensureOnlineRun(run: CompletedRunSummary): Promise<CompletedRunSummary> {
  if (run.runSession.authority === "server") return run;

  const serverRunSession = await onlineLeaderboard.startRun();
  return {
    ...run,
    runSession: serverRunSession,
  };
}

function getSavedPlayerName(): string {
  if (typeof localStorage === "undefined") return "ACE";
  return sanitizePlayerName(localStorage.getItem("retro_shooter_player_name") || "ACE");
}

function savePlayerName(name: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("retro_shooter_player_name", name);
}
