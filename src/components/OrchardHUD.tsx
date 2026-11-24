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
  WeatherKind,
} from '../scene/types';
import { AccountModal } from './AccountModal';
import { IconTooltipButton } from './IconTooltipButton';

interface OrchardHUDProps {
  language: Language;
  timeMode: TimeMode;
  realTime: RealTimeInfo;
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
  accountOpen: boolean;
  session: PlayerSession | null;
  backendAvailable: boolean;
  savingAccount: boolean;
  saveToast: string | null;
  onLanguageToggle: () => void;
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
      return <CloudRain className="h-3.5 w-3.5 text-[#3A84B8]" />;
    case 'snow':
      return <CloudSnow className="h-3.5 w-3.5 text-[#7AA7D9]" />;
    case 'storm':
      return <CloudLightning className="h-3.5 w-3.5 text-[#D48A21]" />;
    case 'cloudy':
      return <Cloud className="h-3.5 w-3.5 text-[#7A8C9E]" />;
    default:
      return isNight ? (
        <Moon className="h-3.5 w-3.5 text-[#F4D078]" />
      ) : (
        <Sun className="h-3.5 w-3.5 text-[#D48A21]" />
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
  accountOpen,
  session,
  backendAvailable,
  savingAccount,
  saveToast,
  onLanguageToggle,
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

  const surfaceClass = isNight
    ? 'bg-[#172136]/95 text-[#F2F6FC] border-[#2E4166]'
    : 'bg-[#FAF6EE]/95 text-[#222B1E] border-[#DDD3BE]';

  const cardBg = isNight
    ? 'border-[#2A3B5E] bg-[#121B2E]'
    : 'border-[#E2D8C3] bg-[#F4EEE0]';

  const mutedText = isNight ? 'text-[#9CB0D1]' : 'text-[#5E6856]';
  const dividerColor = isNight ? 'bg-[#2E4166]' : 'bg-[#DDD3BE]';
  const segmentedBg = isNight ? 'bg-[#0F1728]' : 'bg-[#EDE5D4]';
  const activeTab = isNight
    ? 'bg-[#3C7B52] text-white'
    : 'bg-[#2F6A40] text-[#FCFBF7]';
  const inactiveTab = isNight
    ? 'text-[#B8C7E0] hover:text-white'
    : 'text-[#4C5846] hover:text-[#1D2619]';
  const subtleBtn = isNight
    ? 'bg-[#233252] text-[#E8F0FF] hover:bg-[#2C3F66]'
    : 'bg-[#ECE4D2] text-[#2B3725] hover:bg-[#E0D5BE]';

  const comboMult = Math.min(4, 1 + Math.floor(rush.combo / 4));
  const realSeasonText = t.seasons[realTime.season];
  const energyPct = Math.round((farm.energy / farm.maxEnergy) * 100);
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
      {/* Top Bar: Real-Time Clock/Weather + Wallet/Energy & Icon-Only Action Cluster */}
      <header className="flex flex-wrap items-start justify-between gap-2.5 p-3.5 sm:p-5">
        {/* Top-Left: Title, Real-Time Local Date/Clock, Live Weather, Gold & Energy */}
        <div
          className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-3.5 py-2.5 shadow-sm transition-colors duration-200 sm:px-4 ${surfaceClass}`}
        >
          <div className="flex flex-col">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h1
                className="text-base font-bold leading-tight tracking-tight whitespace-nowrap sm:text-lg"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t.appTitle}
              </h1>
              <span
                className={`text-xs font-semibold whitespace-nowrap tabular-nums ${
                  isNight ? 'text-[#9CD4A8]' : 'text-[#2F6A40]'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {realTime.dateText} · {realTime.timeText}
              </span>
              <span className={`text-[11px] font-medium whitespace-nowrap ${mutedText}`}>
                {realSeasonText}
              </span>
            </div>

            <div
              className={`mt-1 flex flex-wrap items-center gap-2.5 text-xs tabular-nums ${mutedText}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <span className="flex items-center gap-1 font-semibold">
                <WeatherGlyph kind={weather.kind} isNight={isNight} />
                <span>
                  {t.weatherNames[weather.kind]}
                  {weather.temperatureC !== null ? ` ${weather.temperatureC}°C` : ''}
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 font-semibold text-[#C97B18]">
                <Coins className="h-3.5 w-3.5" />
                {farm.gold}
                {t.goldShort}
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-[#3C7B52]" />
                <span
                  className={`inline-block h-1.5 w-14 overflow-hidden rounded-full ${
                    isNight ? 'bg-[#0F1728]' : 'bg-[#E1D8C3]'
                  }`}
                >
                  <span
                    className={`block h-full rounded-full transition-all duration-200 ${
                      energyPct <= 20 ? 'bg-[#D64940]' : 'bg-[#4D9E5B]'
                    }`}
                    style={{ width: `${energyPct}%` }}
                  />
                </span>
                <span>{farm.energy}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Top-Center: Active Harvest Rush Scoreboard */}
        {rush.active && (
          <div className="pointer-events-auto order-3 mx-auto flex flex-col items-center sm:order-2">
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-2 shadow-md tabular-nums ${surfaceClass}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <div className="flex items-center gap-1.5">
                <Timer
                  className={`h-4 w-4 ${
                    rush.timeLeft <= 10 ? 'text-[#D64940]' : 'text-[#D48A21]'
                  }`}
                />
                <span
                  className={`text-sm font-bold ${
                    rush.timeLeft <= 10 ? 'text-[#D64940]' : ''
                  }`}
                >
                  {formatClock(rush.timeLeft)}
                </span>
              </div>

              <div className={`h-4 w-px ${dividerColor}`} aria-hidden="true" />

              <div className="text-xs font-semibold">
                <span className={mutedText}>{t.rushScoreLabel} </span>
                <span className="text-sm font-bold">{rush.score}</span>
              </div>

              {rush.combo >= 2 && (
                <>
                  <div className={`h-4 w-px ${dividerColor}`} aria-hidden="true" />
                  <div className="text-xs font-bold text-[#D48A21]">
                    {t.rushComboLabel} {rush.combo} (x{comboMult})
                  </div>
                </>
              )}

              <div className={`h-4 w-px ${dividerColor}`} aria-hidden="true" />

              <div className={`text-xs ${mutedText}`}>
                {t.rushBestLabel} {Math.max(rush.bestScore, rush.score)}
              </div>
            </div>
            <p
              className={`mt-1.5 rounded-lg border px-3 py-1 text-center text-xs font-medium shadow-sm ${surfaceClass}`}
            >
              {t.rushBannerHint}
            </p>
          </div>
        )}

        {/* Top-Right: Icon-Only Action Cluster with Hover / Tap Tooltips */}
        <div
          className={`pointer-events-auto order-2 flex items-center gap-1.5 rounded-xl border p-1.5 shadow-sm transition-colors duration-200 sm:order-3 ${surfaceClass}`}
        >
          <IconTooltipButton
            tooltip={t.inventoryBtn}
            placement="bottom"
            isNight={isNight}
            badge={totalProduceStored > 0 ? totalProduceStored : null}
            onClick={() => onOpenJournal('bag')}
            className={subtleBtn}
          >
            <Backpack className="h-4 w-4" />
          </IconTooltipButton>

          <IconTooltipButton
            tooltip={t.journalBtn}
            placement="bottom"
            isNight={isNight}
            badge={readyOrdersCount > 0 ? readyOrdersCount : null}
            onClick={() => onOpenJournal(readyOrdersCount > 0 ? 'orders' : 'shop')}
            className={subtleBtn}
          >
            <Store className="h-4 w-4" />
          </IconTooltipButton>

          {!rush.active && (
            <IconTooltipButton
              tooltip={t.sleepBtn}
              placement="bottom"
              isNight={isNight}
              onClick={onSleep}
              className={
                isNight
                  ? 'bg-[#3C7B52] text-white hover:bg-[#316844]'
                  : 'bg-[#2F6A40] text-white hover:bg-[#265734]'
              }
            >
              <BedDouble className="h-4 w-4" />
            </IconTooltipButton>
          )}

          <IconTooltipButton
            tooltip={rush.active ? t.rushActiveBtn : t.rushBtn}
            placement="bottom"
            isNight={isNight}
            onClick={rush.active ? onStopRush : onStartRush}
            className={
              rush.active
                ? 'bg-[#D64940] text-white hover:bg-[#BE3E36]'
                : 'bg-[#D48A21] text-white hover:bg-[#BC791B]'
            }
          >
            <Trophy className="h-4 w-4" />
          </IconTooltipButton>

          <IconTooltipButton
            tooltip={accountTooltip}
            placement="bottom"
            isNight={isNight}
            onClick={onOpenAccount}
            className={
              session
                ? isNight
                  ? 'bg-[#2D6242] text-white hover:bg-[#37754F]'
                  : 'bg-[#2F6A40] text-white hover:bg-[#265734]'
                : subtleBtn
            }
          >
            {session ? <UserCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </IconTooltipButton>

          <IconTooltipButton
            tooltip={t.guideBtn}
            placement="bottom"
            isNight={isNight}
            onClick={onOpenGuide}
            className={subtleBtn}
          >
            <HelpCircle className="h-4 w-4" />
          </IconTooltipButton>

          <IconTooltipButton
            tooltip={t.langSwitchTooltip}
            placement="bottom"
            isNight={isNight}
            onClick={onLanguageToggle}
            className={subtleBtn}
          >
            <Globe className="h-4 w-4" />
          </IconTooltipButton>
        </div>
      </header>

      {/* Bottom Zone: Speech Caption + Icon-Only Collapsible Control Dock */}
      <div className="flex flex-col items-center px-3 pb-3.5 sm:pb-4">
        {speech && (
          <div
            key={speech.id}
            className={`pointer-events-none mb-2.5 max-w-md rounded-xl border px-4 py-2 text-center text-sm font-medium shadow-sm transition-opacity duration-200 ${surfaceClass}`}
          >
            <span
              className={`font-semibold ${
                isNight ? 'text-[#87D698]' : 'text-[#2F6A40]'
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
            isNight={isNight}
            onClick={onToggleDock}
            className={`border shadow-sm ${surfaceClass}`}
          >
            {dockCollapsed ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </IconTooltipButton>
        </div>

        {!dockCollapsed && (
          <div
            className={`pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border px-3 py-2 shadow-md transition-colors duration-200 ${surfaceClass}`}
          >
            {/* 1. Interactive Farm & Character Actions */}
            <div className="flex items-center gap-1.5">
              <IconTooltipButton
                tooltip={t.hugTreeBtn}
                placement="top"
                isNight={isNight}
                onClick={onHugTree}
                className={
                  currentAction === 'hug'
                    ? 'bg-[#D64940] text-white'
                    : subtleBtn
                }
              >
                <Heart className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.plantBtn}
                placement="top"
                isNight={isNight}
                badge={totalSeedsOwned > 0 ? totalSeedsOwned : null}
                onClick={onPlantSeed}
                className={subtleBtn}
              >
                <Sprout className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.waterBtn}
                placement="top"
                isNight={isNight}
                onClick={onWaterSaplings}
                className={
                  currentAction === 'water'
                    ? 'bg-[#3A84B8] text-white'
                    : subtleBtn
                }
              >
                <Droplets className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.waveBtn}
                placement="top"
                isNight={isNight}
                onClick={onWave}
                className={
                  currentAction === 'wave'
                    ? 'bg-[#3C7B52] text-white'
                    : subtleBtn
                }
              >
                <Hand className="h-4 w-4" />
              </IconTooltipButton>
            </div>

            <div className={`hidden h-6 w-px sm:block ${dividerColor}`} aria-hidden="true" />

            {/* 2. Outfit Switcher (Icon-Only) */}
            <div className={`flex items-center gap-1 rounded-xl p-1 ${segmentedBg}`}>
              <IconTooltipButton
                tooltip={t.outfits.common}
                placement="top"
                isNight={isNight}
                onClick={() => onOutfitChange('common')}
                className={outfit === 'common' ? activeTab : inactiveTab}
              >
                <Shirt className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.outfits.spring}
                placement="top"
                isNight={isNight}
                onClick={() => onOutfitChange('spring')}
                className={outfit === 'spring' ? activeTab : inactiveTab}
              >
                <Flower2 className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.outfits.idol}
                placement="top"
                isNight={isNight}
                onClick={() => onOutfitChange('idol')}
                className={outfit === 'idol' ? activeTab : inactiveTab}
              >
                <Sparkles className="h-4 w-4" />
              </IconTooltipButton>
            </div>

            <div className={`hidden h-6 w-px sm:block ${dividerColor}`} aria-hidden="true" />

            {/* 3. Camera Views (Icon-Only) */}
            <div className={`flex items-center gap-1 rounded-xl p-1 ${segmentedBg}`}>
              <IconTooltipButton
                tooltip={t.cameras.appleChan}
                placement="top"
                isNight={isNight}
                onClick={() => onCameraPresetChange('appleChan')}
                className={cameraPreset === 'appleChan' ? activeTab : inactiveTab}
              >
                <Crosshair className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.cameras.orchard}
                placement="top"
                isNight={isNight}
                onClick={() => onCameraPresetChange('orchard')}
                className={cameraPreset === 'orchard' ? activeTab : inactiveTab}
              >
                <Compass className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.cameras.cottage}
                placement="top"
                isNight={isNight}
                onClick={() => onCameraPresetChange('cottage')}
                className={cameraPreset === 'cottage' ? activeTab : inactiveTab}
              >
                <Home className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.cameras.windmill}
                placement="top"
                isNight={isNight}
                onClick={() => onCameraPresetChange('windmill')}
                className={cameraPreset === 'windmill' ? activeTab : inactiveTab}
              >
                <Wind className="h-4 w-4" />
              </IconTooltipButton>

              <IconTooltipButton
                tooltip={t.cameras.brook}
                placement="top"
                isNight={isNight}
                onClick={() => onCameraPresetChange('brook')}
                className={cameraPreset === 'brook' ? activeTab : inactiveTab}
              >
                <Waves className="h-4 w-4" />
              </IconTooltipButton>
            </div>

            <div className={`hidden h-6 w-px sm:block ${dividerColor}`} aria-hidden="true" />

            {/* 4. Real-Time / Lighting & Sound (Icon-Only) */}
            <div className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1 rounded-xl p-1 ${segmentedBg}`}>
                <IconTooltipButton
                  tooltip={t.times.realtime}
                  placement="top"
                  isNight={isNight}
                  onClick={() => onTimeModeChange('realtime')}
                  className={timeMode === 'realtime' ? activeTab : inactiveTab}
                >
                  <Clock className="h-4 w-4" />
                </IconTooltipButton>

                <IconTooltipButton
                  tooltip={t.times.morning}
                  placement="top"
                  isNight={isNight}
                  onClick={() => onTimeModeChange('morning')}
                  className={timeMode === 'morning' ? activeTab : inactiveTab}
                >
                  <Sun className="h-4 w-4" />
                </IconTooltipButton>

                <IconTooltipButton
                  tooltip={t.times.sunset}
                  placement="top"
                  isNight={isNight}
                  onClick={() => onTimeModeChange('sunset')}
                  className={timeMode === 'sunset' ? activeTab : inactiveTab}
                >
                  <Sunset className="h-4 w-4" />
                </IconTooltipButton>

                <IconTooltipButton
                  tooltip={t.times.night}
                  placement="top"
                  isNight={isNight}
                  onClick={() => onTimeModeChange('night')}
                  className={timeMode === 'night' ? activeTab : inactiveTab}
                >
                  <Moon className="h-4 w-4" />
                </IconTooltipButton>
              </div>

              <IconTooltipButton
                tooltip={audioEnabled ? t.audioMuteTitle : t.audioPlayTitle}
                placement="top"
                isNight={isNight}
                onClick={onToggleAudio}
                className={audioEnabled ? activeTab : subtleBtn}
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

      {/* First-Time Welcome & Reopenable Bilingual Help Guidebook Modal */}
      {guideOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
          onClick={onCloseGuide}
        >
          <div
            className={`flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border shadow-xl ${surfaceClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-start justify-between gap-3 border-b px-6 pt-5 pb-4 ${
                isNight ? 'border-[#2E4166]' : 'border-[#DDD3BE]'
              }`}
            >
              <div>
                <h2
                  className="text-xl font-bold tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {t.guideTitle}
                </h2>
                <p className={`mt-1 text-xs ${mutedText}`}>{t.guideSubtitle}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onLanguageToggle}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${subtleBtn}`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{language === 'en' ? '中文' : 'EN'}</span>
                </button>
                <button
                  type="button"
                  onClick={onCloseGuide}
                  aria-label={t.closeBtn}
                  className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                    isNight ? 'hover:bg-[#253555]' : 'hover:bg-[#EAE1CE]'
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto px-6 py-5 text-sm">
              {/* Section 1: Controls & Keybindings */}
              <div>
                <h3 className="mb-2 text-xs font-bold tracking-wide uppercase opacity-80">
                  {t.guideControlsHeading}
                </h3>
                <div
                  className={`divide-y rounded-xl border ${cardBg} ${
                    isNight ? 'divide-[#233250]' : 'divide-[#E6DEC9]'
                  }`}
                >
                  {t.guideControlsItems.map((item) => (
                    <div
                      key={item.keys}
                      className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
                    >
                      <kbd
                        className={`rounded-md border px-2 py-0.5 font-semibold whitespace-nowrap ${
                          isNight
                            ? 'border-[#334870] bg-[#18243D] text-[#E8F0FF]'
                            : 'border-[#D5C9B0] bg-[#FAF6EE] text-[#283323]'
                        }`}
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

              {/* Section 2: Cozy Stardew Orchard Loop */}
              <div>
                <h3 className="mb-2 text-xs font-bold tracking-wide uppercase opacity-80">
                  {t.guideFarmHeading}
                </h3>
                <ul className={`space-y-2 rounded-xl border p-3.5 text-xs leading-relaxed ${cardBg}`}>
                  {t.guideFarmSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#2F6A40] text-[10px] font-bold text-white"
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
              <div className={`rounded-xl border p-3.5 text-xs leading-relaxed ${cardBg}`}>
                <div className="mb-1 flex items-center gap-1.5 font-bold text-[#C97B18]">
                  <Trophy className="h-3.5 w-3.5" />
                  <span>{t.guideRushHeading}</span>
                </div>
                <p className={mutedText}>{t.guideRushDesc}</p>
              </div>
            </div>

            <div
              className={`flex items-center justify-end border-t px-6 py-3.5 ${
                isNight ? 'border-[#2E4166]' : 'border-[#DDD3BE]'
              }`}
            >
              <button
                type="button"
                onClick={onCloseGuide}
                className="rounded-lg bg-[#2F6A40] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#265734] cursor-pointer"
              >
                {t.guideStartBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stardew-Style Overnight Shipping Earnings Summary Modal */}
      {farm.pendingSummary && (
        <div
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4"
          onClick={onDismissSummary}
        >
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-xl ${surfaceClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t.summaryTitle(
                farm.pendingSummary.dayFinished,
                t.seasons[farm.pendingSummary.season],
              )}
            </h2>
            <p className={`mt-1 text-xs ${mutedText}`}>{t.summarySubtitle}</p>

            <div
              className={`my-4 space-y-2 border-y py-4 text-sm tabular-nums ${
                isNight ? 'border-[#2E4166]' : 'border-[#DDD3BE]'
              }`}
            >
              {PRODUCE_ORDER.filter((k) => farm.pendingSummary!.shipped[k] > 0).length === 0 ? (
                <p className={`text-xs ${mutedText}`}>{t.summaryNothingShipped}</p>
              ) : (
                PRODUCE_ORDER.map((k) => {
                  const qty = farm.pendingSummary!.shipped[k];
                  if (qty <= 0) return null;
                  const unit = getSellPrice(k, farm.upgrades.artisanKeg);
                  return (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span>
                        {t.produceNames[k]} × {qty}
                      </span>
                      <span
                        className="font-semibold text-[#C97B18]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        +{qty * unit}
                        {t.goldShort}
                      </span>
                    </div>
                  );
                })
              )}

              <div className="flex items-center justify-between pt-2 text-base font-bold">
                <span>{t.summaryTotalEarned}</span>
                <span
                  className="text-[#C97B18]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  +{farm.pendingSummary.totalGoldEarned}
                  {t.goldShort}
                </span>
              </div>
            </div>

            <p className={`mb-5 text-xs ${mutedText}`}>
              {t.summaryCropsGrown(farm.pendingSummary.cropsGrown)}
            </p>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onDismissSummary}
                className="rounded-lg bg-[#2F6A40] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#265734] cursor-pointer"
              >
                {t.summaryStartNextDay(farm.day)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Harvest Rush End-of-Round Summary Modal */}
      {rush.finished && (
        <div
          className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/45 p-4"
          onClick={onStopRush}
        >
          <div
            className={`w-full max-w-sm rounded-2xl border p-6 shadow-xl ${surfaceClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  className="text-xl font-bold tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {t.rushResultTitle}
                </h2>
                {rush.isNewRecord && (
                  <p className="mt-1 text-xs font-semibold text-[#D48A21]">
                    {t.rushNewRecord}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onStopRush}
                aria-label={t.rushBackCozy}
                className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                  isNight ? 'hover:bg-[#253555]' : 'hover:bg-[#EAE1CE]'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className={`my-4 grid grid-cols-2 gap-3 border-y py-4 text-sm tabular-nums ${
                isNight ? 'border-[#2E4166]' : 'border-[#DDD3BE]'
              }`}
            >
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
                <span className="font-semibold">{rush.roundApples}</span>
              </div>
              <div>
                <span className={`block text-xs ${mutedText}`}>{t.rushGoldCollected}</span>
                <span className="font-semibold">{rush.roundGolden}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onStopRush}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${subtleBtn}`}
              >
                {t.rushBackCozy}
              </button>
              <button
                type="button"
                onClick={onStartRush}
                className="flex items-center gap-1.5 rounded-lg bg-[#2F6A40] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#265734] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t.rushPlayAgain}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Stardew-Style Orchard Journal & Game Inventory Modal */}
      {journalOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
          onClick={onCloseJournal}
        >
          <div
            className={`flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-xl ${surfaceClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header + Tabs */}
            <div
              className={`border-b px-5 pt-5 pb-3 ${
                isNight ? 'border-[#2E4166]' : 'border-[#DDD3BE]'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <h2
                    className="text-lg font-bold tracking-tight sm:text-xl"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {t.journalTitle}
                  </h2>
                  <span
                    className="text-xs font-bold text-[#C97B18] tabular-nums"
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
                  className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                    isNight ? 'hover:bg-[#253555]' : 'hover:bg-[#EAE1CE]'
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className={`mt-3 grid grid-cols-4 gap-1 rounded-xl p-1 ${segmentedBg}`}>
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
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      journalTab === tabId ? activeTab : inactiveTab
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
              {/* TAB 1: APPLE-CHAN GAME INVENTORY, WALLET, SEEDS & ARTISAN CRAFTING */}
              {journalTab === 'bag' && (
                <div className="space-y-5">
                  {/* Wallet & Storage Summary Strip */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className={`rounded-xl border px-3.5 py-2.5 ${cardBg}`}>
                      <span className={`block text-[11px] font-medium ${mutedText}`}>
                        {t.inventoryWalletLabel}
                      </span>
                      <span
                        className="mt-0.5 flex items-center gap-1 text-base font-bold text-[#C97B18] tabular-nums"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        <Coins className="h-4 w-4" />
                        {farm.gold}
                        {t.goldShort}
                      </span>
                    </div>

                    <div className={`rounded-xl border px-3.5 py-2.5 ${cardBg}`}>
                      <span className={`block text-[11px] font-medium ${mutedText}`}>
                        {t.inventoryTotalItemsLabel}
                      </span>
                      <span
                        className="mt-0.5 block text-base font-bold tabular-nums"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {totalProduceStored}
                      </span>
                    </div>

                    <div className={`rounded-xl border px-3.5 py-2.5 ${cardBg}`}>
                      <span className={`block text-[11px] font-medium ${mutedText}`}>
                        {t.inventorySeedsLabel}
                      </span>
                      <span
                        className="mt-0.5 block text-base font-bold text-[#3C7B52] tabular-nums"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {totalSeedsOwned}
                      </span>
                    </div>
                  </div>

                  {/* Seed Pouch Inventory */}
                  <div>
                    <h3 className="mb-2 text-xs font-bold tracking-wide uppercase opacity-80">
                      {t.bagSeedsTitle}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {CROP_ORDER.map((crop) => (
                        <div
                          key={crop}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${cardBg}`}
                        >
                          <span className="truncate font-semibold">{t.cropNames[crop]}</span>
                          <span
                            className="font-bold text-[#3C7B52] tabular-nums"
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
                    <h3 className="mb-2 text-xs font-bold tracking-wide uppercase opacity-80">
                      {t.bagProduceTitle}
                    </h3>
                    <div className="space-y-2">
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
                            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 ${cardBg}`}
                          >
                            <div>
                              <div className="text-sm font-semibold">
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
                                    <span className="ml-2 font-semibold text-[#C97B18]">
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
                                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                    canEat
                                      ? `${subtleBtn} cursor-pointer`
                                      : 'opacity-40 cursor-not-allowed'
                                  }`}
                                >
                                  {t.eatBtn}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={qty <= 0}
                                onClick={() => onShipItem(item, 1)}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                  qty > 0
                                    ? `${subtleBtn} cursor-pointer`
                                    : 'opacity-40 cursor-not-allowed'
                                }`}
                              >
                                {t.shipOneBtn}
                              </button>
                              <button
                                type="button"
                                disabled={qty <= 0}
                                onClick={() => onShipItem(item, qty)}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                  qty > 0
                                    ? 'bg-[#2F6A40] text-white hover:bg-[#265734] cursor-pointer'
                                    : 'bg-[#2F6A40]/30 text-white/60 cursor-not-allowed'
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

                  {/* Artisan Crafting */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase opacity-80">
                      <Flame className="h-3.5 w-3.5 text-[#D48A21]" />
                      <span>{t.craftTitle}</span>
                    </h3>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <div
                        className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${cardBg}`}
                      >
                        <div>
                          <div className="text-sm font-semibold">
                            {t.produceNames.ciderBottles}
                          </div>
                          <div className={`text-xs ${mutedText}`}>{t.craftRecipes.ciderDesc}</div>
                        </div>
                        <button
                          type="button"
                          disabled={farm.inventory.redApples < 3}
                          onClick={() => onCraftArtisan('cider')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 transition-colors ${
                            farm.inventory.redApples >= 3
                              ? 'bg-[#D48A21] text-white hover:bg-[#BC791B] cursor-pointer'
                              : 'bg-[#D48A21]/30 text-white/60 cursor-not-allowed'
                          }`}
                        >
                          {t.craftBtn}
                        </button>
                      </div>

                      <div
                        className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${cardBg}`}
                      >
                        <div>
                          <div className="text-sm font-semibold">
                            {t.produceNames.applePies}
                          </div>
                          <div className={`text-xs ${mutedText}`}>{t.craftRecipes.pieDesc}</div>
                        </div>
                        <button
                          type="button"
                          disabled={
                            farm.inventory.redApples < 2 || farm.inventory.goldenApples < 1
                          }
                          onClick={() => onCraftArtisan('pie')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 transition-colors ${
                            farm.inventory.redApples >= 2 && farm.inventory.goldenApples >= 1
                              ? 'bg-[#D48A21] text-white hover:bg-[#BC791B] cursor-pointer'
                              : 'bg-[#D48A21]/30 text-white/60 cursor-not-allowed'
                          }`}
                        >
                          {t.craftBtn}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pending Shipping Bin */}
                  <div className={`rounded-xl border p-3.5 ${cardBg}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{t.shippingBinTitle}</span>
                      <span
                        className="text-xs font-bold text-[#C97B18] tabular-nums"
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
                <div className="space-y-5">
                  <div>
                    <h3 className="mb-2 text-xs font-bold tracking-wide uppercase opacity-80">
                      {t.shopSeedsTitle}
                    </h3>
                    <div className="space-y-2">
                      {CROP_ORDER.map((crop) => {
                        const price = CROP_SPECS[crop].seedPrice;
                        const owned = farm.inventory.seeds[crop];
                        const canAfford = farm.gold >= price;
                        return (
                          <div
                            key={crop}
                            className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${cardBg}`}
                          >
                            <div>
                              <div className="text-sm font-semibold">
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
                              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold tabular-nums shrink-0 transition-colors ${
                                canAfford
                                  ? 'bg-[#2F6A40] text-white hover:bg-[#265734] cursor-pointer'
                                  : 'bg-[#2F6A40]/30 text-white/60 cursor-not-allowed'
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
                    <h3 className="mb-2 text-xs font-bold tracking-wide uppercase opacity-80">
                      {t.shopUpgradesTitle}
                    </h3>
                    <div className="space-y-2">
                      {(['copperCan', 'magnetBasket', 'artisanKeg'] as const).map((key) => {
                        const owned = farm.upgrades[key];
                        const price = UPGRADE_PRICES[key];
                        const canAfford = !owned && farm.gold >= price;
                        return (
                          <div
                            key={key}
                            className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${cardBg}`}
                          >
                            <div>
                              <div className="text-sm font-semibold">
                                {t.upgrades[key].name}
                              </div>
                              <div className={`text-xs ${mutedText}`}>
                                {t.upgrades[key].desc}
                              </div>
                            </div>
                            {owned ? (
                              <span className="flex items-center gap-1 text-xs font-bold text-[#3C7B52] shrink-0">
                                <Check className="h-3.5 w-3.5" />
                                {t.ownedBtn}
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!canAfford}
                                onClick={() => onBuyUpgrade(key)}
                                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold tabular-nums shrink-0 transition-colors ${
                                  canAfford
                                    ? 'bg-[#D48A21] text-white hover:bg-[#BC791B] cursor-pointer'
                                    : 'bg-[#D48A21]/30 text-white/60 cursor-not-allowed'
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
                <div className="space-y-3">
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
                        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${cardBg}`}
                      >
                        <div>
                          <div className="text-xs font-semibold opacity-75">
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
                            <span className="font-semibold text-[#C97B18]">
                              +{order.rewardGold}
                              {t.goldShort}
                            </span>{' '}
                            · +{order.rewardTrust}% {t.trustLabel}
                          </div>
                        </div>

                        {order.completed ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-[#3C7B52]">
                            <Check className="h-3.5 w-3.5" />
                            {t.completedTag}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!ready}
                            onClick={() => onDeliverOrder(order.id)}
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                              ready
                                ? 'bg-[#2F6A40] text-white hover:bg-[#265734] cursor-pointer'
                                : 'bg-[#2F6A40]/30 text-white/60 cursor-not-allowed'
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

              {/* TAB 4: APPLE-CHAN FIELD ARCHIVE */}
              {journalTab === 'archive' && (
                <div>
                  <p className={`text-xs ${mutedText}`}>{t.profileSubtitle}</p>
                  <div
                    className={`my-3 grid grid-cols-2 gap-x-6 gap-y-2 border-y py-3.5 text-sm ${
                      isNight ? 'border-[#2E4166]' : 'border-[#DDD3BE]'
                    }`}
                  >
                    <div>
                      <span className={`block text-xs ${mutedText}`}>{t.birthdayLabel}</span>
                      <span className="font-semibold">{t.birthdayValue}</span>
                    </div>
                    <div>
                      <span className={`block text-xs ${mutedText}`}>{t.heightLabel}</span>
                      <span className="font-semibold tabular-nums">{t.heightValue}</span>
                    </div>
                    <div>
                      <span className={`block text-xs ${mutedText}`}>{t.experienceLabel}</span>
                      <span className="font-semibold tabular-nums">{t.experienceValue}</span>
                    </div>
                    <div>
                      <span className={`block text-xs ${mutedText}`}>{t.colorsLabel}</span>
                      <span className="font-semibold">{t.colorsValue}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-semibold">{t.trustProgressTitle}</span>
                      <span
                        className="font-bold tabular-nums"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {stats.trustPercent}% / 200%
                      </span>
                    </div>
                    <div
                      className={`mt-1.5 h-2 w-full overflow-hidden rounded-full ${
                        isNight ? 'bg-[#0F1728]' : 'bg-[#E5DCC8]'
                      }`}
                    >
                      <div
                        className="h-full rounded-full bg-[#3C7B52] transition-all duration-300"
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
                        <div key={entry.id} className={`rounded-xl border p-3.5 text-sm ${cardBg}`}>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-bold tracking-wide">{entry.title}</h3>
                            {!unlocked && (
                              <span className={`flex items-center gap-1 text-[11px] ${mutedText}`}>
                                <Lock className="h-3 w-3" />
                                <span>{t.lockedArchiveHint(entry.requiredTrust)}</span>
                              </span>
                            )}
                          </div>
                          {unlocked && (
                            <div className="mt-1.5 space-y-2 text-xs leading-relaxed">
                              <p>{entry.body}</p>
                              {entry.poem && (
                                <p className={`italic ${mutedText}`}>{entry.poem}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span
                      className={`text-xs tabular-nums ${mutedText}`}
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
                      className="rounded-lg bg-[#2F6A40] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#265734] cursor-pointer"
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

      {/* Individual Per-User SQLite Save Account Modal */}
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
