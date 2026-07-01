import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Share2, Trophy, UploadCloud } from "lucide-react";
import { useAppStore } from "../store";
import { buildSubmission, localLeaderboard, onlineLeaderboard, sanitizePlayerName } from "../services/leaderboard";
import { CompletedRunSummary } from "../services/leaderboard";

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
        message: lastRun.isNewHighScore ? "로컬 기록 등록 완료. 신기록입니다." : "로컬 기록 등록 완료.",
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
    <div className="w-full flex flex-col items-center">
      <h2 className="text-4xl font-mono font-black text-rose-500 mb-2 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]">GAME OVER</h2>
      <div className="text-sm font-semibold text-slate-400 mb-6">FINAL SCORE</div>
      <div className="text-6xl font-mono font-black text-white mb-5 tracking-wider">{score.toString().padStart(6, "0")}</div>

      <div className="w-full mb-4 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-center">
        <div className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest">Nickname</div>
        <div className="mt-1 font-mono text-lg font-black text-cyan-200 tracking-wider">{sanitizePlayerName(playerName)}</div>
      </div>

      {lastRun?.isNewHighScore && (
        <div className="mb-4 w-full rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-3 text-center text-xs font-mono font-bold text-yellow-200">
          온라인에 등록하시겠어요?
        </div>
      )}

      {canUploadOnline && (
        <button
          onClick={submitOnlineScore}
          disabled={isSubmitting || status === "done"}
          className="w-full h-12 mb-4 bg-indigo-700 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 border border-indigo-400 disabled:border-slate-700 rounded-lg text-white font-mono text-xs font-black flex items-center justify-center gap-2 transition-all"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          온라인 최고 기록 등록
        </button>
      )}

      <div className="min-h-20 w-full mb-6 space-y-2">
        {result.message && (
          <div className={`text-xs font-semibold text-center flex items-center justify-center gap-2 ${status === "error" || result.local === "error" ? "text-rose-400" : "text-emerald-300"}`}>
            {status === "error" || result.local === "error" ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            <span>{result.message}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <StatusBadge label="LOCAL" status={result.local} rank={result.localRank} />
          <StatusBadge label="ONLINE" status={result.online} rank={result.onlineRank} />
        </div>

        {!onlineReady && (
          <div className="text-[10px] text-slate-500 text-center font-mono">
            Supabase 설정이 없으면 온라인 등록은 숨겨집니다.
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-8 w-full">
        <button
          onClick={() => setGameState("PLAYING")}
          className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] text-white font-bold rounded-xl font-mono transition-all duration-200"
        >
          다시 하기
        </button>
        <button
          onClick={() => setGameState("MENU")}
          className="flex-1 py-3.5 bg-slate-850 hover:bg-slate-750 text-white font-bold rounded-xl font-mono transition-all duration-200 border border-slate-750"
        >
          메인 메뉴
        </button>
      </div>

      <div className="flex items-center justify-center gap-5">
        <button
          onClick={onLeaderboard}
          className="flex items-center gap-2 text-sm font-mono text-yellow-400 hover:text-yellow-300 font-extrabold transition-all duration-150"
        >
          <Trophy size={16} /> 랭킹 보기
        </button>
        <button
          onClick={onShare}
          className="flex items-center gap-2 text-sm font-mono text-cyan-400 hover:text-cyan-300 font-extrabold transition-all duration-150"
        >
          <Share2 size={16} /> 공유하기
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ label, status, rank }: { label: string; status: ChannelStatus; rank: number | null }) {
  const styles = {
    idle: "border-slate-800 text-slate-500 bg-slate-950/60",
    done: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
    skipped: "border-slate-800 text-slate-500 bg-slate-950/60",
    error: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  } satisfies Record<ChannelStatus, string>;

  const text = status === "done" ? "DONE" : status === "error" ? "FAIL" : status === "skipped" ? "SKIP" : "READY";

  return (
    <div className={`h-9 rounded-lg border flex items-center justify-center gap-2 ${styles[status]}`}>
      <span>{label}</span>
      <span>{text}</span>
      {rank !== null && <span className="text-yellow-300">#{rank}</span>}
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
