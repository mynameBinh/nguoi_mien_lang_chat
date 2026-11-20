import {
  clamp,
  NPCS,
  randRange,
  resolveRectCollision,
  WORLD_H,
  WORLD_W,
} from './rules';
import type { GameId, Rect, Vec2 } from './types';
import { drawLantern, drawPerson, drawText, VfxManager } from './vfx';

interface HouseSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  wallColor: string;
  roofColor: string;
}

interface TreeSpec {
  x: number;
  y: number;
  r: number;
  phase: number;
}

interface VillageNpc {
  id: GameId;
  name: string;
  subtitle: string;
  bodyColor: string;
  hatColor: string;
  accentColor: string;
  x: number;
  y: number;
  hatStyle: 'nonla' | 'round' | 'shades' | 'doctor';
}

interface AmbientFirefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
}

function createOffscreen(
  w: number,
  h: number,
  drawFn: (ctx: CanvasRenderingContext2D) => void,
  willReadFrequently = false
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently });
  if (ctx) drawFn(ctx);
  return c;
}

let cachedTitleSky: HTMLCanvasElement | null = null;
function getTitleSky(): HTMLCanvasElement {
  if (cachedTitleSky) return cachedTitleSky;
  cachedTitleSky = createOffscreen(WORLD_W, WORLD_H, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, WORLD_H);
    sky.addColorStop(0, '#1a1033');
    sky.addColorStop(0.45, '#64244d');
    sky.addColorStop(0.78, '#d9534f');
    sky.addColorStop(1, '#f4a261');
    g.fillStyle = sky;
    g.fillRect(0, 0, WORLD_W, WORLD_H);
  });
  return cachedTitleSky;
}

let cachedMoonSprite: HTMLCanvasElement | null = null;
function getMoonSprite(): HTMLCanvasElement {
  if (cachedMoonSprite) return cachedMoonSprite;
  const size = 340;
  const c = createOffscreen(size, size, (ctx) => {
    const cx = size / 2;
    const cy = size / 2;
    const halo = ctx.createRadialGradient(cx, cy, 35, cx, cy, 165);
    halo.addColorStop(0, 'rgba(255, 236, 179, 0.5)');
    halo.addColorStop(0.5, 'rgba(255, 168, 92, 0.16)');
    halo.addColorStop(1, 'rgba(255, 168, 92, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 165, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffe599';
    ctx.beginPath();
    ctx.arc(cx, cy, 64, 0, Math.PI * 2);
    ctx.fill();
  });
  cachedMoonSprite = c;
  return c;
}

export function drawTitleBackdrop(g: CanvasRenderingContext2D, t: number): void {
  g.drawImage(getTitleSky(), 0, 0);

  // Subtle twinkling stars in upper sky
  for (let i = 0; i < 65; i++) {
    const sx = (i * 151 + 29) % WORLD_W;
    const sy = (i * 67 + 17) % 210;
    const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.1 + i * 1.3));
    g.fillStyle = `rgba(255, 245, 215, ${alpha.toFixed(2)})`;
    g.fillRect(sx, sy, i % 5 === 0 ? 2.5 : 1.6, i % 5 === 0 ? 2.5 : 1.6);
  }

  // Glowing harvest moon on right side (cached smooth radial halo)
  const moonX = 725;
  const moonY = 230 + Math.sin(t * 0.45) * 4;
  const moon = getMoonSprite();
  g.drawImage(moon, moonX - moon.width / 2, moonY - moon.height / 2);

  // Parallax mountain ridges
  const layers: [string, number, number, number][] = [
    ['#5c2d5c', 318, 0.16, 26],
    ['#3d1d47', 376, 0.34, 22],
    ['#231130', 435, 0.62, 16],
  ];
  layers.forEach(([col, baseY, speed, amp], k) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, WORLD_H);
    for (let x = 0; x <= WORLD_W; x += 18) {
      const y = baseY + Math.sin(x * 0.0085 + k * 2.1 + t * speed * 0.28) * amp;
      g.lineTo(x, y);
    }
    g.lineTo(WORLD_W, WORLD_H);
    g.closePath();
    g.fill();
  });

  // Village roof silhouettes on right horizon
  g.fillStyle = '#180c24';
  g.beginPath();
  g.moveTo(570, 442);
  g.lineTo(635, 405);
  g.lineTo(700, 442);
  g.lineTo(700, 475);
  g.lineTo(570, 475);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255, 198, 92, 0.72)';
  g.fillRect(624, 448, 22, 18);

  // Floating festival lanterns (concentrated toward center-right to preserve left calm space)
  for (let i = 0; i < 14; i++) {
    const lx = ((i * 113 + 380 + Math.sin(t * 0.8 + i) * 22) % (WORLD_W - 40)) + 20;
    const ly = WORLD_H - ((t * 22 + i * 79) % (WORLD_H + 60));
    const scale = 0.65 + (i % 3) * 0.22;
    drawLantern(g, lx, ly, scale, t, i);
  }

  // Foreground village courtyard strip
  g.fillStyle = '#14091e';
  g.fillRect(0, 472, WORLD_W, 68);
  g.strokeStyle = 'rgba(255, 195, 77, 0.22)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, 472);
  g.lineTo(WORLD_W, 472);
  g.stroke();

  // Animated festival villagers on the right foreground
  const crowd: { body: string; hat: string; x: number; style: 'nonla' | 'round' | 'shades' | 'doctor' }[] = [
    { body: '#d94f4f', hat: '#f2c14e', x: 540, style: 'nonla' },
    { body: '#4f9d69', hat: '#f8fafc', x: 625, style: 'doctor' },
    { body: '#a35fd9', hat: '#1f2937', x: 710, style: 'shades' },
    { body: '#e0a030', hat: '#7a4b2a', x: 795, style: 'round' },
    { body: '#2b8cff', hat: '#f2c14e', x: 880, style: 'nonla' },
  ];
  crowd.forEach((c, i) => {
    drawPerson(g, {
      bodyColor: c.body,
      hatColor: c.hat,
      x: c.x,
      y: 506,
      bob: t * 5.2 + i * 1.1,
      flip: i % 2 === 0 ? 1 : -1,
      scale: 1.18,
      hatStyle: c.style,
    });
  });
}

