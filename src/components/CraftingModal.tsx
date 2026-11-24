import { ArrowRight, Hammer, Sparkles, Sprout, Trash2, Utensils, Wine, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../i18n';
import { CraftingRecipeId, FarmState, Language } from '../scene/types';

type CraftIngredient = 'red' | 'golden';
type GridSlot = CraftIngredient | null;

interface CraftingModalProps {
  open: boolean;
  language: Language;
  isNight: boolean;
  farm: FarmState;
  onClose: () => void;
  onCraft: (recipe: CraftingRecipeId) => void;
}

interface RecipeDef {
  id: CraftingRecipeId;
  needRed: number;
  needGolden: number;
  /** Default Minecraft 3x3 pattern when user clicks the recipe card */
  pattern: GridSlot[];
}

const RECIPES: RecipeDef[] = [
  {
    id: 'cider',
    needRed: 3,
    needGolden: 0,
    pattern: [null, null, null, 'red', 'red', 'red', null, null, null],
  },
  {
    id: 'pie',
    needRed: 2,
    needGolden: 1,
    pattern: [null, 'golden', null, 'red', null, 'red', null, null, null],
  },
  {
    id: 'appleSeed',
    needRed: 1,
    needGolden: 0,
    pattern: [null, null, null, null, 'red', null, null, null, null],
  },
  {
    id: 'goldenSeed',
    needRed: 0,
    needGolden: 1,
    pattern: [null, null, null, null, 'golden', null, null, null, null],
  },
];

function AppleVoxelIcon({ kind }: { kind: CraftIngredient }) {
  return (
    <span
      className={`relative inline-block h-6 w-6 border-2 border-[#1b1b1b] ${
        kind === 'golden'
          ? 'bg-[#f4c430] shadow-[inset_2px_2px_0_#fff099,inset_-2px_-2px_0_#b2770e]'
          : 'bg-[#d63e34] shadow-[inset_2px_2px_0_#ff8a80,inset_-2px_-2px_0_#881b15]'
      }`}
    >
      <span className="absolute -top-1.5 left-1/2 h-1.5 w-1 -translate-x-1/2 bg-[#5c3a1e]" />
      <span className="absolute -top-1.5 left-[58%] h-1 w-1.5 bg-[#4f8a36]" />
    </span>
  );
}

function OutputIcon({ recipe }: { recipe: CraftingRecipeId }) {
  if (recipe === 'cider') return <Wine className="h-6 w-6 text-[#d48a21]" />;
  if (recipe === 'pie') return <Utensils className="h-6 w-6 text-[#c86a24]" />;
  if (recipe === 'appleSeed') return <Sprout className="h-6 w-6 text-[#4f8a36]" />;
  return <Sparkles className="h-6 w-6 text-[#f4c430]" />;
}

export function CraftingModal({
  open,
  language,
  isNight,
  farm,
  onClose,
  onCraft,
}: CraftingModalProps) {
  const [grid, setGrid] = useState<GridSlot[]>(() => Array(9).fill(null));
  const [selected, setSelected] = useState<CraftIngredient>('red');

  const placedRed = useMemo(() => grid.filter((g) => g === 'red').length, [grid]);
  const placedGolden = useMemo(() => grid.filter((g) => g === 'golden').length, [grid]);

  const availRed = Math.max(0, farm.inventory.redApples - placedRed);
  const availGolden = Math.max(0, farm.inventory.goldenApples - placedGolden);

  const matchedRecipe = useMemo<RecipeDef | null>(() => {
    return (
      RECIPES.find((r) => r.needRed === placedRed && r.needGolden === placedGolden) ??
      null
    );
  }, [placedRed, placedGolden]);

  const canExecuteCraft =
    matchedRecipe !== null &&
    farm.inventory.redApples >= matchedRecipe.needRed &&
    farm.inventory.goldenApples >= matchedRecipe.needGolden;

  if (!open) return null;

  const t = TRANSLATIONS[language];
  const panelClass = isNight ? 'mc-panel-dark' : 'mc-panel';
  const insetClass = isNight ? 'mc-inset-dark' : 'mc-inset';
  const slotClass = isNight ? 'mc-slot-dark' : 'mc-slot';
  const btnClass = isNight ? 'mc-btn-dark' : 'mc-btn';
  const mutedText = isNight ? 'text-[#b5bcc7]' : 'text-[#424242]';

  const handleSlotClick = (idx: number) => {
    setGrid((prev) => {
      const next = [...prev];
      if (next[idx] !== null) {
        next[idx] = null;
        return next;
      }
      if (selected === 'red' && availRed > 0) {
        next[idx] = 'red';
      } else if (selected === 'golden' && availGolden > 0) {
        next[idx] = 'golden';
      }
      return next;
    });
  };

  const handleLoadRecipe = (recipe: RecipeDef) => {
    if (
      farm.inventory.redApples < recipe.needRed ||
      farm.inventory.goldenApples < recipe.needGolden
    ) {
      return;
    }
    setGrid([...recipe.pattern]);
  };

  const handleCraft = () => {
    if (!matchedRecipe || !canExecuteCraft) return;
    onCraft(matchedRecipe.id);
    // Keep pattern loaded only if enough ingredients remain for another craft; otherwise clear
    const nextRed = farm.inventory.redApples - matchedRecipe.needRed;
    const nextGold = farm.inventory.goldenApples - matchedRecipe.needGolden;
    if (nextRed < matchedRecipe.needRed || nextGold < matchedRecipe.needGolden) {
      setGrid(Array(9).fill(null));
    }
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl p-5 ${panelClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3">
          <div>
            <h2
              className="flex items-center gap-2 text-lg font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <Hammer className="h-5 w-5 text-[#c88924]" />
              <span>{t.craftingTitle}</span>
            </h2>
            <p className={`mt-0.5 text-xs ${mutedText}`}>{t.craftingSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className={`flex h-8 w-8 items-center justify-center cursor-pointer ${btnClass}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main 2-column Minecraft Workbench Layout */}
        <div className="grid gap-4 md:grid-cols-[1.05fr_1fr]">
          {/* Left: 3x3 Crafting Grid + Output Slot + Ingredient Picker */}
          <div className={`p-3.5 ${insetClass}`}>
            <div className="flex items-center justify-center gap-3.5">
              {/* 3x3 Minecraft Grid */}
              <div className="grid grid-cols-3 gap-1">
                {grid.map((cell, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSlotClick(idx)}
                    className={`flex h-12 w-12 items-center justify-center cursor-pointer ${slotClass}`}
                  >
                    {cell && <AppleVoxelIcon kind={cell} />}
                  </button>
                ))}
              </div>

              <ArrowRight className={`h-6 w-6 shrink-0 ${mutedText}`} />

              {/* Output Slot */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  disabled={!canExecuteCraft}
                  onClick={handleCraft}
                  className={`flex h-14 w-14 items-center justify-center ${slotClass} ${
                    canExecuteCraft
                      ? 'mc-hotbar-active cursor-pointer'
                      : 'opacity-70 cursor-default'
                  }`}
                >
                  {matchedRecipe ? (
                    <OutputIcon recipe={matchedRecipe.id} />
                  ) : (
                    <span className={`text-[10px] font-bold ${mutedText}`}>?</span>
                  )}
                </button>
                <span className="max-w-[92px] truncate text-center text-[11px] font-bold">
                  {matchedRecipe
                    ? t.craftingRecipeNames[matchedRecipe.id]
                    : t.craftingEmptyOutput}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                disabled={!canExecuteCraft}
                onClick={handleCraft}
                className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold ${
                  canExecuteCraft
                    ? 'mc-btn-green cursor-pointer'
                    : `${btnClass} opacity-50 cursor-not-allowed`
                }`}
              >
                <Hammer className="h-3.5 w-3.5" />
                <span>{t.craftingCraftBtn}</span>
              </button>
              <button
                type="button"
                disabled={placedRed === 0 && placedGolden === 0}
                onClick={() => setGrid(Array(9).fill(null))}
                className={`flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold ${btnClass} ${
                  placedRed === 0 && placedGolden === 0
                    ? 'opacity-45 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t.craftingClearBtn}</span>
              </button>
            </div>

            {/* Ingredient Selector from Bag */}
            <div className="mt-3.5 border-t border-black/20 pt-3">
              <div className={`mb-2 text-[11px] font-bold uppercase ${mutedText}`}>
                {t.craftingIngredientsHeading}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelected('red')}
                  className={`flex items-center justify-between gap-2 px-2.5 py-2 text-xs font-bold cursor-pointer ${slotClass} ${
                    selected === 'red' ? 'mc-hotbar-active' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <AppleVoxelIcon kind="red" />
                    <span className="truncate text-white mc-text-shadow">
                      {t.produceNames.redApples}
                    </span>
                  </span>
                  <span
                    className="font-bold text-white tabular-nums mc-text-shadow"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {availRed}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelected('golden')}
                  className={`flex items-center justify-between gap-2 px-2.5 py-2 text-xs font-bold cursor-pointer ${slotClass} ${
                    selected === 'golden' ? 'mc-hotbar-active' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <AppleVoxelIcon kind="golden" />
                    <span className="truncate text-white mc-text-shadow">
                      {t.produceNames.goldenApples}
                    </span>
                  </span>
                  <span
                    className="font-bold text-white tabular-nums mc-text-shadow"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {availGolden}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: 4 Simple One-Click Recipe Book Cards */}
          <div className={`flex flex-col justify-between p-3.5 ${insetClass}`}>
            <div>
              <div className={`mb-2 text-[11px] font-bold uppercase ${mutedText}`}>
                {t.craftingRecipesHeading}
              </div>
              <div className="space-y-2">
                {RECIPES.map((recipe) => {
                  const hasEnough =
                    farm.inventory.redApples >= recipe.needRed &&
                    farm.inventory.goldenApples >= recipe.needGolden;
                  const isActive = matchedRecipe?.id === recipe.id;
                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      disabled={!hasEnough}
                      onClick={() => handleLoadRecipe(recipe)}
                      className={`flex w-full items-center justify-between gap-2.5 px-3 py-2 text-left ${
                        hasEnough
                          ? `${btnClass} cursor-pointer`
                          : `${slotClass} opacity-55 cursor-not-allowed`
                      } ${isActive ? 'mc-hotbar-active' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center ${slotClass}`}>
                          <OutputIcon recipe={recipe.id} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold">
                            {t.craftingRecipeNames[recipe.id]}
                          </div>
                          <div className="truncate text-[11px] opacity-80">
                            {t.craftingRecipeDescs[recipe.id]}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className={`mt-3 text-[11px] leading-relaxed ${mutedText}`}>
              {t.craftingHint}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
