import {
  Backpack,
  BedDouble,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Coins,
  Compass,
  Crosshair,
  Droplets,
  Flame,
  Flower2,
  Globe,
  Hammer,
  Hand,
  Heart,
  HelpCircle,
  Home,
  Lock,
  Moon,
  Package,
  RotateCcw,
  ScrollText,
  Shirt,
  ShoppingBag,
  Sparkles,
  Sprout,
  Store,
  Sun,
  Sunset,
  Timer,
  Trophy,
  User,
  UserCheck,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n';
import { CROP_SPECS, getSellPrice, UPGRADE_PRICES } from '../scene/farmConfig';
import {
  AppleChanAction,
  AppleChanOutfit,
  CameraPreset,
  CraftingRecipeId,
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
  Season,
  SpeechMessage,
  TimeMode,
  WeatherInfo,
  WeatherKind,
} from '../scene/types';
import { AccountModal } from './AccountModal';
import { CraftingModal } from './CraftingModal';
import { IconTooltipButton } from './IconTooltipButton';

interface OrchardHUDProps {
  language: Language;
  timeMode: TimeMode;
  realTime: RealTimeInfo;
  activeSeason: Season;
  weather: WeatherInfo;
  outfit: AppleChanOutfit;
  cameraPreset: CameraPreset | null;
  currentAction: AppleChanAction;
  audioEnabled: boolean;
  stats: OrchardStats;
  farm: FarmState;
  rush: RushState;
  speech: SpeechMessage | null;
  dockCollapsed: boolean;
  guideOpen: boolean;
  journalOpen: boolean;
  journalTab: JournalTab;
  craftingOpen: boolean;
  accountOpen: boolean;
  session: PlayerSession | null;
  backendAvailable: boolean;
  savingAccount: boolean;
  saveToast: string | null;
  onLanguageToggle: () => void;
  onCycleSeason: () => void;
  onTimeModeChange: (mode: TimeMode) => void;
  onOutfitChange: (outfit: AppleChanOutfit) => void;
  onCameraPresetChange: (preset: CameraPreset) => void;
  onHugTree: () => void;
  onWaterSaplings: () => void;
  onPlantSeed: () => void;
  onWave: () => void;
  onSleep: () => void;
  onDismissSummary: () => void;
  onShipItem: (item: ProduceId, count: number) => void;
  onEatProduce: (item: 'redApples' | 'honeyBerries') => void;
  onCraftArtisan: (recipe: 'cider' | 'pie') => void;
  onCraftRecipe: (recipe: CraftingRecipeId) => void;
  onBuySeed: (crop: CropId) => void;
  onBuyUpgrade: (key: keyof OrchardUpgrades) => void;
  onDeliverOrder: (orderId: string) => void;
  onStartRush: () => void;
  onStopRush: () => void;
  onToggleAudio: () => void;
  onToggleDock: () => void;
  onOpenGuide: () => void;
  onCloseGuide: () => void;
  onOpenJournal: (tab?: JournalTab) => void;
  onCloseJournal: () => void;
  onSelectJournalTab: (tab: JournalTab) => void;
  onOpenCrafting: () => void;
  onCloseCrafting: () => void;
  onOpenAccount: () => void;
  onCloseAccount: () => void;
  onRegister: (username: string, password: string) => Promise<void>;
  onLogin: (username: string, password: string) => Promise<void>;
  onSaveAccount: () => Promise<void>;
  onDownloadDb: () => Promise<void>;
  onSignOut: () => void;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function WeatherGlyph({ kind, isNight }: { kind: WeatherKind; isNight: boolean }) {
  switch (kind) {
    case 'rain':
      return <CloudRain className="h-3.5 w-3.5 text-[#3678ad]" />;
    case 'snow':
      return <CloudSnow className="h-3.5 w-3.5 text-[#6ea8e0]" />;
    case 'storm':
      return <CloudLightning className="h-3.5 w-3.5 text-[#c88924]" />;
    case 'cloudy':
      return <Cloud className="h-3.5 w-3.5 text-[#6e7b8a]" />;
    default:
      return isNight ? (
        <Moon className="h-3.5 w-3.5 text-[#f2c05c]" />
      ) : (
        <Sun className="h-3.5 w-3.5 text-[#c88924]" />
      );
  }
}

const PRODUCE_ORDER: ProduceId[] = [
  'redApples',
  'goldenApples',
  'honeyBerries',
  'ciderBottles',
  'applePies',
];

const CROP_ORDER: CropId[] = ['honeyBerry', 'appleSapling', 'goldenSapling'];

export function OrchardHUD({
  language,
  timeMode,
  realTime,
  activeSeason,
  weather,
  outfit,
  cameraPreset,
  currentAction,
  audioEnabled,
  stats,
  farm,
  rush,
  speech,
  dockCollapsed,
  guideOpen,
  journalOpen,
  journalTab,
  craftingOpen,
  accountOpen,
  session,
  backendAvailable,
  savingAccount,
  saveToast,
  onLanguageToggle,
  onCycleSeason,
  onTimeModeChange,
  onOutfitChange,
  onCameraPresetChange,
  onHugTree,
  onWaterSaplings,
  onPlantSeed,
  onWave,
  onSleep,
  onDismissSummary,
  onShipItem,
  onEatProduce,
  onCraftArtisan,
  onCraftRecipe,
  onBuySeed,
  onBuyUpgrade,
  onDeliverOrder,
  onStartRush,
  onStopRush,
  onToggleAudio,
  onToggleDock,
  onOpenGuide,
  onCloseGuide,
  onOpenJournal,
  onCloseJournal,
  onSelectJournalTab,
  onOpenCrafting,
  onCloseCrafting,
  onOpenAccount,
  onCloseAccount,
  onRegister,
  onLogin,
  onSaveAccount,
  onDownloadDb,
  onSignOut,
}: OrchardHUDProps) {
  const t = TRANSLATIONS[language];
  const isNight =
    timeMode === 'night' || (timeMode === 'realtime' && realTime.phase === 'night');

  // Authentic Minecraft Blocky GUI Tokens
  const panelClass = isNight ? 'mc-panel-dark' : 'mc-panel';
  const insetClass = isNight ? 'mc-inset-dark' : 'mc-inset';
  const btnClass = isNight ? 'mc-btn-dark' : 'mc-btn';
  const hotbarSlot = 'mc-slot-dark text-[#f0f0f0]';
  const mutedText = isNight ? 'text-[#b5bcc7]' : 'text-[#424242]';
  const dividerColor = 'bg-black/35';

  const comboMult = Math.min(4, 1 + Math.floor(rush.combo / 4));
  const activeSeasonText = t.seasons[activeSeason];
  const energyPct = Math.round((farm.energy / farm.maxEnergy) * 100);
  const energyBlocks = Math.round((farm.energy / farm.maxEnergy) * 10);
  const totalSeedsOwned =
    farm.inventory.seeds.honeyBerry +
    farm.inventory.seeds.appleSapling +
    farm.inventory.seeds.goldenSapling;
  const totalProduceStored = PRODUCE_ORDER.reduce(
    (sum, k) => sum + farm.inventory[k],
    0,
  );

  const pendingShippingValue = PRODUCE_ORDER.reduce(
    (sum, k) => sum + farm.shippingBin[k] * getSellPrice(k, farm.upgrades.artisanKeg),
    0,
  );
  const readyOrdersCount = farm.orders.filter(
    (o) => !o.completed && farm.inventory[o.item] >= o.required,
  ).length;

  const accountTooltip = session
    ? `${t.accountSignedInAs}: ${session.username}`
    : t.accountBtn;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Top Bar: Minecraft Status Block + Minecraft Icon-Only Hotbar Cluster */}
      <header className="flex flex-wrap items-start justify-between gap-2.5 p-3 sm:p-4">
        {/* Top-Left: Title, Real-Time Local Date/Clock, Clickable Season, Weather, Gold & Energy */}
        <div
          className={`pointer-events-auto flex items-center gap-3 px-3.5 py-2 sm:px-4 ${panelClass}`}
        >
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <h1
                className="text-base font-bold leading-tight tracking-tight whitespace-nowrap sm:text-lg"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t.appTitle}
              </h1>
              <span
                className={`text-xs font-bold whitespace-nowrap tabular-nums ${
                  isNight ? 'text-[#89d966]' : 'text-[#2c5c1a]'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {realTime.dateText} · {realTime.timeText}
              </span>
              <button
                type="button"
                onClick={onCycleSeason}
                title={t.seasonCycleTooltip}
                className={`px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap cursor-pointer ${btnClass}`}
              >
                {activeSeasonText}
              </button>
            </div>

            <div
              className={`mt-1 flex flex-wrap items-center gap-2.5 text-xs tabular-nums ${mutedText}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <span className="flex items-center gap-1 font-bold">
                <WeatherGlyph kind={weather.kind} isNight={isNight} />
                <span>
                  {t.weatherNames[weather.kind]}
                  {weather.temperatureC !== null ? ` ${weather.temperatureC}°C` : ''}
                </span>
              </span>
              <span aria-hidden="true">|</span>
              <span
                className={`flex items-center gap-1 font-bold ${
                  isNight ? 'text-[#f2c05c]' : 'text-[#8a5607]'
                }`}
              >
                <Coins className="h-3.5 w-3.5" />
                {farm.gold}
                {t.goldShort}
              </span>
              <span aria-hidden="true">|</span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-[#4f8a36]" />
                {/* Classic Minecraft segmented XP/Energy bar */}
                <span className="inline-flex gap-[1px] border border-[#141414] bg-[#1e1e1e] p-[1px]">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`block h-2 w-1.5 ${
                        idx < energyBlocks
                          ? energyPct <= 20
                            ? 'bg-[#d64940]'
                            : 'bg-[#62c938]'
                          : 'bg-[#363636]'
                      }`}
                    />
                  ))}
                </span>
                <span className="font-bold">{farm.energy}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Top-Center: Active Harvest Rush Scoreboard */}
        {rush.active && (
          <div className="pointer-events-auto order-3 mx-auto flex flex-col items-center sm:order-2">
            <div
              className={`flex items-center gap-3 px-4 py-2 tabular-nums ${panelClass}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <div className="flex items-center gap-1.5">
                <Timer
                  className={`h-4 w-4 ${
                    rush.timeLeft <= 10 ? 'text-[#c9352b]' : 'text-[#c88924]'
                  }`}
                />
                <span
                  className={`text-sm font-bold ${
                    rush.timeLeft <= 10 ? 'text-[#c9352b]' : ''
                  }`}
                >
                  {formatClock(rush.timeLeft)}
                </span>
              </div>

              <div className={`h-4 w-0.5 ${dividerColor}`} aria-hidden="true" />

              <div className="text-xs font-bold">
                <span className={mutedText}>{t.rushScoreLabel} </span>
                <span className="text-sm font-bold">{rush.score}</span>
              </div>

              {rush.combo >= 2 && (
                <>
                  <div className={`h-4 w-0.5 ${dividerColor}`} aria-hidden="true" />
                  <div className="text-xs font-bold text-[#c88924]">
                    {t.rushComboLabel} {rush.combo} (x{comboMult})
                  </div>
                </>
              )}

              <div className={`h-4 w-0.5 ${dividerColor}`} aria-hidden="true" />

              <div className={`text-xs font-bold ${mutedText}`}>
                {t.rushBestLabel} {Math.max(rush.bestScore, rush.score)}
              </div>
            </div>
            <p className={`mt-1.5 px-3 py-1 text-center text-xs font-bold ${panelClass}`}>
              {t.rushBannerHint}
            </p>
          </div>
        )}

        {/* Top-Right: Minecraft Dark Hotbar Action Cluster (Icon-Only + Dark-Purple Tooltips) */}
        <div className="mc-hotbar pointer-events-auto order-2 flex items-center gap-1 p-1.5 sm:order-3">
          <IconTooltipButton
            tooltip={t.inventoryBtn}
            placement="bottom"
            badge={totalProduceStored > 0 ? totalProduceStored : null}
            onClick={() => onOpenJournal('bag')}
            className={hotbarSlot}
          >
            <Backpack className="h-4 w-4" />
          </IconTooltipButton>

          <IconTooltipButton
            tooltip={t.craftingBtn}
            placement="bottom"
            active={craftingOpen}
            onClick={onOpenCrafting}
            className="mc-btn-gold"
          >
            <Hammer className="h-4 w-4" />
          </IconTooltipButton>

          <IconTooltipButton
            tooltip={t.journalBtn}
            placement="bottom"
            badge={readyOrdersCount > 0 ? readyOrdersCount : null}
            onClick={() => onOpenJournal(readyOrdersCount > 0 ? 'orders' : 'shop')}
            className={hotbarSlot}
          >
            <Store className="h-4 w-4" />
          </IconTooltipButton>

          {!rush.active && (
            <IconTooltipButton
              tooltip={t.sleepBtn}
              placement="bottom"
              onClick={onSleep}
              className="mc-btn-green"
            >
              <BedDouble className="h-4 w-4" />
            </IconTooltipButton>
          )}

          <IconTooltipButton
            tooltip={rush.active ? t.rushActiveBtn : t.rushBtn}
            placement="bottom"
            onClick={rush.active ? onStopRush : onStartRush}
            className={rush.active ? 'mc-btn-red' : 'mc-btn-gold'}
          >
            <Trophy className="h-4 w-4" />
          </IconTooltipButton>

          <IconTooltipButton
            tooltip={accountTooltip}
            placement="bottom"
            onClick={onOpenAccount}
            className={session ? 'mc-btn-green' : hotbarSlot}
          >
            {session ? <UserCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </IconTooltipButton>

          <IconTooltipButton
            tooltip={t.guideBtn}
            placement="bottom"
            onClick={onOpenGuide}
            className={hotbarSlot}
          >
            <HelpCircle className="h-4 w-4" />
          </IconTooltipButton>

          <IconTooltipButton
            tooltip={t.langSwitchTooltip}
            placement="bottom"
            onClick={onLanguageToggle}
            className={hotbarSlot}
          >
            <Globe className="h-4 w-4" />
          </IconTooltipButton>
        </div>
      </header>

      {/* Bottom Zone: Speech Banner + Classic Minecraft Hotbar Dock */}
      <div className="flex flex-col items-center px-3 pb-3 sm:pb-4">
        {speech && (
          <div
            key={speech.id}
            className={`pointer-events-none mb-2 max-w-md px-4 py-2 text-center text-sm font-semibold ${panelClass}`}
          >
            <span
              className={`font-bold ${
                isNight ? 'text-[#89d966]' : 'text-[#2c5c1a]'
              }`}
            >
              {t.speakerName}:
            </span>{' '}
            <span>{speech.text}</span>
          </div>
        )}

        <div className="pointer-events-auto mb-1">
          <IconTooltipButton
            tooltip={dockCollapsed ? t.showControls : t.hideControls}
            placement="top"
            onClick={onToggleDock}
            className="mc-hotbar text-[#f0f0f0]"
          >
            {dockCollapsed ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </IconTooltipButton>
        </div>

        {!dockCollapsed && (
          <div className="mc-hotbar pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 px-2 py-1.5">
            {/* 1. Interactive Farm & Character Actions */}
            <div className="flex items-center gap-1">
              <IconTooltipButton
                tooltip={t.hugTreeBtn}
                placement="top"
                active={currentAction === 'hug'}
                onClick={onHugTree}
                className={currentAction === 'hug' ? 'mc-btn-red' : hotbarSlot}
              >
                <Heart className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.plantBtn}
                placement="top"
                badge={totalSeedsOwned > 0 ? totalSeedsOwned : null}
                onClick={onPlantSeed}
                className={hotbarSlot}
              >
                <Sprout className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.waterBtn}
                placement="top"
                active={currentAction === 'water'}
                onClick={onWaterSaplings}
                className={currentAction === 'water' ? 'mc-btn-blue' : hotbarSlot}
              >
                <Droplets className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.waveBtn}
                placement="top"
                active={currentAction === 'wave'}
                onClick={onWave}
                className={currentAction === 'wave' ? 'mc-btn-green' : hotbarSlot}
              >
                <Hand className="h-4 w-4" />
              </IconTooltipButton>
            </div>

            <div className="hidden h-7 w-0.5 bg-white/15 sm:block" aria-hidden="true" />

            {/* 2. Outfit Switcher */}
            <div className="flex items-center gap-1">
              <IconTooltipButton
                tooltip={t.outfits.common}
                placement="top"
                active={outfit === 'common'}
                onClick={() => onOutfitChange('common')}
                className={outfit === 'common' ? 'mc-btn-green' : hotbarSlot}
              >
                <Shirt className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.outfits.spring}
                placement="top"
                active={outfit === 'spring'}
                onClick={() => onOutfitChange('spring')}
                className={outfit === 'spring' ? 'mc-btn-green' : hotbarSlot}
              >
                <Flower2 className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.outfits.idol}
                placement="top"
                active={outfit === 'idol'}
                onClick={() => onOutfitChange('idol')}
                className={outfit === 'idol' ? 'mc-btn-green' : hotbarSlot}
              >
                <Sparkles className="h-4 w-4" />
              </IconTooltipButton>
            </div>

            <div className="hidden h-7 w-0.5 bg-white/15 sm:block" aria-hidden="true" />

            {/* 3. Camera Views */}
            <div className="flex items-center gap-1">
              <IconTooltipButton
                tooltip={t.cameras.appleChan}
                placement="top"
                active={cameraPreset === 'appleChan'}
                onClick={() => onCameraPresetChange('appleChan')}
                className={cameraPreset === 'appleChan' ? 'mc-btn-green' : hotbarSlot}
              >
                <Crosshair className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.cameras.orchard}
                placement="top"
                active={cameraPreset === 'orchard'}
                onClick={() => onCameraPresetChange('orchard')}
                className={cameraPreset === 'orchard' ? 'mc-btn-green' : hotbarSlot}
              >
                <Compass className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.cameras.cottage}
                placement="top"
                active={cameraPreset === 'cottage'}
                onClick={() => onCameraPresetChange('cottage')}
                className={cameraPreset === 'cottage' ? 'mc-btn-green' : hotbarSlot}
              >
                <Home className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.cameras.windmill}
                placement="top"
                active={cameraPreset === 'windmill'}
                onClick={() => onCameraPresetChange('windmill')}
                className={cameraPreset === 'windmill' ? 'mc-btn-green' : hotbarSlot}
              >
                <Wind className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.cameras.brook}
                placement="top"
                active={cameraPreset === 'brook'}
                onClick={() => onCameraPresetChange('brook')}
                className={cameraPreset === 'brook' ? 'mc-btn-green' : hotbarSlot}
              >
                <Waves className="h-4 w-4" />
              </IconTooltipButton>
            </div>

            <div className="hidden h-7 w-0.5 bg-white/15 sm:block" aria-hidden="true" />

            {/* 4. Real-Time / Lighting & Sound */}
            <div className="flex items-center gap-1">
              <IconTooltipButton
                tooltip={t.times.realtime}
                placement="top"
                active={timeMode === 'realtime'}
                onClick={() => onTimeModeChange('realtime')}
                className={timeMode === 'realtime' ? 'mc-btn-green' : hotbarSlot}
              >
                <Clock className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.times.morning}
                placement="top"
                active={timeMode === 'morning'}
                onClick={() => onTimeModeChange('morning')}
                className={timeMode === 'morning' ? 'mc-btn-green' : hotbarSlot}
              >
                <Sun className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.times.sunset}
                placement="top"
                active={timeMode === 'sunset'}
                onClick={() => onTimeModeChange('sunset')}
                className={timeMode === 'sunset' ? 'mc-btn-green' : hotbarSlot}
              >
                <Sunset className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.times.night}
                placement="top"
                active={timeMode === 'night'}
                onClick={() => onTimeModeChange('night')}
                className={timeMode === 'night' ? 'mc-btn-green' : hotbarSlot}
              >
                <Moon className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={audioEnabled ? t.audioMuteTitle : t.audioPlayTitle}
                placement="top"
                active={audioEnabled}
                onClick={onToggleAudio}
                className={audioEnabled ? 'mc-btn-green' : hotbarSlot}
              >
                {audioEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </IconTooltipButton>
            </div>
          </div>
        )}
      </div>

      {/* Minecraft-Style Welcome & Help Guidebook Popup */}
      {guideOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          onClick={onCloseGuide}
        >
          <div
            className={`flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden ${panelClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b-2 border-black/25 px-5 pt-4 pb-3">
              <div>
                <h2
                  className="text-lg font-bold tracking-tight sm:text-xl"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {t.guideTitle}
                </h2>
                <p className={`mt-0.5 text-xs ${mutedText}`}>{t.guideSubtitle}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onLanguageToggle}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold cursor-pointer ${btnClass}`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{language === 'en' ? '中文' : 'EN'}</span>
                </button>
                <button
                  type="button"
                  onClick={onCloseGuide}
                  aria-label={t.closeBtn}
                  className={`flex h-8 w-8 items-center justify-center cursor-pointer ${btnClass}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4 text-sm">
              {/* Section 1: Controls & Keybindings */}
              <div>
                <h3 className="mb-2 text-xs font-bold tracking-wide uppercase">
                  {t.guideControlsHeading}
                </h3>
                <div className={`divide-y divide-black/15 ${insetClass}`}>
                  {t.guideControlsItems.map((item) => (
                    <div
                      key={item.keys}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                    >
                      <kbd
                        className={`px-2 py-0.5 font-bold whitespace-nowrap ${btnClass}`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {item.keys}
                      </kbd>
                      <span className={`flex-1 text-right sm:text-left ${mutedText}`}>
                        {item.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Cozy Orchard & Cottage Loop */}
              <div>
                <h3 className="mb-2 text-xs font-bold tracking-wide uppercase">
                  {t.guideFarmHeading}
                </h3>
                <ul className={`space-y-2 p-3 text-xs leading-relaxed ${insetClass}`}>
                  {t.guideFarmSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        className="mc-btn-green mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[10px] font-bold"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Section 3: Harvest Rush */}
              <div className={`p-3 text-xs leading-relaxed ${insetClass}`}>
                <div className="mb-1 flex items-center gap-1.5 font-bold text-[#c88924]">
                  <Trophy className="h-3.5 w-3.5" />
                  <span>{t.guideRushHeading}</span>
                </div>
                <p className={mutedText}>{t.guideRushDesc}</p>
              </div>
            </div>

            <div className="flex items-center justify-end border-t-2 border-black/25 px-5 py-3">
              <button
                type="button"
                onClick={onCloseGuide}
                className="mc-btn-green px-5 py-2 text-xs font-bold cursor-pointer"
              >
                {t.guideStartBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minecraft-Style Overnight Shipping Summary Popup */}
      {farm.pendingSummary && (
        <div
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          onClick={onDismissSummary}
        >
          <div
            className={`w-full max-w-md p-5 ${panelClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-lg font-bold tracking-tight sm:text-xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t.summaryTitle(
                farm.pendingSummary.dayFinished,
                t.seasons[farm.pendingSummary.season],
              )}
            </h2>
            <p className={`mt-1 text-xs ${mutedText}`}>{t.summarySubtitle}</p>

            <div className={`my-4 space-y-2 p-3.5 text-sm tabular-nums ${insetClass}`}>
              {PRODUCE_ORDER.filter((k) => farm.pendingSummary!.shipped[k] > 0).length === 0 ? (
                <p className={`text-xs ${mutedText}`}>{t.summaryNothingShipped}</p>
              ) : (
                PRODUCE_ORDER.map((k) => {
                  const qty = farm.pendingSummary!.shipped[k];
                  if (qty <= 0) return null;
                  const unit = getSellPrice(k, farm.upgrades.artisanKeg);
                  return (
                    <div key={k} className="flex items-center justify-between text-xs font-semibold">
                      <span>
                        {t.produceNames[k]} × {qty}
                      </span>
                      <span
                        className="font-bold text-[#c88924]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        +{qty * unit}
                        {t.goldShort}
                      </span>
                    </div>
                  );
                })
              )}

              <div className="flex items-center justify-between border-t border-black/20 pt-2 text-base font-bold">
                <span>{t.summaryTotalEarned}</span>
                <span
                  className="text-[#c88924]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  +{farm.pendingSummary.totalGoldEarned}
                  {t.goldShort}
                </span>
              </div>
            </div>

            <p className={`mb-4 text-xs ${mutedText}`}>
              {t.summaryCropsGrown(farm.pendingSummary.cropsGrown)}
            </p>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onDismissSummary}
                className="mc-btn-green px-4 py-2 text-xs font-bold cursor-pointer"
              >
                {t.summaryStartNextDay(farm.day)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minecraft-Style Harvest Rush End-of-Round Summary Popup */}
      {rush.finished && (
        <div
          className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/55 p-4"
          onClick={onStopRush}
        >
          <div
            className={`w-full max-w-sm p-5 ${panelClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  className="text-lg font-bold tracking-tight sm:text-xl"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {t.rushResultTitle}
                </h2>
                {rush.isNewRecord && (
                  <p className="mt-1 text-xs font-bold text-[#c88924]">
                    {t.rushNewRecord}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onStopRush}
                aria-label={t.rushBackCozy}
                className={`flex h-8 w-8 items-center justify-center cursor-pointer ${btnClass}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className={`my-4 grid grid-cols-2 gap-3 p-3.5 text-sm tabular-nums ${insetClass}`}>
              <div>
                <span className={`block text-xs ${mutedText}`}>{t.rushScoreLabel}</span>
                <span className="text-2xl font-bold">{rush.score}</span>
              </div>
              <div>
                <span className={`block text-xs ${mutedText}`}>{t.rushBestLabel}</span>
                <span className="text-2xl font-bold">{rush.bestScore}</span>
              </div>
              <div>
                <span className={`block text-xs ${mutedText}`}>{t.rushApplesCollected}</span>
                <span className="font-bold">{rush.roundApples}</span>
              </div>
              <div>
                <span className={`block text-xs ${mutedText}`}>{t.rushGoldCollected}</span>
                <span className="font-bold">{rush.roundGolden}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onStopRush}
                className={`px-3.5 py-2 text-xs font-bold cursor-pointer ${btnClass}`}
              >
                {t.rushBackCozy}
              </button>
              <button
                type="button"
                onClick={onStartRush}
                className="mc-btn-green flex items-center gap-1.5 px-4 py-2 text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t.rushPlayAgain}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minecraft-Style Orchard Inventory, Shop, Orders & Archive Popup */}
      {journalOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
          onClick={onCloseJournal}
        >
          <div
            className={`flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden ${panelClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header + Minecraft Blocky Tabs */}
            <div className="border-b-2 border-black/25 px-5 pt-4 pb-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <h2
                    className="text-lg font-bold tracking-tight sm:text-xl"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {t.journalTitle}
                  </h2>
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      isNight ? 'text-[#f2c05c]' : 'text-[#8a5607]'
                    }`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {farm.gold}
                    {t.goldShort}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCloseJournal}
                  aria-label={t.closeBtn}
                  className={`flex h-8 w-8 items-center justify-center cursor-pointer ${btnClass}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {(
                  [
                    ['bag', Package],
                    ['shop', ShoppingBag],
                    ['orders', ScrollText],
                    ['archive', BookOpen],
                  ] as const
                ).map(([tabId, Icon]) => (
                  <button
                    key={tabId}
                    type="button"
                    onClick={() => onSelectJournalTab(tabId)}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-bold cursor-pointer ${
                      journalTab === tabId ? 'mc-btn-green' : btnClass
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t.journalTabs[tabId]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto p-5">
              {/* TAB 1: APPLE-CHAN INVENTORY, WALLET, SEEDS & ARTISAN */}
              {journalTab === 'bag' && (
                <div className="space-y-4">
                  {/* Wallet & Storage Summary Strip */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`px-3 py-2 ${insetClass}`}>
                      <span className={`block text-[11px] font-bold ${mutedText}`}>
                        {t.inventoryWalletLabel}
                      </span>
                      <span
                        className={`mt-0.5 flex items-center gap-1 text-base font-bold tabular-nums ${
                          isNight ? 'text-[#f2c05c]' : 'text-[#8a5607]'
                        }`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        <Coins className="h-4 w-4" />
                        {farm.gold}
                        {t.goldShort}
                      </span>
                    </div>

                    <div className={`px-3 py-2 ${insetClass}`}>
                      <span className={`block text-[11px] font-bold ${mutedText}`}>
                        {t.inventoryTotalItemsLabel}
                      </span>
                      <span
                        className="mt-0.5 block text-base font-bold tabular-nums"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {totalProduceStored}
                      </span>
                    </div>

                    <div className={`px-3 py-2 ${insetClass}`}>
                      <span className={`block text-[11px] font-bold ${mutedText}`}>
                        {t.inventorySeedsLabel}
                      </span>
                      <span
                        className={`mt-0.5 block text-base font-bold tabular-nums ${
                          isNight ? 'text-[#89d966]' : 'text-[#2c5c1a]'
                        }`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {totalSeedsOwned}
                      </span>
                    </div>
                  </div>

                  {/* Seed Pouch Inventory */}
                  <div>
                    <h3 className="mb-1.5 text-xs font-bold tracking-wide uppercase">
                      {t.bagSeedsTitle}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {CROP_ORDER.map((crop) => (
                        <div
                          key={crop}
                          className={`flex items-center justify-between gap-2 px-2.5 py-2 text-xs ${insetClass}`}
                        >
                          <span className="truncate font-bold">{t.cropNames[crop]}</span>
                          <span
                            className={`font-bold tabular-nums ${
                              isNight ? 'text-[#89d966]' : 'text-[#2c5c1a]'
                            }`}
                            style={{ fontFamily: 'var(--font-mono)' }}
                          >
                            ×{farm.inventory.seeds[crop]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Harvest Basket Produce */}
                  <div>
                    <h3 className="mb-1.5 text-xs font-bold tracking-wide uppercase">
                      {t.bagProduceTitle}
                    </h3>
                    <div className="space-y-1.5">
                      {PRODUCE_ORDER.map((item) => {
                        const qty = farm.inventory[item];
                        const sellPrice = getSellPrice(item, farm.upgrades.artisanKeg);
                        const canEat =
                          (item === 'redApples' || item === 'honeyBerries') &&
                          qty > 0 &&
                          farm.energy < farm.maxEnergy;
                        return (
                          <div
                            key={item}
                            className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${insetClass}`}
                          >
                            <div>
                              <div className="text-sm font-bold">
                                {t.produceNames[item]}{' '}
                                <span
                                  className="ml-1 text-xs font-bold tabular-nums"
                                  style={{ fontFamily: 'var(--font-mono)' }}
                                >
                                  ×{qty}
                                </span>
                              </div>
                              <div className={`text-xs tabular-nums ${mutedText}`}>
                                {sellPrice}
                                {t.goldShort}
                                {farm.upgrades.artisanKeg &&
                                  (item === 'ciderBottles' || item === 'applePies') && (
                                    <span className="ml-2 font-bold text-[#c88924]">
                                      ({t.artisanBonusTag})
                                    </span>
                                  )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {(item === 'redApples' || item === 'honeyBerries') && (
                                <button
                                  type="button"
                                  disabled={!canEat}
                                  onClick={() => onEatProduce(item)}
                                  className={`px-2.5 py-1 text-xs font-bold ${btnClass} ${
                                    canEat ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                                  }`}
                                >
                                  {t.eatBtn}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={qty <= 0}
                                onClick={() => onShipItem(item, 1)}
                                className={`px-2.5 py-1 text-xs font-bold ${btnClass} ${
                                  qty > 0 ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                                }`}
                              >
                                {t.shipOneBtn}
                              </button>
                              <button
                                type="button"
                                disabled={qty <= 0}
                                onClick={() => onShipItem(item, qty)}
                                className={`px-2.5 py-1 text-xs font-bold ${
                                  qty > 0
                                    ? 'mc-btn-green cursor-pointer'
                                    : `${btnClass} opacity-40 cursor-not-allowed`
                                }`}
                              >
                                {t.shipAllBtn}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Artisan Crafting + Open 3x3 Table Shortcut */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase">
                        <Flame className="h-3.5 w-3.5 text-[#c88924]" />
                        <span>{t.craftTitle}</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          onCloseJournal();
                          onOpenCrafting();
                        }}
                        className="mc-btn-gold flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                      >
                        <Hammer className="h-3 w-3" />
                        <span>{t.craftingBtn}</span>
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className={`flex items-center justify-between gap-2 p-2.5 ${insetClass}`}>
                        <div>
                          <div className="text-xs font-bold">{t.produceNames.ciderBottles}</div>
                          <div className={`text-[11px] ${mutedText}`}>{t.craftRecipes.ciderDesc}</div>
                        </div>
                        <button
                          type="button"
                          disabled={farm.inventory.redApples < 3}
                          onClick={() => onCraftArtisan('cider')}
                          className={`px-3 py-1.5 text-xs font-bold shrink-0 ${
                            farm.inventory.redApples >= 3
                              ? 'mc-btn-gold cursor-pointer'
                              : `${btnClass} opacity-40 cursor-not-allowed`
                          }`}
                        >
                          {t.craftBtn}
                        </button>
                      </div>

                      <div className={`flex items-center justify-between gap-2 p-2.5 ${insetClass}`}>
                        <div>
                          <div className="text-xs font-bold">{t.produceNames.applePies}</div>
                          <div className={`text-[11px] ${mutedText}`}>{t.craftRecipes.pieDesc}</div>
                        </div>
                        <button
                          type="button"
                          disabled={
                            farm.inventory.redApples < 2 || farm.inventory.goldenApples < 1
                          }
                          onClick={() => onCraftArtisan('pie')}
                          className={`px-3 py-1.5 text-xs font-bold shrink-0 ${
                            farm.inventory.redApples >= 2 && farm.inventory.goldenApples >= 1
                              ? 'mc-btn-gold cursor-pointer'
                              : `${btnClass} opacity-40 cursor-not-allowed`
                          }`}
                        >
                          {t.craftBtn}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pending Shipping Bin */}
                  <div className={`p-3 ${insetClass}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{t.shippingBinTitle}</span>
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          isNight ? 'text-[#f2c05c]' : 'text-[#8a5607]'
                        }`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        +{pendingShippingValue}
                        {t.goldShort}
                      </span>
                    </div>
                    <p className={`mt-1 text-xs ${mutedText}`}>
                      {pendingShippingValue > 0 ? t.shippingBinHint : t.shippingBinEmpty}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: ORCHARD SEED & UPGRADE SHOP */}
              {journalTab === 'shop' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-1.5 text-xs font-bold tracking-wide uppercase">
                      {t.shopSeedsTitle}
                    </h3>
                    <div className="space-y-1.5">
                      {CROP_ORDER.map((crop) => {
                        const price = CROP_SPECS[crop].seedPrice;
                        const owned = farm.inventory.seeds[crop];
                        const canAfford = farm.gold >= price;
                        return (
                          <div
                            key={crop}
                            className={`flex items-center justify-between gap-3 px-3 py-2 ${insetClass}`}
                          >
                            <div>
                              <div className="text-sm font-bold">
                                {t.cropNames[crop]}{' '}
                                <span
                                  className={`ml-1 text-xs tabular-nums ${mutedText}`}
                                  style={{ fontFamily: 'var(--font-mono)' }}
                                >
                                  ({owned})
                                </span>
                              </div>
                              <div className={`text-xs ${mutedText}`}>{t.cropDesc[crop]}</div>
                            </div>
                            <button
                              type="button"
                              disabled={!canAfford}
                              onClick={() => onBuySeed(crop)}
                              className={`px-3 py-1.5 text-xs font-bold tabular-nums shrink-0 ${
                                canAfford
                                  ? 'mc-btn-green cursor-pointer'
                                  : `${btnClass} opacity-40 cursor-not-allowed`
                              }`}
                            >
                              {t.buyBtn} · {price}
                              {t.goldShort}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-1.5 text-xs font-bold tracking-wide uppercase">
                      {t.shopUpgradesTitle}
                    </h3>
                    <div className="space-y-1.5">
                      {(['copperCan', 'magnetBasket', 'artisanKeg'] as const).map((key) => {
                        const owned = farm.upgrades[key];
                        const price = UPGRADE_PRICES[key];
                        const canAfford = !owned && farm.gold >= price;
                        return (
                          <div
                            key={key}
                            className={`flex items-center justify-between gap-3 px-3 py-2.5 ${insetClass}`}
                          >
                            <div>
                              <div className="text-sm font-bold">{t.upgrades[key].name}</div>
                              <div className={`text-xs ${mutedText}`}>{t.upgrades[key].desc}</div>
                            </div>
                            {owned ? (
                              <span
                                className={`flex items-center gap-1 text-xs font-bold shrink-0 ${
                                  isNight ? 'text-[#89d966]' : 'text-[#2c5c1a]'
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                                {t.ownedBtn}
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!canAfford}
                                onClick={() => onBuyUpgrade(key)}
                                className={`px-3 py-1.5 text-xs font-bold tabular-nums shrink-0 ${
                                  canAfford
                                    ? 'mc-btn-gold cursor-pointer'
                                    : `${btnClass} opacity-40 cursor-not-allowed`
                                }`}
                              >
                                {t.buyBtn} · {price}
                                {t.goldShort}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: VILLAGE NOTICE BOARD DAILY ORDERS */}
              {journalTab === 'orders' && (
                <div className="space-y-2.5">
                  <div>
                    <h3 className="text-sm font-bold">{t.ordersTitle}</h3>
                    <p className={`mt-0.5 text-xs ${mutedText}`}>{t.ordersSubtitle}</p>
                  </div>

                  {farm.orders.map((order) => {
                    const owned = farm.inventory[order.item];
                    const ready = !order.completed && owned >= order.required;
                    return (
                      <div
                        key={order.id}
                        className={`flex flex-wrap items-center justify-between gap-3 p-3.5 ${insetClass}`}
                      >
                        <div>
                          <div className="text-xs font-bold opacity-80">
                            {t.requesters[order.requesterKey]}
                          </div>
                          <div className="mt-0.5 text-sm font-bold">
                            {t.produceNames[order.item]} × {order.required}{' '}
                            <span
                              className={`text-xs font-normal tabular-nums ${mutedText}`}
                              style={{ fontFamily: 'var(--font-mono)' }}
                            >
                              ({owned}/{order.required})
                            </span>
                          </div>
                          <div className={`mt-1 text-xs ${mutedText}`}>
                            {t.rewardLabel}:{' '}
                            <span className="font-bold text-[#c88924]">
                              +{order.rewardGold}
                              {t.goldShort}
                            </span>{' '}
                            · +{order.rewardTrust}% {t.trustLabel}
                          </div>
                        </div>

                        {order.completed ? (
                          <span
                            className={`flex items-center gap-1 text-xs font-bold ${
                              isNight ? 'text-[#89d966]' : 'text-[#2c5c1a]'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {t.completedTag}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!ready}
                            onClick={() => onDeliverOrder(order.id)}
                            className={`px-3.5 py-1.5 text-xs font-bold ${
                              ready
                                ? 'mc-btn-green cursor-pointer'
                                : `${btnClass} opacity-40 cursor-not-allowed`
                            }`}
                          >
                            {t.deliverBtn}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 4: APPLE-CHAN OFFICIAL CHARACTER ARCHIVE */}
              {journalTab === 'archive' && (
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className={`text-xs ${mutedText}`}>{t.profileSubtitle}</p>
                    <span
                      className={`text-[11px] font-bold ${
                        isNight ? 'text-[#89d966]' : 'text-[#2c5c1a]'
                      }`}
                    >
                      {t.basicInfoTitle}
                    </span>
                  </div>
                  <div
                    className={`my-3 grid grid-cols-2 gap-x-5 gap-y-2.5 p-3.5 text-sm sm:grid-cols-3 ${insetClass}`}
                  >
                    <div>
                      <span className={`block text-xs ${mutedText}`}>{t.codenameLabel}</span>
                      <span className="font-bold">{t.codenameValue}</span>
                    </div>
                    <div>
                      <span className={`block text-xs ${mutedText}`}>{t.genderLabel}</span>
                      <span className="font-bold">{t.genderValue}</span>
                    </div>
                    <div>
                      <span className={`block text-xs ${mutedText}`}>{t.experienceLabel}</span>
                      <span className="font-bold tabular-nums">{t.experienceValue}</span>
                    </div>
                    <div>
                      <span className={`block text-xs ${mutedText}`}>{t.originLabel}</span>
                      <span className="font-bold">{t.originValue}</span>
                    </div>
                    <div>
                      <span className={`block text-xs ${mutedText}`}>{t.birthdayLabel}</span>
                      <span className="font-bold">{t.birthdayValue}</span>
                    </div>
                    <div>
                      <span className={`block text-xs ${mutedText}`}>{t.heightLabel}</span>
                      <span className="font-bold tabular-nums">{t.heightValue}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold">{t.trustProgressTitle}</span>
                      <span
                        className="font-bold tabular-nums"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {stats.trustPercent}% / 200%
                      </span>
                    </div>
                    <div className="mt-1.5 h-3 w-full border-2 border-[#141414] bg-[#2a2a2a] p-[1px]">
                      <div
                        className="h-full bg-[#62c938] transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (stats.trustPercent / 200) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className={`mt-1.5 text-xs ${mutedText}`}>{t.trustProgressHint}</p>
                  </div>

                  <div className="space-y-2.5">
                    {t.archives.map((entry) => {
                      const unlocked = stats.trustPercent >= entry.requiredTrust;
                      return (
                        <div key={entry.id} className={`p-3.5 text-sm ${insetClass}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-xs font-bold tracking-wide">{entry.title}</h3>
                            {unlocked ? (
                              <span className={`text-[11px] ${mutedText}`}>
                                {entry.unlockNote}
                              </span>
                            ) : (
                              <span className={`flex items-center gap-1 text-[11px] ${mutedText}`}>
                                <Lock className="h-3 w-3" />
                                <span>{t.lockedArchiveHint(entry.requiredTrust)}</span>
                              </span>
                            )}
                          </div>
                          {unlocked && (
                            <div className="mt-2.5 space-y-2 text-xs leading-relaxed">
                              {entry.poem && (
                                <blockquote className="whitespace-pre-line border-l-4 border-[#4f8a36] pl-3 italic opacity-90">
                                  {entry.poem}
                                </blockquote>
                              )}
                              {entry.paragraphs.map((para, idx) => (
                                <p key={idx}>{para}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold tabular-nums ${mutedText}`}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {t.hugsLabel} {stats.treesHugged} · {t.rushBestLabel}{' '}
                      {stats.bestRushScore}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onCloseJournal();
                        onCameraPresetChange('appleChan');
                        onHugTree();
                      }}
                      className="mc-btn-green px-4 py-2 text-xs font-bold cursor-pointer"
                    >
                      {t.watchHugBtn}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Minecraft-Style 3x3 Crafting Table Popup */}
      <CraftingModal
        open={craftingOpen}
        language={language}
        isNight={isNight}
        farm={farm}
        onClose={onCloseCrafting}
        onCraft={onCraftRecipe}
      />

      {/* Minecraft-Style Individual Per-User SQLite Account Modal */}
      <AccountModal
        open={accountOpen}
        language={language}
        isNight={isNight}
        backendAvailable={backendAvailable}
        session={session}
        saving={savingAccount}
        saveToast={saveToast}
        onClose={onCloseAccount}
        onRegister={onRegister}
        onLogin={onLogin}
        onSaveNow={onSaveAccount}
        onDownloadDb={onDownloadDb}
        onSignOut={onSignOut}
      />
    </div>
  );
}
