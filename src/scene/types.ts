export type Language = 'en' | 'zh';

export type TimeOfDay = 'morning' | 'sunset' | 'night';

export type TimeMode = 'realtime' | TimeOfDay;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm';

export type CameraPreset = 'orchard' | 'appleChan' | 'cottage' | 'windmill' | 'brook';

export type AppleChanOutfit = 'common' | 'spring' | 'idol';

export type AppleChanAction = 'stroll' | 'hug' | 'water' | 'wave';

export type CropId = 'honeyBerry' | 'appleSapling' | 'goldenSapling';

export type ProduceId =
  | 'redApples'
  | 'goldenApples'
  | 'honeyBerries'
  | 'ciderBottles'
  | 'applePies';

export type JournalTab = 'bag' | 'shop' | 'orders' | 'archive';

export interface WeatherInfo {
  kind: WeatherKind;
  temperatureC: number | null;
  weatherCode: number;
  isLive: boolean;
}

export interface RealTimeInfo {
  dateText: string;
  timeText: string;
  hourDecimal: number;
  timeZone: string;
  season: Season;
  phase: TimeOfDay;
}

export interface FarmPlotState {
  id: number;
  crop: CropId | null;
  stage: number;
  maxStage: number;
  watered: boolean;
}

export interface OrchardInventory {
  redApples: number;
  goldenApples: number;
  honeyBerries: number;
  ciderBottles: number;
  applePies: number;
  seeds: Record<CropId, number>;
}

export interface OrchardUpgrades {
  copperCan: boolean;
  magnetBasket: boolean;
  artisanKeg: boolean;
}

export type ShippingBinLedger = Record<ProduceId, number>;

export interface DailyOrder {
  id: string;
  requesterKey: 'baker' | 'woodcutter' | 'florist' | 'villager';
  item: ProduceId;
  required: number;
  rewardGold: number;
  rewardTrust: number;
  completed: boolean;
}

export interface DaySummary {
  dayFinished: number;
  season: Season;
  shipped: ShippingBinLedger;
  totalGoldEarned: number;
  cropsGrown: number;
}

export interface FarmState {
  day: number;
  season: Season;
  gold: number;
  energy: number;
  maxEnergy: number;
  inventory: OrchardInventory;
  upgrades: OrchardUpgrades;
  plots: FarmPlotState[];
  shippingBin: ShippingBinLedger;
  orders: DailyOrder[];
  pendingSummary: DaySummary | null;
}

export interface OrchardStats {
  applesHarvested: number;
  goldenApples: number;
  treesHugged: number;
  saplingsWatered: number;
  trustPercent: number;
  bestRushScore: number;
}

export interface PersistedGameState {
  farm: FarmState;
  stats: OrchardStats;
  outfit: AppleChanOutfit;
}

export interface PlayerSession {
  token: string;
  username: string;
  dbFile: string;
  updatedAt: string;
}

export interface RushState {
  active: boolean;
  finished: boolean;
  timeLeft: number;
  score: number;
  combo: number;
  bestScore: number;
  isNewRecord: boolean;
  roundApples: number;
  roundGolden: number;
}

export interface SpeechMessage {
  id: number;
  text: string;
}

export interface SceneCallbacks {
  onStatsChange: (stats: OrchardStats) => void;
  onFarmStateChange: (farm: FarmState) => void;
  onSpeech: (message: SpeechMessage) => void;
  onActionChange: (action: AppleChanAction) => void;
  onCameraPresetClear: () => void;
  onRushStateChange: (rush: RushState) => void;
  onOpenJournalTab: (tab: JournalTab) => void;
}
