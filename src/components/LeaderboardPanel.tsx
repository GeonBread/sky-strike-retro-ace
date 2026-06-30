import React, { useEffect, useState } from "react";
import { Database, Medal, RefreshCw, ShieldCheck, Trophy, Wifi } from "lucide-react";
import {
  LeaderboardEntry,
  LeaderboardScope,
  localLeaderboard,
  onlineLeaderboard,
  sanitizePlayerName,
} from "../services/leaderboard";

interface LeaderboardPanelProps {
  onBack: () => void;
}

interface MyRankState {
  entry: LeaderboardEntry | null;
  rank: number | null;
  loading: boolean;
}

export function LeaderboardPanel({ onBack }: LeaderboardPanelProps) {
  const [scope, setScope] = useState<LeaderboardScope>("local");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [myRank, setMyRank] = useState<MyRankState>({ entry: null, rank: null, loading: false });

  const onlineReady = onlineLeaderboard.isConfigured();
  const savedName = getSavedPlayerName();

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

  const loadMyRank = async () => {
    setMyRank({ entry: null, rank: null, loading: true });
    try {
      if (scope === "online" && !onlineReady) {
        setMyRank({ entry: null, rank: null, loading: false });
        return;
      }
      const repository = scope === "online" ? onlineLeaderboard : localLeaderboard;
      const entry = await repository.getBestEntryForPlayer(savedName);
      const rank = entry ? await repository.getRank(entry.score) : null;
      setMyRank({ entry, rank, loading: false });
    } catch {
      setMyRank({ entry: null, rank: null, loading: false });
    }
  };

  useEffect(() => {
    loadEntries();
    loadMyRank();
  }, [scope]);

  return (
    <div className="w-full flex flex-col items-center min-h-0">
      <h2 className="text-3xl font-black text-white font-mono mb-1 flex items-center gap-2">
        <Trophy className="text-yellow-400" /> LEADERBOARD
      </h2>
      <p className="text-xs text-slate-400 font-semibold mb-5">상위 기록과 내 순위를 확인합니다.</p>

      <div className="grid grid-cols-2 gap-2 w-full mb-4">
        <ScopeButton active={scope === "local"} icon={Database} label="LOCAL" onClick={() => setScope("local")} />
        <ScopeButton active={scope === "online"} icon={Wifi} label="ONLINE" onClick={() => setScope("online")} />
      </div>

      {scope === "online" && (
        <div className="w-full mb-4 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 font-mono">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-indigo-200 font-black tracking-widest">MY ONLINE RANK</div>
              <div className="text-sm text-slate-300 font-bold mt-1">{savedName}</div>
            </div>
            <div className="text-right">
              {myRank.loading ? (
                <RefreshCw size={18} className="animate-spin text-indigo-300" />
              ) : myRank.entry && myRank.rank ? (
                <>
                  <div className="text-2xl text-white font-black">#{myRank.rank}</div>
                  <div className="text-xs text-yellow-300 font-black">{formatScore(myRank.entry.score)}</div>
                </>
              ) : (
                <>
                  <div className="text-lg text-slate-400 font-black">NO RANK</div>
                  <div className="text-[10px] text-slate-500">온라인 기록 없음</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="w-full min-h-0 max-h-[min(46vh,420px)] overflow-y-auto overscroll-contain pr-1 space-y-2.5 mb-6 font-mono">
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
          <div key={entry.id} className="contents">
            {renderRankRow(entry, index + 1)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <button
          onClick={() => {
            loadEntries();
            loadMyRank();
          }}
          className="px-5 py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold rounded-lg font-mono transition-all duration-200 flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} /> 새로고침
        </button>
        <button
          onClick={onBack}
          className="px-5 py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-lg font-mono transition-all duration-200"
        >
          메인 메뉴
        </button>
      </div>
    </div>
  );
}

function ScopeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-11 rounded-lg border font-mono text-xs font-black flex items-center justify-center gap-2 transition-all ${
        active
          ? "bg-cyan-500/15 border-cyan-400 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.18)]"
          : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function renderRankRow(entry: LeaderboardEntry, rank: number) {
  const podium = rank <= 3;
  const colors = rank === 1
    ? "border-yellow-400/70 bg-yellow-400/12 text-yellow-100"
    : rank === 2
      ? "border-cyan-300/55 bg-cyan-300/10 text-cyan-100"
      : rank === 3
        ? "border-fuchsia-400/55 bg-fuchsia-400/10 text-fuchsia-100"
        : "border-slate-800 bg-slate-950/60 text-slate-300";

  return (
    <div className={`grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 rounded-lg border ${podium ? "p-4" : "p-3"} ${colors}`}>
      <div className="flex items-center justify-center">
        {podium ? (
          <div className="flex flex-col items-center leading-none">
            <Medal size={22} className={rank === 1 ? "text-yellow-300" : rank === 2 ? "text-cyan-200" : "text-fuchsia-300"} />
            <span className="text-[10px] font-black mt-1">#{rank}</span>
          </div>
        ) : (
          <span className="text-sm font-black text-slate-500">#{rank}</span>
        )}
      </div>

      <div className="min-w-0">
        <div className={`${podium ? "text-base" : "text-sm"} font-black truncate flex items-center gap-1.5`}>
          {entry.playerName}
          {entry.verified && <ShieldCheck size={12} className="text-emerald-400 shrink-0" />}
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          STAGE {entry.stage} / {formatDuration(entry.durationMs)}
        </div>
      </div>

      <div className="text-right">
        <div className={`${podium ? "text-2xl" : "text-xl"} font-black text-white tracking-wide`}>
          {formatScore(entry.score)}
        </div>
        {podium && <div className="text-[9px] font-black tracking-widest text-slate-400">SCORE</div>}
      </div>
    </div>
  );
}

function formatScore(score: number): string {
  return Math.floor(score).toLocaleString("en-US");
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getSavedPlayerName(): string {
  if (typeof localStorage === "undefined") return "ACE";
  return sanitizePlayerName(localStorage.getItem("retro_shooter_player_name") || "ACE");
}
