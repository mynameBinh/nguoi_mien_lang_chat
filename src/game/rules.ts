import type {
  GameId,
  GameModeOptions,
  ModeChoice,
  NpcDef,
  QuestDef,
  Rect,
  SaveData,
  Vec2,
} from './types';

export const WORLD_W = 960;
export const WORLD_H = 540;

export const NPCS: NpcDef[] = [
  {
    id: 'tug',
    name: 'Cô Ba Kéo Co',
    subtitle: 'Nhịp điệu · 1-2 người',
    bodyColor: '#d94f4f',
    hatColor: '#f2c14e',
    accentColor: '#ff7b54',
  },
  {
    id: 'snake',
    name: 'Cụ Thầy Thuốc',
    subtitle: 'Rồng rắn · 1-2 người',
    bodyColor: '#4f9d69',
    hatColor: '#f8fafc',
    accentColor: '#5eead4',
  },
  {
    id: 'mic',
    name: 'Anh Mic Remix',
    subtitle: 'Cướp mic · 1-2 người',
    bodyColor: '#a35fd9',
    hatColor: '#1f2937',
    accentColor: '#f472b6',
  },
  {
    id: 'cat',
    name: 'Bà Mèo Chuột',
    subtitle: 'Đuổi bắt · 1-2 người',
    bodyColor: '#e0a030',
    hatColor: '#7a4b2a',
    accentColor: '#fbbf24',
  },
];

export const GAME_MODES: Record<GameId, ModeChoice[]> = {
  tug: [
    { label: '1 người', detail: 'Đấu nhịp cùng máy (30 giây)', options: { n: 1 } },
    { label: '2 người', detail: 'P1 (A S D F) vs P2 (J K L ;)', options: { n: 2 } },
  ],
  snake: [
    { label: '1 người · Làm Rắn', detail: 'Nhặt 8 lồng đèn, né Thầy thuốc', options: { n: 1, role: 'snake' } },
    { label: '1 người · Làm Thầy thuốc', detail: 'Bắt đuôi rắn trong 90 giây', options: { n: 1, role: 'doc' } },
    { label: '2 người · Rắn vs Thầy thuốc', detail: 'P1 Rắn · P2 Thầy thuốc', options: { n: 2, role: 'snake' } },
  ],
  mic: [
    { label: '1 người', detail: 'Jack 5 củ vs Sơn Tùng máy (đủ 5 điểm)', options: { n: 1 } },
    { label: '2 người', detail: 'P1 (WASD + Space) vs P2 (Mũi tên + Enter)', options: { n: 2 } },
  ],
  cat: [
    { label: '1 người · Làm Mèo', detail: 'Tóm chuột trong 20 giây', options: { n: 1, role: 'cat' } },
    { label: '1 người · Làm Chuột', detail: 'Sống sót qua 20 giây', options: { n: 1, role: 'mouse' } },
    { label: '2 người · Mèo vs Chuột', detail: 'P1 Mèo · P2 Chuột', options: { n: 2, role: 'cat' } },
  ],
};

export function getIntroContent(gameId: GameId, o: GameModeOptions): { title: string; bullets: string[]; controls: string } {
  switch (gameId) {
    case 'tug':
      return {
        title: 'Kéo Co Nhịp Điệu',
        bullets: [
          'Nốt nhạc rơi xuống: bấm đúng phím khi nốt chạm vạch trắng để kéo dây về phía mình.',
          'Perfect kéo mạnh nhất, rồi Good, rồi Great. Combo cao giúp lực kéo tăng thêm.',
          'Bấm sai hoặc bấm khi không có nốt sẽ bị kéo lùi và mất nhịp!',
          'Thắng khi khăn đỏ vượt qua vạch, hoặc sau 30 giây bên nào kéo lấn hơn sẽ thắng.',
        ],
        controls: o.n === 2 ? 'P1 (trái): A S D F  ·  P2 (phải): J K L ;' : 'Phím: A S D F (hoặc J K L ;)',
      };
    case 'snake':
      return {
        title: 'Rồng Rắn Lên Mây',
        bullets: [
          'Đoàn rắn gồm 7 người (1 đầu, 4 thân, 2 đuôi). Rắn thắng khi nhặt đủ 8 lồng đèn; Thầy thuốc thắng nếu chạm được phần đuôi hoặc hết 90 giây.',
          'Giữ Space/Shift để trườn nhanh liên tục khi còn thể lực (thanh dưới). 0,5 giây đầu khi bắt đầu trườn được miễn nhiễm.',
          'Đầu rắn húc trúng Thầy thuốc sẽ làm choáng 1 giây. Thầy thuốc cũng có thể lướt nhanh.',
        ],
        controls:
          o.n === 2
            ? 'P1 Rắn: WASD + giữ Space  ·  P2 Thầy thuốc: Mũi tên + Enter'
            : o.role === 'snake'
              ? 'Bạn là RẮN: WASD / Mũi tên di chuyển · Giữ Space trườn nhanh'
              : 'Bạn là THẦY THUỐC: WASD / Mũi tên di chuyển · Space lướt',
      };
    case 'mic':
      return {
        title: 'Cướp Mic Remix',
        bullets: [
          'Cướp chiếc mic ở giữa sân khấu và chạy về vạch nhà của mình để ghi +2 điểm. Chạm vào đối thủ đang cầm mic để cướp (+1 điểm). Ai đủ 5 điểm trước sẽ thắng.',
          'Tránh hố sâu (quay về vạch xuất phát), tường lửa (bật tắt theo nhịp) và sóng nhạc (choáng 1 giây). Sau mỗi lần ghi điểm, chướng ngại vật được xáo lại.',
          'Dash hồi mỗi 1,5 giây; người đang cầm mic sẽ dash ngắn hơn một chút.',
        ],
        controls:
          o.n === 2
            ? 'P1: WASD + Space (Dash)  ·  P2: Mũi tên + Enter (Dash)'
            : 'Bạn là Jack 5 củ: WASD / Mũi tên di chuyển · Space để Dash',
      };
    case 'cat':
      return {
        title: 'Mèo Bắt Chuột',
        bullets: [
          'Mèo (cam) phải tóm gọn Chuột (xanh) trong 20 giây. Chuột chỉ cần né tránh và sống sót đến hết giờ.',
          'Nhặt vật phẩm trên sân: ⚡ Tăng tốc (3s), ❄️ Đóng băng đối thủ (1.6s), 🛡️ Khiên bảo vệ (2.5s). Dùng thùng gỗ để cắt góc.',
          'Chuột hồi chiêu Dash (1,3s) nhanh hơn Mèo (2,5s).',
        ],
        controls:
          o.n === 2
            ? 'P1 Mèo: WASD + Space  ·  P2 Chuột: Mũi tên + Enter'
            : `Bạn là ${o.role === 'cat' ? 'MÈO' : 'CHUỘT'}: WASD / Mũi tên · Space / Enter để Dash`,
      };
  }
}

