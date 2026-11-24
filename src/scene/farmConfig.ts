import {
  CropId,
  DailyOrder,
  FarmPlotState,
  FarmState,
  ProduceId,
  Season,
  ShippingBinLedger,
} from './types';

export const FARM_STORAGE_KEY = 'applechan_orchard_farm_v1';

export const CROP_SPECS: Record<
  CropId,
  { seedPrice: number; growDays: number; yieldItem: ProduceId; yieldAmount: number }
> = {
  honeyBerry: {
    seedPrice: 25,
    growDays: 1,
    yieldItem: 'honeyBerries',
    yieldAmount: 2,
  },
  appleSapling: {
    seedPrice: 35,
    growDays: 2,
    yieldItem: 'redApples',
    yieldAmount: 3,
  },
  goldenSapling: {
    seedPrice: 95,
    growDays: 2,
    yieldItem: 'goldenApples',
    yieldAmount: 2,
  },
};

export const BASE_SELL_PRICES: Record<ProduceId, number> = {
  redApples: 15,
  goldenApples: 65,
  honeyBerries: 28,
  ciderBottles: 75,
  applePies: 165,
};

export const UPGRADE_PRICES = {
  copperCan: 120,
  magnetBasket: 180,
  artisanKeg: 240,
} as const;

export function getSellPrice(item: ProduceId, hasArtisanKeg: boolean): number {
  const base = BASE_SELL_PRICES[item];
  if (hasArtisanKeg && (item === 'ciderBottles' || item === 'applePies')) {
    return Math.round(base * 1.5);
  }
  return base;
}

export function createEmptyLedger(): ShippingBinLedger {
  return {
    redApples: 0,
    goldenApples: 0,
    honeyBerries: 0,
    ciderBottles: 0,
    applePies: 0,
  };
}

export function getSeasonForDay(day: number): Season {
  const idx = Math.floor((day - 1) / 7) % 4;
  if (idx === 0) return 'spring';
  if (idx === 1) return 'summer';
  if (idx === 2) return 'autumn';
  return 'winter';
}

export function generateDailyOrders(day: number): DailyOrder[] {
  const pool: Omit<DailyOrder, 'id' | 'completed'>[] = [
    {
      requesterKey: 'villager',
      item: 'redApples',
      required: 4,
      rewardGold: 95,
      rewardTrust: 14,
    },
    {
      requesterKey: 'florist',
      item: 'honeyBerries',
      required: 2,
      rewardGold: 85,
      rewardTrust: 14,
    },
    {
      requesterKey: 'woodcutter',
      item: 'ciderBottles',
      required: 1,
      rewardGold: 130,
      rewardTrust: 18,
    },
    {
      requesterKey: 'baker',
      item: 'applePies',
      required: 1,
      rewardGold: 240,
      rewardTrust: 24,
    },
    {
      requesterKey: 'baker',
      item: 'goldenApples',
      required: 2,
      rewardGold: 185,
      rewardTrust: 20,
    },
    {
      requesterKey: 'woodcutter',
      item: 'redApples',
      required: 6,
      rewardGold: 135,
      rewardTrust: 16,
    },
  ];
  const firstIdx = (day - 1) % pool.length;
  const secondIdx = (day + 1) % pool.length;
  const chosen = [pool[firstIdx], pool[secondIdx]];
  return chosen.map((o, i) => ({
    ...o,
    id: `day${day}_order${i}`,
    completed: false,
  }));
}

export function createInitialFarmState(): FarmState {
  // Start with 2 cozy planted sprouts + 4 open beds so the garden immediately feels alive!
  const plots: FarmPlotState[] = [
    { id: 0, crop: 'honeyBerry', stage: 1, maxStage: 1, watered: false },
    { id: 1, crop: 'appleSapling', stage: 1, maxStage: 2, watered: false },
    { id: 2, crop: null, stage: 0, maxStage: 1, watered: false },
    { id: 3, crop: null, stage: 0, maxStage: 1, watered: false },
    { id: 4, crop: null, stage: 0, maxStage: 1, watered: false },
    { id: 5, crop: null, stage: 0, maxStage: 1, watered: false },
  ];
  return {
    day: 1,
    season: 'spring',
    gold: 60,
    energy: 100,
    maxEnergy: 100,
    inventory: {
      redApples: 3,
      goldenApples: 0,
      honeyBerries: 0,
      ciderBottles: 0,
      applePies: 0,
      seeds: {
        honeyBerry: 2,
        appleSapling: 1,
        goldenSapling: 0,
      },
    },
    upgrades: {
      copperCan: false,
      magnetBasket: false,
      artisanKeg: false,
    },
    plots,
    shippingBin: createEmptyLedger(),
    orders: generateDailyOrders(1),
    pendingSummary: null,
  };
}

export function sanitizeFarmState(parsed: Partial<FarmState> | null | undefined): FarmState {
  const fallback = createInitialFarmState();
  if (!parsed || typeof parsed !== 'object') return fallback;
  const day = Math.max(1, Number(parsed.day) || 1);
  return {
    day,
    season: getSeasonForDay(day),
    gold: Math.max(0, Number(parsed.gold) ?? fallback.gold),
    energy: Math.min(100, Math.max(0, Number(parsed.energy) ?? 100)),
    maxEnergy: 100,
    inventory: {
      redApples: Math.max(0, Number(parsed.inventory?.redApples) || 0),
      goldenApples: Math.max(0, Number(parsed.inventory?.goldenApples) || 0),
      honeyBerries: Math.max(0, Number(parsed.inventory?.honeyBerries) || 0),
      ciderBottles: Math.max(0, Number(parsed.inventory?.ciderBottles) || 0),
      applePies: Math.max(0, Number(parsed.inventory?.applePies) || 0),
      seeds: {
        honeyBerry: Math.max(0, Number(parsed.inventory?.seeds?.honeyBerry) || 0),
        appleSapling: Math.max(0, Number(parsed.inventory?.seeds?.appleSapling) || 0),
        goldenSapling: Math.max(0, Number(parsed.inventory?.seeds?.goldenSapling) || 0),
      },
    },
    upgrades: {
      copperCan: Boolean(parsed.upgrades?.copperCan),
      magnetBasket: Boolean(parsed.upgrades?.magnetBasket),
      artisanKeg: Boolean(parsed.upgrades?.artisanKeg),
    },
    plots:
      Array.isArray(parsed.plots) && parsed.plots.length === 6
        ? parsed.plots
        : fallback.plots,
    shippingBin: {
      ...createEmptyLedger(),
      ...(parsed.shippingBin || {}),
    },
    orders:
      Array.isArray(parsed.orders) && parsed.orders.length > 0
        ? parsed.orders
        : generateDailyOrders(day),
    pendingSummary: null,
  };
}

export function loadFarmState(): FarmState {
  try {
    const raw = window.localStorage.getItem(FARM_STORAGE_KEY);
    if (!raw) return createInitialFarmState();
    return sanitizeFarmState(JSON.parse(raw) as Partial<FarmState>);
  } catch {
    return createInitialFarmState();
  }
}

export function saveFarmState(farm: FarmState): void {
  try {
    const toSave = { ...farm, pendingSummary: null };
    window.localStorage.setItem(FARM_STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore storage errors in sandboxed iframes
  }
}
