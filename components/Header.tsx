import React from 'react';
import { Aperture, Zap, Cpu, Palette, Gpu, Sun, Moon, Star } from 'lucide-react';
import { AppSettings } from '../types';

interface HeaderProps {
  settings: AppSettings;
  onToggleSetting: (key: keyof AppSettings) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  isWebGLSupported?: boolean;
}

const Header: React.FC<HeaderProps> = ({ settings, onToggleSetting, theme, setTheme, isWebGLSupported = true }) => {
  
  const isCrostiniActive = settings.crostiniSafe;
  const isHdrActive = settings.hdr;
  const isWebGpuActive = settings?.webGpuEnabled || false;
  const isBoostActive = settings?.boost || false;
  
  // FIXED: Use Container tokens to support CSS Variables (Hex Codes)
  const toggleButtonClass = (isActive: boolean) => isActive 
    ? 'bg-primary-container text-on-primary-container border-primary/50 hover:bg-opacity-80' 
    : 'bg-surfaceContainer text-on-surface border-transparent hover:bg-surface-variant';

  return (
    <header className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center py-2">
      {/* Logo and Title */}
      <div className="flex items-center gap-4">
        <div className="bg-primary text-onPrimary p-3 rounded-[16px]">
          <Aperture className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-onSurface">Prism Forge</h1>
          <p className="text-xs text-onSurfaceVariant font-medium tracking-wide mt-0.5">PRO CAMERA SUITE</p>
        </div>
      </div>

      {/* Theming and Settings */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Theme Switcher */}
        <div className="flex items-center bg-surfaceContainer rounded-[12px] p-1">
          <button
            onClick={() => setTheme('light')}
            data-testid="theme-btn-light"
            className={`p-2 rounded-[8px] ${theme === 'light' ? 'bg-primary/20 text-primary' : 'text-onSurfaceVariant'}`}
            title="Light Theme"
          >
            <Sun size={16} />
          </button>
          <button
            onClick={() => setTheme('dark')}
            data-testid="theme-btn-dark"
            className={`p-2 rounded-[8px] ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'text-onSurfaceVariant'}`}
            title="Dark Theme"
          >
            <Moon size={16} />
          </button>
          <button
            onClick={() => setTheme('system')}
            data-testid="theme-btn-system"
            className={`p-2 rounded-[8px] ${theme === 'system' ? 'bg-primary/20 text-primary' : 'text-onSurfaceVariant'}`}
            title="System Theme"
          >
            <Star size={16} />
          </button>
        </div>

        {/* Setting Toggles */}
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => onToggleSetting('webGpuEnabled')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-[12px] transition-colors text-xs font-medium border select-none ${toggleButtonClass(isWebGpuActive)}`}
            title="Enable WebGPU Backend (Experimental)"
          >
            <Zap className="w-3.5 h-3.5 text-primary" />WebGPU
          </button>
          <button
            onClick={() => onToggleSetting('crostiniSafe')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-[12px] transition-colors text-xs font-medium border select-none ${toggleButtonClass(isCrostiniActive)}`}
            title="Optimize for Virtualized Environments"
          >
            <Cpu className="w-3.5 h-3.5 text-primary" />Crostini Safe
          </button>
          <button
            onClick={() => onToggleSetting('hdr')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-[12px] transition-colors text-xs font-medium border select-none ${toggleButtonClass(isHdrActive)}`}
            title="Request 10-Bit/HDR Color Depth"
          >
            <Palette className="w-3.5 h-3.5 text-primary" />10-Bit Color
          </button>
          
          {/* Conditional Boost Button */}
          {isWebGLSupported ? (
            <button
              onClick={() => onToggleSetting('boost')}
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
      </div>
    </header>
  );
};

export default Header;