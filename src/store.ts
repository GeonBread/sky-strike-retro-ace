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

const DEFAULT_SETTINGS: GameSettings = {
  bgmVolume: 0.5,
  sfxVolume: 0.8,
  playerShootVolume: 1,
  enemyHitVolume: 1,
  itemVolume: 1,
  notifications: true
};

const getInitialSettings = (): GameSettings => {
  const saved = localStorage.getItem('retro_shooter_settings_v1');
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {}
  }
  return DEFAULT_SETTINGS;
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
  
  settings: getInitialSettings(),
  updateSettings: (newSettings) => set((state) => {
    const settings = { ...state.settings, ...newSettings };
    localStorage.setItem('retro_shooter_settings_v1', JSON.stringify(settings));
    return { settings };
  }),
  
  stats: getInitialStats(),
  updateStats: (newStats) => set((state) => {
    const stats = { ...state.stats, ...newStats };
    localStorage.setItem('retro_shooter_stats', JSON.stringify(stats));
    return { stats };
  }),

  lastRun: null,
  setLastRun: (lastRun) => set({ lastRun })
}));
