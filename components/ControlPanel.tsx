import React, { useRef, useEffect } from 'react';
import { Palette, BrainCircuit, Mic2, Activity, Cable, Sparkles, Image, Film, Download, Trash2, Share2, Play } from 'lucide-react';
import { FilterState, AppSettings, GalleryItem, LutPreset, AudioConfig } from '../types';
import { LUT_PRESETS } from '../constants';

interface ControlPanelProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  audioConfig: AudioConfig;
  setAudioConfig: React.Dispatch<React.SetStateAction<AudioConfig>>;
  audioAnalyser: AnalyserNode | null;
  gallery: GalleryItem[];
  onDelete: (id: string) => void;
  onDownload: (item: GalleryItem) => void;
  onShare: (item: GalleryItem) => void;
  showToast: (msg: string) => void;
  midiDevice: string | null;
  detectedScene?: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  filters,
  setFilters,
  settings,
  setSettings,
  audioConfig,
  setAudioConfig,
  audioAnalyser,
  gallery,
  onDelete,
  onDownload,
  onShare,
  showToast,
  midiDevice,
  detectedScene = "Standard"
}) => {
  
  const handleLutChange = (preset: LutPreset) => {
    setFilters(prev => ({ 
      ...prev, 
      ...preset.values, 
      lut: preset.filter
    }));
    showToast(`LUT Applied: ${preset.name}`);
  };

  const Switch = ({ checked, onChange, label, subLabel }: { checked: boolean, onChange: (e: any) => void, label: string, subLabel?: string }) => (
    <label className="flex items-center justify-between p-4 rounded-[24px] bg-surfaceContainer hover:bg-white/10 cursor-pointer transition-all duration-200 group border border-transparent hover:border-white/5">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{label}</span>
        {subLabel && <span className="text-[11px] text-slate-500 font-medium">{subLabel}</span>}
      </div>
      <div className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          checked={checked}
          onChange={onChange}
          className="sr-only peer" 
        />
        <div className="w-[52px] h-[32px] bg-surfaceVariant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-300 after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary peer-checked:after:bg-onPrimary peer-checked:after:border-transparent peer-checked:after:translate-x-[20px] transition-colors duration-200"></div>
      </div>
    </label>
  );

  return (
    <div className="space-y-4 flex flex-col h-full overflow-y-auto custom-scrollbar p-6">
      
      {/* Intelligence */}
      <div className="bg-surface/80 backdrop-blur-md border border-white/5 rounded-[32px] p-6 shadow-xl shrink-0">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-slate-200 ml-1">Intelligence Suite</h3>
          <div className="p-2 bg-surfaceContainer rounded-full">
             <BrainCircuit className="w-4 h-4 text-primary" />
          </div>
        </div>
        
        {/* Background Blur Slider */}
        <div className="mb-4 px-1 space-y-3">
             <div className="flex justify-between text-xs text-slate-300 font-medium">
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

        {/* Portrait Lighting Slider */}
        <div className="mb-6 px-1 space-y-3">
             <div className="flex justify-between text-xs text-slate-300 font-medium">
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

        <div className="space-y-2">
           <Switch 
             label="Face Mesh HUD" 
             subLabel="Real-time Detection"
             checked={settings.ai}
             onChange={(e) => setSettings(s => ({ ...s, ai: e.target.checked }))}
           />
           <Switch 
             label="AI Autofocus" 
             subLabel="Subject Tracking Focus"
             checked={settings.aiAutofocus}
             onChange={(e) => setSettings(s => ({ ...s, aiAutofocus: e.target.checked }))}
           />
           <Switch 
             label="Motion Trigger" 
             subLabel="Auto-Record on Movement"
             checked={settings.motionTrigger}
             onChange={(e) => setSettings(s => ({ ...s, motionTrigger: e.target.checked }))}
           />
        </div>
      </div>

      {/* Scopes & Tools */}
      <div className="bg-surface/80 backdrop-blur-md border border-white/5 rounded-[32px] p-6 shadow-xl shrink-0">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-slate-200 ml-1">Scopes & Tools</h3>
          <div className="p-2 bg-surfaceContainer rounded-full">
             <Activity className="w-4 h-4 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2">
           <Switch 
             label="RGB Parade" 
             subLabel="Color Waveform Monitor"
             checked={settings.scopes}
             onChange={(e) => setSettings(s => ({ ...s, scopes: e.target.checked }))}
           />
           <Switch 
             label="Luma Histogram" 
             subLabel="Brightness Distribution"
             checked={settings.histogram}
             onChange={(e) => setSettings(s => ({ ...s, histogram: e.target.checked }))}
           />
           <Switch 
             label="Zebra Stripes" 
             subLabel="Exposure Warning"
             checked={settings.zebraStripes}
             onChange={(e) => setSettings(s => ({ ...s, zebraStripes: e.target.checked }))}
           />
           <Switch 
             label="Focus Peaking" 
             subLabel="Edge Highlight (Green)"
             checked={settings.focusPeaking}
             onChange={(e) => setSettings(s => ({ ...s, focusPeaking: e.target.checked }))}
           />
        </div>
      </div>
      
      {/* LUTs */}
      <div className="bg-surface/80 backdrop-blur-md border border-white/5 rounded-[32px] p-6 shadow-xl shrink-0">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-slate-200 ml-1">Color Profile</h3>
          <div className="p-2 bg-surfaceContainer rounded-full">
            <Palette className="w-4 h-4 text-primary" />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar mb-4">
          {LUT_PRESETS.map((preset) => {
             const isActive = filters.lut === preset.filter;
             return (
               <button
                 key={preset.name}
                 onClick={() => handleLutChange(preset)}
                 className={`px-4 py-2.5 rounded-[16px] text-xs font-medium border transition-all duration-200 flex items-center gap-2
                   ${isActive 
                     ? 'border-transparent bg-primary text-black' 
                     : `border-white/10 bg-surfaceContainer text-slate-300 hover:bg-white/10 hover:text-white ${preset.colorClass ? '' : ''}`
                   }`}
               >
                 {isActive && <div className="w-1.5 h-1.5 rounded-full bg-black"></div>}
                 {!isActive && preset.colorClass && (
                    <div className={`w-2 h-2 rounded-full ${preset.colorClass}`}></div>
                 )}
                 {preset.name}
               </button>
             );
          })}
        </div>
      </div>

      {/* Session Gallery */}
      <div className="bg-surface/80 backdrop-blur-md border border-white/5 rounded-[32px] p-6 shadow-xl shrink-0">
         <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-200 ml-1">Session Media</h3>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-400">{gallery.length}</span>
          </div>
          <div className="p-2 bg-surfaceContainer rounded-full">
             <Image className="w-4 h-4 text-primary" />
          </div>
        </div>

        {gallery.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/10 rounded-[20px] bg-white/5">
             <span className="text-xs">No captures in session</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
             {gallery.map((item) => (
                <div key={item.id} className="relative group aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
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
                   
                   {/* Overlay Actions */}
                   <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                      <button 
                        onClick={() => onDownload(item)} 
                        className="p-2 rounded-full bg-white/10 hover:bg-primary hover:text-black text-white transition-colors"
                        title="Download to Disk"
                      >
                         <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onShare(item)} 
                        className="p-2 rounded-full bg-white/10 hover:bg-blue-500 hover:text-white text-white transition-colors"
                        title="Share"
                      >
                         <Share2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(item.id)} 
                        className="p-2 rounded-full bg-white/10 hover:bg-red-500 hover:text-white text-white transition-colors"
                        title="Delete"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="bg-surface border border-white/5 rounded-[24px] p-4 flex flex-wrap gap-4 text-[11px] text-slate-400 font-medium mt-auto shrink-0">
         <span className="flex items-center gap-2 px-3 py-1.5 bg-surfaceContainer rounded-full">
           <div className={`w-2 h-2 rounded-full ${settings.boost ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-slate-600'}`}></div>
           <span>Mode: {settings.boost ? 'Boosted' : 'Native'}</span>
         </span>
         <span className="flex items-center gap-2 px-3 py-1.5 bg-surfaceContainer rounded-full" title="AI Scene Detection">
            <Sparkles className={`w-3 h-3 ${detectedScene !== 'Standard' ? 'text-primary' : 'text-slate-600'}`} />
            <span className={detectedScene !== 'Standard' ? 'text-primary' : ''}>Scene: {detectedScene}</span>
         </span>
         <span className="flex items-center gap-2 px-3 py-1.5 bg-surfaceContainer rounded-full" title={midiDevice ? `Connected: ${midiDevice}` : 'No Controller'}>
            <Cable className={`w-3 h-3 ${midiDevice ? 'text-primary' : 'text-slate-600'}`} />
            <span>MIDI: {midiDevice ? 'ON' : 'OFF'}</span>
         </span>
      </div>

    </div>
  );
};

export default ControlPanel;