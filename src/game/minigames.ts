import type { AudioManager } from './audio';
import {
  applyRopePull,
  checkCatWin,
  checkTugWinner,
  clamp,
  computeMicWaveY,
  dist2,
  isFireWallActive,
  judgeNoteDistance,
  randRange,
  resolveRectCollision,
  stepSnakeHistory,
  WORLD_H,
  WORLD_W,
} from './rules';
import type { GameId, GameModeOptions, Rect, Vec2 } from './types';
import {
  drawBadgeEmoji,
  drawLantern,
  drawPerson,
  drawStaminaBar,
  drawStarPath,
  drawText,
  VfxManager,
} from './vfx';

export interface InputState {
  held: Record<string, boolean>;
  justPressed: Record<string, boolean>;
  moveVec1: () => Vec2;
  moveVecP1: () => Vec2;
  moveVecP2: () => Vec2;
}

export interface MiniGameContext {
  audio: AudioManager;
  vfx: VfxManager;
  triggerHitstop: (sec: number) => void;
  finishGame: (payload: {
    win: boolean;
    title: string;
    stats: { label: string; value: string }[];
    winnerSide: number;
  }) => void;
}

export interface MiniGameInstance {
  id: GameId;
  update: (dt: number, input: InputState) => void;
  draw: (g: CanvasRenderingContext2D) => void;
}

/* ============================================================================
   1. KÉO CO NHỊP ĐIỆU (TUG OF WAR RHYTHM)
   ============================================================================ */
const TUG_KEYS = [
  ['KeyA', 'KeyS', 'KeyD', 'KeyF'],
  ['KeyJ', 'KeyK', 'KeyL', 'Semicolon'],
] as const;
const TUG_LABELS = [
  ['A', 'S', 'D', 'F'],
  ['J', 'K', 'L', ';'],
] as const;
const LANE_COLORS = ['#ff6b6b', '#ffe66d', '#6bd96b', '#4dd2ff'] as const;

export class TugGame implements MiniGameInstance {
  readonly id: GameId = 'tug';
  private n: 1 | 2;
  private rope = 0; // -0.5 to 0.5
  private visualRope = 0;
  private time = 0;
  private countdown = 3;
  private timeLeft = 30;
  private missFlash = 0;
  private pullTimer = 0;
  private pullSide: 0 | 1 = 0;
  private combos: [number, number] = [0, 0];
  private hits: [number, number] = [0, 0];
  private bestCombos: [number, number] = [0, 0];
  private notes: [{ lane: number; y: number }[], { lane: number; y: number }[]] = [[], []];
  private spawnTimers: [number, number] = [0, 0];
  private aiTimer = 1;
  private finished = false;
  private lanePressPulse: [number[], number[]] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  private heldLanes: [boolean[], boolean[]] = [
    [false, false, false, false],
    [false, false, false, false],
  ];
  private staticBg: HTMLCanvasElement;

  constructor(private options: GameModeOptions, private ctx: MiniGameContext) {
    this.n = options.n;
    this.staticBg = document.createElement('canvas');
    this.staticBg.width = WORLD_W;
    this.staticBg.height = WORLD_H;
    const bg = this.staticBg.getContext('2d')!;
    const sky = bg.createLinearGradient(0, 0, 0, 260);
    sky.addColorStop(0, '#50b4d8');
    sky.addColorStop(0.65, '#bfe9bd');
    sky.addColorStop(1, '#79ba5b');
    bg.fillStyle = sky;
    bg.fillRect(0, 0, WORLD_W, 260);

    bg.fillStyle = '#6aa84f';
    bg.beginPath();
    bg.moveTo(0, 200);
    for (let x = 0; x <= WORLD_W; x += 32) {
      bg.lineTo(x, 145 + Math.sin(x * 0.011) * 20);
    }
    bg.lineTo(WORLD_W, 220);
    bg.lineTo(0, 220);
    bg.closePath();
    bg.fill();

    bg.fillStyle = '#538d39';
    bg.fillRect(0, 188, WORLD_W, 72);
    bg.fillStyle = '#c8a773';
    bg.fillRect(100, 208, 760, 40);

    const deckBg = bg.createLinearGradient(0, 255, 0, WORLD_H);
    deckBg.addColorStop(0, '#1e122b');
    deckBg.addColorStop(1, '#11091a');
    bg.fillStyle = deckBg;
    bg.fillRect(0, 255, WORLD_W, WORLD_H - 255);
    bg.strokeStyle = '#ffd23f';
    bg.lineWidth = 3;
    bg.beginPath();
    bg.moveTo(0, 256);
    bg.lineTo(WORLD_W, 256);
    bg.stroke();

    for (let s = 0; s < this.n; s++) {
      const x0 = this.deckX(s);
      bg.fillStyle = 'rgba(10, 5, 16, 0.78)';
      bg.strokeStyle = 'rgba(255, 207, 90, 0.35)';
      bg.lineWidth = 2;
      bg.beginPath();
      bg.roundRect(x0 - 8, 260, 296, WORLD_H - 264, 12);
      bg.fill();
      bg.stroke();
    }
  }

  private deckX(side: number): number {
    return this.n === 1 ? 340 : side ? 584 : 96;
  }

  private pull(side: 0 | 1, force: number): void {
    if (this.finished) return;
    this.rope = applyRopePull(this.rope, side, force);
    this.pullTimer = 0.28;
    this.pullSide = side;

    const flagX = 480 + this.rope * 300;
    if (Math.random() < 0.7) {
      this.ctx.vfx.spawnDirectionalDust(side === 0 ? 250 : 710, 232, side === 0 ? 40 : -40, -15);
    }

    if (Math.abs(this.rope) >= 0.5) {
      this.finished = true;
      const winSide = this.rope < 0 ? 0 : 1;
      const isSingle = this.n === 1;
      this.ctx.vfx.burst(flagX, 178, '#ffd23f', 32, 'confetti', 80, 280);
      this.ctx.vfx.shockwave(flagX, 178, '#ff4d6d', 110, 0.45, 5);
      this.ctx.vfx.addTrauma(0.75);
      this.ctx.triggerHitstop(0.06);
      this.ctx.finishGame({
        win: isSingle ? winSide === 0 : true,
        title: isSingle
          ? winSide === 0
            ? 'Khăn đã qua vạch — BẠN THẮNG!'
            : 'Đội máy kéo thắng rồi!'
          : winSide === 1
            ? 'ĐỘI P2 CHIẾN THẮNG!'
            : 'ĐỘI P1 CHIẾN THẮNG!',
        stats: [
          { label: 'Nốt trúng P1', value: `${this.hits[0]}` },
          ...(this.n === 2 ? [{ label: 'Nốt trúng P2', value: `${this.hits[1]}` }] : []),
          { label: 'Combo cao nhất', value: `x${this.bestCombos[0]}` },
        ],
        winnerSide: winSide,
      });
    }
  }

  private registerHit(side: 0 | 1, rating: 1 | 2 | 3, lane: number): void {
    this.combos[side]++;
    this.hits[side]++;
    this.bestCombos[side] = Math.max(this.bestCombos[side], this.combos[side]);
    const labels = ['GREAT', 'GOOD!', 'PERFECT!!'];
    const colors = ['#9ad0ff', '#7dffb0', '#ffe66d'];
    const x = this.deckX(side) + lane * 70 + 33;

    this.lanePressPulse[side][lane] = 1;
    this.ctx.vfx.shockwave(x, 488, LANE_COLORS[lane], 44 + rating * 12, 0.3, 4);
    this.ctx.vfx.burst(x, 488, LANE_COLORS[lane], 6 + rating * 5, rating === 3 ? 'star' : 'spark');
    this.ctx.vfx.popup(x, 444, labels[rating - 1], colors[rating - 1], rating === 3 ? 25 : 20);

    if (rating === 3) {
      this.ctx.vfx.addTrauma(0.22);
      if (this.combos[side] >= 6) {
        this.ctx.triggerHitstop(0.025);
      }
    }

    this.ctx.audio.playHit(rating, this.combos[side]);
    this.pull(side, rating + (this.combos[side] > 8 ? 1 : 0));
  }

