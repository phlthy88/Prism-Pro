import React from 'react';
import { Aperture, Zap, Cpu, Palette, Gpu } from 'lucide-react';
import { AppSettings } from '../types';

interface HeaderProps {
  settings?: AppSettings;
  onToggleSetting?: (key: keyof AppSettings) => void;
  isWebGLSupported?: boolean;
}

const Header: React.FC<HeaderProps> = ({ settings, onToggleSetting, isWebGLSupported = true }) => {
  
  const isCrostiniActive = settings?.crostiniSafe || false;
  const isHdrActive = settings?.hdr || false;
  const isWebGpuActive = settings?.webGpuEnabled || false; // Placeholder
  const isBoostActive = settings?.boost || false;
  
  // FIXED: Use Container tokens to support CSS Variables (Hex Codes)
  const toggleButtonClass = (isActive: boolean) => isActive 
    ? 'bg-primary-container text-on-primary-container border-primary/50 hover:bg-opacity-80' 
    : 'bg-surfaceContainer text-on-surface border-transparent hover:bg-surface-variant';

  return (
    <header className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center py-2">
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <div className="bg-primary text-black p-3 rounded-[16px]">
             <Aperture className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-normal tracking-tight text-slate-100">Prism Forge</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide mt-0.5">PRO CAMERA SUITE</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        
        {/* 1. WebGPU Toggle */}
        <button 
          onClick={() => onToggleSetting?.('webGpuEnabled')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-[12px] transition-colors text-xs font-medium border select-none ${toggleButtonClass(isWebGpuActive)}`}
          title="Enable WebGPU Backend (Experimental)"
        >
          <Zap className="w-3.5 h-3.5 text-primary" />WebGPU
        </button>
        
        {/* 2. CROSTINI SAFE Toggle */}
        <button 
          onClick={() => onToggleSetting?.('crostiniSafe')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-[12px] transition-colors text-xs font-medium border select-none ${toggleButtonClass(isCrostiniActive)}`}
          title="Optimize for Virtualized Environments"
        >
          <Cpu className="w-3.5 h-3.5 text-primary" />Crostini Safe
        </button>

        {/* 3. 10-BIT COLOR Toggle */}
        <button 
          onClick={() => onToggleSetting?.('hdr')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-[12px] transition-colors text-xs font-medium border select-none ${toggleButtonClass(isHdrActive)}`}
          title="Request 10-Bit/HDR Color Depth"
        >
          <Palette className="w-3.5 h-3.5 text-primary" />10-Bit Color
        </button>
        
        {/* 4. WebGL2 Boost Toggle */}
        {isWebGLSupported ? (
          <button 
            onClick={() => onToggleSetting?.('boost')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-[12px] transition-colors text-xs font-medium border select-none ${toggleButtonClass(isBoostActive)}`}
            title="Enable High Performance Mode (60 FPS Target)"
          >
            <Gpu className="w-3.5 h-3.5 text-primary" />WebGL2 Boost
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-red-500/20 text-red-400 transition-colors text-xs font-medium cursor-default select-none border border-transparent">
            <Gpu className="w-3.5 h-3.5" />WebGL Unavailable
          </span>
        )}

      </div>
    </header>
  );
};

export default Header;