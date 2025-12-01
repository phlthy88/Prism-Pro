
import { useState, useEffect, useCallback, useRef } from 'react';

export const useCamera = (boost: boolean, hdr: boolean = false) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  
  // Hardware capabilities state
  const [capabilities, setCapabilities] = useState<MediaTrackCapabilities | null>(null);
  const [trackSettings, setTrackSettings] = useState<MediaTrackSettings | null>(null);
  
  // Use a ref to track the actual stream instance for immediate cleanup
  const currentStreamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  // Mount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Enumerate devices
  const getDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      if (isMountedRef.current) {
        setDevices(videoDevices);
      }
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  }, []);

  const startStream = useCallback(async () => {
    // Increment request ID to invalidate any previous pending requests
    const requestId = ++requestIdRef.current;
    
    setIsLoading(true);
    setError(null);

    // Immediate cleanup of existing stream
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(track => track.stop());
      currentStreamRef.current = null;
    }
    
    // Clear state to trigger UI loading view
    setStream(null);
    setCapabilities(null);
    setTrackSettings(null);
    setCurrentDeviceId(null);

    // Check enabled state
    if (!isEnabled) {
        setIsLoading(false);
        return;
    }

    // CROSTINI GPU BOOST LOGIC
    // When boost is enabled, we enforce a minimum framerate of 30 to prevent 
    // power-saving throttle, and aim for 60fps.
    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: boost 
        ? { min: 30, ideal: 60, max: 60 } 
        : { ideal: 30 }
    };

    // HDR / 10-Bit Logic
    if (hdr) {
      (videoConstraints as any).resizeMode = 'none'; 
    }

    // If a specific device is selected, use it. Otherwise fall back to facingMode.
    if (activeDeviceId) {
      videoConstraints.deviceId = { exact: activeDeviceId };
    } else {
      videoConstraints.facingMode = facingMode;
    }

    const constraints: MediaStreamConstraints = {
      video: videoConstraints,
      audio: false
    };

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // RACE CONDITION CHECK:
      // If the component unmounted OR a newer request was started while we were awaiting,
      // we must discard this stream immediately to prevent leaks and "Device in use" errors.
      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        newStream.getTracks().forEach(t => t.stop());
        return;
      }
      
      currentStreamRef.current = newStream;
      setStream(newStream);
      
      const videoTrack = newStream.getVideoTracks()[0];
      
      // Get Capabilities & Settings
      if (videoTrack.getCapabilities) {
        setCapabilities(videoTrack.getCapabilities());
      }
      if (videoTrack.getSettings) {
        const s = videoTrack.getSettings();
        setTrackSettings(s);
        if (s.deviceId) setCurrentDeviceId(s.deviceId);
      }
      
      // Refresh device list after permission is granted to get labels
      getDevices();

    } catch (err: any) {
      console.error("Camera Error:", err);
      // Only set error if we are still the active request
      if (isMountedRef.current && requestId === requestIdRef.current) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
           setError("Permission denied. Click 'Retry Access' to enable.");
        } else if (err.name === 'NotFoundError') {
           setError("No camera device found.");
        } else if (err.name === 'NotReadableError') {
           setError("Camera is in use by another application.");
        } else {
           setError("Camera Unavailable");
        }
      }
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [facingMode, boost, hdr, activeDeviceId, getDevices, isEnabled]);

  // Initial load and restarts
  useEffect(() => {
    startStream();
    // Cleanup function runs when dependency changes or unmount
    return () => {
      // We don't stop tracks here immediately if we want to keep stream alive during re-renders,
      // BUT for strict mode and device switching, letting startStream handle the cleanup 
      // via currentStreamRef is safer.
    };
  }, [startStream]); 

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Initial device list fetch
  useEffect(() => {
    getDevices();
    if (navigator.mediaDevices) {
        navigator.mediaDevices.addEventListener('devicechange', getDevices);
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', getDevices);
        };
    }
  }, [getDevices]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setActiveDeviceId(null); // Clear specific device ID to allow facingMode to take over logic momentarily
  };

  const restartStream = () => {
    startStream();
  };
  
  const toggleVideo = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  // Apply hardware constraints (PTZ + Focus)
  const applyControls = useCallback(async (constraints: MediaTrackConstraints) => {
    if (!currentStreamRef.current) return;
    const track = currentStreamRef.current.getVideoTracks()[0];
    
    try {
        const advancedConstraints: any = {};
        const basicConstraints: any = {};

        // Separate constraints. focusMode is a basic constraint, focusDistance is advanced.
        for (const [key, value] of Object.entries(constraints)) {
            if (key === 'focusMode' || key === 'pointsOfInterest') {
                basicConstraints[key] = value;
            } else {
                advancedConstraints[key] = value;
            }
        }

        if (Object.keys(basicConstraints).length > 0) {
            await track.applyConstraints(basicConstraints);
        }
        
        if (Object.keys(advancedConstraints).length > 0) {
            await track.applyConstraints({ advanced: [advancedConstraints] });
        }
        
        // Update local settings state to reflect change
        setTrackSettings(track.getSettings());
    } catch(e) { 
        console.error("Failed to apply constraints", e); 
    }
  }, []);

  return { 
    stream, 
    error, 
    facingMode, 
    toggleCamera, 
    restartStream,
    devices,
    activeDeviceId,
    setActiveDeviceId,
    currentDeviceId, // Expose the actual running device ID
    isLoading,
    capabilities,
    trackSettings,
    applyControls,
    isEnabled,
    toggleVideo
  };
};
