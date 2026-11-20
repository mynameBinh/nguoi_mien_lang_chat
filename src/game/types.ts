export type GameId = 'tug' | 'snake' | 'mic' | 'cat';

export type SceneId = 'title' | 'village' | GameId;

export type ModalState =
  | null
  | { type: 'help'; returnTo: 'title' | 'village' }
  | { type: 'mode'; gameId: GameId; npcName: string }
  | { type: 'intro'; gameId: GameId; options: GameModeOptions }
  | { type: 'pause' }
  | { type: 'result'; result: GameResult };

export interface GameModeOptions {
  n: 1 | 2;
  role?: 'snake' | 'doc' | 'cat' | 'mouse';
}

export interface QuestStep {
  type: 'play' | 'win';
  game: GameId | '*';
  n?: number;
}

export interface QuestDef {
  id: string;
  title: string;
  desc: string;
  steps: QuestStep[];
  reward: number;
}

export interface SaveData {
  pts: number;
  done: Record<string, number>;
  p: Record<string, number>;
}

export interface NpcDef {
  id: GameId;
  name: string;
  subtitle: string;
  bodyColor: string;
  hatColor: string;
  accentColor: string;
}

export interface ModeChoice {
  label: string;
  detail: string;
  options: GameModeOptions;
}

export interface GameResult {
  win: boolean;
  title: string;
  stats: { label: string; value: string }[];
  gameId: GameId;
  winnerSide: number;
  options: GameModeOptions;
  pointsEarned: number;
}

export interface HudSnapshot {
  scene: SceneId;
  modal: ModalState;
  endingActive: boolean;
  muted: boolean;
  points: number;
  activeQuest: {
    title: string;
    desc: string;
    progress: number;
    total: number;
    reward: number;
  } | null;
  nearNpc: {
    id: GameId;
    name: string;
    subtitle: string;
  } | null;
  toast: string | null;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type Rect = [number, number, number, number];
