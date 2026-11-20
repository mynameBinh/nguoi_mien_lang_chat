import { AudioManager } from './audio';
import {
  CatGame,
  drawEndingScene,
  InputState,
  MicGame,
  MiniGameContext,
  MiniGameInstance,
  SnakeGame,
  TugGame,
} from './minigames';
import {
  createInitialSave,
  getCurrentQuest,
  getQuestStepProgress,
  NPCS,
  reportQuestEvent,
  WORLD_H,
  WORLD_W,
} from './rules';
import type {
  GameId,
  GameModeOptions,
  GameResult,
  HudSnapshot,
  ModalState,
  SaveData,
  SceneId,
  Vec2,
} from './types';
import { VfxManager } from './vfx';
import { drawTitleBackdrop, VillageScene } from './village';

const SAVE_KEY = 'lcr1';

const MOVE_KEYS_P1 = ['KeyW', 'KeyS', 'KeyA', 'KeyD'] as const;
const MOVE_KEYS_P2 = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio = new AudioManager();
  private vfx = new VfxManager();
  private village = new VillageScene();
  private activeGame: MiniGameInstance | null = null;
  private currentOptions: GameModeOptions = { n: 1 };

  private scene: SceneId = 'title';
  private modal: ModalState = null;
  private pendingScene: { scene: SceneId; options?: GameModeOptions; introModal?: boolean } | null = null;
  private fade = 0;
  private titleTime = 0;

  private endingState: {
    gameId: GameId;
    winnerSide: number;
    win: boolean;
    elapsed: number;
    result: GameResult;
  } | null = null;

  private hitstop = 0;
  private toastText: string | null = null;
  private toastTimer = 0;

  private held: Record<string, boolean> = {};
  private justPressed: Record<string, boolean> = {};
  private save: SaveData = createInitialSave();

  private rafId = 0;
  private lastTime = 0;
  private lastNearNpcId: string | null = null;
  private modalFrameRendered = false;
  private onSnapshot: (snap: HudSnapshot) => void;

  constructor(canvas: HTMLCanvasElement, onSnapshot: (snap: HudSnapshot) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D unavailable');
    this.ctx = context;
    this.onSnapshot = onSnapshot;

    this.loadSave();
    this.resizeCanvas();
    this.bindEvents();
  }

  private loadSave(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        this.save = {
          pts: typeof parsed.pts === 'number' ? parsed.pts : 0,
          done: parsed.done ?? {},
          p: parsed.p ?? {},
        };
      }
    } catch {
      this.save = createInitialSave();
    }
  }

  private persistSave(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch {
      // ignore storage errors
    }
  }

  private showToast(msg: string): void {
    this.toastText = msg;
    this.toastTimer = 3.2;
    this.emitSnapshot();
  }

  private vignetteCanvas: HTMLCanvasElement | null = null;

  private getVignette(): HTMLCanvasElement {
    if (this.vignetteCanvas) return this.vignetteCanvas;
    const c = document.createElement('canvas');
    c.width = WORLD_W;
    c.height = WORLD_H;
    const ctx = c.getContext('2d')!;
    const vg = ctx.createRadialGradient(WORLD_W / 2, WORLD_H / 2, 310, WORLD_W / 2, WORLD_H / 2, 640);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10, 4, 16, 0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    this.vignetteCanvas = c;
    return c;
  }

  resizeCanvas = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(WORLD_W * dpr);
    this.canvas.height = Math.round(WORLD_H * dpr);
    const scale = Math.min(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    this.canvas.style.width = `${Math.floor(WORLD_W * scale)}px`;
    this.canvas.style.height = `${Math.floor(WORLD_H * scale)}px`;
  };

  private clearInputs(): void {
    for (const k of Object.keys(this.held)) {
      this.held[k] = false;
    }
    for (const k of Object.keys(this.justPressed)) {
      delete this.justPressed[k];
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.held[e.code]) {
      this.justPressed[e.code] = true;
    }
    this.held[e.code] = true;
    this.audio.init();

    if (/Arrow|Space/.test(e.code)) {
      e.preventDefault();
    }

    if (e.code === 'KeyZ' || e.code === 'KeyM') {
      this.toggleMute();
      return;
    }

    // Handle Title start shortcuts
    if (this.scene === 'title' && !this.modal && (e.code === 'Enter' || e.code === 'Space')) {
      this.startFromTitle();
      return;
    }

    // Handle Ending skip
    if (this.endingState && (e.code === 'Enter' || e.code === 'Space')) {
      this.skipEnding();
      return;
    }

    // Handle Modal navigation & shortcuts
    if (this.modal) {
      if (e.code === 'Escape') {
        if (this.modal.type === 'help') {
          this.closeModal();
        } else if (this.modal.type === 'mode') {
          this.closeModal();
        } else if (this.modal.type === 'pause') {
          this.resumeGame();
        }
        return;
      }
      if (this.modal.type === 'pause' && e.code === 'KeyP') {
        this.resumeGame();
        return;
      }
      if (this.modal.type === 'intro' && (e.code === 'Enter' || e.code === 'Space')) {
        this.beginMiniGameFromIntro();
        return;
      }
      return;
    }

    if (e.code === 'KeyH' && this.scene === 'village') {
      this.openHelp('village');
      return;
    }

    if ((e.code === 'Escape' || e.code === 'KeyP') && this.scene !== 'title') {
      this.pauseGame();
      return;
    }

    if (this.scene === 'village' && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) {
      const near = this.village.getNearestNpc();
      if (near) {
        this.openModeSelect(near.id, near.name);
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.held[e.code] = false;
  };

  private onBlur = (): void => {
    this.clearInputs();
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) this.clearInputs();
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.resizeCanvas);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  start(autostart = false): void {
    if (autostart) {
      this.scene = 'village';
      this.village.init();
      this.audio.setMusicMode('calm');
    } else {
      this.scene = 'title';
    }
    this.syncBodyState();
    this.emitSnapshot();
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeCanvas);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.audio.destroy();
  }

  private getInputState(): InputState {
    const vecFrom = (keys: readonly [string, string, string, string]): Vec2 => {
      const x = (this.held[keys[3]] ? 1 : 0) - (this.held[keys[2]] ? 1 : 0);
      const y = (this.held[keys[1]] ? 1 : 0) - (this.held[keys[0]] ? 1 : 0);
      const len = Math.hypot(x, y) || 1;
      return { x: x / len, y: y / len };
    };
    return {
      held: this.held,
      justPressed: this.justPressed,
      moveVecP1: () => vecFrom(MOVE_KEYS_P1),
      moveVecP2: () => vecFrom(MOVE_KEYS_P2),
      moveVec1: () => {
        const a = vecFrom(MOVE_KEYS_P1);
        const b = vecFrom(MOVE_KEYS_P2);
        let x = a.x + b.x;
        let y = a.y + b.y;
        const len = Math.hypot(x, y);
        if (len > 1) {
          x /= len;
          y /= len;
        }
        return { x, y };
      },
    };
  }

  private syncBodyState(): void {
    let state: 'title' | 'playing' | 'paused' | 'gameover' = 'playing';
    if (this.scene === 'title') {
      state = 'title';
    } else if (this.modal?.type === 'pause') {
      state = 'paused';
    } else if (this.endingState || this.modal?.type === 'result') {
      state = 'gameover';
    }
    document.body.dataset.state = state;
  }

  private emitSnapshot(): void {
    this.modalFrameRendered = false;
    this.syncBodyState();
    const curQuest = getCurrentQuest(this.save);
    const near = this.scene === 'village' ? this.village.getNearestNpc() : null;
    this.lastNearNpcId = near?.id ?? null;

    this.onSnapshot({
      scene: this.scene,
      modal: this.modal,
      endingActive: !!this.endingState,
      muted: this.audio.muted,
      points: this.save.pts,
      activeQuest: curQuest
        ? {
            title: curQuest.title,
            desc: curQuest.desc,
            progress: getQuestStepProgress(this.save, curQuest),
            total: curQuest.steps.length,
            reward: curQuest.reward,
          }
        : null,
      nearNpc: near ? { id: near.id, name: near.name, subtitle: near.subtitle } : null,
      toast: this.toastText,
    });
  }

  /* ===== Public UI Commands ===== */

  setVirtualKey(code: string, isDown: boolean): void {
    this.audio.init();
    if (isDown && !this.held[code]) {
      this.justPressed[code] = true;
    }
    this.held[code] = isDown;
  }

  pulseVirtualKey(code: string): void {
    this.audio.init();
    this.justPressed[code] = true;
    this.held[code] = true;
    window.setTimeout(() => {
      this.held[code] = false;
    }, 80);
  }

  startFromTitle(): void {
    this.audio.init();
    this.audio.playUi();
    this.clearInputs();
    this.transitionTo('village');
  }

  openHelp(returnTo: 'title' | 'village'): void {
    this.audio.init();
    this.audio.playUi();
    this.modal = { type: 'help', returnTo };
    this.emitSnapshot();
  }

  closeModal(): void {
    this.audio.playUi();
    this.modal = null;
    this.emitSnapshot();
  }

  openModeSelect(gameId: GameId, npcName?: string): void {
    this.audio.init();
    this.audio.playUi();
    const name = npcName ?? NPCS.find((n) => n.id === gameId)?.name ?? 'Chọn chế độ';
    this.modal = { type: 'mode', gameId, npcName: name };
    this.emitSnapshot();
  }

  selectMode(gameId: GameId, options: GameModeOptions): void {
    this.audio.playUi();
    this.clearInputs();
    this.currentOptions = options;
    this.transitionTo(gameId, options, true);
  }

  beginMiniGameFromIntro(): void {
    this.audio.playUi();
    this.clearInputs();
    this.modal = null;
    this.emitSnapshot();
  }

  pauseGame(): void {
    if (this.scene === 'title' || this.endingState || this.modal?.type === 'result') return;
    this.audio.playUi();
    this.clearInputs();
    this.audio.setPaused(true);
    this.modal = { type: 'pause' };
    this.emitSnapshot();
  }

  resumeGame(): void {
    this.audio.playUi();
    this.clearInputs();
    this.audio.setPaused(false);
    this.modal = null;
    this.emitSnapshot();
  }

  restartCurrentGame(): void {
    if (this.scene === 'title' || this.scene === 'village') return;
    this.audio.playUi();
    this.clearInputs();
    this.audio.setPaused(false);
    this.endingState = null;
    this.modal = null;
    this.transitionTo(this.scene, this.currentOptions, false);
  }

  returnToVillage(): void {
    this.audio.playUi();
    this.clearInputs();
    this.audio.setPaused(false);
    this.endingState = null;
    this.modal = null;
    this.transitionTo('village');
  }

  skipEnding(): void {
    if (!this.endingState) return;
    this.audio.playUi();
    const result = this.endingState.result;
    this.endingState = null;
    this.modal = { type: 'result', result };
    this.emitSnapshot();
  }

  toggleMute(): void {
    this.audio.toggleMute();
    this.emitSnapshot();
  }

  private transitionTo(scene: SceneId, options?: GameModeOptions, showIntro = false): void {
    if (this.pendingScene) return;
    this.pendingScene = { scene, options, introModal: showIntro };
  }

  private createMiniGame(id: GameId, options: GameModeOptions): MiniGameInstance {
    const context: MiniGameContext = {
      audio: this.audio,
      vfx: this.vfx,
      triggerHitstop: (sec: number) => {
        this.hitstop = Math.max(this.hitstop, sec);
      },
      finishGame: ({ win, title, stats, winnerSide }) => {
        if (this.endingState) return;
        const beforePts = this.save.pts;
        const r1 = reportQuestEvent(this.save, 'play', id);
        let r2Completed: typeof r1.completedQuests = [];
        if (win) {
          const r2 = reportQuestEvent(this.save, 'win', id);
          r2Completed = r2.completedQuests;
          this.save.pts += 10;
        }
        this.persistSave();
        const pointsEarned = this.save.pts - beforePts;

        const allCompleted = [...r1.completedQuests, ...r2Completed];
        if (allCompleted.length > 0) {
          const q = allCompleted[0];
          this.showToast(`Hoàn thành: ${q.title} (+${q.reward} điểm)`);
        }

        this.audio.playEnd(win);
        if (win) {
          this.vfx.burst(480, 220, '#ffd23f', 36, 'confetti', 80, 290);
        }

        this.endingState = {
          gameId: id,
          winnerSide,
          win,
          elapsed: 0,
          result: {
            win,
            title,
            stats,
            gameId: id,
            winnerSide,
            options,
            pointsEarned,
          },
        };
        this.emitSnapshot();
      },
    };

    switch (id) {
      case 'tug':
        return new TugGame(options, context);
      case 'snake':
        return new SnakeGame(options, context);
      case 'mic':
        return new MicGame(options, context);
      case 'cat':
        return new CatGame(options, context);
    }
  }

  private applyPendingTransition(): void {
    if (!this.pendingScene) return;
    const { scene, options, introModal } = this.pendingScene;
    this.pendingScene = null;
    this.vfx.clear();
    this.endingState = null;
    this.hitstop = 0;
    this.scene = scene;

    if (scene === 'title') {
      this.activeGame = null;
      this.modal = null;
      this.audio.setMusicMode('calm');
    } else if (scene === 'village') {
      this.activeGame = null;
      this.village.init();
      this.modal = null;
      this.audio.setMusicMode('calm');
    } else {
      const opts = options ?? { n: 1 };
      this.activeGame = this.createMiniGame(scene, opts);
      this.modal = introModal ? { type: 'intro', gameId: scene, options: opts } : null;
      this.audio.setMusicMode('upbeat');
    }
    this.emitSnapshot();
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0), 0.05);

    // Fade transitions
    if (this.pendingScene) {
      this.fade += dt * 4.2;
      if (this.fade >= 1) {
        this.fade = 1;
        this.applyPendingTransition();
      }
    } else if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt * 4.2);
    }

    // Toast timer
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.toastText = null;
        this.emitSnapshot();
      }
    }

    // Update simulation
    const input = this.getInputState();
    const isModalBlocking = this.modal !== null;

    if (this.scene === 'title') {
      this.titleTime += dt;
    } else if (this.endingState) {
      this.endingState.elapsed += dt;
      this.vfx.update(dt);
      if (this.endingState.elapsed >= 3.1) {
        const result = this.endingState.result;
        this.endingState = null;
        this.modal = { type: 'result', result };
        this.emitSnapshot();
      }
    } else if (!isModalBlocking) {
      if (this.hitstop > 0) {
        this.hitstop = Math.max(0, this.hitstop - dt);
        this.vfx.update(dt);
      } else {
        if (this.scene === 'village') {
          this.village.update(dt, input.moveVec1(), this.vfx);
          const near = this.village.getNearestNpc();
          if ((near?.id ?? null) !== this.lastNearNpcId) {
            this.emitSnapshot();
          }
        } else if (this.activeGame) {
          this.activeGame.update(dt, input);
        }
        this.vfx.update(dt);
      }
    }

    // Render Canvas (skip redundant repaints behind static modals once settled)
    if (isModalBlocking && !this.pendingScene && this.fade <= 0 && this.modalFrameRendered) {
      for (const k of Object.keys(this.justPressed)) {
        delete this.justPressed[k];
      }
      return;
    }
    this.modalFrameRendered = isModalBlocking && !this.pendingScene && this.fade <= 0;

    const g = this.ctx;
    const dpr = this.canvas.width / WORLD_W;
    g.save();
    g.scale(dpr, dpr);

    const shake = this.vfx.getShakeOffset();
    g.save();
    g.translate(shake.x, shake.y);

    if (this.scene === 'title') {
      drawTitleBackdrop(g, this.titleTime);
    } else if (this.scene === 'village') {
      this.village.draw(g);
    } else if (this.activeGame) {
      this.activeGame.draw(g);
    }

    this.vfx.draw(g);
    g.restore();

    if (this.endingState) {
      drawEndingScene(
        g,
        this.endingState.gameId,
        this.endingState.winnerSide,
        this.endingState.win,
        this.endingState.elapsed
      );
    }

    // Subtle warm festival vignette (cached)
    g.drawImage(this.getVignette(), 0, 0);

    if (this.fade > 0) {
      g.fillStyle = `rgba(14, 7, 20, ${this.fade.toFixed(2)})`;
      g.fillRect(0, 0, WORLD_W, WORLD_H);
    }

    g.restore();

    // Clear single-frame edge triggers
    for (const k of Object.keys(this.justPressed)) {
      delete this.justPressed[k];
    }
  };
}
