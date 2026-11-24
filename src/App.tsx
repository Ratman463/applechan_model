import { useCallback, useEffect, useRef, useState } from 'react';
import { OrchardHUD } from './components/OrchardHUD';
import {
  detectInitialLanguage,
  saveLanguagePreference,
  TRANSLATIONS,
} from './i18n';
import { createInitialFarmState } from './scene/farmConfig';
import { OrchardEngine } from './scene/OrchardEngine';
import {
  AppleChanAction,
  AppleChanOutfit,
  CameraPreset,
  CropId,
  FarmState,
  JournalTab,
  Language,
  OrchardStats,
  OrchardUpgrades,
  PlayerSession,
  ProduceId,
  RealTimeInfo,
  RushState,
  SpeechMessage,
  TimeMode,
  WeatherInfo,
} from './scene/types';
import {
  checkSqliteBackend,
  downloadPlayerSqliteDb,
  loginPlayerAccount,
  registerPlayerAccount,
  savePlayerGameState,
} from './services/playerDb';
import {
  fetchLocalWeather,
  getFallbackWeather,
  getRealTimeSnapshot,
} from './services/realtimeWeather';

const GUIDE_SEEN_KEY = 'applechan_orchard_guide_seen_v1';

function shouldShowGuideOnFirstVisit(): boolean {
  try {
    return window.localStorage.getItem(GUIDE_SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<OrchardEngine | null>(null);
  const speechTimerRef = useRef<number | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const skipNextAutoSaveRef = useRef(false);

  const [language, setLanguage] = useState<Language>(() => detectInitialLanguage());
  const initialLangRef = useRef<Language>(language);

  const [timeMode, setTimeMode] = useState<TimeMode>('realtime');
  const [realTime, setRealTime] = useState<RealTimeInfo>(() =>
    getRealTimeSnapshot(initialLangRef.current),
  );
  const [weather, setWeather] = useState<WeatherInfo>(() => getFallbackWeather());
  const [outfit, setOutfit] = useState<AppleChanOutfit>('common');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset | null>('appleChan');
  const [currentAction, setCurrentAction] = useState<AppleChanAction>('stroll');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [guideOpen, setGuideOpen] = useState<boolean>(() => shouldShowGuideOnFirstVisit());
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalTab, setJournalTab] = useState<JournalTab>('bag');

  // Individual per-user SQLite account state (Bearer token strictly kept in memory)
  const [accountOpen, setAccountOpen] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const [stats, setStats] = useState<OrchardStats>({
    applesHarvested: 0,
    goldenApples: 0,
    treesHugged: 0,
    saplingsWatered: 0,
    trustPercent: 0,
    bestRushScore: 0,
  });
  const [farm, setFarm] = useState<FarmState>(() => createInitialFarmState());
  const [rush, setRush] = useState<RushState>({
    active: false,
    finished: false,
    timeLeft: 60,
    score: 0,
    combo: 0,
    bestScore: 0,
    isNewRecord: false,
    roundApples: 0,
    roundGolden: 0,
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

  const openJournalTab = useCallback((tab?: JournalTab) => {
    if (tab) setJournalTab(tab);
    setJournalOpen(true);
  }, []);

  // Sync <html lang>, <title>, real-time formatted date, and engine 3D signboards on language change
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = TRANSLATIONS[language].pageTitle;
    engineRef.current?.setLanguage(language);
    setRealTime(getRealTimeSnapshot(language));
  }, [language]);

  // Keep user's local timezone date & clock continuously synced (updates every 15s)
  useEffect(() => {
    const syncClock = () => {
      const snap = getRealTimeSnapshot(language);
      setRealTime(snap);
      engineRef.current?.setRealTimeHour(snap.hourDecimal);
    };
    syncClock();
    const id = window.setInterval(syncClock, 15_000);
    return () => window.clearInterval(id);
  }, [language]);

  // Fetch live local weather matching user's timezone (refreshes every 15 minutes)
  useEffect(() => {
    let active = true;
    const syncWeather = async () => {
      const info = await fetchLocalWeather();
      if (!active) return;
      setWeather(info);
      engineRef.current?.setWeather(info.kind);
    };
    void syncWeather();
    const id = window.setInterval(() => void syncWeather(), 15 * 60_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  // Probe per-user SQLite Express backend availability
  useEffect(() => {
    let active = true;
    void checkSqliteBackend().then((ok) => {
      if (active) setBackendAvailable(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleCloseGuide = useCallback(() => {
    setGuideOpen(false);
    try {
      window.localStorage.setItem(GUIDE_SEEN_KEY, '1');
    } catch {
      // Ignore storage failures
    }
  }, []);

  // Pause WASD movement while any modal is open
  useEffect(() => {
    engineRef.current?.setInputPaused(
      guideOpen ||
        journalOpen ||
        accountOpen ||
        rush.finished ||
        farm.pendingSummary !== null,
    );
  }, [guideOpen, journalOpen, accountOpen, rush.finished, farm.pendingSummary]);

  // Mount Three.js engine once in an isolated ref container so React UI never resets WebGL
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new OrchardEngine(
      container,
      {
        onStatsChange: (next) => setStats(next),
        onFarmStateChange: (nextFarm) => setFarm(nextFarm),
        onSpeech: (msg) => showSpeech(msg),
        onActionChange: (action) => setCurrentAction(action),
        onCameraPresetClear: () => setCameraPreset(null),
        onRushStateChange: (nextRush) => setRush(nextRush),
        onOpenJournalTab: (tab) => openJournalTab(tab),
      },
      initialLangRef.current,
    );
    engineRef.current = engine;

    const snap = getRealTimeSnapshot(initialLangRef.current);
    engine.setTimeMode('realtime');
    engine.setRealTimeHour(snap.hourDecimal);
    engine.setWeather(weather.kind);

    return () => {
      if (speechTimerRef.current !== null) {
        window.clearTimeout(speechTimerRef.current);
      }
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSpeech, openJournalTab]);

  // Push weather updates to the 3D engine whenever weather state changes
  useEffect(() => {
    engineRef.current?.setWeather(weather.kind);
  }, [weather.kind]);

  // Debounced automatic persistence to the signed-in player's individual SQLite database
  useEffect(() => {
    if (!session || !backendAvailable) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      const engine = engineRef.current;
      if (!engine) return;
      const snapshot = engine.getPersistedState();
      void savePlayerGameState(session.token, snapshot)
        .then(({ updatedAt }) => {
          setSession((prev) => (prev ? { ...prev, updatedAt } : null));
        })
        .catch(() => {
          // Silent retry on next state change or manual Save Now
        });
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [farm, stats, outfit, session?.token, backendAvailable]);

  // Keyboard shortcuts: 'H' for Hide Controls, 'Escape' to close modals
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
        handleCloseGuide();
        setJournalOpen(false);
        setAccountOpen(false);
        engineRef.current?.dismissDaySummary();
        engineRef.current?.stopHarvestRush(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCloseGuide]);

  const handleToggleLanguage = () => {
    setLanguage((prev) => {
      const next: Language = prev === 'en' ? 'zh' : 'en';
      saveLanguagePreference(next);
      return next;
    });
  };

  const handleTimeMode = (mode: TimeMode) => {
    setTimeMode(mode);
    engineRef.current?.setTimeMode(mode);
    if (mode === 'realtime') {
      const snap = getRealTimeSnapshot(language);
      setRealTime(snap);
      engineRef.current?.setRealTimeHour(snap.hourDecimal);
    }
  };

  const handleOutfit = (next: AppleChanOutfit) => {
    setOutfit(next);
    engineRef.current?.setOutfit(next);
  };

  const handleCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    engineRef.current?.setCameraPreset(preset);
  };

  const handleSleep = () => {
    setJournalOpen(false);
    if (timeMode === 'night') {
      setTimeMode('morning');
      engineRef.current?.setTimeMode('morning');
    }
    engineRef.current?.sleepAndAdvanceDay();
  };

  const handleStartRush = () => {
    setJournalOpen(false);
    engineRef.current?.startHarvestRush();
  };

  const handleToggleAudio = () => {
    setAudioEnabled((prev) => {
      const next = !prev;
      engineRef.current?.setAudioEnabled(next);
      return next;
    });
  };

  const handleRegister = async (username: string, password: string) => {
    const initialState = engineRef.current?.getPersistedState() ?? {
      farm,
      stats,
      outfit,
    };
    const res = await registerPlayerAccount(username, password, initialState);
    skipNextAutoSaveRef.current = true;
    setSession(res.session);
    setSaveToast(TRANSLATIONS[language].accountSavedToast);
  };

  const handleLogin = async (username: string, password: string) => {
    const res = await loginPlayerAccount(username, password);
    skipNextAutoSaveRef.current = true;
    setSession(res.session);
    if (res.gamestate) {
      engineRef.current?.hydratePersistedState(res.gamestate);
      if (
        res.gamestate.outfit === 'common' ||
        res.gamestate.outfit === 'spring' ||
        res.gamestate.outfit === 'idol'
      ) {
        setOutfit(res.gamestate.outfit);
      }
    }
    setSaveToast(null);
  };

  const handleSaveAccount = async () => {
    if (!session || !engineRef.current) return;
    setSavingAccount(true);
    setSaveToast(null);
    try {
      const snapshot = engineRef.current.getPersistedState();
      const { updatedAt } = await savePlayerGameState(session.token, snapshot);
      setSession((prev) => (prev ? { ...prev, updatedAt } : null));
      setSaveToast(TRANSLATIONS[language].accountSavedToast);
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDownloadDb = async () => {
    if (!session) return;
    await downloadPlayerSqliteDb(session.token, session.username);
  };

  const handleSignOut = () => {
    setSession(null);
    setSaveToast(null);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Stable isolated WebGL canvas container */}
      <div
        ref={mountRef}
        className="h-full w-full"
        aria-label={TRANSLATIONS[language].ariaCanvas}
      />

      {/* Semantic DOM HUD Overlay */}
      <OrchardHUD
        language={language}
        timeMode={timeMode}
        realTime={realTime}
        weather={weather}
        outfit={outfit}
        cameraPreset={cameraPreset}
        currentAction={currentAction}
        audioEnabled={audioEnabled}
        stats={stats}
        farm={farm}
        rush={rush}
        speech={speech}
        dockCollapsed={dockCollapsed}
        guideOpen={guideOpen}
        journalOpen={journalOpen}
        journalTab={journalTab}
        accountOpen={accountOpen}
        session={session}
        backendAvailable={backendAvailable}
        savingAccount={savingAccount}
        saveToast={saveToast}
        onLanguageToggle={handleToggleLanguage}
        onTimeModeChange={handleTimeMode}
        onOutfitChange={handleOutfit}
        onCameraPresetChange={handleCameraPreset}
        onHugTree={() => engineRef.current?.triggerHugNearestTree()}
        onWaterSaplings={() => engineRef.current?.triggerWaterSaplings()}
        onPlantSeed={() => engineRef.current?.plantInFirstEmptyPlot()}
        onWave={() => engineRef.current?.triggerWave()}
        onSleep={handleSleep}
        onDismissSummary={() => engineRef.current?.dismissDaySummary()}
        onShipItem={(item: ProduceId, count: number) =>
          engineRef.current?.shipItem(item, count)
        }
        onEatProduce={(item: 'redApples' | 'honeyBerries') =>
          engineRef.current?.eatProduce(item)
        }
        onCraftArtisan={(recipe: 'cider' | 'pie') =>
          engineRef.current?.craftArtisan(recipe)
        }
        onBuySeed={(crop: CropId) => engineRef.current?.buySeed(crop)}
        onBuyUpgrade={(key: keyof OrchardUpgrades) =>
          engineRef.current?.buyUpgrade(key)
        }
        onDeliverOrder={(orderId: string) =>
          engineRef.current?.deliverOrder(orderId)
        }
        onStartRush={handleStartRush}
        onStopRush={() => engineRef.current?.stopHarvestRush(true)}
        onToggleAudio={handleToggleAudio}
        onToggleDock={() => setDockCollapsed((prev) => !prev)}
        onOpenGuide={() => setGuideOpen(true)}
        onCloseGuide={handleCloseGuide}
        onOpenJournal={openJournalTab}
        onCloseJournal={() => setJournalOpen(false)}
        onSelectJournalTab={setJournalTab}
        onOpenAccount={() => {
          setSaveToast(null);
          setAccountOpen(true);
        }}
        onCloseAccount={() => setAccountOpen(false)}
        onRegister={handleRegister}
        onLogin={handleLogin}
        onSaveAccount={handleSaveAccount}
        onDownloadDb={handleDownloadDb}
        onSignOut={handleSignOut}
      />
    </main>
  );
}