  private registerMiss(side: 0 | 1, lane: number): void {
    if (this.finished) return;
    this.combos[side] = 0;
    this.missFlash = 0.28;
    const x = this.deckX(side) + lane * 70 + 33;
    this.ctx.vfx.shockwave(x, 488, '#ff4d4d', 54, 0.28, 4);
    this.ctx.vfx.burst(x, 488, '#ff4d4d', 12, 'spark');
    this.ctx.vfx.popup(x, 446, 'TRẬT NHỊP!', '#ff6b6b', 20);
    this.ctx.vfx.addTrauma(0.38);
    this.ctx.audio.playMiss();
    this.pull((1 - side) as 0 | 1, 1.5);
  }

  update(dt: number, input: InputState): void {
    this.time += dt;
    this.pullTimer = Math.max(0, this.pullTimer - dt);
    this.missFlash = Math.max(0, this.missFlash - dt);
    this.visualRope += (this.rope - this.visualRope) * Math.min(1, dt * 16);

    for (let s = 0; s < 2; s++) {
      for (let l = 0; l < 4; l++) {
        this.lanePressPulse[s][l] = Math.max(0, this.lanePressPulse[s][l] - dt * 5);
        this.heldLanes[s][l] = !!(
          input.held[TUG_KEYS[s][l]] ||
          (this.n === 1 && input.held[TUG_KEYS[1][l]])
        );
      }
    }

    if (this.countdown > 0) {
      const prevCeil = Math.ceil(this.countdown);
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.ctx.audio.playCountdown(true);
        this.ctx.vfx.shockwave(480, 270, '#ffd23f', 180, 0.45, 5);
      } else if (Math.ceil(this.countdown) !== prevCeil) {
        this.ctx.audio.playCountdown(false);
      }
      return;
    }

    this.timeLeft -= dt;

    for (let s = 0 as 0 | 1; s < this.n; s = (s + 1) as 0 | 1) {
      this.spawnTimers[s] -= dt;
      if (this.spawnTimers[s] <= 0) {
        this.spawnTimers[s] = randRange(0.32, 0.58);
        this.notes[s].push({ lane: (Math.random() * 4) | 0, y: 248 });
      }

      this.notes[s].forEach((note) => {
        note.y += 305 * dt;
      });
      this.notes[s] = this.notes[s].filter((note) => {
        if (note.y > WORLD_H + 20) {
          this.combos[s] = 0;
          return false;
        }
        return true;
      });

      TUG_KEYS[s].forEach((code, lane) => {
        const pressed = input.justPressed[code] || (this.n === 1 && input.justPressed[TUG_KEYS[1][lane]]);
        if (!pressed) return;
        let bestIdx = -1;
        let bestDist = Infinity;
        this.notes[s].forEach((note, idx) => {
          if (note.lane === lane) {
            const d = Math.abs(note.y - 488);
            if (d < bestDist) {
              bestDist = d;
              bestIdx = idx;
            }
          }
        });
        const rating = bestIdx >= 0 ? judgeNoteDistance(bestDist) : null;
        if (rating !== null) {
          this.notes[s].splice(bestIdx, 1);
          this.registerHit(s, rating, lane);
        } else {
          this.registerMiss(s, lane);
        }
      });
    }

    if (this.n === 1) {
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) {
        this.aiTimer = randRange(0.46, 0.8);
        this.pull(1, 1 + ((Math.random() * 2) | 0));
      }
    }

    if (this.timeLeft <= 0 && !this.finished) {
      this.finished = true;
      const winSide = checkTugWinner(this.rope, this.hits);
      const isSingle = this.n === 1;
      this.ctx.vfx.addTrauma(0.5);
      this.ctx.finishGame({
        win: isSingle ? winSide === 0 : true,
        title: isSingle
          ? winSide === 0
            ? 'Hết giờ! Bạn kéo thắng!'
            : 'Hết giờ! Đội máy kéo nhỉnh hơn!'
          : winSide === 1
            ? 'Hết giờ! ĐỘI P2 thắng!'
            : 'Hết giờ! ĐỘI P1 thắng!',
        stats: [
          { label: 'Nốt trúng P1', value: `${this.hits[0]}` },
          ...(this.n === 2 ? [{ label: 'Nốt trúng P2', value: `${this.hits[1]}` }] : []),
          { label: 'Combo cao nhất', value: `x${this.bestCombos[0]}` },
        ],
        winnerSide: winSide,
      });
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    g.drawImage(this.staticBg, 0, 0);

    // Festive bunting flags across top
    for (let i = 0; i < 16; i++) {
      const bx = 30 + i * 60;
      const by = 18 + Math.sin(this.time * 3 + i) * 3;
      g.fillStyle = ['#e63946', '#ffd23f', '#4dd2ff', '#7dffb0'][i % 4];
      g.beginPath();
      g.moveTo(bx - 12, 0);
      g.lineTo(bx + 12, 0);
      g.lineTo(bx, by + 16);
      g.closePath();
      g.fill();
    }

    // Threshold markers
    g.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    g.lineWidth = 3;
    g.setLineDash([8, 6]);
    [330, 480, 630].forEach((lx, idx) => {
      g.strokeStyle = idx === 1 ? 'rgba(255, 210, 63, 0.55)' : 'rgba(255, 255, 255, 0.85)';
      g.beginPath();
      g.moveTo(lx, 166);
      g.lineTo(lx, 248);
      g.stroke();
    });
    g.setLineDash([]);

    // Tug Rope & vibrating center handkerchief
    const flagX = 480 + this.visualRope * 300;
    const ropeVib = this.pullTimer > 0 ? Math.sin(this.time * 48) * 2 : 0;
    g.strokeStyle = '#6d4423';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(130 + this.visualRope * 60, 194 + ropeVib);
    g.lineTo(830 + this.visualRope * 60, 194 - ropeVib);
    g.stroke();
    g.strokeStyle = '#b07b48';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(130 + this.visualRope * 60, 194 + ropeVib);
    g.lineTo(830 + this.visualRope * 60, 194 - ropeVib);
    g.stroke();

    // Red festival handkerchief
    g.fillStyle = '#e63946';
    g.strokeStyle = '#fff3b0';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(flagX, 192);
    g.lineTo(flagX + 16, 222 + Math.sin(this.time * 9) * 3);
    g.lineTo(flagX - 16, 222);
    g.closePath();
    g.fill();
    g.stroke();

    // Teams leaning & pulling
    for (let i = 0; i < 3; i++) {
      const pullingLeft = this.pullTimer > 0 && this.pullSide === 0;
      const pullingRight = this.pullTimer > 0 && this.pullSide === 1;
      const bobL = pullingLeft ? this.time * 16 + i : 0;
      const bobR = pullingRight ? this.time * 16 + i : 0;
      drawPerson(g, {
        bodyColor: '#d94f4f',
        hatColor: '#f2c14e',
        x: 182 + i * 54 + this.visualRope * 60,
        y: 232,
        bob: bobL,
        flip: 1,
        leanAngle: pullingLeft ? -0.18 : -0.06,
        hatStyle: 'nonla',
      });
      drawPerson(g, {
        bodyColor: '#3b82f6',
        hatColor: '#f8fafc',
        x: 778 - i * 54 + this.visualRope * 60,
        y: 232,
        bob: bobR,
        flip: -1,
        leanAngle: pullingRight ? -0.18 : -0.06,
        hatStyle: 'round',
      });
    }

    drawText(g, 'P1', 90, 154, 22, '#ff9a9a', 'center', '800');
    drawText(g, this.n === 1 ? 'MÁY' : 'P2', 870, 154, 22, '#9ac2ff', 'center', '800');

    // Rhythm Decks
    for (let s = 0; s < this.n; s++) {
      const x0 = this.deckX(s);

      for (let l = 0; l < 4; l++) {
        const lx = x0 + l * 70;
        const held = this.heldLanes[s][l];
        const pulse = this.lanePressPulse[s][l];

        // Lane beam (zero-allocation layered translucent strips)
        if (held || pulse > 0) {
          g.fillStyle = LANE_COLORS[l] + (held ? '30' : '1d');
          g.fillRect(lx, 265, 66, 240);
          g.fillStyle = LANE_COLORS[l] + (held ? '26' : '14');
          g.fillRect(lx, 385, 66, 120);
        } else {
          g.fillStyle = 'rgba(255, 255, 255, 0.035)';
          g.fillRect(lx, 265, 66, 240);
        }

        // Hit receptor box
        const scale = 1 + pulse * 0.1;
        g.save();
        g.translate(lx + 33, 488);
        g.scale(scale, scale);
        g.fillStyle = held ? LANE_COLORS[l] + '40' : 'rgba(20, 12, 30, 0.85)';
        g.strokeStyle = LANE_COLORS[l];
        g.lineWidth = 3;
        g.beginPath();
        g.roundRect(-30, -18, 60, 36, 9);
        g.fill();
        g.stroke();
        drawText(g, TUG_LABELS[s][l], 0, 7, 18, held ? '#ffffff' : LANE_COLORS[l], 'center', '800');
        g.restore();
      }

      // Hit line
      g.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x0 - 6, 488);
      g.lineTo(x0 + 286, 488);
      g.stroke();

      // Falling notes with fast comet trails
      this.notes[s].forEach((note) => {
        const nx = x0 + note.lane * 70 + 33;
        const col = LANE_COLORS[note.lane];
        g.fillStyle = col + '26';
        g.fillRect(nx - 8, note.y - 42, 16, 22);
        g.fillStyle = col + '55';
        g.fillRect(nx - 10, note.y - 20, 20, 20);

        g.fillStyle = col;
        g.strokeStyle = '#ffffff';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(nx, note.y, 19, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.65)';
        g.beginPath();
        g.arc(nx - 5, note.y - 5, 5, 0, Math.PI * 2);
        g.fill();
      });

      if (this.combos[s] > 1) {
        const flameCol = this.combos[s] >= 8 ? '#ffd23f' : '#ffffff';
        drawText(g, `Combo x${this.combos[s]}`, x0 + 140, 294, 20 + Math.min(this.combos[s], 12) * 0.5, flameCol);
      }
    }

    // Miss red edge vignette
    if (this.missFlash > 0) {
      g.fillStyle = `rgba(230, 40, 40, ${(this.missFlash * 0.75).toFixed(2)})`;
      g.fillRect(0, 0, WORLD_W, WORLD_H);
    }

    // Timer Pill
    drawText(g, `${Math.max(0, Math.ceil(this.timeLeft))}s`, 480, 58, 34, this.timeLeft < 8 ? '#ff6b6b' : '#fff8eb', 'center', '800');

    // Countdown overlay
    if (this.countdown > 0) {
      g.fillStyle = 'rgba(12, 6, 20, 0.56)';
      g.fillRect(0, 0, WORLD_W, WORLD_H);
      const val = Math.ceil(this.countdown);
      const frac = this.countdown - Math.floor(this.countdown);
      const sc = 0.85 + frac * 0.35;
      g.save();
      g.translate(480, 285);
      g.scale(sc, sc);
      drawText(g, `${val}`, 0, 0, 150, '#ffd23f', 'center', '800');
      g.restore();
      drawText(g, 'Sẵn sàng kéo co!', 480, 360, 28, '#fff8eb');
    }
  }
}

