import { BookOpen, Play, Volume2, VolumeX } from 'lucide-react';

interface TitleScreenProps {
  points: number;
  muted: boolean;
  onStart: () => void;
  onHelp: () => void;
  onToggleMute: () => void;
}

export function TitleScreen({
  points,
  muted,
  onStart,
  onHelp,
  onToggleMute,
}: TitleScreenProps) {
  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-between p-6 md:p-10 pointer-events-none">
      {/* Top-right compact audio control */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={muted ? 'Bật âm thanh (Z)' : 'Tắt âm thanh (Z)'}
          className="pointer-events-auto inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#26111e]/90 border-2 border-[#f5b942]/60 text-[#ffe8a3] hover:bg-[#3a192c] hover:border-[#ffd23f] active:scale-95 transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-[#ffd23f]"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Title Lockup over left calm negative space */}
      <div className="my-auto max-w-xl">
        <div className="pointer-events-auto inline-block w-full">
          {/* Bespoke Vietnamese Folk-Lantern SVG Title Lockup */}
          <svg
            viewBox="0 0 540 220"
            className="w-full max-w-[320px] sm:max-w-[440px] md:max-w-[490px] h-auto drop-shadow-[0_10px_24px_rgba(12,4,20,0.75)]"
            role="img"
            aria-label="Người Miền Làng Chất - Trò chơi dân gian phiên bản cách tân"
          >
            {/* Decorative roof ridge & lantern crest */}
            <path
              d="M36 38 Q145 10 270 26 Q395 10 504 38"
              fill="none"
              stroke="#ffd23f"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle cx="270" cy="20" r="6" fill="#ffd23f" />
            <circle cx="36" cy="38" r="4" fill="#ff6b6b" />
            <circle cx="504" cy="38" r="4" fill="#ff6b6b" />

            {/* Upper line: NGƯỜI MIỀN */}
            <text
              x="16"
              y="96"
              fontFamily="Bricolage Grotesque, Plus Jakarta Sans, sans-serif"
              fontWeight="800"
              fontSize="56"
              letterSpacing="-1"
              fill="#fff3c4"
              stroke="#3b1219"
              strokeWidth="10"
              paintOrder="stroke fill"
            >
              NGƯỜI MIỀN
            </text>

            {/* Lower line: LÀNG CHẤT */}
            <text
              x="16"
              y="174"
              fontFamily="Bricolage Grotesque, Plus Jakarta Sans, sans-serif"
              fontWeight="800"
              fontSize="66"
              letterSpacing="0.5"
              fill="#ffd23f"
              stroke="#3b1219"
              strokeWidth="11"
              paintOrder="stroke fill"
            >
              LÀNG CHẤT
            </text>

            {/* Subtitle rule */}
            <line x1="18" y1="196" x2="88" y2="196" stroke="#ff7b54" strokeWidth="3" strokeLinecap="round" />
            <text
              x="100"
              y="201"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="700"
              fontSize="16"
              fill="#ffe8c2"
              letterSpacing="1.2"
            >
              TRÒ CHƠI DÂN GIAN · PHIÊN BẢN CÁCH TÂN
            </text>
          </svg>

          {/* Primary Actions (<= 2 actions) */}
          <div className="mt-5 md:mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onStart();
              }}
              className="inline-flex items-center justify-center gap-2.5 px-6 md:px-7 py-3 md:py-3.5 min-h-[46px] md:min-h-[48px] rounded-xl bg-[#f59e0b] hover:bg-[#fbbf24] text-[#290f14] font-display font-extrabold text-base md:text-lg tracking-wide border-2 border-[#fff3c4] shadow-[0_6px_0_#7c2d12,0_12px_24px_rgba(0,0,0,0.45)] active:translate-y-[2px] active:shadow-[0_4px_0_#7c2d12] transition-transform duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Bắt đầu hội làng</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onHelp();
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 md:py-3.5 min-h-[46px] md:min-h-[48px] rounded-xl bg-[#26111e]/90 hover:bg-[#3a192c] text-[#fff3d6] font-semibold text-sm md:text-base border-2 border-[#f5b942]/55 hover:border-[#ffd23f] transition-transform duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#ffd23f]"
            >
              <BookOpen className="w-4 h-4 text-[#ffd23f]" />
              <span>Hướng dẫn</span>
            </button>
          </div>

          <div className="mt-3.5 flex items-center gap-3 text-sm text-[#ffe8c2]/90 font-semibold">
            <span>Điểm tích lũy:</span>
            <span className="font-mono-num text-base font-bold text-[#ffd23f] tabular-nums">
              {points}
            </span>
          </div>
        </div>
      </div>

      {/* Single flat borderless control-hint line in bottom safe margin */}
      <div className="text-xs md:text-sm text-[#ffe8c2]/80 font-medium tracking-wide">
        WASD / Mũi tên Di chuyển · E Tương tác · Space / Enter Hành động · P Tạm dừng · Z Âm thanh
      </div>
    </div>
  );
}
