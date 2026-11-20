import { BookOpen, FastForward, HelpCircle, Pause, Volume2, VolumeX } from 'lucide-react';
import { NPCS } from '../game/rules';
import type { GameId, HudSnapshot } from '../game/types';

interface GameHudProps {
  snap: HudSnapshot;
  onToggleMute: () => void;
  onPause: () => void;
  onHelp: () => void;
  onOpenGame: (gameId: GameId, name?: string) => void;
  onSkipEnding: () => void;
  onVirtualKey: (code: string, down: boolean) => void;
  onPulseKey: (code: string) => void;
}

export function GameHud({
  snap,
  onToggleMute,
  onPause,
  onHelp,
  onOpenGame,
  onSkipEnding,
  onVirtualKey,
  onPulseKey,
}: GameHudProps) {
  const inVillage = snap.scene === 'village';
  const inMiniGame = !inVillage && snap.scene !== 'title';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 md:p-4">
      {/* Top Perimeter Clusters */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-left: Active Quest plaque (Village only) */}
        <div>
          {inVillage && (
            <div className="pointer-events-auto max-w-[330px] rounded-xl bg-[#24101d]/90 border-2 border-[#f5b942]/55 px-3.5 py-2.5 shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
              {snap.activeQuest ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#ffd23f]">
                      Nhiệm vụ · +{snap.activeQuest.reward}
                    </span>
                    <span className="font-mono-num text-xs font-bold text-[#fff8eb] tabular-nums">
                      {snap.activeQuest.progress}/{snap.activeQuest.total}
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-[#fff8eb] leading-snug">
                    {snap.activeQuest.title}
                  </div>
                  <div className="text-xs text-[#e8d5b7] leading-snug">
                    {snap.activeQuest.desc}
                  </div>
                </>
              ) : (
                <div className="text-sm font-bold text-[#86efac]">
                  Đã hoàn thành mọi nhiệm vụ hội làng!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top-right: Points + Utility Icon Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {inVillage && (
            <div className="px-3.5 py-2 rounded-xl bg-[#24101d]/90 border-2 border-[#f5b942]/55 flex items-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.4)]">
              <span className="text-xs font-semibold text-[#e8d5b7]">Điểm</span>
              <span className="font-mono-num text-base font-bold text-[#ffd23f] tabular-nums">
                {snap.points}
              </span>
            </div>
          )}

          {snap.endingActive ? (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onSkipEnding();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-xl bg-[#24101d]/90 border-2 border-[#f5b942]/70 text-[#ffd23f] text-sm font-bold hover:bg-[#3a192c] active:scale-95 transition-transform duration-150 cursor-pointer"
            >
              <FastForward className="w-4 h-4" />
              <span>Bỏ qua (Enter)</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMute();
                }}
                aria-label={snap.muted ? 'Bật âm thanh (Z)' : 'Tắt âm thanh (Z)'}
                title="Âm thanh (Z)"
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#24101d]/90 border-2 border-[#f5b942]/55 text-[#ffe8a3] hover:bg-[#3a192c] hover:border-[#ffd23f] active:scale-95 transition-transform duration-150 cursor-pointer"
              >
                {snap.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {inVillage && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onHelp();
                  }}
                  aria-label="Hướng dẫn (H)"
                  title="Hướng dẫn (H)"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#24101d]/90 border-2 border-[#f5b942]/55 text-[#ffe8a3] hover:bg-[#3a192c] hover:border-[#ffd23f] active:scale-95 transition-transform duration-150 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPause();
                }}
                aria-label="Tạm dừng (P)"
                title="Tạm dừng (P)"
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#24101d]/90 border-2 border-[#f5b942]/55 text-[#ffe8a3] hover:bg-[#3a192c] hover:border-[#ffd23f] active:scale-95 transition-transform duration-150 cursor-pointer"
              >
                <Pause className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {snap.toast && (
        <div className="mx-auto pointer-events-none animate-toast-pop">
          <div className="px-5 py-2.5 rounded-xl bg-[#2b121c]/95 border-2 border-[#ffd23f] text-[#ffd23f] font-bold text-sm shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
            {snap.toast}
          </div>
        </div>
      )}

      {/* Bottom Area */}
      <div className="flex flex-col items-center gap-2">
        {/* Contextual NPC Interact CTA when standing close */}
        {inVillage && snap.nearNpc && !snap.modal && (
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenGame(snap.nearNpc!.id, snap.nearNpc!.name);
            }}
            className="pointer-events-auto inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#f59e0b] hover:bg-[#fbbf24] text-[#290f14] font-bold text-sm border-2 border-[#fff3c4] shadow-[0_4px_0_#7c2d12,0_8px_20px_rgba(0,0,0,0.45)] active:translate-y-[1px] transition-transform duration-150 cursor-pointer animate-subtle-float"
          >
            <BookOpen className="w-4 h-4" />
            <span>Nhấn E hoặc bấm để chơi: {snap.nearNpc.name}</span>
          </button>
        )}

        {/* Quick-select dock in Village so users can either walk to NPCs or jump directly */}
        {inVillage && !snap.modal && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#24101d]/88 border border-[#f5b942]/40">
            {NPCS.map((npc) => (
              <button
                key={npc.id}
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenGame(npc.id, npc.name);
                }}
                className="px-3 py-1.5 min-h-[36px] rounded-lg bg-[#38182b] hover:bg-[#4e223c] text-[#fff3d6] text-xs font-bold border border-[#f5b942]/35 hover:border-[#ffd23f] transition-transform duration-150 active:scale-95 whitespace-nowrap cursor-pointer"
              >
                {npc.name}
              </button>
            ))}
          </div>
        )}

        {/* Touch controls on mobile/coarse viewports during active play */}
        {inMiniGame && !snap.modal && !snap.endingActive && (
          <div className="md:hidden w-full flex items-end justify-between gap-2 pointer-events-none">
            {snap.scene === 'tug' ? (
              <div className="pointer-events-auto w-full flex justify-center gap-2">
                {(
                  [
                    ['KeyA', 'A'],
                    ['KeyS', 'S'],
                    ['KeyD', 'D'],
                    ['KeyF', 'F'],
                  ] as const
                ).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onPointerDown={() => onPulseKey(code)}
                    className="w-14 h-12 rounded-xl bg-[#24101d]/90 border-2 border-[#ffd23f]/70 text-[#ffd23f] font-bold text-base active:scale-95"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="pointer-events-auto grid grid-cols-3 gap-1 w-32">
                  <div />
                  <button
                    type="button"
                    aria-label="Lên"
                    onPointerDown={() => onVirtualKey('KeyW', true)}
                    onPointerUp={() => onVirtualKey('KeyW', false)}
                    onPointerLeave={() => onVirtualKey('KeyW', false)}
                    className="h-10 rounded-lg bg-[#24101d]/85 border border-[#f5b942]/50 text-[#fff8eb] font-bold"
                  >
                    ▲
                  </button>
                  <div />
                  <button
                    type="button"
                    aria-label="Trái"
                    onPointerDown={() => onVirtualKey('KeyA', true)}
                    onPointerUp={() => onVirtualKey('KeyA', false)}
                    onPointerLeave={() => onVirtualKey('KeyA', false)}
                    className="h-10 rounded-lg bg-[#24101d]/85 border border-[#f5b942]/50 text-[#fff8eb] font-bold"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    aria-label="Xuống"
                    onPointerDown={() => onVirtualKey('KeyS', true)}
                    onPointerUp={() => onVirtualKey('KeyS', false)}
                    onPointerLeave={() => onVirtualKey('KeyS', false)}
                    className="h-10 rounded-lg bg-[#24101d]/85 border border-[#f5b942]/50 text-[#fff8eb] font-bold"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    aria-label="Phải"
                    onPointerDown={() => onVirtualKey('KeyD', true)}
                    onPointerUp={() => onVirtualKey('KeyD', false)}
                    onPointerLeave={() => onVirtualKey('KeyD', false)}
                    className="h-10 rounded-lg bg-[#24101d]/85 border border-[#f5b942]/50 text-[#fff8eb] font-bold"
                  >
                    ▶
                  </button>
                </div>
                <button
                  type="button"
                  onPointerDown={() => onVirtualKey('Space', true)}
                  onPointerUp={() => onVirtualKey('Space', false)}
                  onPointerLeave={() => onVirtualKey('Space', false)}
                  className="pointer-events-auto px-5 h-12 rounded-xl bg-[#f59e0b]/95 border-2 border-[#fff3c4] text-[#290f14] font-extrabold text-sm"
                >
                  DASH
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
