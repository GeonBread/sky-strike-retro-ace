import { create } from 'zustand';
import { GameState, GameSettings, PlayerStats, ShipColor } from './types';
import { CompletedRunSummary } from './services/leaderboard';

interface AppState {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  
  score: number;
  setScore: (score: number | ((prev: number) => number)) => void;
  
  shipColor: ShipColor;
  setShipColor: (color: ShipColor) => void;
  
  settings: GameSettings;
  updateSettings: (settings: Partial<GameSettings>) => void;
  
  stats: PlayerStats;
  updateStats: (stats: Partial<PlayerStats>) => void;

  lastRun: CompletedRunSummary | null;
  setLastRun: (run: CompletedRunSummary | null) => void;
}

const getInitialStats = (): PlayerStats => {
  const saved = localStorage.getItem('retro_shooter_stats');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return { highScore: 0, dailyChallengeCompleted: false, lastPlayed: Date.now() };
};

export const useAppStore = create<AppState>((set) => ({
  gameState: 'MENU',
  setGameState: (gameState) => set({ gameState }),
  
  score: 0,
  setScore: (scoreUpdater) => set((state) => {
    const newScore = typeof scoreUpdater === 'function' ? scoreUpdater(state.score) : scoreUpdater;
    return { score: newScore };
  }),
  
  shipColor: 'blue',
  setShipColor: (shipColor) => set({ shipColor }),
  
  settings: { bgmVolume: 0.5, sfxVolume: 0.8, notifications: true },
  updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  
  stats: getInitialStats(),
  updateStats: (newStats) => set((state) => {
    const stats = { ...state.stats, ...newStats };
    localStorage.setItem('retro_shooter_stats', JSON.stringify(stats));
    return { stats };
  }),

  lastRun: null,
  setLastRun: (lastRun) => set({ lastRun })
}));
