import React, { useEffect, useState } from "react";
import { Medal, RefreshCw, ShieldCheck } from "lucide-react";
import {
  LeaderboardEntry,
  LeaderboardScope,
  localLeaderboard,
  onlineLeaderboard,
  sanitizePlayerName,
} from "../services/leaderboard";
import { HobanwooSpriteButton } from "./ui/buttons/HobanwooSpriteButton";
import "./leaderboardPanel.css";

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
    void loadEntries();
    void loadMyRank();
  }, [scope]);

  return (
    <div className="hobanwooLeaderboardRoot">
      <section className="hobanwooLeaderboardFrame" aria-label="랭킹">
        <div className="hobanwooLeaderboardContent">
          <header className="hobanwooLeaderboardHeader">
            <img src="/assets/ui/logos/site-logo.png" alt="" draggable={false} />
            <div>
              <div className="hobanwooLeaderboardEyebrow">GRADUATION OPERATION</div>
              <h2>순위표</h2>
              <p>상위 기록과 내 순위를 확인합니다.</p>
            </div>
          </header>

          <div className="hobanwooLeaderboardScopeGrid">
            <HobanwooSpriteButton
              variant="leaderboardLocal"
              size="wide"
              selected={scope === "local"}
              onClick={() => setScope("local")}
            />
            <HobanwooSpriteButton
              variant="leaderboardOnline"
              size="wide"
              selected={scope === "online"}
              onClick={() => setScope("online")}
            />
          </div>

          {scope === "online" && (
            <div className="hobanwooMyRankCard">
              <div>
                <div className="hobanwooMyRankLabel">MY ONLINE RANK</div>
                <div className="hobanwooMyRankName">{savedName}</div>
              </div>
              <div className="hobanwooMyRankValue">
                {myRank.loading ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : myRank.entry && myRank.rank ? (
                  <>
                    <strong>#{myRank.rank}</strong>
                    <span>{formatScore(myRank.entry.score)}</span>
                  </>
                ) : (
                  <>
                    <strong>NO RANK</strong>
                    <span>온라인 기록 없음</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="hobanwooRankList">
            {loading && (
              <div className="hobanwooRankEmpty">
                <RefreshCw size={17} className="animate-spin" /> 불러오는 중
              </div>
            )}

            {!loading && entries.length === 0 && (
              <div className="hobanwooRankEmpty">
                {message || "아직 등록된 기록이 없습니다."}
              </div>
            )}

            {!loading && entries.map((entry, index) => (
              <React.Fragment key={entry.id}>
                {renderRankRow(entry, index + 1)}
              </React.Fragment>
            ))}
          </div>

          <div className="hobanwooLeaderboardActions">
            <HobanwooSpriteButton
              variant="refresh"
              size="wide"
              onClick={() => {
                void loadEntries();
                void loadMyRank();
              }}
            />
            <HobanwooSpriteButton variant="back" size="wide" onClick={onBack} />
          </div>
        </div>
      </section>
    </div>
  );
}

function renderRankRow(entry: LeaderboardEntry, rank: number) {
  const podium = rank <= 3;

  return (
    <div className={`hobanwooRankRow ${podium ? `podium podium-${rank}` : ""}`}>
      <div className="hobanwooRankPosition">
        {podium ? (
          <>
            <Medal size={22} />
            <span>#{rank}</span>
          </>
        ) : (
          <span>#{rank}</span>
        )}
      </div>

      <div className="hobanwooRankPlayer">
        <div className="hobanwooRankPlayerName">
          {entry.playerName}
          {entry.verified && <ShieldCheck size={13} />}
        </div>
        <div className="hobanwooRankMeta">
          STAGE {entry.stage} · {formatDuration(entry.durationMs)}
        </div>
      </div>

      <div className="hobanwooRankScore">
        <strong>{formatScore(entry.score)}</strong>
        <span>SCORE</span>
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