/* ============================================================================
   2. RỒNG RẮN LÊN MÂY (SNAKE & DOCTOR)
   ============================================================================ */
export class SnakeGame implements MiniGameInstance {
  readonly id: GameId = 'snake';
  private n: 1 | 2;
  private role: 'snake' | 'doc';
  private timeLeft = 90;
  private collected = 0;
  private elapsed = 0;
  private snake = { x: 200, y: 270, stamina: 35, ghostStamina: 35, inv: 0, dash: 0, stunCd: 0 };
  private history: Vec2[] = [];
  private doctor = { x: 780, y: 270, stamina: 100, ghostStamina: 100, stun: 0, dash: 0, hitFlash: 0 };
  private lanterns: { x: number; y: number; phase: number }[] = [];
  private dustTimer = 0;
  private finished = false;

  constructor(private options: GameModeOptions, private ctx: MiniGameContext) {
    this.n = options.n;
    this.role = options.role === 'doc' ? 'doc' : 'snake';
    for (let i = 0; i < 60; i++) {
      this.history.push({ x: 200 - i * 4, y: 270 });
    }
    for (let i = 0; i < 4; i++) this.spawnLantern();
  }

  private spawnLantern(): void {
    this.lanterns.push({
      x: randRange(80, WORLD_W - 80),
      y: randRange(105, WORLD_H - 95),
      phase: randRange(0, Math.PI * 2),
    });
  }

  private segment(i: number): Vec2 {
    return this.history[Math.min(i * 5, this.history.length - 1)];
  }

  private finish(snakeWon: boolean, message: string): void {
    if (this.finished) return;
    this.finished = true;
    const win = this.n === 2 || (this.role === 'snake' ? snakeWon : !snakeWon);
    this.ctx.finishGame({
      win,
      title: message,
      stats: [
        { label: 'Lồng đèn', value: `${this.collected}/8` },
        { label: 'Thời gian', value: `${Math.round(90 - this.timeLeft)}s` },
      ],
      winnerSide: snakeWon ? 1 : 0,
    });
  }