export const QUESTS: QuestDef[] = [
  {
    id: 'q1',
    title: 'Khởi động làng',
    desc: 'Chơi thử mỗi trò một lần',
    steps: [
      { type: 'play', game: 'tug' },
      { type: 'play', game: 'snake' },
      { type: 'play', game: 'mic' },
      { type: 'play', game: 'cat' },
    ],
    reward: 50,
  },
  {
    id: 'q2',
    title: 'Cao thủ dân gian',
    desc: 'Thắng 3 trận bất kỳ',
    steps: [{ type: 'win', game: '*', n: 3 }],
    reward: 100,
  },
  {
    id: 'q3',
    title: 'Vua kéo co',
    desc: 'Thắng một trận kéo co',
    steps: [{ type: 'win', game: 'tug' }],
    reward: 60,
  },
];

export function createInitialSave(): SaveData {
  return { pts: 0, done: {}, p: {} };
}

export function getCurrentQuest(save: SaveData): QuestDef | null {
  return QUESTS.find((q) => !save.done[q.id]) ?? null;
}

export function getQuestStepProgress(save: SaveData, q: QuestDef): number {
  return q.steps.filter((s, i) => (save.p[q.id + i] || 0) >= (s.n || 1)).length;
}

export function reportQuestEvent(
  save: SaveData,
  type: 'play' | 'win',
  game: GameId
): { completedQuests: QuestDef[] } {
  const completedQuests: QuestDef[] = [];
  for (const q of QUESTS) {
    if (save.done[q.id]) continue;
    q.steps.forEach((s, i) => {
      if (s.type === type && (s.game === '*' || s.game === game)) {
        const key = q.id + i;
        save.p[key] = Math.min(s.n || 1, (save.p[key] || 0) + 1);
      }
    });
    if (getQuestStepProgress(save, q) === q.steps.length) {
      save.done[q.id] = 1;
      save.pts += q.reward;
      completedQuests.push(q);
    }
  }
  return { completedQuests };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function dist2(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function resolveRectCollision(pos: Vec2, dx: number, dy: number, rects: Rect[], radius = 12): void {
  const hits = () =>
    rects.some(
      (q) => pos.x + radius > q[0] && pos.x - radius < q[0] + q[2] && pos.y + radius > q[1] && pos.y - radius < q[1] + q[3]
    );
  pos.x += dx;
  if (hits()) pos.x -= dx;
  pos.y += dy;
  if (hits()) pos.y -= dy;
}

export type NoteRating = 1 | 2 | 3; // 1: GREAT, 2: GOOD, 3: PERFECT

export function judgeNoteDistance(distancePx: number): NoteRating | null {
  const d = Math.abs(distancePx);
  if (d >= 64) return null;
  if (d < 20) return 3;
  if (d < 40) return 2;
  return 1;
}

export function applyRopePull(rope: number, side: 0 | 1, force: number): number {
  const dir = side === 1 ? 1 : -1;
  return clamp(rope + dir * force * 0.012, -0.5, 0.5);
}

export function checkTugWinner(rope: number, hits: [number, number]): 0 | 1 {
  if (rope < 0) return 0;
  if (rope > 0) return 1;
  return hits[0] >= hits[1] ? 0 : 1;
}

export function isFireWallActive(elapsed: number, phase: number): boolean {
  return Math.sin((elapsed + phase) * 2) > 0;
}

export function computeMicWaveY(elapsed: number, phase: number): number {
  return 400 + Math.sin(elapsed * 1.6 + phase) * 300;
}

export function stepSnakeHistory(history: Vec2[], head: Vec2, maxLength = 60, minStep = 4): Vec2[] {
  const first = history[0];
  if (!first || Math.hypot(head.x - first.x, head.y - first.y) >= minStep) {
    const next = [{ x: head.x, y: head.y }, ...history];
    if (next.length > maxLength) next.length = maxLength;
    return next;
  }
  return history;
}

export function checkCatWin(catWon: boolean, modeN: 1 | 2, humanIndex: number): boolean {
  return modeN === 2 ? true : humanIndex === 0 ? catWon : !catWon;
}
