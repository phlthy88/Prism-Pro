import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import { useTheme } from './hooks/useTheme';
import Viewfinder from './components/Viewfinder';
import SettingsFlyout from './components/SettingsFlyout';
import { useCamera } from './hooks/useCamera';
import { useAudioSource } from './hooks/useAudioSource';
import { useMidi } from './hooks/useMidi';
import { FilterState, AppSettings, GalleryItem, AudioConfig, IntervalometerConfig } from './types';
import { INITIAL_FILTERS, INITIAL_SETTINGS, INITIAL_AUDIO_CONFIG } from './constants';
import { Toast } from './components/Toast';

const isWebGLSupported = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
};

export default function App() {
  const { theme, setTheme } = useTheme();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [audioConfig, setAudioConfig] = useState<AudioConfig>(INITIAL_AUDIO_CONFIG);

  const webGLSupported = React.useMemo(() => isWebGLSupported(), []);
  
  const [activeFlyout, setActiveFlyout] = useState<'none' | 'basic' | 'pro'>('none');
  
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [lutLoader, setLutLoader] = useState<((file: File) => void) | null>(null);
  const [detectedScene, setDetectedScene] = useState<string>('Standard');
  
  const [intervalometer, setIntervalometer] = useState<IntervalometerConfig>({ enabled: false, interval: 5, count: 0, frameCount: 0 });
  
  const { connectedDevice: midiDevice } = useMidi(setFilters, setAudioConfig);

  const handleToggleSetting = useCallback((key: keyof AppSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const { 
    stream: videoStream, 
    error: cameraError, 
    toggleCamera,
    devices: videoDevices,
    activeDeviceId,
    setActiveDeviceId,
    currentDeviceId,
    isLoading,
    capabilities,
    trackSettings,
    applyControls,
    isEnabled: isCameraEnabled,
    toggleVideo: toggleCameraEnabled,
    restartStream
  } = useCamera(settings.boost, settings.hdr);

  const {
    audioStream,
    audioDevices,
    activeAudioDeviceId,
    setActiveAudioDeviceId,
    audioError
  } = useAudioSource(audioConfig.enabled);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCapture = useCallback(async (dataUrl: string) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const newItem: GalleryItem = {
      id: Date.now().toString(),
      type: 'image',
      url: dataUrl,
      timestamp: Date.now(),
      blob: blob
    };
    setGallery(prev => [newItem, ...prev]);
    showToast("Snapshot Saved to Session");
  }, []);

  const handleRecordingComplete = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const newItem: GalleryItem = {
      id: Date.now().toString(),
      type: 'video',
      url: url,
      timestamp: Date.now(),
      blob: blob
    };
    setGallery(prev => [newItem, ...prev]);
    showToast("Recording Saved to Session");
  }, []);

  const handleDownload = useCallback((item: GalleryItem) => {
    if (!item.blob) return;
    const a = document.createElement('a');
    a.href = item.url;
    a.download = `prism-${item.type}-${item.timestamp}.${item.type === 'video' ? 'webm' : 'jpg'}`;
    a.click();
    showToast("File Downloaded");
  }, []);

  const handleDelete = useCallback((id: string) => {
    setGallery(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleShare = useCallback(async (item: GalleryItem) => {
    if (!item.blob) return;
    try {
      const file = new File([item.blob], `prism-${item.timestamp}.${item.type === 'video' ? 'webm' : 'jpg'}`, { type: item.blob.type });
      const shareData = {
          files: [file],
          title: 'Prism Forge Capture',
          text: 'Check out this capture from Prism Forge.'
      };
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        showToast("Shared Successfully");
      } else {
        showToast("Sharing not supported on this device");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      showToast("Share failed");
    }
  }, []);

  const toggleBoost = () => {
    setSettings(prev => ({ ...prev, boost: !prev.boost }));
  };
  
  const handleLutLoaderReady = useCallback((loader: (file: File) => void) => {
    setLutLoader(() => loader);
  }, []);

  const handleAudioAnalyserReady = useCallback((analyser: AnalyserNode | null) => {
    setAudioAnalyser(analyser);
  }, []);

  return (
    <main className="fixed inset-0 w-full h-full bg-surface flex flex-col overflow-hidden">
      
      {/* Header - Fixed Height, z-[100] to sit below SettingsFlyout (z-[120]) and Toast (z-[130]) */}
      <div className="shrink-0 z-[100] px-6 pt-4 pb-2 bg-surface">
        <Header 
          settings={settings}
          onToggleSetting={handleToggleSetting}
          theme={theme}
          setTheme={setTheme}
          isWebGLSupported={webGLSupported}
          onToggleBasicSettings={() => setActiveFlyout(prev => prev === 'basic' ? 'none' : 'basic')}
          onToggleProSettings={() => setActiveFlyout(prev => prev === 'pro' ? 'none' : 'pro')}
        />
      </div>

      {/* Main Workspace - Flex Container */}
      <section className="flex-1 flex min-h-0 relative">
        
        {/* Viewfinder Area 
            - Centered container
            - No margin shifting (mr-0) to maintain overlay behavior
        */}
        <div className="flex-1 flex items-center justify-center p-4 xl:p-8 min-w-0 min-h-0 relative z-0">
          <Viewfinder 
            videoStream={videoStream}
            audioStream={audioStream}
            isLoading={isLoading}
            filters={filters}
            setFilters={setFilters}
            settings={settings}
            audioConfig={audioConfig}
            setAudioConfig={setAudioConfig}
            onCapture={handleCapture}
            onRecordingComplete={handleRecordingComplete}
            
            onToggleBasicSettings={() => setActiveFlyout(prev => prev === 'basic' ? 'none' : 'basic')}
            onToggleProSettings={() => setActiveFlyout(prev => prev === 'pro' ? 'none' : 'pro')}
            
            onToggleGrid={() => setSettings(s => ({ ...s, grid: !s.grid }))}
            onFlipCamera={toggleCamera}
            onRetryCamera={restartStream}
            
            isCameraEnabled={isCameraEnabled}
            onToggleCamera={toggleCameraEnabled}
            
            cameraError={cameraError}
            audioError={audioError}
            videoDevices={videoDevices}
            audioDevices={audioDevices}
            activeDeviceId={activeDeviceId}
            activeAudioDeviceId={activeAudioDeviceId}
            currentDeviceId={currentDeviceId}
            onDeviceChange={setActiveDeviceId}
            onAudioDeviceChange={setActiveAudioDeviceId}
            onLutLoaderReady={handleLutLoaderReady}
            onAudioAnalyserReady={handleAudioAnalyserReady}
            capabilities={capabilities}
            trackSettings={trackSettings}
            applyControls={applyControls}
            onSceneDetected={setDetectedScene}
          />
        </div>

      </section>

      {/* Unified Settings Flyout:
          - Backdrop is z-[90]
          - Panel is z-[120] to overlay Viewfinder
      */}
      <SettingsFlyout
        className="z-[120]"
        isOpen={activeFlyout !== 'none'}
        mode={activeFlyout === 'none' ? 'basic' : activeFlyout}
        onClose={() => setActiveFlyout('none')}
        
        // Common Props
        filters={filters}
        setFilters={setFilters}
        settings={settings}
        setSettings={setSettings}
        
        // Pro Props
        toggleBoost={toggleBoost}
        capabilities={capabilities}
        trackSettings={trackSettings}
        applyControls={applyControls}
        loadLut={lutLoader}
        
        // Basic Props
        audioConfig={audioConfig}
        setAudioConfig={setAudioConfig}
        audioAnalyser={audioAnalyser}
        gallery={gallery}
        onDelete={handleDelete}
        onDownload={handleDownload}
        onShare={handleShare}
        showToast={showToast}
        midiDevice={midiDevice}
        detectedScene={detectedScene}
        
        // Intervalometer
        intervalometer={intervalometer}
        setIntervalometer={setIntervalometer}
      />

      {/* Toast: z-[130] to stay on top of everything */}
      <Toast message={toastMessage} className="z-[130]" />
    </main>
  );
}