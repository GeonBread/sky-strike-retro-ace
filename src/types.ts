export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'CUTSCENE' | 'TUTORIAL' | 'CUSTOMIZE' | 'LEADERBOARD' | 'DEV_MODE';

export type ShipColor = 'blue' | 'red' | 'green' | 'yellow' | 'vanguard';

export interface GameSettings {
  bgmVolume: number;
  sfxVolume: number;
  notifications: boolean;
}

export interface PlayerStats {
  highScore: number;
  dailyChallengeCompleted: boolean;
  lastPlayed: number;
}
