import { useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { GameModals } from './components/GameModals';
import { TitleScreen } from './components/TitleScreen';
import { GameEngine } from './game/engine';
import type { HudSnapshot } from './game/types';

const INITIAL_SNAP: HudSnapshot = {
  scene: 'title',
  modal: null,
  endingActive: false,
  muted: false,
  points: 0,
  activeQuest: null,
  nearNpc: null,
  toast: null,
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [snap, setSnap] = useState<HudSnapshot>(INITIAL_SNAP);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    const engine = new GameEngine(canvas, (nextSnap) => {
      setSnap(nextSnap);
    });
    engineRef.current = engine;
    engine.start(autostart);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#14091e] flex items-center justify-center">
      {/* Isolated Canvas Container */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        onClick={() => {
          if (snap.endingActive) {
            engineRef.current?.skipEnding();
          }
        }}
        className="block"
      />

      {/* Title Screen */}
      {snap.scene === 'title' && !snap.modal && (
        <TitleScreen
          points={snap.points}
          muted={snap.muted}
          onStart={() => engineRef.current?.startFromTitle()}
          onHelp={() => engineRef.current?.openHelp('title')}
          onToggleMute={() => engineRef.current?.toggleMute()}
        />
      )}

      {/* Playing HUD */}
      {snap.scene !== 'title' && (
        <GameHud
          snap={snap}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onPause={() => engineRef.current?.pauseGame()}
          onHelp={() => engineRef.current?.openHelp('village')}
          onOpenGame={(id, name) => engineRef.current?.openModeSelect(id, name)}
          onSkipEnding={() => engineRef.current?.skipEnding()}
          onVirtualKey={(code, down) => engineRef.current?.setVirtualKey(code, down)}
          onPulseKey={(code) => engineRef.current?.pulseVirtualKey(code)}
        />
      )}

      {/* Modals */}
      <GameModals
        modal={snap.modal}
        muted={snap.muted}
        inVillage={snap.scene === 'village'}
        onClose={() => engineRef.current?.closeModal()}
        onSelectMode={(id, opts) => engineRef.current?.selectMode(id, opts)}
        onStartFromIntro={() => engineRef.current?.beginMiniGameFromIntro()}
        onResume={() => engineRef.current?.resumeGame()}
        onRestart={() => engineRef.current?.restartCurrentGame()}
        onReturnVillage={() => engineRef.current?.returnToVillage()}
        onToggleMute={() => engineRef.current?.toggleMute()}
      />
    </main>
  );
}