export class VillageScene {
  private bgCanvas!: HTMLCanvasElement;
  private houses: HouseSpec[] = [];
  private trees: TreeSpec[] = [];
  private npcs: VillageNpc[] = [];
  private fireflies: AmbientFirefly[] = [];
  private player: Vec2 = { x: 480, y: 300 };
  private playerFlip = 1;
  private walkDist = 0;
  private squashX = 1;
  private squashY = 1;
  private dustTimer = 0;
  private time = 0;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.generateVillage();

    const npcPositions: Vec2[] = [];
    for (let k = 0; k < 800 && npcPositions.length < 4; k++) {
      const x = randRange(75, WORLD_W - 75);
      const y = randRange(95, WORLD_H - 65);
      const blockedByHouse = this.houses.some(
        (h) => x > h.x - 36 && x < h.x + h.w + 36 && y > h.y - 58 && y < h.y + h.h + 44
      );
      if (blockedByHouse) continue;
      if (this.trees.some((tr) => Math.hypot(tr.x - x, tr.y - y) < tr.r + 28)) continue;
      if (Math.hypot(x - 480, y - 300) < 130) continue;
      if (x < 395 && y < 130) continue;
      if (npcPositions.some((q) => Math.hypot(q.x - x, q.y - y) < 175)) continue;
      npcPositions.push({ x, y });
    }
    while (npcPositions.length < 4) {
      npcPositions.push({ x: 140 + npcPositions.length * 220, y: WORLD_H - 65 });
    }

    const styles: ('nonla' | 'doctor' | 'shades' | 'round')[] = ['nonla', 'doctor', 'shades', 'round'];
    this.npcs = NPCS.map((n, i) => ({
      ...n,
      x: npcPositions[i].x,
      y: npcPositions[i].y,
      hatStyle: styles[i],
    }));