  update(dt: number, input: InputState): void {
    const s = this.snake;
    const d = this.doctor;
    this.timeLeft -= dt;
    this.elapsed += dt;

    let vs: Vec2;
    let vd: Vec2;
    let ds = false;
    let dd = false;

    const unifiedMove = input.moveVec1();
    const dashPress = !!(input.justPressed.Space || input.justPressed.ShiftLeft || input.justPressed.Enter);

    if (this.n === 2) {
      vs = input.moveVecP1();
      ds = !!(input.held.Space || input.held.ShiftLeft);
      vd = input.moveVecP2();
      dd = !!(input.justPressed.Enter || input.justPressed.ShiftRight);
    } else if (this.role === 'snake') {
      vs = unifiedMove;
      ds = !!(input.held.Space || input.held.ShiftLeft || input.held.Enter);
      const tail = this.segment(6);
      const distTail = Math.hypot(tail.x - d.x, tail.y - d.y) || 1;
      vd = { x: (tail.x - d.x) / distTail, y: (tail.y - d.y) / distTail };
      dd = distTail < 170 && distTail > 60 && d.stamina >= 40 && Math.random() < 0.02;
    } else {
      vd = unifiedMove;
      dd = dashPress;
      let target = this.lanterns[0];
      let bestDist = Infinity;
      for (const l of this.lanterns) {
        const q = Math.hypot(l.x - s.x, l.y - s.y);
        if (q < bestDist) {
          bestDist = q;
          target = l;
        }
      }
      let ax = target.x - s.x;
      let ay = target.y - s.y;
      const al = Math.hypot(ax, ay) || 1;
      ax /= al;
      ay /= al;
      const dr = Math.hypot(d.x - s.x, d.y - s.y) || 1;
      if (dr < 160) {
        ax -= ((d.x - s.x) / dr) * 1.6;
        ay -= ((d.y - s.y) / dr) * 1.6;
      }
      const l2 = Math.hypot(ax, ay) || 1;
      vs = { x: ax / l2, y: ay / l2 };
      ds = s.dash > 0 ? dr < 220 && s.stamina > 5 : dr < 90 && s.stamina >= 35 && Math.random() < 0.06;
    }

    if (!(s.dash > 0)) s.stamina = Math.min(35, s.stamina + 18 * dt);
    d.stamina = Math.min(100, d.stamina + 20 * dt);
    s.ghostStamina += (s.stamina - s.ghostStamina) * Math.min(1, dt * 6);
    d.ghostStamina += (d.stamina - d.ghostStamina) * Math.min(1, dt * 6);

    const wasSlithering = s.dash > 0;
    s.dash -= dt;
    s.inv -= dt;
    s.stunCd -= dt;
    d.dash -= dt;
    d.hitFlash = Math.max(0, d.hitFlash - dt);

    if (ds && (wasSlithering ? s.stamina > 0 : s.stamina >= 10)) {
      if (!wasSlithering) {
        s.inv = 0.5;
        this.ctx.audio.playDash();
        this.ctx.vfx.shockwave(s.x, s.y, '#4dd2ff', 42, 0.25, 3);
      }
      s.dash = 0.08;
      s.stamina = Math.max(0, s.stamina - 35 * dt);
    }

    if (dd && d.stamina >= 40 && d.dash <= 0 && d.stun <= 0) {
      d.stamina -= 40;
      d.dash = 0.25;
      this.ctx.audio.playDash();
      this.ctx.vfx.burst(d.x, d.y, '#5eead4', 10, 'spark');
    }

    const sSpeed = s.dash > 0 ? 320 : 142;
    s.x = clamp(s.x + vs.x * sSpeed * dt, 42, WORLD_W - 42);
    s.y = clamp(s.y + vs.y * sSpeed * dt, 76, WORLD_H - 64);

    if (s.dash > 0) {
      this.dustTimer -= dt;
      if (this.dustTimer <= 0) {
        this.dustTimer = 0.04;
        this.ctx.vfx.afterimage(s.x, s.y, '#ffd23f', 14);
      }
    }

    this.history = stepSnakeHistory(this.history, s, 60, 4);

    d.stun -= dt;
    if (d.stun <= 0) {
      const dSpeed = d.dash > 0 ? 420 : 138;
      d.x = clamp(d.x + vd.x * dSpeed * dt, 42, WORLD_W - 42);
      d.y = clamp(d.y + vd.y * dSpeed * dt, 76, WORLD_H - 64);
      if (d.dash > 0) this.ctx.vfx.afterimage(d.x, d.y, '#2a9d8f', 15);
    }

    // Head-butt stuns Doctor
    if (dist2(s, d) < 26 && d.stun <= 0 && s.stunCd <= 0) {
      d.stun = 1.0;
      d.hitFlash = 0.08;
      s.stunCd = 2.5;
      this.ctx.vfx.burst(d.x, d.y, '#ffd23f', 20, 'star');
      this.ctx.vfx.shockwave(d.x, d.y, '#ffd23f', 64, 0.35, 4);
      this.ctx.vfx.popup(d.x, d.y - 36, 'CHOÁNG!', '#ffd23f', 22);
      this.ctx.vfx.addTrauma(0.5);
      this.ctx.triggerHitstop(0.05);
      this.ctx.audio.playStun();
    }

    // Doctor catches tail
    for (let i = 5; i < 7; i++) {
      const seg = this.segment(i);
      if (Math.hypot(seg.x - d.x, seg.y - d.y) < 18 && s.inv <= 0 && d.stun <= 0) {
        this.ctx.vfx.burst(seg.x, seg.y, '#ff6b6b', 24, 'spark');
        this.ctx.vfx.addTrauma(0.6);
        this.ctx.triggerHitstop(0.06);
        this.finish(false, 'Thầy thuốc đã bắt được đuôi rắn!');
        return;
      }
    }

    // Collect lanterns
    this.lanterns = this.lanterns.filter((l) => {
      if (Math.hypot(l.x - s.x, l.y - s.y) < 24) {
        this.collected++;
        this.ctx.vfx.burst(l.x, l.y, '#ffb347', 16, 'star');
        this.ctx.vfx.shockwave(l.x, l.y, '#ffd23f', 52, 0.32, 3);
        this.ctx.vfx.popup(l.x, l.y - 20, `${this.collected}/8`, '#ffd23f', 20);
        this.ctx.audio.playPickup();
        return false;
      }
      return true;
    });

    while (this.collected + this.lanterns.length < 8) this.spawnLantern();

    if (this.collected >= 8) {
      this.finish(true, 'Rồng rắn thu thập đủ 8 lồng đèn!');
    } else if (this.timeLeft <= 0) {
      this.finish(false, 'Hết giờ, rắn chưa kịp lấy đủ lồng đèn!');
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    // Twilight bamboo courtyard
    g.fillStyle = '#1f3f2a';
    g.fillRect(0, 0, WORLD_W, WORLD_H);

    // Subtle courtyard stone tile grid
    g.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    g.lineWidth = 1;
    for (let x = 30; x <= 930; x += 45) {
      g.beginPath();
      g.moveTo(x, 60);
      g.lineTo(x, 490);
      g.stroke();
    }
    for (let y = 60; y <= 490; y += 45) {
      g.beginPath();
      g.moveTo(30, y);
      g.lineTo(930, y);
      g.stroke();
    }

    // Courtyard gold border
    g.strokeStyle = 'rgba(255, 210, 63, 0.72)';
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(30, 60, 900, 430, 12);
    g.stroke();

    // Floating lanterns
    this.lanterns.forEach((l) => {
      drawLantern(g, l.x, l.y + Math.sin(this.elapsed * 4 + l.phase) * 4, 1.15, this.elapsed, l.phase);
    });

    // Sinuous ribbon connecting the 7 snake members
    g.save();
    g.strokeStyle = 'rgba(255, 210, 63, 0.45)';
    g.lineWidth = 12;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i < 7; i++) {
      const seg = this.segment(i);
      if (i === 0) g.moveTo(seg.x, seg.y);
      else g.lineTo(seg.x, seg.y);
    }
    g.stroke();
    g.restore();

    // 7 villagers in the snake chain
    for (let i = 6; i >= 0; i--) {
      const seg = this.segment(i);
      const isHead = i === 0;
      const isTail = i >= 5;
      drawPerson(g, {
        bodyColor: isHead ? '#d62828' : isTail ? '#ff8a3d' : '#e9c46a',
        hatColor: isHead ? '#ffd23f' : '#7a4b2a',
        x: seg.x,
        y: seg.y + 8,
        bob: this.elapsed * 9 + i * 0.9,
        scale: isHead ? 1.24 : 0.96,
        hatStyle: isHead ? 'nonla' : 'round',
      });
      if (isHead && this.snake.inv > 0) {
        g.strokeStyle = '#4dd2ff';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(seg.x, seg.y, 26, 0, Math.PI * 2);
        g.stroke();
      }
    }

    // Doctor
    const d = this.doctor;
    drawPerson(g, {
      bodyColor: '#2a9d8f',
      hatColor: '#1f2937',
      x: d.x,
      y: d.y + 8,
      bob: this.elapsed * 9,
      scale: 1.18,
      hitFlash: d.hitFlash > 0,
      hatStyle: 'doctor',
    });
    drawText(g, 'Thầy thuốc', d.x, d.y + 30, 13, '#99f6e4');
    if (d.stun > 0) {
      for (let k = 0; k < 3; k++) {
        const a = this.elapsed * 6 + (k * Math.PI * 2) / 3;
        g.fillStyle = '#ffd23f';
        drawStarPath(g, d.x + Math.cos(a) * 16, d.y - 36 + Math.sin(a) * 5, 4, 6, 2.5);
        g.fill();
      }
    }

    // HUD
    drawText(g, `Lồng đèn: ${this.collected}/8`, 24, 38, 22, '#ffb347', 'left', '800');
    drawText(g, `${Math.max(0, Math.ceil(this.timeLeft))}s`, WORLD_W / 2, 38, 28, this.timeLeft < 12 ? '#ff6b6b' : '#fff8eb', 'center', '800');
    const roleHint =
      this.n === 2
        ? 'P1 Rắn (WASD + Space) · P2 Thầy thuốc (↑↓←→ + Enter)'
        : this.role === 'snake'
          ? 'Bạn: RẮN · Giữ Space trườn'
          : 'Bạn: THẦY THUỐC · Space lướt';
    drawText(g, roleHint, WORLD_W - 118, 36, 15, '#e2e8f0', 'right', '600');

    drawStaminaBar(g, 24, 504, 210, 14, this.snake.stamina / 35, this.snake.ghostStamina / 35, '#4dd2ff', 'Thể lực Rắn');
    drawStaminaBar(g, WORLD_W - 234, 504, 210, 14, d.stamina / 100, d.ghostStamina / 100, '#2dd4bf', 'Thể lực Thầy thuốc');
  }
}

/* ============================================================================
   3. CƯỚP MIC REMIX (STEAL THE MIC)
   ============================================================================ */
const MIC_WW = 1600;
const MIC_WH = 800;

interface MicPlayer {
  x: number;
  y: number;
  bodyColor: string;
  hatColor: string;
  name: string;
  stun: number;
  dash: number;
  dashCd: number;
  dir: Vec2;
  flip: number;
  hitFlash: number;
}

