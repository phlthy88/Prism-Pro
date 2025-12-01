import React, { useState, useEffect, useRef } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { PerfMetrics } from '../types';

interface PerformanceMonitorProps {
  metrics: PerfMetrics;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ metrics }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Handle click outside to collapse
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  // Color coding for health
  const fpsColor = metrics.fps >= 58 ? 'text-primary' : metrics.fps >= 30 ? 'text-yellow-400' : 'text-red-500';

  if (!isExpanded) {
    return (
      <div className="absolute bottom-6 left-6 z-50" ref={wrapperRef}>
        <button
          onClick={() => setIsExpanded(true)}
          className="p-3 rounded-full bg-black/20 hover:bg-black/60 backdrop-blur-[2px] hover:backdrop-blur-md border border-white/5 hover:border-white/20 transition-all duration-300 group pointer-events-auto shadow-lg"
          title="Show Performance Stats"
        >
          <Activity className="w-5 h-5 text-primary/60 group-hover:text-primary transition-colors animate-pulse duration-[3000ms]" />
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={wrapperRef}
      className="absolute bottom-6 left-6 bg-surface/90 backdrop-blur-xl border border-white/10 p-4 rounded-[24px] font-mono text-[10px] z-50 pointer-events-auto shadow-2xl cursor-pointer hover:border-white/20 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 min-w-[200px]"
    >
      <div 
        className="flex items-center justify-between gap-8 mb-4 text-slate-400 border-b border-white/5 pb-2"
        onClick={() => setIsExpanded(false)}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span className="uppercase tracking-widest font-bold text-[9px]">Engine Stats</span>
        </div>
        <ChevronDown className="w-3 h-3 opacity-50 hover:text-white" />
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <span className="text-slate-500 font-medium">FPS</span>
        <span className={`font-bold text-right ${fpsColor}`}>{metrics.fps}</span>
        
        <span className="text-slate-500 font-medium">Frame Time</span>
        <span className="text-slate-200 text-right">{metrics.frameTime.toFixed(1)}ms</span>
        
        {metrics.memory && (
          <>
            <span className="text-slate-500 font-medium">Memory</span>
            <span className="text-slate-200 text-right">{metrics.memory} MB</span>
          </>
        )}
        
        <span className="text-slate-500 font-medium">Renderer</span>
        <span className="text-primary text-right font-medium">WebGL2</span>
      </div>
    </div>
  );
};