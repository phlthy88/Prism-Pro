
import React, { useRef, useEffect, useState } from 'react';
import { SlidersHorizontal, Grid3x3, SwitchCamera, Loader2, ChevronDown, Camera, CameraOff, Mic, MicOff, PictureInPicture2, Cast, Eye, EyeOff, Square, Crosshair, Settings, Timer, RefreshCw } from 'lucide-react';
import { FilterState, AppSettings, AudioConfig, AudioPreset, IntervalometerConfig } from '../types';
import { useVideoProcessor } from '../hooks/useVideoProcessor';
import { PerformanceMonitor } from './PerformanceMonitor';
import { useRecorder } from '../hooks/useRecorder';
import { usePiP } from '../hooks/usePiP';
import { useVirtualCamera } from '../hooks/useVirtualCamera';
import { useVisualAnalysis } from '../hooks/useVisualAnalysis';
import { useSegmentation } from '../hooks/useSegmentation';
import { useAudioProcessor } from '../hooks/useAudioProcessor';
import { AUDIO_PRESETS } from '../constants';
import { VirtualGimbal } from './VirtualGimbal';

interface ViewfinderProps {
  videoStream: MediaStream | null;
  audioStream: MediaStream | null;
  isLoading?: boolean;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  settings: AppSettings;
  audioConfig: AudioConfig;
  setAudioConfig: React.Dispatch<React.SetStateAction<AudioConfig>>;
  onCapture: (dataUrl: string) => void;
  onRecordingComplete: (blob: Blob) => void;
  
  // Replaced single toggle with two callbacks
  onToggleBasicSettings: () => void;
  onToggleProSettings: () => void;
  
  onToggleGrid: () => void;
  onFlipCamera: () => void;
  onRetryCamera?: () => void;
  
  isCameraEnabled: boolean;
  onToggleCamera: () => void;
  
  cameraError: string | null;
  audioError: string | null;
  videoDevices: MediaDeviceInfo[];
  audioDevices: MediaDeviceInfo[];
  activeDeviceId: string | null;
  activeAudioDeviceId: string | null;
  currentDeviceId?: string | null;
  onDeviceChange: (deviceId: string) => void;
  onAudioDeviceChange: (deviceId: string) => void;
  onLutLoaderReady: (loader: (file: File) => void) => void;
  onAudioAnalyserReady: (analyser: AnalyserNode | null) => void;
  capabilities: MediaTrackCapabilities | null;
  trackSettings: MediaTrackSettings | null;
  applyControls: (constraints: MediaTrackConstraints) => Promise<void>;
  onSceneDetected: (scene: string) => void;
}

