import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Droplets,
  Hand,
  Heart,
  Moon,
  Sun,
  Sunset,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  AppleChanAction,
  AppleChanOutfit,
  CameraPreset,
  OrchardStats,
  SpeechMessage,
  TimeOfDay,
} from '../scene/types';

interface OrchardHUDProps {
  timeOfDay: TimeOfDay;
  outfit: AppleChanOutfit;
  cameraPreset: CameraPreset | null;
  currentAction: AppleChanAction;
  audioEnabled: boolean;
  stats: OrchardStats;
  speech: SpeechMessage | null;
  dockCollapsed: boolean;
  profileOpen: boolean;
  onTimeOfDayChange: (mode: TimeOfDay) => void;
  onOutfitChange: (outfit: AppleChanOutfit) => void;
  onCameraPresetChange: (preset: CameraPreset) => void;
  onHugTree: () => void;
  onWaterSaplings: () => void;
  onWave: () => void;
  onToggleAudio: () => void;
  onToggleDock: () => void;
  onToggleProfile: (open: boolean) => void;
}

export function OrchardHUD({
  timeOfDay,
  outfit,
  cameraPreset,
  currentAction,
  audioEnabled,
  stats,
  speech,
  dockCollapsed,
  profileOpen,
  onTimeOfDayChange,
  onOutfitChange,
  onCameraPresetChange,
  onHugTree,
  onWaterSaplings,
  onWave,
  onToggleAudio,
  onToggleDock,
  onToggleProfile,
}: OrchardHUDProps) {
  const isNight = timeOfDay === 'night';

  const surfaceClass = isNight
    ? 'bg-[#172136]/95 text-[#F2F6FC] border-[#2E4166]'
    : 'bg-[#FAF6EE]/95 text-[#222B1E] border-[#DDD3BE]';

  const mutedText = isNight ? 'text-[#9CB0D1]' : 'text-[#5E6856]';
  const dividerColor = isNight ? 'bg-[#2E4166]' : 'bg-[#DDD3BE]';
  const segmentedBg = isNight ? 'bg-[#0F1728]' : 'bg-[#EDE5D4]';
  const activeTab = isNight
    ? 'bg-[#3C7B52] text-white'
    : 'bg-[#2F6A40] text-[#FCFBF7]';
  const inactiveTab = isNight
    ? 'text-[#B8C7E0] hover:text-white'
    : 'text-[#4C5846] hover:text-[#1D2619]';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Minimal Top-Left Header Lockup (unobstructed center viewport) */}
      <header className="flex items-start justify-between p-4 sm:p-5">
        <div
          className={`pointer-events-auto flex items-center gap-4 rounded-xl border px-4 py-2.5 shadow-sm transition-colors duration-200 ${surfaceClass}`}
        >
          <div className="flex flex-col">
            <h1
              className="text-base font-bold leading-tight tracking-tight whitespace-nowrap sm:text-lg"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Apple-chan&apos;s Orchard
            </h1>
            <div
              className={`mt-0.5 flex items-center gap-2 text-xs tabular-nums ${mutedText}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <span>Apples {stats.applesHarvested}</span>
              <span aria-hidden="true">·</span>
              <span>Hugs {stats.treesHugged}</span>
              <span aria-hidden="true">·</span>
              <span>Click any tree</span>
            </div>
          </div>

          <div className={`h-7 w-px ${dividerColor}`} aria-hidden="true" />

          <button
            type="button"
            onClick={() => onToggleProfile(true)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isNight
                ? 'bg-[#233252] text-[#E8F0FF] hover:bg-[#2C3F66]'
                : 'bg-[#ECE4D2] text-[#2B3725] hover:bg-[#E0D5BE]'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Profile</span>
          </button>
        </div>
      </header>

      {/* Bottom Zone: Speech Caption + Collapsible Control Dock */}
      <div className="flex flex-col items-center px-3 pb-4">
        {/* Ephemeral Cheerful Speech Caption above the dock */}
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
              Apple-chan:
            </span>{' '}
            <span>{speech.text}</span>
          </div>
        )}

        {/* Collapse / Expand Tab attached to top edge of bottom dock */}
        <button
          type="button"
          onClick={onToggleDock}
          title="Toggle controls (H)"
          className={`pointer-events-auto flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${surfaceClass}`}
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {/* Unified Bottom Control Dock */}
        {!dockCollapsed && (
          <div
            className={`pointer-events-auto flex w-full max-w-[940px] flex-wrap items-center justify-center gap-2.5 rounded-2xl border px-3.5 py-2.5 shadow-md transition-colors duration-200 sm:flex-nowrap sm:justify-between ${surfaceClass}`}
          >
            {/* 1. Interactive Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onHugTree}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentAction === 'hug'
                    ? 'bg-[#D64940] text-white'
                    : isNight
                      ? 'bg-[#253555] text-[#F2F6FC] hover:bg-[#31456D]'
                      : 'bg-[#EFE7D7] text-[#283323] hover:bg-[#E4D9C2]'
                }`}
              >
                <Heart className="h-3.5 w-3.5" />
                <span>Hug Tree</span>
              </button>

              <button
                type="button"
                onClick={onWaterSaplings}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentAction === 'water'
                    ? 'bg-[#3A84B8] text-white'
                    : isNight
                      ? 'bg-[#253555] text-[#F2F6FC] hover:bg-[#31456D]'
                      : 'bg-[#EFE7D7] text-[#283323] hover:bg-[#E4D9C2]'
                }`}
              >
                <Droplets className="h-3.5 w-3.5" />
                <span>Water</span>
              </button>

              <button
                type="button"
                onClick={onWave}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentAction === 'wave'
                    ? 'bg-[#3C7B52] text-white'
                    : isNight
                      ? 'bg-[#253555] text-[#F2F6FC] hover:bg-[#31456D]'
                      : 'bg-[#EFE7D7] text-[#283323] hover:bg-[#E4D9C2]'
                }`}
              >
                <Hand className="h-3.5 w-3.5" />
                <span>Wave</span>
              </button>
            </div>

            <div className={`hidden h-6 w-px sm:block ${dividerColor}`} aria-hidden="true" />

            {/* 2. Outfit Switcher */}
            <div className={`flex items-center gap-0.5 rounded-lg p-1 ${segmentedBg}`}>
              {(
                [
                  ['common', 'Common'],
                  ['spring', 'Spring'],
                  ['idol', 'Idol'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onOutfitChange(mode)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    outfit === mode ? activeTab : inactiveTab
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={`hidden h-6 w-px sm:block ${dividerColor}`} aria-hidden="true" />

            {/* 3. Camera Views */}
            <div className={`flex items-center gap-0.5 rounded-lg p-1 ${segmentedBg}`}>
              {(
                [
                  ['orchard', 'Orchard'],
                  ['appleChan', 'Apple-chan'],
                  ['cottage', 'Cottage'],
                  ['brook', 'Brook'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onCameraPresetChange(id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    cameraPreset === id ? activeTab : inactiveTab
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={`hidden h-6 w-px sm:block ${dividerColor}`} aria-hidden="true" />

            {/* 4. Lighting & Sound */}
            <div className="flex items-center gap-1.5">
              <div className={`flex items-center gap-0.5 rounded-lg p-1 ${segmentedBg}`}>
                <button
                  type="button"
                  onClick={() => onTimeOfDayChange('morning')}
                  aria-label="Sunny Morning"
                  title="Sunny Morning"
                  className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                    timeOfDay === 'morning' ? activeTab : inactiveTab
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onTimeOfDayChange('sunset')}
                  aria-label="Golden Sunset"
                  title="Golden Sunset"
                  className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                    timeOfDay === 'sunset' ? activeTab : inactiveTab
                  }`}
                >
                  <Sunset className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onTimeOfDayChange('night')}
                  aria-label="Starry Night"
                  title="Starry Night"
                  className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                    timeOfDay === 'night' ? activeTab : inactiveTab
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={onToggleAudio}
                aria-label={audioEnabled ? 'Mute orchard chimes' : 'Enable orchard chimes'}
                title={audioEnabled ? 'Mute sound' : 'Play orchard chimes'}
                className={`rounded-lg p-2 transition-colors cursor-pointer ${
                  audioEnabled
                    ? activeTab
                    : isNight
                      ? 'bg-[#253555] text-[#B8C7E0] hover:text-white'
                      : 'bg-[#EFE7D7] text-[#4C5846] hover:text-[#1D2619]'
                }`}
              >
                {audioEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Optional Character Profile Almanac Modal (Strictly User-Triggered) */}
      {profileOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
          onClick={() => onToggleProfile(false)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-xl ${surfaceClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-xl font-bold tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Apple-chan&apos;s Field Archive
                </h2>
                <p className={`mt-1 text-xs ${mutedText}`}>
                  Original character by 70CentsApple · Orchard Keeper
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggleProfile(false)}
                aria-label="Close profile"
                className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                  isNight ? 'hover:bg-[#253555]' : 'hover:bg-[#EAE1CE]'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className={`my-4 grid grid-cols-2 gap-x-6 gap-y-2 border-y py-4 text-sm ${
                isNight ? 'border-[#2E4166]' : 'border-[#DDD3BE]'
              }`}
            >
              <div>
                <span className={`block text-xs ${mutedText}`}>Birthday</span>
                <span className="font-semibold">August 7</span>
              </div>
              <div>
                <span className={`block text-xs ${mutedText}`}>Height</span>
                <span className="font-semibold tabular-nums">146 cm</span>
              </div>
              <div>
                <span className={`block text-xs ${mutedText}`}>Tree Planting</span>
                <span className="font-semibold tabular-nums">5 years</span>
              </div>
              <div>
                <span className={`block text-xs ${mutedText}`}>Favorite Colors</span>
                <span className="font-semibold">Grass Green &amp; Sky Blue</span>
              </div>
            </div>

            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Cheerful, independent, and endlessly enthusiastic, Apple-chan reclaimed an
                overgrown garden and grew it into her own blooming apple orchard. Every tree
                stands deeply rooted as her family—and she loves hugging every single trunk
                so tightly that apples tumble from the leaves.
              </p>
              <p className={`text-xs italic ${mutedText}`}>
                &ldquo;At the edge of darkness, in the orchard&apos;s heart, leaves rustle, a
                girl looks up. Starry skies, moonlight sways, leaning on a sturdy trunk, she
                falls into dream&apos;s embrace.&rdquo;
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  onToggleProfile(false);
                  onCameraPresetChange('appleChan');
                  onHugTree();
                }}
                className="rounded-lg bg-[#2F6A40] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#265734] cursor-pointer"
              >
                Watch Her Hug a Tree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
