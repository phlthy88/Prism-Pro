import React from 'react';
import { Aperture, Zap, Cpu, Palette, Gpu, Sun, Moon, Star } from 'lucide-react';
import { AppSettings } from '../types';

interface HeaderProps {
  settings: AppSettings;
  onToggleSetting: (key: keyof AppSettings) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  isWebGLSupported?: boolean;
  onToggleBasicSettings: () => void;
  onToggleProSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ settings, onToggleSetting, theme, setTheme, isWebGLSupported = true, onToggleBasicSettings, onToggleProSettings }) => {
  
  const isCrostiniActive = settings.crostiniSafe;
  const isHdrActive = settings.hdr;
  const isWebGpuActive = settings?.webGpuEnabled || false;
  const isBoostActive = settings?.boost || false;
  
  // FIXED: Use Container tokens to support CSS Variables (Hex Codes)
  const toggleButtonClass = (isActive: boolean) => isActive
    ? 'bg-primary-container text-on-primary-container border-primary/50 shadow-elevation-2 hover:shadow-elevation-3'
    : 'bg-surface-container text-on-surface border-transparent hover:bg-surface-variant shadow-elevation-1';

  return (
    <header className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center py-2">
      {/* Logo and Title */}
      <div className="flex items-center gap-4">
        <div className="bg-primary text-on-primary p-3 rounded-lg shadow-elevation-3 shadow-glow-purple">
          <Aperture className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-on-surface">Prism Forge</h1>
          <p className="text-xs text-on-surface-variant font-medium tracking-wide mt-0.5">PRO CAMERA SUITE</p>
        </div>
      </div>

      {/* Theming and Settings */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Theme Switcher */}
        <div className="flex items-center bg-surface-container rounded-md p-1 shadow-elevation-1">
          <button
            onClick={() => setTheme('light')}
            data-testid="theme-btn-light"
            className={`p-2 rounded-sm transition-all focus-ring ${theme === 'light' ? 'bg-primary/20 text-primary shadow-glow-amber' : 'text-on-surface-variant hover:bg-surface-variant'}`}
            title="Light Theme"
            aria-label="Switch to light theme"
          >
            <Sun size={16} aria-hidden="true" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            data-testid="theme-btn-dark"
            className={`p-2 rounded-sm transition-all focus-ring ${theme === 'dark' ? 'bg-primary/20 text-primary shadow-glow-blue' : 'text-on-surface-variant hover:bg-surface-variant'}`}
            title="Dark Theme"
            aria-label="Switch to dark theme"
          >
            <Moon size={16} aria-hidden="true" />
          </button>
          <button
            onClick={() => setTheme('system')}
            data-testid="theme-btn-system"
            className={`p-2 rounded-sm transition-all focus-ring ${theme === 'system' ? 'bg-primary/20 text-primary shadow-glow-purple' : 'text-on-surface-variant hover:bg-surface-variant'}`}
            title="System Theme"
            aria-label="Switch to system theme"
          >
            <Star size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Setting Toggles */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onToggleSetting('webGpuEnabled')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-all focus-ring text-xs font-medium border select-none ${toggleButtonClass(isWebGpuActive)} ${isWebGpuActive ? 'shadow-glow-lime' : ''}`}
            title="Enable WebGPU Backend (Experimental)"
            aria-label="Toggle WebGPU backend"
            aria-pressed={isWebGpuActive}
          >
            <Zap className={`w-3.5 h-3.5 ${isWebGpuActive ? 'text-accent-lime' : 'text-accent-amber'}`} aria-hidden="true" />WebGPU
          </button>
          <button
            onClick={() => onToggleSetting('crostiniSafe')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-all focus-ring text-xs font-medium border select-none ${toggleButtonClass(isCrostiniActive)} ${isCrostiniActive ? 'shadow-glow-blue' : ''}`}
            title="Optimize for Virtualized Environments"
            aria-label="Toggle Crostini safe mode"
            aria-pressed={isCrostiniActive}
          >
            <Cpu className={`w-3.5 h-3.5 ${isCrostiniActive ? 'text-accent-blue' : 'text-primary'}`} aria-hidden="true" />Crostini Safe
          </button>
          <button
            onClick={() => onToggleSetting('hdr')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-all focus-ring text-xs font-medium border select-none ${toggleButtonClass(isHdrActive)} ${isHdrActive ? 'shadow-glow-pink' : ''}`}
            title="Request 10-Bit/HDR Color Depth"
            aria-label="Toggle 10-bit color"
            aria-pressed={isHdrActive}
          >
            <Palette className={`w-3.5 h-3.5 ${isHdrActive ? 'text-accent-pink' : 'text-primary'}`} aria-hidden="true" />10-Bit Color
          </button>

          {/* Conditional Boost Button */}
          {isWebGLSupported ? (
            <button
              onClick={() => onToggleSetting('boost')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-all focus-ring text-xs font-medium border select-none ${toggleButtonClass(isBoostActive)} ${isBoostActive ? 'shadow-glow-green' : ''}`}
              title="Enable High Performance Mode (60 FPS Target)"
              aria-label="Toggle high performance mode"
              aria-pressed={isBoostActive}
            >
              <Gpu className={`w-3.5 h-3.5 ${isBoostActive ? 'text-accent-green' : 'text-primary'}`} aria-hidden="true" />WebGL2 Boost
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-error-container/20 text-error transition-all text-xs font-medium cursor-default select-none border border-error/30 shadow-elevation-1">
              <Gpu className="w-3.5 h-3.5" aria-hidden="true" />WebGL Unavailable
            </span>
          )}

          {/* Basic Tools Button */}
          <button
            onClick={onToggleBasicSettings}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-all focus-ring text-xs font-medium border select-none ${toggleButtonClass(settings.ai || settings.aiAutofocus || settings.scopes || settings.histogram || settings.showPerfMonitor)} ${(settings.ai || settings.aiAutofocus || settings.scopes || settings.histogram || settings.showPerfMonitor) ? 'shadow-glow-cyan' : ''}`}
            title="Open Basic Tools (AI, Scopes, Gallery)"
            aria-label="Toggle basic tools"
          >
            <span className="w-3.5 h-3.5 inline-flex items-center justify-center bg-accent-cyan/20 rounded text-accent-cyan" aria-hidden="true">AI</span>Basic
          </button>

          {/* Pro Controls Button */}
          <button
            onClick={onToggleProSettings}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-all focus-ring text-xs font-medium border select-none ${toggleButtonClass(settings.hardwarePTZ || settings.grading || settings.luts)} ${(settings.hardwarePTZ || settings.grading || settings.luts) ? 'shadow-glow-purple' : ''}`}
            title="Open Pro Controls (Hardware PTZ, Grading, LUTs)"
            aria-label="Toggle pro controls"
          >
            <span className="w-3.5 h-3.5 inline-flex items-center justify-center bg-accent-purple/20 rounded text-accent-purple" aria-hidden="true">PTZ</span>Pro
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;