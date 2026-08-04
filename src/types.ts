export type GameState = 'MENU' | 'STORY' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'STORY_RESULT' | 'CUTSCENE' | 'TUTORIAL' | 'CUSTOMIZE' | 'PROFILE' | 'LEADERBOARD' | 'DEV_MODE';

export type GameMode = 'arcade' | 'story';

export type ShipColor = 'blue' | 'red' | 'green' | 'yellow' | 'vanguard';

export type ShipStyle = 'science' | 'humanities' | 'arts';

export interface GameSettings {
  bgmVolume: number;
  sfxVolume: number;
  playerShootVolume: number;
  enemyHitVolume: number;
  itemVolume: number;
  notifications: boolean;
}

export interface PlayerStats {
  highScore: number;
  dailyChallengeCompleted: boolean;
  lastPlayed: number;
}