export class MicGame implements MiniGameInstance {
  readonly id: GameId = 'mic';
  private n: 1 | 2;
  private time = 0;
  private scores: [number, number] = [0, 0];
  private players: [MicPlayer, MicPlayer];
  private mic = { x: 800, y: 400, by: -1 };
  private lyric = '';
  private lyricTimer = 0;
  private lyricOwner = 0;
  private holes: [number, number][] = [];
  private fireWalls: [number, number, number, number, number][] = [];
  private wavePhases: number[] = [];
  private waveXs: number[] = [];
  private finished = false;

  constructor(private options: GameModeOptions, private ctx: MiniGameContext) {
    this.n = options.n;
    this.players = [
      {
        x: 120,
        y: 400,
        bodyColor: '#ff4d6d',
        hatColor: '#1f2937',
        name: 'Jack 5 củ',
        stun: 0,
        dash: 0,
        dashCd: 0,
        dir: { x: 1, y: 0 },
        flip: 1,
        hitFlash: 0,
      },
      {
        x: 1480,
        y: 400,
        bodyColor: '#4d79ff',
        hatColor: '#f8fafc',
        name: 'Sơn Tùng ôm tivi',
        stun: 0,
        dash: 0,
        dashCd: 0,
        dir: { x: -1, y: 0 },
        flip: -1,
        hitFlash: 0,
      },
    ];
    this.generateObstacles();
    this.resetRound();
  }

  private generateObstacles(): void {
    this.holes = [];
    for (let i = 0; i < 5; i++) {
      let x: number;
      let y: number;
      do {
        x = randRange(380, 1220);
        y = randRange(80, 720);
      } while (Math.hypot(x - 800, y - 400) < 115);
      this.holes.push([x, y]);
    }
    this.fireWalls = [];
    for (let i = 0; i < 3; i++) {
      let x: number;
      let y: number;
      const h = randRange(110, 170);
      do {
        x = randRange(420, 1150);
        y = randRange(80, 620);
      } while (x < 860 && x + 18 > 740 && y < 460 && y + h > 340);
      this.fireWalls.push([x, y, 18, h, randRange(0, 3)]);
    }
    this.wavePhases = [randRange(0, 6), randRange(0, 6), randRange(0, 6)];
    this.waveXs = [randRange(450, 650), randRange(750, 850), randRange(950, 1150)];
  }

  private waves(): [number, number][] {
    return this.waveXs.map((x, i) => [x, computeMicWaveY(this.time, this.wavePhases[i])]);
  }

  private resetRound(): void {
    this.players.forEach((p, i) => {
      p.x = i ? 1480 : 120;
      p.y = 400;
      p.stun = 0;
      p.dash = 0;
      p.dashCd = 0;
      p.dir = { x: i ? -1 : 1, y: 0 };
    });
    this.mic = { x: 800, y: 400, by: -1 };
  }

  private respawnPlayer(idx: number): void {
    const p = this.players[idx];
    this.ctx.vfx.burst(p.x * 0.6, p.y * 0.6 + 60, '#ff6b6b', 14, 'spark');
    p.x = idx ? 1480 : 120;
    p.y = 400;
    p.hitFlash = 0.1;
    if (this.mic.by === idx) {
      this.mic.by = -1;
      this.mic.x = 800;
      this.mic.y = 400;
    }
  }

  private aiMove(): Vec2 {
    const p = this.players[1];
    const opp = this.players[0];
    let tx = this.mic.x;
    let ty = this.mic.y;
    if (this.mic.by === 1) {
      tx = MIC_WW - 100;
      ty = 400;
    } else if (this.mic.by === 0) {
      tx = opp.x;
      ty = opp.y;
    }
    let dx = tx - p.x;
    let dy = ty - p.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    for (const h of this.holes) {
      const q = Math.hypot(p.x - h[0], p.y - h[1]);
      if (q < 75) {
        dx += ((p.x - h[0]) / q) * 1.3;
        dy += ((p.y - h[1]) / q) * 1.3;
      }
    }
    const m = Math.hypot(dx, dy) || 1;
    return { x: (dx / m) * 0.9, y: (dy / m) * 0.9 };
  }

