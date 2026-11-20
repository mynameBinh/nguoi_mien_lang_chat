import { randRange } from './rules';

export type ParticleKind = 'spark' | 'dust' | 'confetti' | 'star' | 'petal';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: ParticleKind;
  rot: number;
  vrot: number;
  gravity: number;
}

interface Shockwave {
  active: boolean;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  maxR: number;
  color: string;
  lineWidth: number;
}

interface FloatingPopup {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
}

interface Afterimage {
  active: boolean;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

const MAX_PARTICLES = 420;
const MAX_SHOCKWAVES = 40;
const MAX_POPUPS = 32;
const MAX_AFTERIMAGES = 64;

export class VfxManager {
  private particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    size: 4,
    color: '#fff',
    kind: 'spark',
    rot: 0,
    vrot: 0,
    gravity: 0,
  }));
  private pCursor = 0;

  private waves: Shockwave[] = Array.from({ length: MAX_SHOCKWAVES }, () => ({
    active: false,
    x: 0,
    y: 0,
    life: 0,
    maxLife: 0.4,
    maxR: 60,
    color: '#fff',
    lineWidth: 4,
  }));
  private wCursor = 0;

  private popups: FloatingPopup[] = Array.from({ length: MAX_POPUPS }, () => ({
    active: false,
    x: 0,
    y: 0,
    vy: -40,
    life: 0,
    maxLife: 0.7,
    text: '',
    color: '#fff',
    size: 20,
  }));
  private popCursor = 0;

  private trails: Afterimage[] = Array.from({ length: MAX_AFTERIMAGES }, () => ({
    active: false,
    x: 0,
    y: 0,
    life: 0,
    maxLife: 0.25,
    color: '#fff',
    radius: 14,
  }));
  private tCursor = 0;

  trauma = 0;

  clear(): void {
    this.particles.forEach((p) => (p.active = false));
    this.waves.forEach((w) => (w.active = false));
    this.popups.forEach((p) => (p.active = false));
    this.trails.forEach((t) => (t.active = false));
    this.trauma = 0;
  }

  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  getShakeOffset(): { x: number; y: number } {
    if (this.trauma <= 0.005) return { x: 0, y: 0 };
    const mag = this.trauma * this.trauma * 14;
    return {
      x: (Math.random() * 2 - 1) * mag,
      y: (Math.random() * 2 - 1) * mag,
    };
  }

  burst(
    x: number,
    y: number,
    color: string,
    count = 12,
    kind: ParticleKind = 'spark',
    speedMin = 45,
    speedMax = 210
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.pCursor];
      this.pCursor = (this.pCursor + 1) % MAX_PARTICLES;
      const a = randRange(0, Math.PI * 2);
      const s = randRange(speedMin, speedMax);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - (kind === 'confetti' ? 60 : 0);
      p.maxLife = randRange(0.35, 0.85);
      p.life = p.maxLife;
      p.size = kind === 'dust' ? randRange(4, 9) : randRange(3, 6.5);
      p.color = color;
      p.kind = kind;
      p.rot = randRange(0, Math.PI * 2);
      p.vrot = randRange(-7, 7);
      p.gravity = kind === 'confetti' ? 220 : kind === 'dust' ? -25 : 90;
    }
  }

  spawnDirectionalDust(x: number, y: number, vx: number, vy: number, color = 'rgba(255,244,214,0.65)'): void {
    const p = this.particles[this.pCursor];
    this.pCursor = (this.pCursor + 1) % MAX_PARTICLES;
    p.active = true;
    p.x = x + randRange(-5, 5);
    p.y = y + randRange(-3, 3);
    p.vx = vx + randRange(-18, 18);
    p.vy = vy + randRange(-18, 10);
    p.maxLife = randRange(0.24, 0.42);
    p.life = p.maxLife;
    p.size = randRange(4, 8);
    p.color = color;
    p.kind = 'dust';
    p.rot = 0;
    p.vrot = 0;
    p.gravity = -18;
  }

  shockwave(x: number, y: number, color: string, maxR = 72, maxLife = 0.36, lineWidth = 4): void {
    const w = this.waves[this.wCursor];
    this.wCursor = (this.wCursor + 1) % MAX_SHOCKWAVES;
    w.active = true;
    w.x = x;
    w.y = y;
    w.life = maxLife;
    w.maxLife = maxLife;
    w.maxR = maxR;
    w.color = color;
    w.lineWidth = lineWidth;
  }

  popup(x: number, y: number, text: string, color = '#ffe66d', size = 22): void {
    const p = this.popups[this.popCursor];
    this.popCursor = (this.popCursor + 1) % MAX_POPUPS;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vy = -52;
    p.maxLife = 0.72;
    p.life = p.maxLife;
    p.text = text;
    p.color = color;
    p.size = size;
  }

  afterimage(x: number, y: number, color: string, radius = 15): void {
    const t = this.trails[this.tCursor];
    this.tCursor = (this.tCursor + 1) % MAX_AFTERIMAGES;
    t.active = true;
    t.x = x;
    t.y = y;
    t.maxLife = 0.24;
    t.life = t.maxLife;
    t.color = color;
    t.radius = radius;
  }

  update(dt: number): void {
    this.trauma = Math.max(0, this.trauma - dt * 2.4);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.vx *= 1 - Math.min(0.5, dt * 1.8);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
    }

    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const w = this.waves[i];
      if (!w.active) continue;
      w.life -= dt;
      if (w.life <= 0) w.active = false;
    }

    for (let i = 0; i < MAX_POPUPS; i++) {
      const p = this.popups[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.y += p.vy * dt;
      p.vy *= 1 - Math.min(0.4, dt * 3);
    }

    for (let i = 0; i < MAX_AFTERIMAGES; i++) {
      const t = this.trails[i];
      if (!t.active) continue;
      t.life -= dt;
      if (t.life <= 0) t.active = false;
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    // Afterimages
    for (let i = 0; i < MAX_AFTERIMAGES; i++) {
      const t = this.trails[i];
      if (!t.active) continue;
      const alpha = (t.life / t.maxLife) * 0.42;
      g.save();
      g.globalAlpha = alpha;
      g.fillStyle = t.color;
      g.beginPath();
      g.arc(t.x, t.y, t.radius * (0.65 + 0.35 * (t.life / t.maxLife)), 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    // Shockwaves
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const w = this.waves[i];
      if (!w.active) continue;
      const progress = 1 - w.life / w.maxLife;
      const eased = 1 - Math.pow(1 - progress, 3);
      g.save();
      g.globalAlpha = Math.max(0, 1 - progress);
      g.strokeStyle = w.color;
      g.lineWidth = w.lineWidth * (1 - progress * 0.65);
      g.beginPath();
      g.arc(w.x, w.y, 10 + eased * w.maxR, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }

    // Particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const ratio = p.life / p.maxLife;
      g.save();
      g.globalAlpha = Math.min(1, ratio * 1.4);
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.color;
      if (p.kind === 'dust') {
        g.beginPath();
        g.arc(0, 0, p.size * (1.2 - ratio * 0.3), 0, Math.PI * 2);
        g.fill();
      } else if (p.kind === 'confetti' || p.kind === 'petal') {
        g.fillRect(-p.size * 0.8, -p.size * 0.4, p.size * 1.6, p.size * 0.8);
      } else if (p.kind === 'star') {
        drawStarPath(g, 0, 0, 4, p.size * 1.4, p.size * 0.55);
        g.fill();
      } else {
        g.beginPath();
        g.roundRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size, 2);
        g.fill();
      }
      g.restore();
    }

    // Floating popups
    for (let i = 0; i < MAX_POPUPS; i++) {
      const p = this.popups[i];
      if (!p.active) continue;
      const progress = 1 - p.life / p.maxLife;
      const popScale = progress < 0.2 ? 0.7 + (progress / 0.2) * 0.45 : 1.15 - (progress - 0.2) * 0.25;
      g.save();
      g.globalAlpha = Math.min(1, (p.life / p.maxLife) * 2.1);
      g.translate(p.x, p.y);
      g.scale(popScale, popScale);
      drawText(g, p.text, 0, 0, p.size, p.color, 'center');
      g.restore();
    }
  }
}

