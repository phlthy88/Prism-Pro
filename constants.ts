
import { FilterState, AppSettings, LutPreset, AudioPreset, AudioConfig } from './types';

export const INITIAL_FILTERS: FilterState = {
  exposure: 0,
  iso: 400,
  temp: 5600,
  saturation: 1,
  contrast: 1,
  brightness: 1,
  hue: 0,
  sepia: 0,
  blur: 0, // Default Off
  portraitLighting: 0, // Default Off
  zoom: 1,
  pan: 0,
  tilt: 0,
  vignette: 0,
  lut: 'none',
  lutIntensity: 1.0,
  falseColor: false,
  logProfile: false,
  desqueeze: 1.0,
  shutterSim: 0
};

export const INITIAL_SETTINGS: AppSettings = {
  grid: false,
  guides: 'none',
  histogram: false,
  scopes: false,
  ai: false,
  aiAutofocus: false,
  autoLowLight: false, // Default Off
  boost: false,
  zebraStripes: false,
  focusPeaking: false,
  showPerfMonitor: true,
  motionTrigger: false,
  mirror: false,
  crostiniSafe: false,
  hdr: false,
  webGpuEnabled: false
};

export const INITIAL_AUDIO_CONFIG: AudioConfig = {
  enabled: true,
  gain: 1.0,
  preset: 'broadcast'
};

export const AUDIO_PRESETS: AudioPreset[] = [
  {
    id: 'broadcast',
    name: 'Podcast / Broadcast',
    description: 'Warm, compressed voice with reduced rumble.',
    settings: {
      lowCut: 80,
      highCut: 16000,
      peakFreq: 3000, // Presence
      peakGain: 3,
      compressorThreshold: -24,
      compressorRatio: 4
    }
  },
  {
    id: 'vocal',
    name: 'Vocal Isolation (AI Sim)',
    description: 'Aggressive filtering to isolate speech frequencies.',
    settings: {
      lowCut: 150,
      highCut: 8000,
      peakFreq: 2000,
      peakGain: 6,
      compressorThreshold: -20,
      compressorRatio: 8
    }
  },
  {
    id: 'cinema',
    name: 'Cinema / Wide',
    description: 'Dynamic range preserved with slight polish.',
    settings: {
      lowCut: 40,
      highCut: 20000,
      peakFreq: 5000,
      peakGain: 2,
      compressorThreshold: -12,
      compressorRatio: 2
    }
  },
  {
    id: 'asmr',
    name: 'ASMR / Sensitive',
    description: 'High gain, minimal compression, full spectrum.',
    settings: {
      lowCut: 20,
      highCut: 22000,
      peakFreq: 12000, // Air
      peakGain: 4,
      compressorThreshold: -40,
      compressorRatio: 1.5
    }
  }
];

export const LUT_PRESETS: LutPreset[] = [
  { 
    name: "Native", 
    filter: "none", 
    colorClass: "bg-slate-700",
    values: { contrast: 1, saturation: 1, brightness: 1, hue: 0, sepia: 0 }
  },
  { 
    name: "Playa", 
    filter: "playa", 
    colorClass: "bg-orange-400",
    values: { contrast: 1.1, saturation: 1.2, brightness: 1.05, hue: -5, sepia: 0.1 }
  },
  { 
    name: "Clay", 
    filter: "clay", 
    colorClass: "bg-red-400",
    values: { contrast: 1.0, saturation: 0.8, brightness: 1.0, hue: 0, sepia: 0.3 }
  },
  { 
    name: "Blush", 
    filter: "blush", 
    colorClass: "bg-pink-400",
    values: { contrast: 0.95, saturation: 1.1, brightness: 1.05, hue: 10, sepia: 0.1 }
  },
  { 
    name: "Modulo", 
    filter: "modulo", 
    colorClass: "bg-slate-500",
    values: { contrast: 1.3, saturation: 0, brightness: 1.0, hue: 0, sepia: 0 }
  },
  { 
    name: "Wool", 
    filter: "wool", 
    colorClass: "bg-gray-400",
    values: { contrast: 0.9, saturation: 0.9, brightness: 1.0, hue: 0, sepia: 0.1 }
  },
  { 
    name: "Ollie", 
    filter: "ollie", 
    colorClass: "bg-emerald-500",
    values: { contrast: 1.1, saturation: 1.1, brightness: 1.0, hue: 0, sepia: 0 }
  },
  { 
    name: "Vesta", 
    filter: "vesta", 
    colorClass: "bg-yellow-200",
    values: { contrast: 1.05, saturation: 1.2, brightness: 1.1, hue: -5, sepia: 0.2 }
  },
  { 
    name: "Honey", 
    filter: "honey", 
    colorClass: "bg-amber-300",
    values: { contrast: 1.0, saturation: 1.1, brightness: 1.05, hue: 0, sepia: 0.4 }
  },
  { 
    name: "Isla", 
    filter: "isla", 
    colorClass: "bg-cyan-200",
    values: { contrast: 0.9, saturation: 1.1, brightness: 1.1, hue: -10, sepia: 0 }
  },
  { 
    name: "Bazaar", 
    filter: "bazaar", 
    colorClass: "bg-rose-600",
    values: { contrast: 1.2, saturation: 1.3, brightness: 0.9, hue: 5, sepia: 0 }
  },
  { 
    name: "Vista", 
    filter: "vista", 
    colorClass: "bg-blue-500",
    values: { contrast: 1.2, saturation: 1.2, brightness: 1.0, hue: 0, sepia: 0 }
  },
  { 
    name: "Prime", 
    filter: "prime", 
    colorClass: "bg-indigo-500",
    values: { contrast: 1.3, saturation: 1.4, brightness: 1.0, hue: 0, sepia: 0 }
  },
  // Legacy
  { 
    name: "Neo-Noir", 
    filter: "neonoir", 
    colorClass: "bg-gray-800",
    values: { contrast: 1.4, brightness: 0.8, saturation: 0, hue: 0, sepia: 0 }
  },
  { 
    name: "Vintage", 
    filter: "vintage", 
    colorClass: "bg-amber-700",
    values: { sepia: 0.5, contrast: 0.9, brightness: 1.0, saturation: 0.7, hue: 0 }
  }
];