  update(dt: number, input: InputState): void {
    this.time += dt;
    this.lyricTimer = Math.max(0, this.lyricTimer - dt);

    for (let i = 0; i < 2; i++) {
      const p = this.players[i];
      const j = 1 - i;
      p.stun -= dt;
      p.dash -= dt;
      p.dashCd -= dt;
      p.hitFlash = Math.max(0, p.hitFlash - dt);
      if (p.stun > 0) continue;

      const isBot = i === 1 && this.n === 1;
      const v =
        i === 0
          ? this.n === 2
            ? input.moveVecP1()
            : input.moveVec1()
          : this.n === 2
            ? input.moveVecP2()
            : this.aiMove();

      if (v.x || v.y) {
        p.dir = { x: v.x, y: v.y };
        if (Math.abs(v.x) > 0.15) p.flip = v.x > 0 ? 1 : -1;
      }

      const dashTrig = isBot
        ? p.dashCd <= 0 && dist2(p, this.players[j]) < 240 && Math.random() < 0.03
        : this.n === 2
          ? !!input.justPressed[i ? 'Enter' : 'Space']
          : !!(input.justPressed.Space || input.justPressed.ShiftLeft || input.justPressed.Enter);

      if (dashTrig && p.dashCd <= 0) {
        p.dashCd = 1.5;
        p.dash = this.mic.by === i ? 0.13 : 0.25;
        this.ctx.audio.playDash();
        this.ctx.vfx.burst(p.x * 0.6, p.y * 0.6 + 60, p.bodyColor, 10, 'spark');
      }

      const moveDir = p.dash > 0 ? (v.x || v.y ? v : p.dir) : v;
      const speed = p.dash > 0 ? 195 * (this.mic.by === i ? 2.2 : 3.2) : 195;
      p.x = clamp(p.x + moveDir.x * speed * dt, 24, MIC_WW - 24);
      p.y = clamp(p.y + moveDir.y * speed * dt, 24, MIC_WH - 24);

      if (p.dash > 0) {
        this.ctx.vfx.afterimage(p.x * 0.6, p.y * 0.6 + 60, p.bodyColor, 14);
      }

      for (const h of this.holes) {
        if (Math.hypot(h[0] - p.x, h[1] - p.y) < 25) {
          this.respawnPlayer(i);
          this.ctx.audio.playMiss();
          break;
        }
      }

      for (const f of this.fireWalls) {
        if (
          isFireWallActive(this.time, f[4]) &&
          p.x > f[0] - 12 &&
          p.x < f[0] + f[2] + 12 &&
          p.y > f[1] - 12 &&
          p.y < f[1] + f[3] + 12
        ) {
          this.respawnPlayer(i);
          this.ctx.audio.playMiss();
          break;
        }
      }

      for (const w of this.waves()) {
        if (Math.hypot(w[0] - p.x, w[1] - p.y) < 28) {
          p.stun = 1.0;
          p.hitFlash = 0.1;
          this.ctx.audio.playStun();
          this.ctx.vfx.popup(p.x * 0.6, p.y * 0.6 + 26, 'CHOÁNG!', '#4dd2ff', 18);
          break;
        }
      }

      // Steal from carrier
      if (this.mic.by === j && dist2(p, this.players[j]) < 32 && this.players[j].stun <= 0 && p.stun <= 0) {
        this.scores[i]++;
        this.ctx.vfx.addTrauma(0.55);
        this.ctx.triggerHitstop(0.05);
        this.ctx.vfx.shockwave(p.x * 0.6, p.y * 0.6 + 60, '#ffd23f', 88, 0.36, 4);
        this.ctx.vfx.burst(p.x * 0.6, p.y * 0.6 + 60, p.bodyColor, 20, 'star');
        this.ctx.audio.playScore();
        this.lyric = `Bị chặn đứng! +1 cho ${p.name}`;
        this.lyricOwner = i;
        this.lyricTimer = 2.2;
        this.resetRound();
        this.generateObstacles();
        continue;
      }

      // Pick up center mic
      if (this.mic.by < 0 && Math.hypot(this.mic.x - p.x, this.mic.y - p.y) < 30) {
        this.mic.by = i;
        this.ctx.audio.playPickup();
        this.ctx.vfx.shockwave(p.x * 0.6, p.y * 0.6 + 60, '#ffd23f', 54, 0.28, 3);
      }

      // Deliver mic home
      if (this.mic.by === i) {
        this.mic.x = p.x;
        this.mic.y = p.y - 28;
        if (i ? p.x > MIC_WW - 150 : p.x < 150) {
          this.scores[i] += 2;
          this.lyric = i
            ? 'Hơn 10 năm rồi, STILL ON TOP OF THE GAME!'
            : 'Thiên lý ơi, em có thể chơi tốt hơn không!';
          this.lyricOwner = i;
          this.lyricTimer = 3;
          this.ctx.vfx.addTrauma(0.7);
          this.ctx.triggerHitstop(0.06);
          this.ctx.vfx.burst(p.x * 0.6, p.y * 0.6 + 60, '#ffd23f', 28, 'confetti');
          this.ctx.audio.playScore();
          this.resetRound();
          this.generateObstacles();
          continue;
        }
      }
    }

    if ((this.scores[0] >= 5 || this.scores[1] >= 5) && !this.finished) {
      this.finished = true;
      const winSide = this.scores[1] >= 5 ? 1 : 0;
      this.ctx.finishGame({
        win: this.n === 2 || winSide === 0,
        title: `${this.players[winSide].name} chiến thắng!`,
        stats: [
          { label: this.players[0].name, value: `${this.scores[0]} điểm` },
          { label: this.players[1].name, value: `${this.scores[1]} điểm` },
        ],
        winnerSide: winSide,
      });
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    g.fillStyle = '#150c26';
    g.fillRect(0, 0, WORLD_W, WORLD_H);

    g.save();
    g.translate(0, 60);
    g.scale(0.6, 0.6);

    // Stage floor
    const stageGrad = g.createLinearGradient(0, 0, MIC_WW, MIC_WH);
    stageGrad.addColorStop(0, '#2c153f');
    stageGrad.addColorStop(0.5, '#21123a');
    stageGrad.addColorStop(1, '#1a1945');
    g.fillStyle = stageGrad;
    g.fillRect(0, 0, MIC_WW, MIC_WH);

    // Beat-pulsing stage grid
    const pulseAlpha = (0.14 + 0.08 * Math.sin(this.time * 6)).toFixed(2);
    g.strokeStyle = `rgba(255, 110, 210, ${pulseAlpha})`;
    g.lineWidth = 2;
    for (let x = 0; x <= MIC_WW; x += 80) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, MIC_WH);
      g.stroke();
    }
    for (let y = 0; y <= MIC_WH; y += 80) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(MIC_WW, y);
      g.stroke();
    }

    // Team home zones
    g.fillStyle = 'rgba(255, 77, 109, 0.24)';
    g.fillRect(0, 0, 150, MIC_WH);
    g.fillStyle = 'rgba(77, 121, 255, 0.24)';
    g.fillRect(MIC_WW - 150, 0, 150, MIC_WH);

    // Stage frame
    g.strokeStyle = '#ffcf5a';
    g.lineWidth = 6;
    g.strokeRect(0, 0, MIC_WW, MIC_WH);

    // Holes
    this.holes.forEach((h) => {
      g.fillStyle = '#09040f';
      g.beginPath();
      g.arc(h[0], h[1], 27, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#9ca3af';
      g.lineWidth = 4;
      g.stroke();
    });

    // Fire walls with telegraph flicker
    this.fireWalls.forEach((f) => {
      const s = Math.sin((this.time + f[4]) * 2);
      if (s > 0) {
        g.fillStyle = '#ff6b00';
        g.fillRect(f[0], f[1], f[2], f[3]);
        g.fillStyle = '#ffd23f';
        g.fillRect(f[0] + 4, f[1] + Math.sin(this.time * 22) * 5 + 10, 10, f[3] - 20);
      } else {
        // Telegraph warning shimmer before turning active
        const warning = s > -0.35;
        g.fillStyle = warning ? 'rgba(255, 130, 30, 0.45)' : 'rgba(90, 70, 50, 0.4)';
        g.fillRect(f[0], f[1], f[2], f[3]);
      }
    });

    // Soundwave hazards
    this.waves().forEach((w) => {
      for (let k = 0; k < 3; k++) {
        g.strokeStyle = `rgba(77, 210, 255, ${(0.82 - k * 0.24).toFixed(2)})`;
        g.lineWidth = 4;
        g.beginPath();
        g.arc(w[0], w[1], 14 + k * 9 + Math.sin(this.time * 8) * 2, 0, Math.PI * 2);
        g.stroke();
      }
    });

    // Golden Mic in center
    if (this.mic.by < 0) {
      const bobY = this.mic.y + Math.sin(this.time * 5) * 6;
      const halo = g.createRadialGradient(this.mic.x, bobY, 8, this.mic.x, bobY, 55);
      halo.addColorStop(0, 'rgba(255, 210, 63, 0.65)');
      halo.addColorStop(1, 'rgba(255, 210, 63, 0)');
      g.fillStyle = halo;
      g.beginPath();
      g.arc(this.mic.x, bobY, 55, 0, Math.PI * 2);
      g.fill();
      drawBadgeEmoji(g, '🎤', this.mic.x, bobY, 54);
    }

    // Players
    this.players.forEach((p, i) => {
      drawPerson(g, {
        bodyColor: p.bodyColor,
        hatColor: p.hatColor,
        x: p.x,
        y: p.y + 16,
        bob: this.time * 9,
        flip: p.flip,
        scale: 1.9,
        hitFlash: p.hitFlash > 0,
        hatStyle: 'shades',
      });
      drawText(g, p.name, p.x, p.y + 56, 20, i === 0 ? '#fda4af' : '#93c5fd', 'center', '800');
      if (p.stun > 0) drawBadgeEmoji(g, '💫', p.x, p.y - 68, 34);
      if (this.mic.by === i) drawBadgeEmoji(g, '🎤', p.x + (i ? -32 : 32), p.y - 24, 46);
    });

    g.restore();

    // Top HUD Score & Dash Bars
    drawText(
      g,
      `${this.players[0].name}  ${this.scores[0]} : ${this.scores[1]}  ${this.players[1].name}`,
      WORLD_W / 2,
      36,
      24,
      '#fff8eb',
      'center',
      '800'
    );

    this.players.forEach((p, i) => {
      const bx = i === 0 ? 20 : WORLD_W - 220;
      const ratio = 1 - clamp(p.dashCd / 1.5, 0, 1);
      drawStaminaBar(g, bx, 18, 200, 12, ratio, ratio, '#ffd23f', `Dash ${i ? '(Enter)' : '(Space)'}`);
    });

    if (this.lyricTimer > 0) {
      drawText(g, this.lyric, WORLD_W / 2, WORLD_H - 20, 24, this.lyricOwner ? '#93c5fd' : '#fda4af', 'center', '800');
    }
  }
}

/* ============================================================================
   4. MÈO BẮT CHUỘT (CAT & MOUSE)
   ============================================================================ */
interface CatActor {
  x: number;
  y: number;
  isCat: boolean;
  speedBoost: number;
  freeze: number;
  shield: number;
  dash: number;
  dashCd: number;
  hitFlash: number;
}

export class CatGame implements MiniGameInstance {
  readonly id: GameId = 'cat';
  private n: 1 | 2;
  private timeLeft = 20;
  private elapsed = 0;
  private humanIdx: number;
  private crates: Rect[] = [
    [200, 150, 72, 42],
    [688, 150, 72, 42],
    [430, 236, 100, 58],
    [200, 360, 72, 42],
    [688, 360, 72, 42],
    [430, 418, 100, 34],
  ];
  private players: [CatActor, CatActor];
  private items: { x: number; y: number; kind: 0 | 1 | 2 }[] = [];
  private spawnTimer = 1.8;
  private finished = false;

  constructor(private options: GameModeOptions, private ctx: MiniGameContext) {
    this.n = options.n;
    this.humanIdx = options.n === 2 ? -1 : options.role === 'cat' ? 0 : 1;
    this.players = [
      { x: 120, y: 270, isCat: true, speedBoost: 0, freeze: 0, shield: 0, dash: 0, dashCd: 0, hitFlash: 0 },
      { x: 840, y: 270, isCat: false, speedBoost: 0, freeze: 0, shield: 0, dash: 0, dashCd: 0, hitFlash: 0 },
    ];
  }

