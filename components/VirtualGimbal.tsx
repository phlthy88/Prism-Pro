
import React, { useRef, useState, useEffect } from 'react';
import { FilterState } from '../types';

interface MediaTrackCapabilitiesPTZ extends MediaTrackCapabilities {
  pan?: { min: number; max: number; step: number };
  tilt?: { min: number; max: number; step: number };
  zoom?: { min: number; max: number; step: number };
}

interface MediaTrackSettingsPTZ extends MediaTrackSettings {
  pan?: number;
  tilt?: number;
}

interface VirtualGimbalProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  capabilities?: MediaTrackCapabilities | null;
  trackSettings?: MediaTrackSettings | null;
  applyControls?: (constraints: MediaTrackConstraints) => Promise<void>;
}

export const VirtualGimbal: React.FC<VirtualGimbalProps> = ({ 
  filters, 
  setFilters,
  capabilities,
  trackSettings,
  applyControls
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const pendingUpdateRef = useRef<{x: number, y: number} | null>(null);
  const isApplyingRef = useRef(false);

  const caps = capabilities as MediaTrackCapabilitiesPTZ | null;
  const settings = trackSettings as MediaTrackSettingsPTZ | null;
  
  // Determine if Hardware PTZ is available
  const hasHardwarePTZ = !!(caps && (caps.pan || caps.tilt));

  // Initialize Position from Source (Hardware or Software)
  useEffect(() => {
    if (hasHardwarePTZ && caps && settings) {
      // Map Hardware value to -1...1
      let x = 0, y = 0;
      if (caps.pan && typeof settings.pan === 'number') {
        const range = caps.pan.max - caps.pan.min;
        x = ((settings.pan - caps.pan.min) / range) * 2 - 1;
      }
      if (caps.tilt && typeof settings.tilt === 'number') {
        const range = caps.tilt.max - caps.tilt.min;
        y = ((settings.tilt - caps.tilt.min) / range) * 2 - 1;
      }
      // Only set if not currently dragging to avoid jumpiness
      if (!isDragging) {
         setPosition({ x, y });
      }
    } else {
      // Digital Map
      setPosition({ x: filters.pan || 0, y: filters.tilt || 0 });
    }
  }, [hasHardwarePTZ, caps, settings, filters.pan, filters.tilt, isDragging]);

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    updatePosition(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    updatePosition(clientX, clientY);
  };

  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate delta normalized to -1 to 1
    let deltaX = (clientX - centerX) / (rect.width / 2);
    let deltaY = (clientY - centerY) / (rect.height / 2);
    
    // Clamp to circle
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (dist > 1) {
       deltaX /= dist;
       deltaY /= dist;
    }

    setPosition({ x: deltaX, y: deltaY });
    
    if (hasHardwarePTZ && caps && applyControls) {
       // Throttled Hardware Update
       pendingUpdateRef.current = { x: deltaX, y: deltaY };
       processHardwareUpdate();
    } else {
       // Instant Digital Update
       setFilters(prev => ({ ...prev, pan: deltaX, tilt: deltaY }));
    }
  };

  const processHardwareUpdate = async () => {
    if (isApplyingRef.current || !pendingUpdateRef.current || !caps || !applyControls) return;
    
    isApplyingRef.current = true;
    const { x, y } = pendingUpdateRef.current;
    pendingUpdateRef.current = null;

    const constraints: any = {};
    if (caps.pan) {
       const range = caps.pan.max - caps.pan.min;
       // Map -1..1 to min..max
       constraints.pan = caps.pan.min + ((x + 1) / 2) * range;
    }
    if (caps.tilt) {
       const range = caps.tilt.max - caps.tilt.min;
       constraints.tilt = caps.tilt.min + ((y + 1) / 2) * range;
    }

    try {
      await applyControls(constraints);
    } catch (e) {
      console.error("PTZ Error", e);
    } finally {
      isApplyingRef.current = false;
      // If a new update arrived while we were applying, process it now
      if (pendingUpdateRef.current) {
        processHardwareUpdate();
      }
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd = () => handleEnd();

    if (isDragging) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging]);

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPosition({ x: 0, y: 0 });
    
    if (hasHardwarePTZ && caps && applyControls) {
       // Reset Hardware to center
       const constraints: any = {};
       if (caps.pan) constraints.pan = (caps.pan.max + caps.pan.min) / 2;
       if (caps.tilt) constraints.tilt = (caps.tilt.max + caps.tilt.min) / 2;
       applyControls(constraints);
    } else {
       setFilters(prev => ({ ...prev, pan: 0, tilt: 0 }));
    }
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFilters(prev => ({ ...prev, zoom: 1 }));
    
    if (caps && caps.zoom && applyControls) {
        applyControls({ zoom: caps.zoom.min } as any);
    }
  };

  // Color Coding: Cyan for Hardware, Primary for Digital
  const glowColor = hasHardwarePTZ ? 'rgba(34, 211, 238, 0.6)' : 'rgba(192, 255, 96, 0.5)';
  const puckColor = hasHardwarePTZ ? 'bg-cyan-400' : 'bg-primary';

  return (
    <div className="absolute bottom-32 left-6 z-20 flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
       <div 
         ref={containerRef}
         className="w-24 h-24 rounded-full border border-white/20 bg-black/40 backdrop-blur-md relative cursor-crosshair shadow-2xl touch-none"
         onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
         onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
       >
          {/* Grid lines */}
          <div className="absolute inset-0 border-white/5 border rounded-full" />
          <div className="absolute top-1/2 left-2 right-2 h-px bg-white/10" />
          <div className="absolute left-1/2 top-2 bottom-2 w-px bg-white/10" />
          
          {/* Puck */}
          <div 
            className={`absolute w-8 h-8 rounded-full ${puckColor} top-1/2 left-1/2 -ml-4 -mt-4 transition-transform duration-75 ease-out flex items-center justify-center`}
            style={{ 
               transform: `translate(${position.x * 40}px, ${position.y * 40}px)`,
               boxShadow: `0 0 15px ${glowColor}`
            }}
          >
             <div className="w-2 h-2 bg-black rounded-full opacity-50" />
          </div>
       </div>
       <button 
         onClick={handleReset}
         className="px-3 py-1 bg-black/40 hover:bg-white/10 rounded-full text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-white/10 transition-colors"
       >
         {hasHardwarePTZ ? 'Reset Motor' : 'Reset Gimbal'}
       </button>
       <button 
         onClick={handleResetZoom}
         className="px-3 py-1 bg-black/40 hover:bg-white/10 rounded-full text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-white/10 transition-colors"
       >
         Reset Zoom
       </button>
    </div>
  );
};
