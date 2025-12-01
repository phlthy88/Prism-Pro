
import { useState, useRef, useCallback } from 'react';

interface UseRecorderReturn {
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  recordingTime: number;
}

export const useRecorder = (
    canvas: HTMLCanvasElement | null, 
    audioStream: MediaStream | null,
    onRecordingComplete: (blob: Blob) => void
): UseRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);

  const startRecording = useCallback(() => {
    if (!canvas) return;

    try {
      // Capture video from canvas
      const stream = canvas.captureStream(60); // 60 FPS target
      
      // Mix in audio if available
      if (audioStream) {
          const audioTracks = audioStream.getAudioTracks();
          if (audioTracks.length > 0) {
              stream.addTrack(audioTracks[0]);
          }
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9' 
        : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000 // 8 Mbps
      });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete(blob);
        setRecordingTime(0);
      };

      recorder.start(100); // 100ms chunks
      setIsRecording(true);

      // Timer
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordingTime(Date.now() - startTime);
      }, 1000);

    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }, [canvas, audioStream, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    recordingTime
  };
};