  private aiDecide(p: CatActor, opp: CatActor): { v: Vec2; dash: boolean } {
    const dx = opp.x - p.x;
    const dy = opp.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (p.isCat) {
      return { v: { x: dx / d, y: dy / d }, dash: d < 155 && p.dashCd <= 0 && Math.random() < 0.03 };
    }
    let vx = -dx / d;
    let vy = -dy / d;
    if (d > 215 && this.items[0]) {
      const it = this.items[0];
      const a = Math.hypot(it.x - p.x, it.y - p.y) || 1;
      vx = (it.x - p.x) / a;
      vy = (it.y - p.y) / a;
    }
    vx += ((480 - p.x) / 480) * (Math.abs(p.x - 480) > 380 ? 2 : 0.3);
    vy += ((280 - p.y) / 280) * (Math.abs(p.y - 280) > 190 ? 2 : 0.3);
    const l = Math.hypot(vx, vy) || 1;
    return { v: { x: vx / l, y: vy / l }, dash: d < 105 && p.dashCd <= 0 && Math.random() < 0.08 };
  }

  private finish(catWon: boolean, msg: string): void {
    if (this.finished) return;
    this.finished = true;
    const win = checkCatWin(catWon, this.n, this.humanIdx);
    this.ctx.finishGame({
      win,
      title: this.n === 2 ? `${catWon ? 'MÈO (P1)' : 'CHUỘT (P2)'} THẮNG! ${msg}` : msg,
      stats: [{ label: 'Thời gian còn lại', value: `${Math.max(0, Math.ceil(this.timeLeft))}s` }],
      winnerSide: catWon ? 1 : 0,
    });
  }

  update(dt: number, input: InputState): void {
    this.timeLeft -= dt;
    this.elapsed += dt;
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0 && this.items.length < 3) {
      this.spawnTimer = 3.8;
      const x = randRange(80, WORLD_W - 80);
      const y = randRange(96, WORLD_H - 80);
      if (!this.crates.some((r) => x > r[0] - 22 && x < r[0] + r[2] + 22 && y > r[1] - 22 && y < r[1] + r[3] + 22)) {
        this.items.push({ x, y, kind: ((Math.random() * 3) | 0) as 0 | 1 | 2 });
      }
    }

    this.players.forEach((p, i) => {
      const opp = this.players[1 - i];
      p.speedBoost = Math.max(0, p.speedBoost - dt);
      p.freeze = Math.max(0, p.freeze - dt);
      p.shield = Math.max(0, p.shield - dt);
      p.dash = Math.max(0, p.dash - dt);
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.hitFlash = Math.max(0, p.hitFlash - dt);

      let v: Vec2;
      let dashTrig = false;
      if (this.n === 2) {
        v = i === 0 ? input.moveVecP1() : input.moveVecP2();
        dashTrig = !!input.justPressed[i ? 'Enter' : 'Space'];
      } else if (i === this.humanIdx) {
        v = input.moveVec1();
        dashTrig = !!(input.justPressed.Space || input.justPressed.Enter || input.justPressed.ShiftLeft);
      } else {
        const decision = this.aiDecide(p, opp);
        v = decision.v;
        dashTrig = decision.dash;
      }

      if (p.freeze > 0) return;

      if (dashTrig && p.dashCd <= 0) {
        p.dash = 0.25;
        p.dashCd = p.isCat ? 2.5 : 1.3;
        this.ctx.audio.playDash();
        this.ctx.vfx.burst(p.x, p.y, '#fff8eb', 8, 'dust');
      }

      const speed = (p.isCat ? 162 : 196) * (p.speedBoost > 0 ? 1.5 : 1) * (p.dash > 0 ? 2.4 : 1);
      resolveRectCollision(p, v.x * speed * dt, v.y * speed * dt, this.crates, 14);
      p.x = clamp(p.x, 42, WORLD_W - 42);
      p.y = clamp(p.y, 74, WORLD_H - 64);

      if (p.dash > 0) {
        this.ctx.vfx.afterimage(p.x, p.y, p.isCat ? '#ff8a3d' : '#4d79ff', 18);
      }

      this.items = this.items.filter((it) => {
        if (Math.hypot(it.x - p.x, it.y - p.y) > 26) return true;
        this.ctx.audio.playPickup();
        this.ctx.vfx.burst(it.x, it.y, '#ffd23f', 14, 'star');
        this.ctx.vfx.shockwave(it.x, it.y, '#ffd23f', 48, 0.28, 3);
        if (it.kind === 0) {
          p.speedBoost = 3;
          this.ctx.vfx.popup(p.x, p.y - 38, 'TĂNG TỐC!', '#ffd23f', 18);
        } else if (it.kind === 1) {
          if (opp.shield <= 0) {
            opp.freeze = 1.6;
            opp.hitFlash = 0.1;
            this.ctx.vfx.popup(opp.x, opp.y - 38, 'ĐÓNG BĂNG!', '#93c5fd', 18);
          }
        } else {
          p.shield = 2.5;
          this.ctx.vfx.popup(p.x, p.y - 38, 'KHIÊN!', '#5eead4', 18);
        }
        return false;
      });
    });

    const cat = this.players[0];
    const mouse = this.players[1];
    if (dist2(cat, mouse) < 25 && mouse.shield <= 0) {
      this.ctx.vfx.burst(mouse.x, mouse.y, '#ff595e', 30, 'confetti');
      this.ctx.vfx.shockwave(mouse.x, mouse.y, '#ff595e', 88, 0.4, 5);
      this.ctx.vfx.addTrauma(0.75);
      this.ctx.triggerHitstop(0.06);
      this.finish(true, 'Mèo đã tóm gọn Chuột!');
    } else if (this.timeLeft <= 0) {
      this.finish(false, 'Chuột trốn thoát thành công!');
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    // Warm wooden courtyard tiles
    g.fillStyle = '#ad7e4b';
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let x = 0; x < WORLD_W; x += 60) {
      for (let y = 60; y < WORLD_H; y += 60) {
        g.fillStyle = ((x + y) / 60) % 2 ? '#c0925c' : '#a77847';
        g.fillRect(x, y, 60, 60);
      }
    }

    // Courtyard trim
    g.strokeStyle = '#4a2b13';
    g.lineWidth = 6;
    g.strokeRect(30, 60, 900, 430);

    // 3D beveled wooden crates
    this.crates.forEach(([cx, cy, cw, ch]) => {
      g.fillStyle = 'rgba(20, 10, 5, 0.28)';
      g.fillRect(cx + 4, cy + 6, cw, ch);

      g.fillStyle = '#8b5a2b';
      g.strokeStyle = '#4a2b13';
      g.lineWidth = 3;
      g.fillRect(cx, cy, cw, ch);
      g.strokeRect(cx, cy, cw, ch);

      g.fillStyle = '#a4713f';
      g.fillRect(cx + 4, cy + 4, cw - 8, 6);

      g.beginPath();
      g.moveTo(cx + 4, cy + 4);
      g.lineTo(cx + cw - 4, cy + ch - 4);
      g.moveTo(cx + cw - 4, cy + 4);
      g.lineTo(cx + 4, cy + ch - 4);
      g.stroke();
    });

    // Power-up pickups with pulsing halos
    this.items.forEach((it) => {
      const bobY = it.y + Math.sin(this.elapsed * 5 + it.x) * 4;
      const glowCols = ['#ffd23f', '#7dd3fc', '#5eead4'];
      g.fillStyle = glowCols[it.kind] + '44';
      g.beginPath();
      g.arc(it.x, bobY, 20 + Math.sin(this.elapsed * 6) * 3, 0, Math.PI * 2);
      g.fill();
      drawBadgeEmoji(g, ['⚡', '❄️', '🛡️'][it.kind], it.x, bobY, 26);
    });

