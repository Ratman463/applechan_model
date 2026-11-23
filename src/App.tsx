import { useCallback, useEffect, useRef, useState } from 'react';
import { OrchardHUD } from './components/OrchardHUD';
import { OrchardEngine } from './scene/OrchardEngine';
import {
  AppleChanAction,
  AppleChanOutfit,
  CameraPreset,
  OrchardStats,
  SpeechMessage,
  TimeOfDay,
} from './scene/types';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<OrchardEngine | null>(null);
  const speechTimerRef = useRef<number | null>(null);

  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
  const [outfit, setOutfit] = useState<AppleChanOutfit>('common');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset | null>('orchard');
  const [currentAction, setCurrentAction] = useState<AppleChanAction>('stroll');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [stats, setStats] = useState<OrchardStats>({
    applesHarvested: 0,
    treesHugged: 0,
    saplingsWatered: 0,
  });
  const [speech, setSpeech] = useState<SpeechMessage | null>(null);

  const showSpeech = useCallback((msg: SpeechMessage) => {
    setSpeech(msg);
    if (speechTimerRef.current !== null) {
      window.clearTimeout(speechTimerRef.current);
    }
    speechTimerRef.current = window.setTimeout(() => {
      setSpeech(null);
    }, 4500);
  }, []);

  // Mount Three.js engine once in an isolated ref container so React UI never resets WebGL
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new OrchardEngine(container, {
      onStatsChange: (next) => setStats(next),
      onSpeech: (msg) => showSpeech(msg),
      onActionChange: (action) => setCurrentAction(action),
      onCameraPresetClear: () => setCameraPreset(null),
    });
    engineRef.current = engine;

    return () => {
      if (speechTimerRef.current !== null) {
        window.clearTimeout(speechTimerRef.current);
      }
      engine.dispose();
      engineRef.current = null;
    };
  }, [showSpeech]);

  // Keyboard shortcut 'H' for Zen / Hide Controls mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      } else if (e.key === 'Escape') {
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleTimeOfDay = (mode: TimeOfDay) => {
    setTimeOfDay(mode);
    engineRef.current?.setTimeOfDay(mode);
  };

  const handleOutfit = (next: AppleChanOutfit) => {
    setOutfit(next);
    engineRef.current?.setOutfit(next);
  };

  const handleCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    engineRef.current?.setCameraPreset(preset);
  };

  const handleHugTree = () => {
    engineRef.current?.triggerHugNearestTree();
  };

  const handleWaterSaplings = () => {
    engineRef.current?.triggerWaterSaplings();
  };

  const handleWave = () => {
    engineRef.current?.triggerWave();
  };

  const handleToggleAudio = () => {
    setAudioEnabled((prev) => {
      const next = !prev;
      engineRef.current?.setAudioEnabled(next);
      return next;
    });
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Stable isolated WebGL canvas container */}
      <div
        ref={mountRef}
        className="h-full w-full"
        aria-label="Interactive 3D Minecraft-style Apple Orchard featuring Apple-chan"
      />

      {/* Semantic DOM HUD Overlay */}
      <OrchardHUD
        timeOfDay={timeOfDay}
        outfit={outfit}
        cameraPreset={cameraPreset}
        currentAction={currentAction}
        audioEnabled={audioEnabled}
        stats={stats}
        speech={speech}
        dockCollapsed={dockCollapsed}
        profileOpen={profileOpen}
        onTimeOfDayChange={handleTimeOfDay}
        onOutfitChange={handleOutfit}
        onCameraPresetChange={handleCameraPreset}
        onHugTree={handleHugTree}
        onWaterSaplings={handleWaterSaplings}
        onWave={handleWave}
        onToggleAudio={handleToggleAudio}
        onToggleDock={() => setDockCollapsed((prev) => !prev)}
        onToggleProfile={setProfileOpen}
      />
    </main>
  );
}