    this.fireflies = Array.from({ length: 28 }, () => ({
      x: randRange(20, WORLD_W - 20),
      y: randRange(40, WORLD_H - 30),
      vx: randRange(-14, 14),
      vy: randRange(-10, 10),
      phase: randRange(0, Math.PI * 2),
      size: randRange(1.6, 3.2),
    }));
  }

  private generateVillage(): void {
    const roadMask = createOffscreen(WORLD_W, WORLD_H, (ctx) => {
      ctx.strokeStyle = '#000';
      ctx.lineCap = 'round';
      ctx.lineWidth = 58;
      ctx.beginPath();
      ctx.moveTo(-20, randRange(190, 380));
      ctx.bezierCurveTo(
        randRange(210, 390),
        randRange(110, 430),
        randRange(560, 790),
        randRange(110, 430),
        WORLD_W + 20,
        randRange(190, 380)
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(randRange(280, 680), -20);
      ctx.bezierCurveTo(
        randRange(180, 780),
        randRange(110, 240),
        randRange(180, 780),
        randRange(300, 440),
        randRange(280, 680),
        WORLD_H + 20
      );
      ctx.stroke();
    }, true);

    const rx = roadMask.getContext('2d', { willReadFrequently: true })!;
    const roadPixels = rx.getImageData(0, 0, WORLD_W, WORLD_H).data;
    const isRoad = (a: number, b: number) => {
      const px = clamp(a, 0, WORLD_W - 1) | 0;
      const py = clamp(b, 0, WORLD_H - 1) | 0;
      return roadPixels[(py * WORLD_W + px) * 4 + 3] > 0;
    };

    const wallPalette = ['#d8a472', '#e0b384', '#c9905f', '#e3bd91'];
    const roofPalette = ['#b83b36', '#335c81', '#7d4e2d', '#4f7745'];
    const houses: HouseSpec[] = [];

    for (let k = 0; k < 550 && houses.length < 7; k++) {
      const w = randRange(92, 128);
      const h = randRange(62, 80);
      const x = randRange(24, WORLD_W - w - 24);
      const y = randRange(64, WORLD_H - h - 26);

      if (x < 390 && y < 126) continue;
      if (Math.abs(x + w / 2 - 480) < w / 2 + 86 && Math.abs(y + h / 2 - 300) < h / 2 + 86) continue;
      if (
        houses.some(
          (o) => x < o.x + o.w + 34 && x + w + 34 > o.x && y < o.y + o.h + 52 && y + h + 34 > o.y
        )
      ) {
        continue;
      }
      const probePoints: [number, number][] = [
        [x - 8, y - 8],
        [x + w + 8, y - 8],
        [x - 8, y + h + 8],
        [x + w + 8, y + h + 8],
        [x + w / 2, y + h / 2],
        [x + w / 2, y + h + 14],
        [x + w / 2, y - 8],
      ];
      if (probePoints.some(([px, py]) => isRoad(px, py))) continue;

      houses.push({
        x,
        y,
        w,
        h,
        wallColor: wallPalette[houses.length % wallPalette.length],
        roofColor: roofPalette[houses.length % roofPalette.length],
      });
    }
    this.houses = houses;

    const trees: TreeSpec[] = [];
    for (let k = 0; k < 420 && trees.length < 15; k++) {
      const tx = randRange(24, WORLD_W - 24);
      const ty = randRange(66, WORLD_H - 32);
      if (
        houses.some((o) => tx > o.x - 34 && tx < o.x + o.w + 34 && ty > o.y - 54 && ty < o.y + o.h + 40) ||
        isRoad(tx, ty) ||
        isRoad(tx, ty + 24) ||
        Math.hypot(tx - 480, ty - 300) < 76 ||
        (tx < 395 && ty < 120) ||
        trees.some((tr) => Math.hypot(tr.x - tx, tr.y - ty) < 48)
      ) {
        continue;
      }
      trees.push({ x: tx, y: ty, r: randRange(18, 24), phase: randRange(0, Math.PI * 2) });
    }
    this.trees = trees;

    // Render static terrain + paths + houses onto cached offscreen layer
    this.bgCanvas = createOffscreen(WORLD_W, WORLD_H, (ctx) => {
      const grass = ctx.createLinearGradient(0, 0, 0, WORLD_H);
      grass.addColorStop(0, '#74ba58');
      grass.addColorStop(1, '#4c8e3d');
      ctx.fillStyle = grass;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);

      // Subtle meadow grass tufts & wildflowers
      for (let i = 0; i < 190; i++) {
        const fx = randRange(10, WORLD_W - 10);
        const fy = randRange(10, WORLD_H - 10);
        ctx.fillStyle = i % 4 === 0 ? '#fff3b0' : i % 4 === 1 ? '#ffd23f' : i % 4 === 2 ? '#ff8fab' : '#8fd66f';
        ctx.beginPath();
        ctx.arc(fx, fy, i % 4 === 3 ? 2.4 : 1.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Village dirt road with outer curb & pebble speckles
      ctx.save();
      ctx.shadowColor = 'rgba(20, 40, 12, 0.35)';
      ctx.shadowBlur = 12;
      ctx.drawImage(
        createOffscreen(WORLD_W, WORLD_H, (y) => {
          y.drawImage(roadMask, 0, 0);
          y.globalCompositeOperation = 'source-in';
          y.fillStyle = '#cfb07a';
          y.fillRect(0, 0, WORLD_W, WORLD_H);
        }),
        0,
        0
      );
      ctx.restore();

      // Inner warm road highlight
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.drawImage(
        createOffscreen(WORLD_W, WORLD_H, (y) => {
          y.drawImage(roadMask, 0, 0);
          y.globalCompositeOperation = 'source-in';
          y.fillStyle = '#e5cba0';
          y.fillRect(0, 0, WORLD_W, WORLD_H);
        }),
        0,
        0
      );
      ctx.restore();

      // Center festival courtyard ring
      ctx.fillStyle = 'rgba(232, 200, 148, 0.48)';
      ctx.beginPath();
      ctx.ellipse(480, 300, 68, 46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(139, 90, 43, 0.32)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw houses sorted by Y
      [...houses]
        .sort((a, b) => a.y - b.y)
        .forEach((h) => {
          // Ground shadow
          ctx.fillStyle = 'rgba(14, 24, 10, 0.28)';
          ctx.beginPath();
          ctx.ellipse(h.x + h.w / 2, h.y + h.h + 2, h.w / 2 + 10, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          // Wall
          ctx.fillStyle = h.wallColor;
          ctx.strokeStyle = '#4a2b14';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(h.x, h.y, h.w, h.h, 4);
          ctx.fill();
          ctx.stroke();

          // Timber pillars
          ctx.fillStyle = '#5c361a';
          ctx.fillRect(h.x + 3, h.y, 4, h.h);
          ctx.fillRect(h.x + h.w - 7, h.y, 4, h.h);

          // Door & glowing warm windows
          ctx.fillStyle = '#4f2c15';
          ctx.beginPath();
          ctx.roundRect(h.x + h.w / 2 - 11, h.y + h.h - 33, 22, 33, [4, 4, 0, 0]);
          ctx.fill();

          ctx.fillStyle = '#ffe599';
          ctx.strokeStyle = '#5c361a';
          ctx.lineWidth = 2;
          [h.x + 11, h.x + h.w - 29].forEach((wx) => {
            ctx.fillRect(wx, h.y + 18, 18, 18);
            ctx.strokeRect(wx, h.y + 18, 18, 18);
          });

          // Curved Vietnamese tiled roof
          ctx.fillStyle = h.roofColor;
          ctx.strokeStyle = '#33180b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(h.x - 11, h.y + 5);
          ctx.quadraticCurveTo(h.x + h.w * 0.25, h.y - 12, h.x + h.w / 2, h.y - 38);
          ctx.quadraticCurveTo(h.x + h.w * 0.75, h.y - 12, h.x + h.w + 11, h.y + 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Roof ridge cap
          ctx.fillStyle = '#f2c14e';
          ctx.beginPath();
          ctx.arc(h.x + h.w / 2, h.y - 38, 4, 0, Math.PI * 2);
          ctx.fill();
        });
    });
  }

  getNearestNpc(): VillageNpc | null {
    return this.npcs.find((n) => Math.hypot(n.x - this.player.x, n.y - this.player.y) < 62) ?? null;
  }

  update(dt: number, moveVec: Vec2, vfx: VfxManager): void {
    this.time += dt;

    // Ambient firefly drift
    for (const f of this.fireflies) {
      f.x += (f.vx + Math.sin(this.time + f.phase) * 8) * dt;
      f.y += (f.vy + Math.cos(this.time * 0.8 + f.phase) * 6) * dt;
      if (f.x < 10) f.x = WORLD_W - 10;
      if (f.x > WORLD_W - 10) f.x = 10;
      if (f.y < 20) f.y = WORLD_H - 20;
      if (f.y > WORLD_H - 20) f.y = 20;
    }

    const houseRects: Rect[] = this.houses.map((h) => [h.x, h.y + 10, h.w, h.h - 10]);
    const speed = 185;
    const prevX = this.player.x;
    const prevY = this.player.y;
    resolveRectCollision(this.player, moveVec.x * speed * dt, moveVec.y * speed * dt, houseRects, 12);
    this.player.x = clamp(this.player.x, 22, WORLD_W - 22);
    this.player.y = clamp(this.player.y, 44, WORLD_H - 26);

    const moved = Math.hypot(this.player.x - prevX, this.player.y - prevY);
    if (moved > 0.2) {
      this.walkDist += moved * 0.14;
      if (Math.abs(moveVec.x) > 0.15) {
        this.playerFlip = moveVec.x > 0 ? 1 : -1;
      }
      this.squashX = 1.04;
      this.squashY = 0.96;
      this.dustTimer -= dt;
      if (this.dustTimer <= 0) {
        this.dustTimer = 0.14;
        vfx.spawnDirectionalDust(this.player.x, this.player.y + 4, -moveVec.x * 24, -moveVec.y * 24);
      }
    } else {
      this.squashX += (1 - this.squashX) * Math.min(1, dt * 14);
      this.squashY += (1 - this.squashY) * Math.min(1, dt * 14);
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    g.drawImage(this.bgCanvas, 0, 0);

    // Draw glowing ground ring under each NPC (brighter when player is near)
    const near = this.getNearestNpc();
    for (const n of this.npcs) {
      const isNear = near?.id === n.id;
      const pulse = 1 + Math.sin(this.time * 4.5) * 0.08;
      g.save();
      g.strokeStyle = isNear ? '#ffd23f' : 'rgba(255, 232, 160, 0.35)';
      g.lineWidth = isNear ? 3 : 1.5;
      g.fillStyle = isNear ? 'rgba(255, 210, 63, 0.16)' : 'rgba(255, 255, 255, 0.04)';
      g.beginPath();
      g.ellipse(n.x, n.y + 6, 26 * pulse, 12 * pulse, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.restore();
    }

    // Y-sort NPCs, Player, and Swaying Trees
    const renderables: { y: number; render: () => void }[] = [];

    for (const tr of this.trees) {
      renderables.push({
        y: tr.y + 18,
        render: () => {
          const sway = Math.sin(this.time * 1.6 + tr.phase) * 2.2;
          // Shadow
          g.fillStyle = 'rgba(10, 22, 8, 0.25)';
          g.beginPath();
          g.ellipse(tr.x, tr.y + 24, tr.r * 0.9, 6, 0, 0, Math.PI * 2);
          g.fill();
          // Trunk
          g.fillStyle = '#5a3a1e';
          g.fillRect(tr.x - 4, tr.y, 8, 25);
          // Canopy layers
          g.fillStyle = '#236429';
          g.beginPath();
          g.arc(tr.x + sway * 0.5, tr.y - 2, tr.r, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#33883b';
          g.beginPath();
          g.arc(tr.x - 4 + sway, tr.y - 7, tr.r * 0.72, 0, Math.PI * 2);
          g.fill();
        },
      });
    }

    for (const n of this.npcs) {
      const isNear = near?.id === n.id;
      renderables.push({
        y: n.y,
        render: () => {
          drawPerson(g, {
            bodyColor: n.bodyColor,
            hatColor: n.hatColor,
            x: n.x,
            y: n.y,
            bob: this.time * 3.2 + n.x * 0.05,
            scale: isNear ? 1.08 : 1,
            hatStyle: n.hatStyle,
          });
          drawText(g, n.name, n.x, n.y + 22, 13, isNear ? '#ffe066' : '#fff8eb');
          const markerY = n.y - 48 + Math.sin(this.time * 5 + n.x) * 3.5;
          // Floating festival badge
          g.fillStyle = isNear ? '#ffd23f' : 'rgba(26, 12, 34, 0.85)';
          g.strokeStyle = isNear ? '#5a1e1e' : '#ffd23f';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(n.x, markerY - 5, 11, 0, Math.PI * 2);
          g.fill();
          g.stroke();
          drawText(g, '!', n.x, markerY, 15, isNear ? '#3a1520' : '#ffd23f', 'center', '800');
        },
      });
    }

    renderables.push({
      y: this.player.y,
      render: () => {
        drawPerson(g, {
          bodyColor: '#2b8cff',
          hatColor: '#f2c14e',
          x: this.player.x,
          y: this.player.y,
          bob: this.walkDist,
          flip: this.playerFlip,
          squashX: this.squashX,
          squashY: this.squashY,
          hatStyle: 'nonla',
        });
        drawText(g, 'Bạn', this.player.x, this.player.y + 22, 13, '#bae6fd');
      },
    });

    renderables.sort((a, b) => a.y - b.y);
    renderables.forEach((item) => item.render());

    // House eaves lanterns
    this.houses.forEach((h, idx) => {
      drawLantern(g, h.x + h.w / 2, h.y + 10, 0.45, this.time, idx);
    });

    // Ambient golden fireflies
    for (const f of this.fireflies) {
      const glow = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.time * 3.5 + f.phase));
      g.fillStyle = `rgba(255, 224, 120, ${(glow * 0.8).toFixed(2)})`;
      g.beginPath();
      g.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      g.fill();
    }
  }
}
