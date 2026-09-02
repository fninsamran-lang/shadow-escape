export type Difficulty = 'easy' | 'normal' | 'hard';

export interface Position {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  type?: 'wall' | 'pillar' | 'crate' | 'terminal' | 'server';
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  speed: number;
  angle: number;
  hasKey: boolean;
  hasCard: boolean;
  hasIntel: boolean;
  isMoving: boolean;
  footstepTimer: number;
}

export interface Guard {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  angle: number;
  fov: number; // in radians
  visionRange: number; // in pixels
  closeDetectionRadius: number;
  waypoints: Position[];
  currentWaypointIndex: number;
  waitTimer: number;
  waitDuration: number;
  state: 'patrol' | 'suspicious' | 'alert';
}

export interface InteractiveItem {
  id: string;
  type: 'key' | 'access_card' | 'master_key' | 'intel' | 'terminal';
  x: number;
  y: number;
  radius: number;
  label: string;
  codeName: string;
  collected: boolean;
}

export interface ExitDoor {
  x: number;
  y: number;
  width: number;
  height: number;
  unlocked: boolean;
  label?: string;
}

export type GameStatus =
  | 'idle'
  | 'playing'
  | 'gameover_detected'
  | 'gameover_time'
  | 'victory'
  | 'operation_complete';

export interface MissionObjective {
  id: string;
  title: string;
  titleTh: string;
  completed: boolean;
  type: 'key' | 'card' | 'terminal' | 'intel' | 'exit';
}

export interface LevelConfig {
  levelNumber: 1 | 2 | 3;
  codeName: string;
  title: string;
  titleTh: string;
  subtitle: string;
  descriptionTh: string;
  playerStart: Position;
  exitDoor: ExitDoor;
  walls: Wall[];
  getGuards: (difficulty: Difficulty) => Guard[];
  items: InteractiveItem[];
  getInitialObjectives: () => MissionObjective[];
  decorations?: { text: string; x: number; y: number }[];
}

export interface GameStats {
  currentLevel: 1 | 2 | 3;
  difficulty: Difficulty;
  timeRemaining: number;
  maxTime: number;
  detection: number; // 0 to 100
  score: number;
  totalScore: number;
  levelScores: number[];
  status: GameStatus;
  stealthBonus: number;
  timeBonus: number;
  rank: 'S' | 'A' | 'B' | 'C' | 'F';
  allObjectivesCompleted?: boolean;
  hasKey?: boolean;
  hasCard?: boolean;
  hasIntel?: boolean;
  objectives?: MissionObjective[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface GameNotification {
  id: string;
  title: string;
  subtitle: string;
  type: 'key' | 'card' | 'intel' | 'terminal' | 'unlocked' | 'alert' | 'locked';
  timestamp: number;
}

