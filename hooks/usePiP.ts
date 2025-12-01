import { useState, useCallback, useRef } from 'react';

export const usePiP = (canvas: HTMLCanvasElement | null) => {
  const [isPiPActive, setIsPiPActive] = useState(false);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  const togglePiP = useCallback(async () => {
    if (!canvas) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else {
        // Create a hidden video element to play the canvas stream
        if (!pipVideoRef.current) {
          const video = document.createElement('video');
          video.muted = true;
          video.autoplay = true;
          pipVideoRef.current = video;
        }

        const video = pipVideoRef.current;
        if (video.srcObject !== canvas.captureStream()) {
             video.srcObject = canvas.captureStream();
        }
        
        // Wait for video to be ready
        await video.play();
        await video.requestPictureInPicture();
        setIsPiPActive(true);

        video.addEventListener('leavepictureinpicture', () => {
           setIsPiPActive(false);
        }, { once: true });
      }
    } catch (err) {
      console.error("PiP failed", err);
    }
  }, [canvas]);

  return { isPiPActive, togglePiP };
};