import React, { useEffect, useState } from "react";
import { Database, RefreshCw, ShieldCheck, Trophy, Wifi } from "lucide-react";
import { LeaderboardEntry, LeaderboardScope, localLeaderboard, onlineLeaderboard } from "../services/leaderboard";

interface LeaderboardPanelProps {
  onBack: () => void;
}

export function LeaderboardPanel({ onBack }: LeaderboardPanelProps) {
  const [scope, setScope] = useState<LeaderboardScope>("local");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onlineReady = onlineLeaderboard.isConfigured();

  const loadEntries = async () => {
    setLoading(true);
    setMessage("");

    try {
      if (scope === "online" && !onlineReady) {
        setEntries([]);
        setMessage("온라인 랭킹은 Supabase 환경변수 설정 후 사용할 수 있습니다.");
        return;
      }

      const repository = scope === "online" ? onlineLeaderboard : localLeaderboard;
      setEntries(await repository.getTopScores(10));
    } catch (error) {
      setEntries([]);
      setMessage(error instanceof Error ? error.message : "랭킹을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [scope]);

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-3xl font-black text-white font-mono mb-2 flex items-center gap-2">
        <Trophy className="text-yellow-400" /> LEADERBOARD
      </h2>
      <p className="text-xs text-slate-400 font-semibold mb-6">로컬 기록과 검증된 온라인 기록을 확인합니다.</p>

      <div className="grid grid-cols-2 gap-2 w-full mb-5">
        <button
          onClick={() => setScope("local")}
          className={`h-11 rounded-lg border font-mono text-xs font-black flex items-center justify-center gap-2 transition-all ${scope === "local" ? "bg-cyan-500/15 border-cyan-400 text-cyan-200" : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"}`}
        >
          <Database size={15} /> LOCAL
        </button>
        <button
          onClick={() => setScope("online")}
          className={`h-11 rounded-lg border font-mono text-xs font-black flex items-center justify-center gap-2 transition-all ${scope === "online" ? "bg-indigo-500/15 border-indigo-400 text-indigo-200" : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"}`}
        >
          <Wifi size={15} /> ONLINE
        </button>
      </div>

      <div className="w-full min-h-[280px] space-y-2.5 mb-6 font-mono">
        {loading && (
          <div className="h-32 flex items-center justify-center text-slate-500 text-xs">
            <RefreshCw size={16} className="animate-spin mr-2" /> 불러오는 중
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="h-32 flex items-center justify-center text-slate-500 text-xs text-center px-6">
            {message || "아직 등록된 기록이 없습니다."}
          </div>
        )}

        {!loading && entries.map((entry, index) => (
          <div
            key={entry.id}
            className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 p-3 rounded-lg border ${index === 0 ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-300" : "bg-slate-950/60 border-slate-800 text-slate-300"}`}
          >
            <span className="text-center font-black">#{index + 1}</span>
            <div className="min-w-0">
              <div className="font-black truncate flex items-center gap-1.5">
                {entry.playerName}
                {entry.verified && <ShieldCheck size={12} className="text-emerald-400 shrink-0" />}
              </div>
              <div className="text-[10px] text-slate-500">
                STAGE {entry.stage} · {formatDuration(entry.durationMs)}
              </div>
            </div>
            <span className="text-right text-sm font-black">{entry.score.toString().padStart(6, "0")}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <button
          onClick={loadEntries}
          className="px-5 py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold rounded-xl font-mono transition-all duration-200 flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} /> 새로고침
        </button>
        <button
          onClick={onBack}
          className="px-5 py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-xl font-mono transition-all duration-200"
        >
          메인 메뉴
        </button>
      </div>
    </div>
  );
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
