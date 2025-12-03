import React, { useRef, useState } from 'react';
import { X, Sliders, Move, Upload, RotateCcw, Keyboard, Palette, BrainCircuit, Activity, Image, Film, Download, Trash2, Share2, Play, Sparkles, Cable, LayoutTemplate, ScanEye, Timer, Sun } from 'lucide-react';
import { FilterState, AppSettings, AudioConfig, GalleryItem, LutPreset, IntervalometerConfig, MediaTrackCapabilitiesPTZ, MediaTrackSettingsPTZ } from '../types';
import { INITIAL_FILTERS, LUT_PRESETS } from '../constants';

interface SettingsFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'basic' | 'pro';
  
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  settings: AppSettings;
  setSettings?: React.Dispatch<React.SetStateAction<AppSettings>>;
  
  // Pro Props
  toggleBoost: () => void;
  capabilities: MediaTrackCapabilities | null;
  trackSettings: MediaTrackSettings | null;
  applyControls: (constraints: MediaTrackConstraints) => void;
  loadLut: ((file: File) => void) | null;
  
  // Basic Props
  audioConfig?: AudioConfig;
  setAudioConfig?: React.Dispatch<React.SetStateAction<AudioConfig>>;
  audioAnalyser?: AnalyserNode | null;
  gallery?: GalleryItem[];
  onDelete?: (id: string) => void;
  onDownload?: (item: GalleryItem) => void;
  onShare?: (item: GalleryItem) => void;
  showToast?: (msg: string) => void;
  midiDevice?: string | null;
  detectedScene?: string;
  
  // Intervalometer (Managed by parent or local if simple)
  intervalometer?: IntervalometerConfig;
  setIntervalometer?: React.Dispatch<React.SetStateAction<IntervalometerConfig>>;

  className?: string;
}