export function drawStarPath(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number
): void {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  g.beginPath();
  g.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    g.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    g.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  g.closePath();
}

export function drawText(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size = 20,
  color = '#fff8eb',
  align: CanvasTextAlign = 'center',
  fontWeight = '700'
): void {
  g.save();
  g.font = `${fontWeight} ${size}px "Plus Jakarta Sans", "Segoe UI", sans-serif`;
  g.textAlign = align;
  g.lineJoin = 'round';
  g.lineWidth = Math.max(3, size * 0.22);
  g.strokeStyle = 'rgba(18, 9, 24, 0.85)';
  g.strokeText(text, x, y);
  g.fillStyle = color;
  g.fillText(text, x, y);
  g.restore();
}

let cachedLanternSprite: HTMLCanvasElement | null = null;

function getLanternSprite(): HTMLCanvasElement {
  if (cachedLanternSprite) return cachedLanternSprite;
  const size = 76;
  const cx = size / 2;
  const cy = size / 2;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.save();
  ctx.translate(cx, cy);

  // Soft warm ambient halo
  const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
  halo.addColorStop(0, 'rgba(255, 195, 77, 0.48)');
  halo.addColorStop(0.55, 'rgba(232, 72, 48, 0.16)');
  halo.addColorStop(1, 'rgba(232, 72, 48, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();

  // Hanging cord
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, -15);
  ctx.stroke();

  // Lantern body
  const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 15);
  bodyGrad.addColorStop(0, '#ff8f5a');
  bodyGrad.addColorStop(0.55, '#e02f2f');
  bodyGrad.addColorStop(1, '#9b1515');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 14.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bamboo ribs
  ctx.strokeStyle = 'rgba(255, 224, 130, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.5, 14, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Gold caps
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.roundRect(-6.5, -16, 13, 3.8, 1.5);
  ctx.roundRect(-6.5, 12.2, 13, 3.8, 1.5);
  ctx.fill();

  // Tassel
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-1.5, 16, 3, 8);
  ctx.fillStyle = '#e02f2f';
  ctx.fillRect(-2.5, 21, 5, 4);

  ctx.restore();
  cachedLanternSprite = c;
  return c;
}

