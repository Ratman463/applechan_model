export type TimeOfDay = 'morning' | 'sunset' | 'night';

export type CameraPreset = 'orchard' | 'appleChan' | 'cottage' | 'brook';

export type AppleChanOutfit = 'common' | 'spring' | 'idol';

export type AppleChanAction = 'stroll' | 'hug' | 'water' | 'wave';

export interface OrchardStats {
  applesHarvested: number;
  treesHugged: number;
  saplingsWatered: number;
}

export interface SpeechMessage {
  id: number;
  text: string;
}

export interface SceneCallbacks {
  onStatsChange: (stats: OrchardStats) => void;
  onSpeech: (message: SpeechMessage) => void;
  onActionChange: (action: AppleChanAction) => void;
  onCameraPresetClear: () => void;
}
