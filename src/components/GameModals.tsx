import { Home, Play, RotateCcw, Trophy, Volume2, VolumeX, X } from 'lucide-react';
import { GAME_MODES, getIntroContent } from '../game/rules';
import type { GameId, GameModeOptions, ModalState } from '../game/types';

interface GameModalsProps {
  modal: ModalState;
  muted: boolean;
  inVillage: boolean;
  onClose: () => void;
  onSelectMode: (gameId: GameId, options: GameModeOptions) => void;
  onStartFromIntro: () => void;
  onResume: () => void;
  onRestart: () => void;
  onReturnVillage: () => void;
  onToggleMute: () => void;
}

export function GameModals({
  modal,
  muted,
  inVillage,
  onClose,
  onSelectMode,
  onStartFromIntro,
  onResume,
  onRestart,
  onReturnVillage,
  onToggleMute,
}: GameModalsProps) {
  if (!modal) return null;

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-[#0d0514]/80"
      role="dialog"
      aria-modal="true"
    >
      {/* 1. HELP MODAL */}
      {modal.type === 'help' && (
        <div className="w-full max-w-2xl rounded-2xl bg-[#2a1220] border-2 border-[#f5b942] p-6 md:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.65)] animate-modal-enter max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between gap-4 border-b border-[#f5b942]/30 pb-3.5">
            <h2 className="font-display text-2xl font-extrabold text-[#ffd23f]">
              Hướng dẫn hội làng
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hướng dẫn"
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-[#3d1b2f] hover:bg-[#52243f] text-[#ffe8c2] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 space-y-3 text-sm text-[#fff4df] leading-relaxed">
            <div className="p-3 rounded-xl bg-[#1d0b16]/80 border border-[#f5b942]/25">
              <div className="font-bold text-[#ffd23f]">Làng hội</div>
              <p className="mt-0.5 text-[#ebd9bc]">
                Di chuyển bằng WASD / Mũi tên · Nhấn E / Space / Enter để trò chuyện với NPC hoặc chọn nhanh trò chơi ở thanh dưới · P / Esc tạm dừng · Z tắt/bật âm thanh.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#1d0b16]/80 border border-[#f5b942]/25">
              <div className="font-bold text-[#ff8fa3]">1. Kéo co nhịp điệu</div>
              <p className="mt-0.5 text-[#ebd9bc]">
                Nốt nhạc rơi xuống 4 làn: bấm đúng nhịp khi nốt chạm vạch trắng (P1: A S D F · P2: J K L ;). Kéo 30 giây, bấm sai sẽ bị kéo lùi!
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#1d0b16]/80 border border-[#f5b942]/25">
              <div className="font-bold text-[#6ee7b7]">2. Rồng rắn lên mây</div>
              <p className="mt-0.5 text-[#ebd9bc]">
                Giữ Space / Shift để trườn nhanh. Rắn lấy đủ 8 lồng đèn sẽ thắng; đầu húc làm choáng Thầy thuốc 1 giây. 2P: P1 WASD + Space · P2 Mũi tên + Enter.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#1d0b16]/80 border border-[#f5b942]/25">
              <div className="font-bold text-[#c4b5fd]">3. Cướp mic remix</div>
              <p className="mt-0.5 text-[#ebd9bc]">
                Cướp mic ở giữa sân chạy về vạch nhà +2 điểm, chạm người đang cầm mic +1 điểm. Đủ 5 điểm thắng! Dash: Space (P1) / Enter (P2).
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#1d0b16]/80 border border-[#f5b942]/25">
              <div className="font-bold text-[#fcd34d]">4. Mèo bắt chuột</div>
              <p className="mt-0.5 text-[#ebd9bc]">
                Đuổi bắt trong 20 giây. Dash: Space (P1) / Enter (P2). Nhặt ⚡ tăng tốc, ❄️ đóng băng đối thủ, 🛡️ khiên bảo vệ.
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 min-h-[44px] rounded-xl bg-[#f59e0b] hover:bg-[#fbbf24] text-[#290f14] font-bold text-sm border-2 border-[#fff3c4] cursor-pointer"
            >
              Quay lại
            </button>
          </div>
        </div>
      )}

      {/* 2. MODE SELECT MODAL */}
      {modal.type === 'mode' && (
        <div className="w-full max-w-md rounded-2xl bg-[#2a1220] border-2 border-[#f5b942] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.65)] animate-modal-enter">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#ffd23f]">
                {modal.npcName}
              </div>
              <h2 className="font-display text-2xl font-extrabold text-[#fff8eb] mt-0.5">
                Chọn chế độ chơi
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-[#3d1b2f] hover:bg-[#52243f] text-[#ffe8c2] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-5 space-y-2.5">
            {GAME_MODES[modal.gameId].map((choice, idx) => (
              <button
                key={choice.label}
                type="button"
                onClick={() => onSelectMode(modal.gameId, choice.options)}
                className="w-full text-left px-4 py-3.5 min-h-[54px] rounded-xl bg-[#3c1a2d] hover:bg-[#51233d] border-2 border-[#f5b942]/45 hover:border-[#ffd23f] transition-transform duration-150 active:scale-[0.99] cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-[#fff8eb] group-hover:text-[#ffd23f]">
                    {idx + 1}. {choice.label}
                  </span>
                  <Play className="w-4 h-4 text-[#ffd23f] opacity-80 group-hover:opacity-100" />
                </div>
                <div className="text-xs text-[#e3ceb0] mt-0.5">{choice.detail}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. GAME INTRO MODAL */}
      {modal.type === 'intro' && (() => {
        const info = getIntroContent(modal.gameId, modal.options);
        return (
          <div className="w-full max-w-xl rounded-2xl bg-[#2a1220] border-2 border-[#f5b942] p-6 md:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.65)] animate-modal-enter">
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-[#ffd23f]">
              {info.title}
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm md:text-base text-[#fff4df] leading-relaxed">
              {info.bullets.map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#ffd23f] shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-[#1a0a13] border border-[#f5b942]/35 text-xs md:text-sm font-semibold text-[#ffe8a3]">
              {info.controls}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onReturnVillage}
                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-[#3d1b2f] hover:bg-[#52243f] text-[#ffe8c2] font-semibold text-sm cursor-pointer"
              >
                Về làng
              </button>
              <button
                type="button"
                data-start="true"
                onClick={onStartFromIntro}
                className="inline-flex items-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl bg-[#f59e0b] hover:bg-[#fbbf24] text-[#290f14] font-extrabold text-sm border-2 border-[#fff3c4] shadow-[0_4px_0_#7c2d12] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Bắt đầu (Enter)</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* 4. PAUSE MODAL */}
      {modal.type === 'pause' && (
        <div className="w-full max-w-sm rounded-2xl bg-[#2a1220] border-2 border-[#f5b942] p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.65)] animate-modal-enter">
          <h2 className="font-display text-3xl font-extrabold text-[#ffd23f]">Tạm dừng</h2>
          <p className="mt-1.5 text-sm text-[#e3ceb0]">
            Nhấn P hoặc Esc để tiếp tục trận đấu
          </p>

          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full inline-flex items-center justify-center gap-2 py-3 min-h-[46px] rounded-xl bg-[#f59e0b] hover:bg-[#fbbf24] text-[#290f14] font-extrabold text-base border-2 border-[#fff3c4] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Tiếp tục</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl bg-[#3c1a2d] hover:bg-[#51233d] text-[#fff3d6] font-bold text-sm border border-[#f5b942]/45 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>Âm thanh: {muted ? 'Đang tắt' : 'Đang bật'} (Z)</span>
            </button>

            {!inVillage && (
              <>
                <button
                  type="button"
                  onClick={onRestart}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl bg-[#3c1a2d] hover:bg-[#51233d] text-[#fff3d6] font-bold text-sm border border-[#f5b942]/45 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Chơi lại</span>
                </button>
                <button
                  type="button"
                  onClick={onReturnVillage}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl bg-[#3c1a2d] hover:bg-[#51233d] text-[#fff3d6] font-bold text-sm border border-[#f5b942]/45 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Về làng</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. RESULT / VICTORY / GAME OVER MODAL */}
      {modal.type === 'result' && (
        <div className="w-full max-w-md rounded-2xl bg-[#2a1220] border-2 border-[#f5b942] p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.65)] animate-modal-enter">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#3c1a2d] border-2 border-[#ffd23f] text-[#ffd23f] mb-3">
            <Trophy className="w-7 h-7" />
          </div>
          <h2 className="font-display text-3xl font-extrabold text-[#ffd23f]">
            {modal.result.win ? 'Chiến thắng!' : 'Thua rồi!'}
          </h2>
          <p className="mt-1.5 text-base font-bold text-[#fff8eb]">{modal.result.title}</p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {modal.result.stats.map((st) => (
              <div
                key={st.label}
                className="rounded-xl bg-[#1b0a14] border border-[#f5b942]/35 px-3 py-2.5"
              >
                <div className="text-xs text-[#e3ceb0]">{st.label}</div>
                <div className="font-mono-num text-lg font-bold text-[#ffd23f] tabular-nums mt-0.5">
                  {st.value}
                </div>
              </div>
            ))}
            {modal.result.pointsEarned > 0 && (
              <div className="col-span-2 rounded-xl bg-[#1b0a14] border border-[#86efac]/40 px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#bbf7d0]">Điểm thưởng nhận được</span>
                <span className="font-mono-num text-base font-bold text-[#86efac] tabular-nums">
                  +{modal.result.pointsEarned}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={onReturnVillage}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 min-h-[46px] rounded-xl bg-[#3c1a2d] hover:bg-[#51233d] text-[#fff3d6] font-bold text-sm border border-[#f5b942]/50 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Về làng</span>
            </button>
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 min-h-[46px] rounded-xl bg-[#f59e0b] hover:bg-[#fbbf24] text-[#290f14] font-extrabold text-sm border-2 border-[#fff3c4] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Chơi lại</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