const SettingsFlyout: React.FC<SettingsFlyoutProps> = ({
  isOpen,
  onClose,
  mode,
  filters,
  setFilters,
  settings,
  setSettings,
  toggleBoost,
  capabilities,
  trackSettings,
  applyControls,
  loadLut,
  // Basic
  audioConfig,
  setAudioConfig,
  gallery = [],
  onDelete,
  onDownload,
  onShare,
  showToast,
  midiDevice,
  detectedScene = "Standard",
  intervalometer,
  setIntervalometer,
  className
}) => {
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const caps = capabilities as MediaTrackCapabilitiesPTZ | null;
  const tSettings = trackSettings as MediaTrackSettingsPTZ | null;

  const [confirmReset, setConfirmReset] = useState(false);

  // Clear reset confirmation when flyout closes
  React.useEffect(() => {
    if (!isOpen) {
      setConfirmReset(false);
    }
  }, [isOpen]);

  // Handle Escape key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [spinning, setSpinning] = useState<Record<string, boolean>>({});

  const handleRangeChange = (key: keyof FilterState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [key]: parseFloat(e.target.value) }));
  };

  const handleHardwareChange = (key: 'pan' | 'tilt' | 'zoom') => (e: React.ChangeEvent<HTMLInputElement>) => {
    applyControls({ [key]: parseFloat(e.target.value) } as any);
  };
  
  const handleLutUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0] && loadLut) {
        loadLut(e.target.files[0]);
        setFilters(prev => ({ ...prev, lut: 'custom' }));
     }
  };

  const triggerSpin = (key: string) => {
    setSpinning(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setSpinning(prev => ({ ...prev, [key]: false })), 700);
  };

  const handleResetAll = () => {
    if (confirmReset) {
      setFilters(INITIAL_FILTERS);
      if (caps?.pan) applyControls({ pan: 0 } as any);
      if (caps?.tilt) applyControls({ tilt: 0 } as any);
      if (caps?.zoom) applyControls({ zoom: 1 } as any);
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  const resetGrading = () => {
    triggerSpin('grading');
    setFilters(prev => ({
      ...prev,
      contrast: INITIAL_FILTERS.contrast,
      brightness: INITIAL_FILTERS.brightness,
      saturation: INITIAL_FILTERS.saturation,
      hue: INITIAL_FILTERS.hue,
      sepia: INITIAL_FILTERS.sepia,
      lut: INITIAL_FILTERS.lut,
      lutIntensity: INITIAL_FILTERS.lutIntensity,
      logProfile: false,
      falseColor: false
    }));
  };

  const resetMechanics = () => {
    triggerSpin('mechanics');
    if (caps?.pan) applyControls({ pan: 0 } as any);
    if (caps?.tilt) applyControls({ tilt: 0 } as any);
    if (caps?.zoom) applyControls({ zoom: 1 } as any);
  };

  const resetSensor = () => {
    triggerSpin('sensor');
    setFilters(prev => ({
      ...prev,
      exposure: INITIAL_FILTERS.exposure,
      iso: INITIAL_FILTERS.iso,
      temp: INITIAL_FILTERS.temp
    }));
  };

  const resetOptics = () => {
    triggerSpin('optics');
    setFilters(prev => ({
      ...prev,
      zoom: INITIAL_FILTERS.zoom,
      vignette: INITIAL_FILTERS.vignette,
      desqueeze: 1.0
    }));
  };
  
  const handleLutChange = (preset: LutPreset) => {
    setFilters(prev => ({ 
      ...prev, 
      ...preset.values, 
      lut: preset.filter
    }));
    if (showToast) showToast(`LUT Applied: ${preset.name}`);
  };

  const Switch = ({ checked, onChange, label, subLabel }: { checked: boolean, onChange: (e: any) => void, label: string, subLabel?: string }) => (
    <label className="flex items-center justify-between p-4 rounded-xl bg-surface-container hover:bg-surface-container-high cursor-pointer transition-all duration-200 group border border-transparent hover:border-outline-variant shadow-elevation-1 hover:shadow-elevation-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-on-surface group-hover:text-on-surface transition-colors">{label}</span>
        {subLabel && <span className="text-[11px] text-on-surface-variant font-medium">{subLabel}</span>}
      </div>
      <div className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-[52px] h-[32px] bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-outline after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary peer-checked:after:bg-on-primary peer-checked:after:border-transparent peer-checked:after:translate-x-[20px] transition-colors duration-200"></div>
      </div>
    </label>
  );

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-scrim/60 backdrop-blur-sm transition-opacity duration-500 z-flyout-backdrop ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Sidebar */}
      <aside
        /* FIXED: Changed bg-surface to bg-surface-container to provide contrast against the main background */
        className={`fixed top-0 right-0 h-full w-full max-w-[400px] bg-surface-container border-l border-outline-variant shadow-elevation-5 overflow-y-auto custom-scrollbar transform transition-transform duration-500 ease-[cubic-bezier(0.2,0.0,0,1.0)] rounded-l-3xl ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${className || 'z-flyout'}`}
      >
        <div className="p-8 space-y-8 min-h-full flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between sticky top-0 bg-surface-container pt-2 pb-4 z-20 border-b border-outline-variant shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-normal text-on-surface">
                {mode === 'basic' ? 'Basic Settings' : 'Pro Controls'}
              </h2>
              {mode === 'pro' && (
                <button
                  onClick={handleResetAll}
                  className={`text-[10px] font-bold uppercase tracking-wider border px-3 py-1 rounded-full transition-all duration-200 shadow-elevation-2 focus-ring ${
                    confirmReset
                      ? 'bg-error text-on-error border-error animate-pulse shadow-glow-orange'
                      : 'text-error border-error/30 hover:bg-error/10'
                  }`}
                >
                  {confirmReset ? 'Confirm?' : 'Reset All'}
                </button>
              )}
            </div>
            <button onClick={onClose} className="p-3 rounded-full hover:bg-surface-container-high hover:text-on-surface text-on-surface-variant transition-all shadow-elevation-1 hover:shadow-elevation-2 focus-ring">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* --- BASIC MODE CONTENT --- */}
          {mode === 'basic' && setSettings && (
            <div className="space-y-6 pb-10 animate-in slide-in-from-right-4 duration-500">
              
              {/* Intelligence */}
              <div className="bg-surface-container-low border border-outline-variant rounded-3xl p-6 space-y-4">
                 <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-on-surface ml-1">Intelligence Suite</h3>
                  <BrainCircuit className="w-4 h-4 text-primary" />
                </div>
                
                <div className="space-y-3 px-1">
                     <div className="flex justify-between text-xs text-on-surface-variant font-medium">
                       <span>AI Background Blur</span> 
                       <span>{(filters.blur * 100).toFixed(0)}%</span>
                     </div>
                     <input 
                       type="range" min="0" max="1" step="0.1" 
                       value={filters.blur} 
                       onChange={(e) => setFilters(prev => ({ ...prev, blur: parseFloat(e.target.value) }))}
                       className="accent-primary"
                     />
                </div>
                <div className="space-y-3 px-1">
                     <div className="flex justify-between text-xs text-on-surface-variant font-medium">
                       <span>AI Portrait Lighting</span> 
                       <span>{(filters.portraitLighting * 100).toFixed(0)}%</span>
                     </div>
                     <input 
                       type="range" min="0" max="1" step="0.1" 
                       value={filters.portraitLighting} 
                       onChange={(e) => setFilters(prev => ({ ...prev, portraitLighting: parseFloat(e.target.value) }))}
                       className="accent-primary"
                     />
                </div>
                <div className="space-y-2 pt-2">
                   <Switch label="Face Mesh HUD" subLabel="Real-time Detection" checked={settings.ai} onChange={(e) => setSettings?.(s => ({ ...s, ai: e.target.checked }))} />
                   <Switch label="AI Autofocus" subLabel="Subject Tracking Focus" checked={settings.aiAutofocus} onChange={(e) => setSettings?.(s => ({ ...s, aiAutofocus: e.target.checked }))} />
                   <Switch label="AI Low Light Boost" subLabel="Auto-Enhance Dark Scenes" checked={settings.autoLowLight} onChange={(e) => setSettings?.(s => ({ ...s, autoLowLight: e.target.checked }))} />
                   <Switch label="Motion Trigger" subLabel="Auto-Record on Movement" checked={settings.motionTrigger} onChange={(e) => setSettings?.(s => ({ ...s, motionTrigger: e.target.checked }))} />
                </div>
              </div>

              {/* Scopes & Tools */}
              <div className="bg-surface-container-low border border-outline-variant rounded-3xl p-6 space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-on-surface ml-1">Scopes & Tools</h3>
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                 <Switch label="RGB Parade" subLabel="Color Waveform Monitor" checked={settings.scopes} onChange={(e) => setSettings?.(s => ({ ...s, scopes: e.target.checked }))} />
                 <Switch label="Luma Histogram" subLabel="Brightness Distribution" checked={settings.histogram} onChange={(e) => setSettings?.(s => ({ ...s, histogram: e.target.checked }))} />
                 <Switch label="Zebra Stripes" subLabel="Exposure Warning" checked={settings.zebraStripes} onChange={(e) => setSettings?.(s => ({ ...s, zebraStripes: e.target.checked }))} />
                 <Switch label="Focus Peaking" subLabel="Edge Highlight (Green)" checked={settings.focusPeaking} onChange={(e) => setSettings?.(s => ({ ...s, focusPeaking: e.target.checked }))} />
                 <Switch label="Mirror View" subLabel="Horizontal Flip" checked={settings.mirror} onChange={(e) => setSettings?.(s => ({ ...s, mirror: e.target.checked }))} />
              </div>

              {/* Basic Guides */}
              <div className="bg-surface-container-low border border-outline-variant rounded-3xl p-6 space-y-4">
                 <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-on-surface ml-1">Composition</h3>
                  <LayoutTemplate className="w-4 h-4 text-primary" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {['none', '16:9', '4:3', '2.35:1', '1:1'].map((g) => (
                      <button
                        key={g}
                        onClick={() => setSettings?.(s => ({ ...s, guides: g as any }))}
                        className={`px-3 py-2 rounded-xl text-[10px] font-medium border transition-all focus-ring ${settings.guides === g ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high'}`}
                      >
                        {g.toUpperCase()}
                      </button>
                    ))}
                </div>
              </div>

               {/* LUTs */}
              <div className="bg-surface-container-low border border-outline-variant rounded-3xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-bold text-on-surface ml-1">Color Profile</h3>
                  <Palette className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-wrap gap-2.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                  {LUT_PRESETS.map((preset) => {
                     const isActive = filters.lut === preset.filter;
                     return (
                       <button
                         key={preset.name}
                         onClick={() => handleLutChange(preset)}
                         className={`px-4 py-2.5 rounded-[16px] text-xs font-medium border transition-all duration-200 flex items-center gap-2 focus-ring
                           ${isActive 
                             ? 'border-transparent bg-primary text-on-primary'
                             : `border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high hover:text-on-surface ${preset.colorClass ? '' : ''}`
                           }`}
                       >
                         {isActive && <div className="w-1.5 h-1.5 rounded-full bg-on-primary"></div>}
                         {!isActive && preset.colorClass && (
                            <div className={`w-2 h-2 rounded-full ${preset.colorClass}`}></div>
                         )}
                         {preset.name}
                       </button>
                     );
                  })}
                </div>
              </div>

              {/* Gallery */}
              <div className="bg-surface-container-low border border-outline-variant rounded-3xl p-6">
                 <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-on-surface ml-1">Session Media</h3>
                    <span className="text-[10px] bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant">{gallery.length}</span>
                  </div>
                  <Image className="w-4 h-4 text-primary" />
                </div>

                {gallery.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-on-surface-variant border border-dashed border-outline-variant rounded-xl bg-surface-container">
                     <span className="text-xs">No captures in session</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                     {gallery.map((item) => (
                        <div key={item.id} className="relative group aspect-video rounded-xl overflow-hidden bg-black border border-outline-variant">
                           {item.type === 'video' ? (
                             <>
                                <video src={item.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                   <Play className="w-8 h-8 text-white/50 fill-white/20" />
                                </div>
                                <div className="absolute top-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-bold text-white flex items-center gap-1">
                                   <Film className="w-3 h-3 text-red-400" />
                                </div>
                             </>
                           ) : (
                             <img src={item.url} alt="Capture" className="w-full h-full object-cover" />
                           )}
                           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all flex items-center justify-center gap-2">
                              <button onClick={() => onDownload?.(item)} className="p-2 rounded-full bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface transition-colors focus-ring" title="Download"><Download className="w-4 h-4" /></button>
                              <button onClick={() => onShare?.(item)} className="p-2 rounded-full bg-surface-container hover:bg-blue-500 hover:text-white text-on-surface transition-colors focus-ring" title="Share"><Share2 className="w-4 h-4" /></button>
                              <button onClick={() => onDelete?.(item.id)} className="p-2 rounded-full bg-surface-container hover:bg-error hover:text-on-error text-on-surface transition-colors focus-ring" title="Delete"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        </div>
                     ))}
                  </div>
                )}
              </div>
              
              {/* Status Footer */}
              <div className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-wrap gap-4 text-[11px] text-on-surface-variant font-medium mt-auto">
                 <span className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-full">
                    <Sparkles className={`w-3 h-3 ${detectedScene !== 'Standard' ? 'text-primary' : 'text-on-surface-variant/50'}`} />
                    <span className={detectedScene !== 'Standard' ? 'text-primary' : ''}>Scene: {detectedScene}</span>
                 </span>
                 <span className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-full">
                    <Cable className={`w-3 h-3 ${midiDevice ? 'text-primary' : 'text-on-surface-variant/50'}`} />
                    <span>MIDI: {midiDevice ? 'ON' : 'OFF'}</span>
                 </span>
              </div>
            </div>
          )}

          {/* --- PRO MODE CONTENT --- */}
          {mode === 'pro' && (
             <div className="space-y-8 pb-10 animate-in slide-in-from-right-4 duration-500">
                {/* Post Processing / Grading */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-surface-container-low px-4 py-2 rounded-full">
                    <div className="flex items-center text-sm font-medium text-primary">
                      <span className="uppercase tracking-widest text-[10px]">Grading FX</span>
                      <Sliders className="w-3.5 h-3.5 ml-2" />
                    </div>
                    <button onClick={resetGrading} className="text-on-surface-variant hover:text-on-surface transition-colors p-1 focus-ring rounded" title="Reset Grading">
                      <RotateCcw className={`w-3.5 h-3.5 transition-transform duration-700 ease-in-out ${spinning['grading'] ? '-rotate-[360deg]' : ''}`} />
                    </button>
                  </div>
                  
                  <div className="space-y-6 px-2">
                    {/* Import LUT */}
                    <div className="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-3">
                       <div className="flex justify-between items-center">
                         <span className="text-xs font-medium text-on-surface">3D LUT (.png/.cube)</span>
                         <span className="text-[10px] text-on-surface-variant">512x512 Identity</span>
                       </div>
                       <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="w-full py-2.5 rounded-md bg-surface-container-high hover:bg-surface-bright text-xs text-on-surface border border-outline-variant flex items-center justify-center gap-2 transition-colors focus-ring"
                       >
                         <Upload className="w-3.5 h-3.5" />
                         Import LUT Strip
                       </button>
                       <input type="file" ref={fileInputRef} onChange={handleLutUpload} className="hidden" accept="image/png,image/jpeg"/>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <Switch label="Log Profile" subLabel="Flat Gamma Curve" checked={filters.logProfile} onChange={(e) => setFilters(f => ({ ...f, logProfile: e.target.checked }))} />
                       <Switch label="False Color" subLabel="IRE Heatmap" checked={filters.falseColor} onChange={(e) => setFilters(f => ({ ...f, falseColor: e.target.checked }))} />
                    </div>

                    <div className="space-y-3">
                       <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Contrast</span><span>{filters.contrast}</span></div>
                       <input type="range" min="0" max="2" step="0.1" value={filters.contrast} onChange={handleRangeChange('contrast')} className="accent-primary" />
                    </div>
                    <div className="space-y-3">
                       <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Brightness</span><span>{filters.brightness}</span></div>
                       <input type="range" min="0" max="2" step="0.1" value={filters.brightness} onChange={handleRangeChange('brightness')} className="accent-primary" />
                    </div>
                    <div className="space-y-3">
                       <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Saturation</span><span>{filters.saturation}</span></div>
                       <input type="range" min="0" max="2" step="0.1" value={filters.saturation} onChange={handleRangeChange('saturation')} className="accent-primary" />
                    </div>
                    <div className="space-y-3">
                       <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Hue Shift</span><span>{filters.hue}°</span></div>
                       <input type="range" min="-180" max="180" step="5" value={filters.hue} onChange={handleRangeChange('hue')} className="accent-primary" />
                    </div>
                    <div className="space-y-3">
                       <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Sepia</span><span>{filters.sepia}</span></div>
                       <input type="range" min="0" max="1" step="0.1" value={filters.sepia} onChange={handleRangeChange('sepia')} className="accent-primary" />
                    </div>
                  </div>
                </div>

                {/* Hardware Mechanics (PTZ) */}
                {caps && (caps.pan || caps.tilt || caps.zoom) && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-surface-container-low px-4 py-2 rounded-full">
                      <div className="flex items-center text-sm font-medium text-primary">
                        <span className="uppercase tracking-widest text-[10px]">Mechanics</span>
                        <Move className="w-3.5 h-3.5 ml-2" />
                      </div>
                      <button onClick={resetMechanics} className="text-on-surface-variant hover:text-on-surface transition-colors p-1 focus-ring rounded" title="Reset Mechanics">
                        <RotateCcw className={`w-3.5 h-3.5 transition-transform duration-700 ease-in-out ${spinning['mechanics'] ? '-rotate-[360deg]' : ''}`} />
                      </button>
                    </div>

                    <div className="space-y-6 px-2">
                      {caps.pan && (
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Pan</span><span>{tSettings?.pan || 0}°</span></div>
                          <input type="range" min={caps.pan.min} max={caps.pan.max} step={caps.pan.step} value={tSettings?.pan || 0} onChange={handleHardwareChange('pan')} className="accent-primary" />
                        </div>
                      )}
                      {caps.tilt && (
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Tilt</span><span>{tSettings?.tilt || 0}°</span></div>
                          <input type="range" min={caps.tilt.min} max={caps.tilt.max} step={caps.tilt.step} value={tSettings?.tilt || 0} onChange={handleHardwareChange('tilt')} className="accent-primary" />
                        </div>
                      )}
                      {caps.zoom && (
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Optical Zoom</span><span>{tSettings?.zoom || 1}x</span></div>
                          <input type="range" min={caps.zoom.min} max={caps.zoom.max} step={caps.zoom.step} value={tSettings?.zoom || 1} onChange={handleHardwareChange('zoom')} className="accent-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Camera Sim */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-surface-container-low px-4 py-2 rounded-full">
                    <div className="flex items-center text-sm font-medium text-primary">
                      <span className="uppercase tracking-widest text-[10px]">Sensor</span>
                      <Sun className="w-3.5 h-3.5 ml-2" /> // Dep: Sun icon
                    </div>
                    <button onClick={resetSensor} className="text-on-surface-variant hover:text-on-surface transition-colors p-1 focus-ring rounded" title="Reset Sensor">
                      <RotateCcw className={`w-3.5 h-3.5 transition-transform duration-700 ease-in-out ${spinning['sensor'] ? '-rotate-[360deg]' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-6 px-2">
                    <div className="space-y-3">
                       <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Exposure Bias</span><span>{filters.exposure}</span></div>
                       <input type="range" min="-2" max="2" step="0.1" value={filters.exposure} onChange={handleRangeChange('exposure')} className="accent-primary" />
                    </div>
                    <div className="space-y-3">
                       <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>ISO (Gain & Noise)</span><span>{filters.iso}</span></div>
                       <input type="range" min="100" max="3200" step="100" value={filters.iso} onChange={handleRangeChange('iso')} className="accent-primary" />
                    </div>
                    <div className="space-y-3">
                       <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>White Balance (K)</span><span>{filters.temp}K</span></div>
                       <input type="range" min="3000" max="9000" step="100" value={filters.temp} onChange={handleRangeChange('temp')} className="bg-gradient-to-r from-blue-900 via-slate-800 to-orange-900 rounded-full h-1.5"/>
                    </div>
                  </div>
                </div>

                {/* Optics */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-surface-container-low px-4 py-2 rounded-full">
                    <div className="flex items-center text-sm font-medium text-primary">
                      <span className="uppercase tracking-widest text-[10px]">Optics</span>
                      <ScanEye className="w-3.5 h-3.5 ml-2" />
                    </div>
                    <button onClick={resetOptics} className="text-on-surface-variant hover:text-on-surface transition-colors p-1 focus-ring rounded" title="Reset Optics">
                      <RotateCcw className={`w-3.5 h-3.5 transition-transform duration-700 ease-in-out ${spinning['optics'] ? '-rotate-[360deg]' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-6 px-2">
                     <div className="space-y-3">
                       <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Desqueeze</span><span>{filters.desqueeze}x</span></div>
                       <div className="flex gap-2">
                          {[1.0, 1.33, 1.5, 2.0].map(v => (
                             <button 
                               key={v}
                               onClick={() => setFilters(f => ({ ...f, desqueeze: v }))}
                               className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium border focus-ring ${filters.desqueeze === v ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container border-outline-variant text-on-surface-variant'}`}
                             >
                               {v}x
                             </button>
                          ))}
                       </div>
                    </div>
                     <div className="space-y-3">
                       <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Digital Zoom</span><span>{filters.zoom}x</span></div>
                       <input type="range" min="1" max="3" step="0.1" value={filters.zoom} onChange={handleRangeChange('zoom')} className="accent-primary" />
                    </div>
                    <div className="space-y-3">
                       <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Vignette</span><span>{filters.vignette}</span></div>
                       <input type="range" min="0" max="1" step="0.05" value={filters.vignette} onChange={handleRangeChange('vignette')} className="accent-primary" />
                    </div>
                  </div>
                </div>
                
                {/* Intervalometer */}
                {setIntervalometer && intervalometer && (
                  <div className="space-y-4">
                     <div className="flex justify-between items-center bg-surface-container-low px-4 py-2 rounded-full">
                        <div className="flex items-center text-sm font-medium text-primary">
                           <span className="uppercase tracking-widest text-[10px]">Intervalometer</span>
                           <Timer className="w-3.5 h-3.5 ml-2" />
                        </div>
                        <Switch label="" checked={intervalometer.enabled} onChange={(e) => setIntervalometer(i => ({ ...i, enabled: e.target.checked }))} />
                     </div>
                     <div className="px-2 space-y-4">
                        <div className="space-y-3">
                           <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Interval (Seconds)</span><span>{intervalometer.interval}s</span></div>
                           <input 
                             type="range" min="1" max="60" step="1" 
                             value={intervalometer.interval} 
                             onChange={(e) => setIntervalometer(i => ({ ...i, interval: parseInt(e.target.value) }))} 
                             className="accent-primary" 
                           />
                        </div>
                        <div className="space-y-3">
                           <div className="flex justify-between text-xs text-on-surface-variant font-medium"><span>Count (0 = Infinite)</span><span>{intervalometer.count === 0 ? '∞' : intervalometer.count}</span></div>
                           <input 
                             type="range" min="0" max="100" step="10" 
                             value={intervalometer.count} 
                             onChange={(e) => setIntervalometer(i => ({ ...i, count: parseInt(e.target.value) }))} 
                             className="accent-primary" 
                           />
                        </div>
                     </div>
                  </div>
                )}

                {/* MIDI Hint */}
                 <div className="pt-8 border-t border-outline-variant space-y-4">
                   <div className="flex justify-between items-center text-sm font-medium text-on-surface-variant uppercase tracking-widest text-[10px]">
                     <span>System Override</span>
                   </div>
                   <button 
                     onClick={toggleBoost}
                     className="w-full py-4 px-5 rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high text-sm text-left flex items-center justify-between transition group focus-ring"
                   >
                     <span className="text-on-surface font-medium">Crostini GPU Boost</span>
                     <div className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center ${settings.boost ? 'bg-primary' : 'bg-surface-variant'}`}>
                        <div className={`w-4 h-4 rounded-full bg-on-primary shadow-sm transition-transform ${settings.boost ? 'translate-x-6' : 'translate-x-0'}`}></div>
                     </div>
                   </button>
                   
                   <div className="w-full py-4 px-5 rounded-xl border border-outline-variant bg-surface-container text-sm text-left flex flex-col gap-2">
                     <div className="flex items-center gap-2 text-primary font-medium">
                        <Keyboard className="w-4 h-4" />
                        <span>MIDI Control Map</span>
                     </div>
                     <div className="text-[10px] text-on-surface-variant grid grid-cols-2 gap-2">
                        <span>CC 1: Zoom</span>
                        <span>CC 2: Exposure</span>
                        <span>CC 3: LUT Strength</span>
                        <span>CC 4: Blur</span>
                        <span>CC 7: Audio Gain</span>
                     </div>
                   </div>
                </div>
             </div>
          )}

        </div>
      </aside>
    </>
  );
};

export default SettingsFlyout;
