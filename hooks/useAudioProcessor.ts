
import { useEffect, useRef, useState } from 'react';
import { AudioConfig } from '../types';
import { AUDIO_PRESETS } from '../constants';

export const useAudioProcessor = (stream: MediaStream | null, config: AudioConfig) => {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  
  // Nodes
  const gainNodeRef = useRef<GainNode | null>(null);
  const lowCutRef = useRef<BiquadFilterNode | null>(null);
  const highCutRef = useRef<BiquadFilterNode | null>(null);
  const peakEqRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);

  useEffect(() => {
    if (!stream || !config.enabled) return;
    
    // 1. Init Context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    
    // 2. Check for audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    // 3. Create Source
    if (sourceRef.current) sourceRef.current.disconnect();
    sourceRef.current = ctx.createMediaStreamSource(stream);

    // 4. Create Nodes
    if (!gainNodeRef.current) gainNodeRef.current = ctx.createGain();
    if (!lowCutRef.current) {
        lowCutRef.current = ctx.createBiquadFilter();
        lowCutRef.current.type = 'highpass';
    }
    if (!highCutRef.current) {
        highCutRef.current = ctx.createBiquadFilter();
        highCutRef.current.type = 'lowpass';
    }
    if (!peakEqRef.current) {
        peakEqRef.current = ctx.createBiquadFilter();
        peakEqRef.current.type = 'peaking';
    }
    if (!compressorRef.current) compressorRef.current = ctx.createDynamicsCompressor();
    if (!destinationRef.current) destinationRef.current = ctx.createMediaStreamDestination();
    
    // Analyser for UI
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.5;
    setAnalyser(analyserNode);

    // 5. Connect Chain
    // Source -> LowCut -> HighCut -> PeakEQ -> Compressor -> Gain -> Analyser -> Destination
    sourceRef.current.connect(lowCutRef.current);
    lowCutRef.current.connect(highCutRef.current);
    highCutRef.current.connect(peakEqRef.current);
    peakEqRef.current.connect(compressorRef.current);
    compressorRef.current.connect(gainNodeRef.current);
    gainNodeRef.current.connect(analyserNode);
    analyserNode.connect(destinationRef.current);

    setProcessedStream(destinationRef.current.stream);

    // Cleanup on unmount or stream change
    return () => {
       // Typically we don't close the context here to avoid re-creating it too often,
       // but we should disconnect the source.
       if (sourceRef.current) sourceRef.current.disconnect();
    };
  }, [stream, config.enabled]);

  // Update Parameters based on Preset & Config
  useEffect(() => {
     if (!audioContextRef.current) return;
     const ctx = audioContextRef.current;
     const now = ctx.currentTime;
     const preset = AUDIO_PRESETS.find(p => p.id === config.preset) || AUDIO_PRESETS[0];

     if (gainNodeRef.current) {
         gainNodeRef.current.gain.setTargetAtTime(config.gain, now, 0.1);
     }
     
     if (lowCutRef.current) {
         lowCutRef.current.frequency.setTargetAtTime(preset.settings.lowCut, now, 0.1);
     }
     if (highCutRef.current) {
         highCutRef.current.frequency.setTargetAtTime(preset.settings.highCut, now, 0.1);
     }
     if (peakEqRef.current) {
         peakEqRef.current.frequency.setTargetAtTime(preset.settings.peakFreq, now, 0.1);
         peakEqRef.current.gain.setTargetAtTime(preset.settings.peakGain, now, 0.1);
     }
     if (compressorRef.current) {
         compressorRef.current.threshold.setTargetAtTime(preset.settings.compressorThreshold, now, 0.1);
         compressorRef.current.ratio.setTargetAtTime(preset.settings.compressorRatio, now, 0.1);
     }

  }, [config]);

  return { processedStream, analyser };
};
