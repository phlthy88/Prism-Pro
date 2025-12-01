
import { useState, useEffect, useCallback, useRef } from 'react';

export const useAudioSource = (enabled: boolean) => {
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeAudioDeviceId, setActiveAudioDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentStreamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  // Mount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const getAudioDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (isMountedRef.current) {
        setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
      }
    } catch (e) {
      console.error("Failed to enumerate audio devices", e);
    }
  }, []);

  const startAudio = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    // Immediate cleanup of existing stream
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(t => t.stop());
      currentStreamRef.current = null;
    }

    if (!enabled) {
      setAudioStream(null);
      return;
    }

    const constraints: MediaStreamConstraints = {
      audio: activeAudioDeviceId 
        ? { deviceId: { exact: activeAudioDeviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: false } 
        : { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      video: false
    };

    try {
      if (!navigator.mediaDevices?.getUserMedia) return;

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Race condition check
      if (!isMountedRef.current || requestId !== requestIdRef.current || !enabled) {
          stream.getTracks().forEach(t => t.stop());
          return;
      }

      currentStreamRef.current = stream;
      setAudioStream(stream);
      setError(null);
      
      // Refresh devices to get labels if they were missing
      getAudioDevices();
    } catch (err: any) {
      console.error("Audio Error:", err);
      if (isMountedRef.current && requestId === requestIdRef.current) {
         if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
             setError("Permission denied");
         } else {
             setError("Microphone access failed");
         }
      }
    }
  }, [enabled, activeAudioDeviceId, getAudioDevices]);

  useEffect(() => {
    getAudioDevices();
    if (navigator.mediaDevices) {
        navigator.mediaDevices.addEventListener('devicechange', getAudioDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', getAudioDevices);
    }
  }, [getAudioDevices]);

  useEffect(() => {
    startAudio();
    return () => {
      // Cleanup is handled by the next startAudio call or the component unmount cleanup
    };
  }, [startAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        if (currentStreamRef.current) {
            currentStreamRef.current.getTracks().forEach(t => t.stop());
        }
    }
  }, []);

  return {
    audioStream,
    audioDevices,
    activeAudioDeviceId,
    setActiveAudioDeviceId,
    audioError: error
  };
};
