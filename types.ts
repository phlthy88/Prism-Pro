
export interface FilterState {
  exposure: number;
  iso: number;
  temp: number;
  saturation: number;
  // New visual filters
  contrast: number;
  brightness: number;
  hue: number;
  sepia: number;
  blur: number; // 0 (off) to 1 (max)
  portraitLighting: number; // AI Enhancement 0 (off) to 1 (max)
  
  zoom: number;
  pan: number;
  tilt: number;
  vignette: number;
  lut: string;
  lutIntensity: number;

  // New Pro Features
  falseColor: boolean; // IRE Heatmap
  logProfile: boolean; // Flat Gamma Curve
  desqueeze: number; // 1.0, 1.33, 1.5, etc.
  shutterSim: number; // 0 (Off) to 1 (Max blur/lag)
}

export interface AppSettings {
  grid: boolean;
  guides: 'none' | '16:9' | '4:3' | '2.35:1' | '1:1'; // Basic Safe Areas
  histogram: boolean;
  scopes: boolean; // RGB Parade
  ai: boolean;
  aiAutofocus: boolean; // New: AI Driven Focus
  autoLowLight: boolean; // New: AI Low Light Enhancement
  boost: boolean;
  zebraStripes: boolean;
  focusPeaking: boolean;
  showPerfMonitor: boolean;
  motionTrigger: boolean; // Auto-record on motion
  mirror: boolean; // Horizontal Flip
  
  // Rendering and Input Settings
  crostiniSafe: boolean; // Controls WebGL desynchronized: true
  hdr: boolean;          // Controls camera constraints (10-bit color request)
  webGpuEnabled: boolean; // Placeholder for WebGPU rendering path
}

export interface IntervalometerConfig {
  enabled: boolean;
  interval: number; // seconds
  count: number; // 0 = infinite
  frameCount: number; // Current progress
}

export interface AudioConfig {
  enabled: boolean;
  gain: number;
  preset: string; // 'broadcast' | 'cinema' | 'asmr' | 'vocal'
}

export interface AudioPreset {
  id: string;
  name: string;
  description: string;
  settings: {
    lowCut: number; // Hz
    highCut: number; // Hz
    peakFreq: number; // Hz
    peakGain: number; // dB
    compressorThreshold: number; // dB
    compressorRatio: number;
  }
}

export interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  timestamp: number;
  blob?: Blob; // For sharing/downloading
}

export interface LutPreset {
  name: string;
  filter: string; // Keep for fallback or ID
  colorClass: string;
  values: Partial<FilterState>;
}

export interface DetectedObject {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

export interface WorkerInitMessage {
  type: 'INIT';
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  config?: {
    crostiniSafe: boolean;
    webGpuEnabled: boolean;
  };
}

export interface WorkerFrameMessage {
  type: 'FRAME';
  bitmap: ImageBitmap;
  mask?: ImageBitmap; // Segmentation mask
  filters: FilterState;
  settings: {
    zebraStripes: boolean;
    focusPeaking: boolean;
    histogram: boolean;
    scopes: boolean;
    mirror: boolean;
    autoLowLight: boolean;
  };
}

export interface WorkerLutMessage {
  type: 'LUT_DATA';
  bitmap: ImageBitmap;
}

export interface PerfMetrics {
  fps: number;
  frameTime: number; // ms
  memory?: number; // MB
}

// Stats from the worker (Histogram + RGB Scope)
export interface FrameStats {
  histogram: number[]; // Luma
  rgbParade?: { r: number[]; g: number[]; b: number[] };
  scene?: string; // AI Detected Scene
  lumaAvg?: number; // For low light detection
  smoothedLuma?: number; // Internal smoothed value
}