    // Cat & Mouse actors
    this.players.forEach((p) => {
      g.fillStyle = 'rgba(15, 8, 18, 0.35)';
      g.beginPath();
      g.ellipse(p.x, p.y + 22, 22, 8, 0, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = p.hitFlash > 0 ? '#ffffff' : p.isCat ? '#ff8a3d' : '#4d79ff';
      g.strokeStyle = '#fff8eb';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(p.x, p.y, 26, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      drawBadgeEmoji(g, p.isCat ? '🐱' : '🐭', p.x, p.y + 2, 36);
      drawText(g, p.isCat ? 'MÈO' : 'CHUỘT', p.x, p.y - 34, 14, '#fff8eb', 'center', '800');

      if (p.shield > 0) {
        g.strokeStyle = '#5eead4';
        g.lineWidth = 3.5;
        g.beginPath();
        g.arc(p.x, p.y, 32, 0, Math.PI * 2);
        g.stroke();
      }
      if (p.freeze > 0) {
        g.fillStyle = 'rgba(147, 197, 253, 0.38)';
        g.beginPath();
        g.arc(p.x, p.y, 29, 0, Math.PI * 2);
        g.fill();
        drawBadgeEmoji(g, '❄️', p.x, p.y - 26, 22);
      }
      if (p.speedBoost > 0) drawBadgeEmoji(g, '⚡', p.x + 22, p.y - 22, 18);
    });

    // Final 5s urgency border pulse
    if (this.timeLeft <= 5 && this.timeLeft > 0) {
      const pulse = (0.12 + 0.12 * Math.sin(this.elapsed * 12)).toFixed(2);
      g.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
      g.lineWidth = 14;
      g.strokeRect(7, 7, WORLD_W - 14, WORLD_H - 14);
    }

    // HUD
    drawText(g, `${Math.max(0, Math.ceil(this.timeLeft))}s`, WORLD_W / 2, 38, 32, this.timeLeft < 6 ? '#ff6b6b' : '#fff8eb', 'center', '800');
    drawText(
      g,
      this.n === 2 ? 'P1 Mèo (Space) · P2 Chuột (Enter)' : this.humanIdx === 0 ? 'Bạn: MÈO' : 'Bạn: CHUỘT',
      24,
      36,
      18,
      '#fff8eb',
      'left',
      '700'
    );

    this.players.forEach((p, i) => {
      const bx = i ? WORLD_W - 224 : 24;
      const maxCd = p.isCat ? 2.5 : 1.3;
      const ratio = 1 - clamp(p.dashCd / maxCd, 0, 1);
      drawStaminaBar(g, bx, 504, 200, 14, ratio, ratio, '#ffd23f', `${p.isCat ? 'Mèo' : 'Chuột'} · Dash`);
    });
  }
}

/* ============================================================================
   5. ANIMATED ENDING CUTSCENE (3 seconds per game)
   ============================================================================ */
export function drawEndingScene(
  g: CanvasRenderingContext2D,
  gameId: GameId,
  winnerSide: number,
  win: boolean,
  e: number
): void {
  const jump = (i: number) => Math.abs(Math.sin(e * 6.5 + i)) * 48;

  g.fillStyle = `rgba(14, 6, 24, ${Math.min(0.94, e * 1.6)})`;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  const spot = g.createRadialGradient(480, 320, 20, 480, 320, 390);
  spot.addColorStop(0, 'rgba(255, 220, 120, 0.32)');
  spot.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = spot;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  let lines: [string, string] = ['', ''];

  if (gameId === 'tug') {
    for (let i = 0; i < 3; i++) {
      drawPerson(g, {
        bodyColor: winnerSide ? '#3b82f6' : '#d94f4f',
        hatColor: '#f2c14e',
        x: 270 + i * 85,
        y: 410 - jump(i),
        scale: 1.85,
        hatStyle: 'nonla',
      });
      drawPerson(g, {
        bodyColor: winnerSide ? '#d94f4f' : '#3b82f6',
        hatColor: '#f8fafc',
        x: 650 + i * 70,
        y: 430,
        scale: 1.25,
        hatStyle: 'round',
      });
      drawBadgeEmoji(g, '😵', 650 + i * 70, 355, 24);
    }
    lines = [`ĐỘI ${winnerSide ? 'XANH' : 'ĐỎ'} GIÀNH CHIẾN THẮNG!`, 'Dây thừng rung lên, cả hội làng reo hò vang dội.'];
  } else if (gameId === 'snake') {
    if (winnerSide) {
      for (let i = 0; i < 7; i++) {
        drawPerson(g, {
          bodyColor: i === 0 ? '#d62828' : i > 4 ? '#ff8a3d' : '#e9c46a',
          hatColor: '#7a4b2a',
          x: ((e * 150 + i * 54) % 1100) - 80,
          y: 405 + Math.sin(e * 8 + i) * 8,
          scale: 1.45,
          hatStyle: 'nonla',
        });
      }
      for (let i = 0; i < 8; i++) {
        drawLantern(g, 115 + i * 104, 330 - ((e * 60 + i * 37) % 200), 1.35, e, i);
      }
      lines = ['Rồng rắn lên mây!', 'Cả đoàn về đủ, lồng đèn sáng rực bầu trời đêm hội.'];
    } else {
      drawPerson(g, {
        bodyColor: '#2a9d8f',
        hatColor: '#1f2937',
        x: 330,
        y: 420,
        bob: e * 8,
        scale: 2.4,
        hatStyle: 'doctor',
      });
      for (let i = 0; i < 2; i++) {
        drawPerson(g, {
          bodyColor: '#ff8a3d',
          hatColor: '#7a4b2a',
          x: 570 + i * 80,
          y: 425,
          flip: -1,
          scale: 1.55,
        });
      }
      drawText(g, '"Đuôi rồng rắn đây rồi!"', 480, 228, 26, '#99f6e4');
      lines = ['Thầy thuốc giành chiến thắng!', 'Rồng rắn chưa kịp lên mây...'];
    }
  } else if (gameId === 'mic') {
    g.fillStyle = 'rgba(255, 255, 255, 0.08)';
    g.beginPath();
    g.moveTo(480, 0);
    g.lineTo(290, 540);
    g.lineTo(670, 540);
    g.closePath();
    g.fill();

    drawPerson(g, {
      bodyColor: winnerSide ? '#4d79ff' : '#ff4d6d',
      hatColor: winnerSide ? '#f8fafc' : '#1f2937',
      x: 480,
      y: 430 - jump(0),
      scale: 2.5,
      hatStyle: 'shades',
    });
    drawBadgeEmoji(g, '🎤', 548, 342 - jump(0), 50);
    drawPerson(g, { bodyColor: winnerSide ? '#ff4d6d' : '#4d79ff', hatColor: '#1f2937', x: 185, y: 455, scale: 1.35, hatStyle: 'shades' });
    drawPerson(g, { bodyColor: winnerSide ? '#ff4d6d' : '#4d79ff', hatColor: '#1f2937', x: 775, y: 455, flip: -1, scale: 1.35, hatStyle: 'shades' });

    lines = [
      `${winnerSide ? 'Sơn Tùng ôm tivi' : 'Jack 5 củ'} lên ngôi!`,
      winnerSide ? '"Hơn 10 năm rồi, STILL ON TOP OF THE GAME!"' : '"Thiên lý ơi, em có thể chơi tốt hơn không!"',
    ];
  } else {
    if (winnerSide) {
      drawBadgeEmoji(g, '🐱', 400, 380, 126);
      drawBadgeEmoji(g, '🐭', 575, 428, 68 + Math.sin(e * 10) * 6);
      lines = ['Meo! Chú Mèo tóm gọn chú Chuột.', 'Cả sân hội làng ồ lên một tiếng vang dội.'];
    } else {
      drawBadgeEmoji(g, '🐭', 475, 380, 118 + Math.sin(e * 8) * 8);
      drawBadgeEmoji(g, '🧀', 610, 420, 62);
      drawBadgeEmoji(g, '😵', 320, 428, 86);
      lines = ['Chuột nhắt thoát nạn ngoạn mục!', 'Mèo hụt mất bữa, Chuột mở tiệc phô mai.'];
    }
  }

  if (win) {
    for (let i = 0; i < 48; i++) {
      g.fillStyle = ['#ffd23f', '#ff4d6d', '#4dd2ff', '#7dffb0'][i % 4];
      g.fillRect((i * 97 + Math.sin(e * 3 + i) * 32) % WORLD_W, (e * 145 + i * 61) % WORLD_H, 8, 5);
    }
  }

  drawText(g, lines[0], 480, 84, 34, '#ffcf5a', 'center', '800');
  drawText(g, lines[1], 480, 128, 19, '#fff8eb', 'center', '600');
  drawText(g, 'Enter / chạm để tiếp tục', WORLD_W - 24, WORLD_H - 18, 14, '#cbd5e1', 'right', '600');
}