export function drawLantern(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  time = 0,
  phase = 0
): void {
  const sway = Math.sin(time * 2.2 + phase) * 0.06;
  const sprite = getLanternSprite();
  g.save();
  g.translate(x, y);
  g.rotate(sway);
  g.scale(scale, scale);
  g.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
  g.restore();
}

export interface PersonRenderOptions {
  bodyColor: string;
  hatColor: string;
  x: number;
  y: number;
  bob?: number;
  flip?: number;
  scale?: number;
  squashX?: number;
  squashY?: number;
  hitFlash?: boolean;
  hatStyle?: 'nonla' | 'round' | 'shades' | 'doctor';
  leanAngle?: number;
}

export function drawPerson(g: CanvasRenderingContext2D, opts: PersonRenderOptions): void {
  const {
    bodyColor,
    hatColor,
    x,
    y,
    bob = 0,
    flip = 1,
    scale = 1,
    squashX = 1,
    squashY = 1,
    hitFlash = false,
    hatStyle = 'nonla',
    leanAngle = 0,
  } = opts;

  const stride = Math.sin(bob);
  const bounce = Math.abs(Math.sin(bob)) * 2.5;

  g.save();
  g.translate(x, y);
  g.scale(scale, scale);

  // Soft ground shadow
  g.fillStyle = 'rgba(15, 8, 22, 0.34)';
  g.beginPath();
  g.ellipse(0, 6, 13, 5, 0, 0, Math.PI * 2);
  g.fill();

  g.translate(0, -bounce);
  g.rotate(leanAngle * flip);
  g.scale(flip * squashX, squashY);

  // Legs
  g.fillStyle = '#2d2336';
  g.beginPath();
  g.roundRect(-6 + stride * 2.5, -4, 5, 9, 2);
  g.roundRect(1 - stride * 2.5, -4, 5, 9, 2);
  g.fill();

  // Torso (áo dài / bà ba tunic)
  g.fillStyle = hitFlash ? '#ffffff' : bodyColor;
  g.strokeStyle = 'rgba(20, 10, 28, 0.72)';
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(-10, -20, 20, 18, 6);
  g.fill();
  g.stroke();

  // Traditional scarf / sash accent
  if (!hitFlash) {
    g.fillStyle = 'rgba(255, 240, 200, 0.25)';
    g.fillRect(-3, -18, 6, 12);
  }

  // Arms
  g.fillStyle = hitFlash ? '#ffffff' : '#f5cfa0';
  g.beginPath();
  g.arc(-11, -13 - stride * 2, 3.2, 0, Math.PI * 2);
  g.arc(11, -13 + stride * 2, 3.2, 0, Math.PI * 2);
  g.fill();

  // Head
  g.fillStyle = hitFlash ? '#ffffff' : '#f7d3a8';
  g.strokeStyle = 'rgba(20, 10, 28, 0.72)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, -25, 9.2, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  if (!hitFlash) {
    // Eyes & rosy cheeks
    g.fillStyle = '#1f1628';
    g.fillRect(-3.8, -26, 2.2, 3);
    g.fillRect(2, -26, 2.2, 3);
    g.fillStyle = 'rgba(235, 90, 90, 0.35)';
    g.beginPath();
    g.arc(-5.2, -23.2, 1.8, 0, Math.PI * 2);
    g.arc(5.5, -23.2, 1.8, 0, Math.PI * 2);
    g.fill();

    // Hat / Accessory
    if (hatStyle === 'shades') {
      g.fillStyle = '#18181b';
      g.fillRect(-6.5, -27.5, 5.5, 3.8);
      g.fillRect(1, -27.5, 5.5, 3.8);
      g.fillRect(-1.5, -26.5, 3, 1.4);
      // Stylish hair cap
      g.fillStyle = hatColor;
      g.beginPath();
      g.arc(0, -30, 8.5, Math.PI, 0);
      g.fill();
    } else if (hatStyle === 'doctor') {
      // Khăn xếp / traditional scholar cap
      g.fillStyle = hatColor;
      g.beginPath();
      g.roundRect(-10, -36, 20, 7, 3);
      g.fill();
      g.strokeStyle = '#ffd23f';
      g.lineWidth = 1.5;
      g.strokeRect(-10, -34, 20, 2.5);
    } else if (hatStyle === 'nonla') {
      // Conical Nón Lá
      g.fillStyle = hatColor;
      g.strokeStyle = 'rgba(90, 52, 18, 0.75)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(-15, -29);
      g.lineTo(0, -41);
      g.lineTo(15, -29);
      g.closePath();
      g.fill();
      g.stroke();
      // Brim ribbon
      g.strokeStyle = '#d94f4f';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(-11, -31);
      g.lineTo(11, -31);
      g.stroke();
    } else {
      g.fillStyle = hatColor;
      g.beginPath();
      g.ellipse(0, -31, 13, 4, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(0, -31, 7, Math.PI, 0);
      g.fill();
    }
  }

  g.restore();
}