const Viewfinder: React.FC<ViewfinderProps> = ({
  videoStream,
  audioStream,
  isLoading = false,
  filters: parentFilters,
  setFilters,
  settings,
  audioConfig,
  setAudioConfig,
  onCapture,
  onRecordingComplete,
  onToggleBasicSettings,
  onToggleProSettings,
  onToggleGrid,
  onFlipCamera,
  onRetryCamera,
  isCameraEnabled,
  onToggleCamera,
  cameraError,
  audioError,
  videoDevices,
  audioDevices,
  activeDeviceId,
  activeAudioDeviceId,
  currentDeviceId,
  onDeviceChange,
  onAudioDeviceChange,
  onLutLoaderReady,
  onAudioAnalyserReady,
  capabilities,
  trackSettings,
  applyControls,
  onSceneDetected
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [renderCanvas, setRenderCanvas] = useState<HTMLCanvasElement | null>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const vuCanvasRef = useRef<HTMLCanvasElement>(null);

  // Intervalometer State
  const [intervalometer, setIntervalometer] = useState<IntervalometerConfig>({ enabled: false, interval: 5, count: 0, frameCount: 0 });

  // AI Hooks
  const isAiEnabled = settings.ai || settings.aiAutofocus;
  const { detections, isModelLoading } = useVisualAnalysis(videoRef, isAiEnabled);
  
  // Segmentation Hook
  const isSegmentationEnabled = parentFilters.blur > 0 || parentFilters.portraitLighting > 0;
  const { getLatestMask } = useSegmentation(videoRef, isSegmentationEnabled);

  // Video Processor Hook
  const { metrics, loadLut, frameStats } = useVideoProcessor(
      videoRef, 
      renderCanvas, 
      videoStream, 
      parentFilters, 
      settings,
      getLatestMask 
  );
  
  // Audio Processor Hook
  const { processedStream, analyser } = useAudioProcessor(audioStream, audioConfig);

  useEffect(() => {
    if (loadLut) onLutLoaderReady(loadLut);
  }, [loadLut, onLutLoaderReady]);

  useEffect(() => {
    onAudioAnalyserReady(analyser);
  }, [analyser, onAudioAnalyserReady]);

  // Intervalometer Logic
  useEffect(() => {
    let intervalId: number;
    if (intervalometer.enabled) {
      intervalId = window.setInterval(() => {
         if (renderCanvas) {
            try {
               const data = renderCanvas.toDataURL('image/jpeg', 0.9);
               onCapture(data);
               setIntervalometer(prev => {
                  const newCount = prev.frameCount + 1;
                  // Auto-stop if count reached
                  if (prev.count > 0 && newCount >= prev.count) {
                      return { ...prev, enabled: false, frameCount: 0 };
                  }
                  return { ...prev, frameCount: newCount };
               });
            } catch(e) {}
         }
      }, intervalometer.interval * 1000);
    }
    return () => clearInterval(intervalId);
  }, [intervalometer.enabled, intervalometer.interval, intervalometer.count, renderCanvas, onCapture]);

  // AI Scene Logic
  useEffect(() => {
    let newScene = "Standard";
    if (frameStats.lumaAvg !== undefined && frameStats.lumaAvg < 50) {
        newScene = "Low Light";
    } else {
        const persons = detections.filter(d => d.class === 'person');
        if (persons.length > 0) {
            newScene = "Portrait";
        } else if (detections.some(d => ['potted plant', 'chair', 'couch', 'tv', 'laptop'].includes(d.class))) {
            newScene = "Indoor";
        }
    }
    onSceneDetected(newScene);
  }, [frameStats.lumaAvg, detections, onSceneDetected]);

  // AI Autofocus Logic
  useEffect(() => {
    if (!settings.aiAutofocus || !capabilities) return;

    const person = detections
      .filter(d => d.class === 'person')
      .sort((a, b) => (b.bbox[2] * b.bbox[3]) - (a.bbox[2] * a.bbox[3]))[0];
    
    if (person && 'focusDistance' in capabilities) {
        const h = person.bbox[3] / 100; // 0 to 1
        const targetDistance = Math.max(0.1, 2.0 - (h * 1.8)); // 0.2m to 2.0m approx
        
        applyControls({
            focusMode: 'manual',
            focusDistance: targetDistance
        } as any);
    }
  }, [detections, settings.aiAutofocus, capabilities, applyControls]);

  // --- Recorder Hook ---
  const { isRecording, startRecording, stopRecording, recordingTime } = useRecorder(
      renderCanvas, 
      processedStream,
      onRecordingComplete
  );
  
  const { isPiPActive, togglePiP } = usePiP(renderCanvas);
  const { isVirtualCamActive, toggleVirtualCam } = useVirtualCamera(renderCanvas);

  const [infoLabel, setInfoLabel] = useState('Initializing...');
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isMicMenuOpen, setIsMicMenuOpen] = useState(false);
  const [isCompareActive, setIsCompareActive] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isControlsHovered, setIsControlsHovered] = useState(false);
  const [captureError, setCaptureError] = useState(false);
  const controlsTimeoutRef = useRef<number>(0);

  // Auto-hide controls logic
  useEffect(() => {
    const resetTimer = () => {
      setIsControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (!isControlsHovered) {
        controlsTimeoutRef.current = window.setTimeout(() => setIsControlsVisible(false), 3000);
      }
    };
    const handleMouseMove = () => resetTimer();
    resetTimer();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [isControlsHovered]);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
      const track = videoStream.getVideoTracks()[0];
      const s = track.getSettings();
      setInfoLabel(track.label ? track.label : `${s.width || 'Auto'}x${s.height || 'Auto'}`);
    } else {
      setInfoLabel(isCameraEnabled ? 'No Signal' : 'Camera Off');
    }
  }, [videoStream, isCameraEnabled]);

  // Enhanced Spectral Analyzer
  useEffect(() => {
    if (!isMicMenuOpen || !analyser || !vuCanvasRef.current || !audioConfig.enabled) return;
    const canvas = vuCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    analyser.fftSize = 256; 
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;
    
    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#0e1318';
      ctx.fillRect(0,0, canvas.width, canvas.height);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2);
      ctx.stroke();

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const percent = dataArray[i] / 255;
        const hue = 100 - (percent * 100); 
        
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
      animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isMicMenuOpen, analyser, audioConfig.enabled]);

  const handleCaptureClick = () => {
    if (!renderCanvas) {
      console.warn('Capture failed: No render canvas available');
      return;
    }
    try {
      const data = renderCanvas.toDataURL('image/jpeg', 0.9);
      onCapture(data);
      setCaptureError(false);
    } catch(e) {
      console.error('Capture failed:', e);
      setCaptureError(true);
      setTimeout(() => setCaptureError(false), 2000);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const activeDeviceLabel = videoDevices.find(d => d.deviceId === (activeDeviceId || currentDeviceId))?.label || infoLabel;
  const activeAudioLabel = audioDevices.find(d => d.deviceId === activeAudioDeviceId)?.label || 'Default Mic';
  const hasHardwarePTZ = capabilities && ('pan' in capabilities || 'tilt' in capabilities);
  const showGimbal = parentFilters.zoom > 1.0 || hasHardwarePTZ;

  const focusSubject = settings.aiAutofocus && !isModelLoading 
    ? detections.filter(d => d.class === 'person').sort((a, b) => (b.bbox[2] * b.bbox[3]) - (a.bbox[2] * a.bbox[3]))[0] 
    : null;

  // Calculate Guide Dimensions for Animation
  const getGuideDimensions = (guide: string) => {
    switch (guide) {
      case '4:3': return { width: '75%', height: '100%' };
      case '1:1': return { width: '56.25%', height: '100%' };
      case '2.35:1': return { width: '100%', height: '75.3%' }; // approx 16:9 / 2.35 = 0.753
      case '16:9': 
      case 'none':
      default: return { width: '100%', height: '100%' };
    }
  };

  const guideDims = getGuideDimensions(settings.guides);

  return (
    <div 
      className="bg-surface p-1 accent-ring relative group select-none rounded-3xl overflow-hidden shadow-2xl border border-white/5 w-full max-h-full aspect-video mx-auto"
      onMouseMove={() => {
        setIsControlsVisible(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = window.setTimeout(() => setIsControlsVisible(false), 3000);
      }}
    >
       {settings.showPerfMonitor && <PerformanceMonitor metrics={metrics} />}

       {/* Virtual Gimbal */}
       {showGimbal && (
         <VirtualGimbal 
            filters={parentFilters} 
            setFilters={setFilters} 
            capabilities={capabilities}
            trackSettings={trackSettings}
            applyControls={applyControls}
         />
       )}

       {/* Top Toolbar */}
       <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
          <div className="flex flex-wrap gap-2 pointer-events-auto items-center">
            {isRecording ? (
              <span className="px-3 py-1.5 rounded-full gradient-amber-orange backdrop-blur-xl text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2 border-2 border-accent-orange/80 shadow-2xl animate-pulse glow-orange">
                <div className="w-2 h-2 rounded-full bg-white shadow-lg"></div>
                REC {formatTime(recordingTime)}
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-black/90 to-black/85 backdrop-blur-xl text-xs font-bold uppercase tracking-widest text-accent-lime flex items-center gap-2 border-2 border-accent-lime/40 shadow-2xl glow-lime">
                <span className="w-2 h-2 rounded-full bg-accent-lime recording-dot shadow-[0_0_8px_var(--accent-lime-glow)]"></span>
                Live
              </span>
            )}

            {/* Intervalometer Status */}
            {intervalometer.enabled && (
               <span className="px-3 py-1.5 rounded-full gradient-purple-pink backdrop-blur-xl text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2 border-2 border-accent-pink/60 shadow-2xl animate-pulse glow-pink">
                  <Timer className="w-3.5 h-3.5" />
                  INTV {intervalometer.frameCount} / {intervalometer.count === 0 ? '∞' : intervalometer.count}
               </span>
            )}
            
            {/* Camera Widget */}
            <div className="relative viewfinder-widget rounded-full">
              <div className={`flex items-center rounded-full backdrop-blur-xl border-2 font-semibold shadow-elevation-3 transition-all hidden md:flex
                  ${cameraError
                    ? 'bg-error-container/90 border-error/60 text-on-error-container shadow-glow-orange'
                    : !isCameraEnabled
                        ? 'bg-error-container/80 border-error/50 text-on-error-container'
                        : 'bg-transparent border-transparent text-white shadow-glow-cyan'
                  }
               `}>
                 <button
                   onClick={onToggleCamera}
                   className="pl-3 pr-2 py-1.5 flex items-center gap-2 hover:bg-white/10 transition-all rounded-l-full focus-ring-light"
                   title={isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
                   aria-label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
                 >
                   {isCameraEnabled ? <Camera className="w-4 h-4" aria-hidden="true" /> : <CameraOff className="w-4 h-4" aria-hidden="true" />}
                   <span className="max-w-[100px] truncate text-xs font-bold">
                     {cameraError ? 'Cam Error' : (isCameraEnabled ? activeDeviceLabel : 'Camera Off')}
                   </span>
                 </button>

                 <div className="w-px h-4 bg-white/20"></div>

                 <button
                   onClick={() => { setIsDeviceMenuOpen(!isDeviceMenuOpen); setIsMicMenuOpen(false); }}
                   className="pl-2 pr-2 py-1.5 hover:bg-white/10 transition-all rounded-r-full flex items-center justify-center focus-ring-light"
                   title="Camera Settings"
                   aria-haspopup="listbox"
                   aria-expanded={isDeviceMenuOpen}
                   aria-label="Select camera device"
                 >
                   <ChevronDown className={`w-4 h-4 transition-transform ${isDeviceMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                 </button>
               </div>
                
              {isDeviceMenuOpen && (
                <div
                  className="absolute top-full left-0 mt-2 w-64 viewfinder-widget rounded-xl shadow-elevation-4 backdrop-blur-2xl overflow-hidden z-dropdown py-2 shadow-glow-cyan"
                  role="listbox"
                  aria-label="Available cameras"
                >
                  {videoDevices.map((device, i) => {
                    const isActive = device.deviceId === (activeDeviceId || currentDeviceId);
                    return (
                      <button
                        key={device.deviceId || i}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                          onDeviceChange(device.deviceId);
                          setIsDeviceMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-surface-variant transition-colors flex items-center gap-3 focus-ring-light
                          ${isActive ? 'text-accent-cyan bg-accent-cyan/20' : 'text-on-surface'}
                        `}
                      >
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-accent-cyan shadow-[0_0_8px_var(--accent-cyan-glow)]' : 'bg-transparent border-2 border-outline'}`}></div>
                        <span className="truncate">{device.label || `Camera ${i + 1}`}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Microphone Widget */}
            <div className="relative hidden md:block viewfinder-widget rounded-full">
               <div className={`flex items-center rounded-full backdrop-blur-xl border-2 font-semibold shadow-elevation-3 transition-all
                  ${audioError
                    ? 'bg-error-container/90 border-error/60 text-on-error-container shadow-glow-orange'
                    : !audioConfig.enabled
                        ? 'bg-error-container/80 border-error/50 text-on-error-container'
                        : 'bg-transparent border-transparent text-white shadow-glow-green'
                  }
               `}>
                 <button
                   onClick={() => setAudioConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                   className="pl-3 pr-2 py-1.5 flex items-center gap-2 hover:bg-white/10 transition-all rounded-l-full focus-ring-light"
                   title={audioConfig.enabled ? "Mute Microphone" : "Unmute Microphone"}
                   aria-label={audioConfig.enabled ? "Mute microphone" : "Unmute microphone"}
                 >
                   {audioConfig.enabled ? <Mic className="w-4 h-4" aria-hidden="true" /> : <MicOff className="w-4 h-4" aria-hidden="true" />}
                   <span className="max-w-[100px] truncate text-xs font-bold">
                     {audioError ? 'Mic Error' : (audioConfig.enabled ? activeAudioLabel : 'Muted')}
                   </span>
                 </button>

                 <div className="w-px h-4 bg-white/20"></div>

                 <button
                   onClick={() => { setIsMicMenuOpen(!isMicMenuOpen); setIsDeviceMenuOpen(false); }}
                   className="pl-2 pr-2 py-1.5 hover:bg-white/10 transition-all rounded-r-full flex items-center justify-center focus-ring-light"
                   title="Audio Settings"
                   aria-haspopup="listbox"
                   aria-expanded={isMicMenuOpen}
                   aria-label="Select audio input"
                 >
                   <ChevronDown className={`w-4 h-4 transition-transform ${isMicMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                 </button>
               </div>

              {isMicMenuOpen && (
                <div
                  className="absolute top-full left-0 mt-2 w-72 viewfinder-widget rounded-xl shadow-elevation-4 backdrop-blur-2xl overflow-hidden z-dropdown p-4 space-y-4 shadow-glow-green"
                  role="listbox"
                  aria-label="Available microphones"
                >
                  <div className="h-20 w-full bg-black/50 rounded-lg overflow-hidden border border-white/10 relative">
                     <canvas ref={vuCanvasRef} width={280} height={80} className="w-full h-full" />
                  </div>
                  <div className="max-h-[120px] overflow-y-auto custom-scrollbar space-y-1">
                    {audioDevices.map((device, i) => {
                       const isActive = device.deviceId === activeAudioDeviceId;
                       return (
                         <button
                           key={device.deviceId || i}
                           role="option"
                           aria-selected={isActive}
                           onClick={() => onAudioDeviceChange(device.deviceId)}
                           className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 focus-ring-light
                             ${isActive ? 'bg-accent-green/20 text-accent-green' : 'hover:bg-surface-variant text-on-surface'}
                           `}
                         >
                            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-accent-green shadow-[0_0_8px_var(--accent-green-glow)]' : 'border-2 border-outline'}`}></div>
                            <span className="truncate">{device.label || `Mic ${i + 1}`}</span>
                         </button>
                       );
                    })}
                  </div>
                  <div className="space-y-2 pt-2 border-t-2 border-accent-green/20">
                     <div className="flex justify-between text-xs text-accent-green font-bold">
                        <span>Input Gain</span>
                        <span>{(audioConfig.gain * 100).toFixed(0)}%</span>
                     </div>
                     <input
                       type="range" min="0" max="3" step="0.1"
                       value={audioConfig.gain}
                       onChange={(e) => setAudioConfig(prev => ({ ...prev, gain: parseFloat(e.target.value) }))}
                       className="accent-primary focus-ring-light"
                       aria-label="Microphone input gain"
                     />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-2 pointer-events-auto viewfinder-toolbar">
            {/* Basic Settings (New Button) */}
             <button
              onClick={onToggleBasicSettings}
              className="w-10 h-10 rounded-full bg-surface-container/95 backdrop-blur-xl border-2 border-accent-purple/30 text-on-surface hover:text-accent-purple hover:bg-surface-variant hover:border-accent-purple/60 hover:shadow-glow-purple transition-all flex items-center justify-center shadow-elevation-3 focus-ring-light"
              title="Basic Settings & Tools"
              aria-label="Open basic settings"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Pro Settings (Sliders) */}
            <button
              onClick={onToggleProSettings}
              className="w-10 h-10 rounded-full bg-surface-container/95 backdrop-blur-xl border-2 border-accent-pink/30 text-on-surface hover:text-accent-pink hover:bg-surface-variant hover:border-accent-pink/60 hover:shadow-glow-pink transition-all flex items-center justify-center shadow-elevation-3 focus-ring-light"
              title="Pro Controls"
              aria-label="Open pro controls"
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={onToggleGrid}
              className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center shadow-elevation-3 backdrop-blur-xl focus-ring-light ${settings.grid ? 'gradient-amber-orange text-black border-accent-amber shadow-glow-amber' : 'bg-surface-container/95 border-accent-amber/30 text-on-surface hover:text-accent-amber hover:bg-surface-variant hover:border-accent-amber/60 hover:shadow-glow-amber'}`}
              title="Toggle Grid"
              aria-label="Toggle grid overlay"
              aria-pressed={settings.grid}
            >
              <Grid3x3 className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={onFlipCamera}
              className="w-10 h-10 rounded-full bg-surface-container/95 backdrop-blur-xl border-2 border-accent-blue/30 text-on-surface hover:text-accent-blue hover:bg-surface-variant hover:border-accent-blue/60 hover:shadow-glow-blue transition-all flex items-center justify-center shadow-elevation-3 focus-ring-light"
              title="Flip Camera"
              aria-label="Switch camera"
            >
              <SwitchCamera className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center rounded-2xl">
          
          {isLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
               <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          )}

          {cameraError ? (
             <div className="w-full h-full flex flex-col items-center justify-center text-red-400 font-mono p-4 bg-surfaceContainer/50 text-center gap-4">
               <p>{cameraError}</p>
               <button 
                 onClick={onRetryCamera}
                 className="flex items-center gap-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-red-900/20 active:scale-95"
               >
                 <RefreshCw className="w-4 h-4" />
                 Retry Access
               </button>
             </div>
          ) : (
            <>
              {/* Processed WebGL Canvas */}
              <canvas 
                ref={setRenderCanvas}
                className="w-full h-full object-cover relative z-10 transition-transform duration-300"
                style={{ transform: `scaleX(${parentFilters.desqueeze})` }} // Simple preview desqueeze
                width={1920}
                height={1080}
              />
              <video 
                ref={videoRef}
                autoPlay playsInline muted 
                onLoadedMetadata={(e) => e.currentTarget.play()}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${isCompareActive ? 'opacity-100 z-20' : 'opacity-0 z-0'}`}
              />
            </>
          )}
          
          {isCompareActive && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-black/70 backdrop-blur rounded-lg border border-white/10 z-30 text-xs font-bold uppercase tracking-widest">
              Original Signal
            </div>
          )}

          <div className="scanlines absolute inset-0 opacity-20 pointer-events-none z-10"></div>
          
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 z-10 ${settings.grid ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-full h-full grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-white/20"></div>
              <div className="border-r border-white/20"></div>
              <div></div>
            </div>
          </div>
          
          {/* Safe Areas (Guides) with Animated Black Bars */}
           <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
              <div 
                  className={`transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-[0_0_0_9999px_black]
                    ${settings.guides === 'none' ? 'border-none' : 'border border-white/20'}
                  `}
                  style={guideDims}
              />
           </div>

          {/* AI Face Mesh HUD */}
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 z-10 ${settings.ai ? 'opacity-100' : 'opacity-0'}`}>
             {settings.ai && !isModelLoading && detections.map((det, i) => (
               <div 
                  key={`${det.class}-${i}`}
                  className="absolute border-2 border-primary rounded-lg shadow-[0_0_20px_rgba(192,255,96,0.2)] transition-all duration-200 ease-out"
                  style={{ left: `${det.bbox[0]}%`, top: `${det.bbox[1]}%`, width: `${det.bbox[2]}%`, height: `${det.bbox[3]}%` }}
               >
                 <div className="absolute -top-3 left-3 flex items-center">
                    <span className="text-[10px] bg-primary text-black px-2 py-0.5 font-bold uppercase rounded-full shadow-md">{det.class}</span>
                 </div>
               </div>
             ))}
          </div>

          {/* AI Autofocus Reticle */}
          {settings.aiAutofocus && focusSubject && (
            <div 
                className="absolute z-10 transition-all duration-200 ease-out pointer-events-none"
                style={{ 
                    left: `${focusSubject.bbox[0]}%`, 
                    top: `${focusSubject.bbox[1]}%`, 
                    width: `${focusSubject.bbox[2]}%`, 
                    height: `${focusSubject.bbox[3]}%` 
                }}
            >
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Crosshair className="w-4 h-4 text-cyan-400 opacity-60 animate-pulse" />
                </div>
            </div>
          )}

          {/* Scopes Overlay (Raised to z-30 to float over guides) */}
          {(settings.histogram || settings.scopes) && (
             <div className="absolute bottom-28 right-4 flex gap-3 z-30 pointer-events-none viewfinder-widget">
                {settings.histogram && (
                  <div className="w-32 h-20 rounded-lg border-2 border-white/20 bg-black/90 backdrop-blur-xl p-3 flex items-end gap-0.5 shadow-2xl">
                    {frameStats.histogram.map((h, i) => (
                       <div key={i} className="flex-1 bg-white/60 rounded-t-sm transition-[height] duration-100 ease-linear" style={{ height: `${Math.max(2, h)}%` }} />
                    ))}
                  </div>
                )}
                {settings.scopes && frameStats.rgbParade && (
                  <div className="w-32 h-20 rounded-lg border-2 border-white/20 bg-black/90 backdrop-blur-xl p-3 flex items-end gap-0.5 relative overflow-hidden shadow-2xl">
                     <div className="absolute inset-2 flex items-end gap-0.5 opacity-90 mix-blend-screen">
                        {frameStats.rgbParade.r.map((h, i) => (
                           <div key={`r-${i}`} className="flex-1 bg-red-500 rounded-t-sm" style={{ height: `${Math.max(2, h)}%` }} />
                        ))}
                     </div>
                     <div className="absolute inset-2 flex items-end gap-0.5 opacity-90 mix-blend-screen">
                        {frameStats.rgbParade.g.map((h, i) => (
                           <div key={`g-${i}`} className="flex-1 bg-green-500 rounded-t-sm" style={{ height: `${Math.max(2, h)}%` }} />
                        ))}
                     </div>
                     <div className="absolute inset-2 flex items-end gap-0.5 opacity-90 mix-blend-screen">
                        {frameStats.rgbParade.b.map((h, i) => (
                           <div key={`b-${i}`} className="flex-1 bg-blue-500 rounded-t-sm" style={{ height: `${Math.max(2, h)}%` }} />
                        ))}
                     </div>
                     <div className="absolute top-1 left-2 text-[8px] font-bold text-white/80">RGB PARADE</div>
                  </div>
                )}
             </div>
          )}

        </div>

        {/* Dynamic Control Bar (Bottom) - Compact with Gradient */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center pointer-events-none z-30 overflow-hidden h-[80px] viewfinder-controls">
          <div
            ref={controlsRef}
            onMouseEnter={() => setIsControlsHovered(true)}
            onMouseLeave={() => setIsControlsHovered(false)}
            className={`relative bg-surface-container/98 backdrop-blur-2xl border-2 border-gradient-animated rounded-full flex items-center shadow-elevation-4 pointer-events-auto transform transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] px-5 py-2 gap-4
              ${isControlsVisible ? 'translate-y-0 opacity-100' : 'translate-y-[200%] opacity-80'}
            `}
            style={{
              borderImage: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple), var(--accent-pink)) 1'
            }}
          >
            <div className="flex items-center gap-2 border-r-2 border-accent-purple/30 pr-4">
               <button onClick={togglePiP} className={`p-2 rounded-full transition-all focus-ring-light ${isPiPActive ? 'gradient-cyan-blue text-white shadow-glow-cyan' : 'text-on-surface-variant hover:text-accent-cyan hover:bg-surface-variant hover:shadow-glow-cyan'}`} title="Picture-in-Picture" aria-label="Toggle picture-in-picture mode" aria-pressed={isPiPActive}><PictureInPicture2 className="w-4 h-4" aria-hidden="true" /></button>
               <button onClick={toggleVirtualCam} className={`p-2 rounded-full transition-all focus-ring-light ${isVirtualCamActive ? 'gradient-purple-pink text-white shadow-glow-purple' : 'text-on-surface-variant hover:text-accent-purple hover:bg-surface-variant hover:shadow-glow-purple'}`} title="Virtual Camera" aria-label="Toggle virtual camera output" aria-pressed={isVirtualCamActive}><Cast className="w-4 h-4" aria-hidden="true" /></button>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handleCaptureClick} className={`w-12 h-12 rounded-full border-[3px] bg-surface-variant/50 hover:bg-surface-variant active:scale-95 transition-all group flex items-center justify-center relative focus-ring-light ${captureError ? 'border-error ring-2 ring-error shadow-glow-orange' : 'border-accent-lime/50 hover:shadow-glow-lime'}`} title="Capture Photo" aria-label="Capture photo"><div className={`w-8 h-8 rounded-full shadow-lg transition-colors ${captureError ? 'bg-error' : 'bg-on-surface group-hover:gradient-green-cyan'}`}></div></button>
              <button onClick={isRecording ? stopRecording : startRecording} className={`w-10 h-10 rounded-lg border-[2px] transition-all flex items-center justify-center active:scale-95 focus-ring-light ${isRecording ? 'border-red-500 bg-red-500/30 shadow-glow-orange' : 'border-accent-orange/40 bg-surface-variant/30 hover:shadow-glow-orange'}`} title={isRecording ? "Stop Recording" : "Start Recording"} aria-label={isRecording ? "Stop recording" : "Start recording"} aria-pressed={isRecording}>{isRecording ? <Square className="w-4 h-4 text-red-500 fill-current" aria-hidden="true" /> : <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>}</button>
            </div>
            <div className="flex items-center gap-2 border-l-2 border-accent-pink/30 pl-4">
               <button onMouseDown={() => setIsCompareActive(true)} onMouseUp={() => setIsCompareActive(false)} onMouseLeave={() => setIsCompareActive(false)} onTouchStart={() => setIsCompareActive(true)} onTouchEnd={() => setIsCompareActive(false)} className={`p-2 rounded-full transition-all focus-ring-light ${isCompareActive ? 'gradient-amber-orange text-black shadow-glow-amber' : 'text-on-surface-variant hover:text-accent-amber hover:bg-surface-variant hover:shadow-glow-amber'}`} title="Compare Original" aria-label="Hold to compare with original" aria-pressed={isCompareActive}>{isCompareActive ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}</button>
            </div>
          </div>
        </div>
    </div>
  );
};

export default Viewfinder;