export function drawBadgeEmoji(
  g: CanvasRenderingContext2D,
  emoji: string,
  x: number,
  y: number,
  size = 32,
  flip = 1
): void {
  g.save();
  g.translate(x, y);
  g.scale(flip, 1);
  g.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(emoji, 0, 0);
  g.restore();
}

export function drawStaminaBar(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
  ghostRatio: number,
  color: string,
  label: string
): void {
  const clamped = Math.max(0, Math.min(1, ratio));
  const clampedGhost = Math.max(clamped, Math.min(1, ghostRatio));

  g.save();
  g.fillStyle = 'rgba(18, 9, 26, 0.85)';
  g.strokeStyle = 'rgba(255, 207, 90, 0.45)';
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(x, y, w, h, 8);
  g.fill();
  g.stroke();

  if (clampedGhost > clamped) {
    g.fillStyle = 'rgba(255, 255, 255, 0.35)';
    g.beginPath();
    g.roundRect(x + 2, y + 2, Math.max(0, (w - 4) * clampedGhost), h - 4, 6);
    g.fill();
  }

  if (clamped > 0.01) {
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(x + 2, y + 2, Math.max(0, (w - 4) * clamped), h - 4, 6);
    g.fill();
  }

  drawText(g, label, x + w / 2, y + h + 15, 12, '#fff5db', 'center', '600');
  g.restore();
}
