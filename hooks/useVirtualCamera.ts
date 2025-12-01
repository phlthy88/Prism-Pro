import { useState, useCallback } from 'react';

export const useVirtualCamera = (canvas: HTMLCanvasElement | null) => {
  const [isVirtualCamActive, setIsVirtualCamActive] = useState(false);

  const toggleVirtualCam = useCallback(() => {
    setIsVirtualCamActive(prev => !prev);
    // Note: True driver-level virtual camera is not possible in standard web pages.
    // This state controls the UI indicator and would allow internal stream routing 
    // if we had a broadcasting module attached.
    if (canvas) {
      // Logic to capture stream could go here
      // const stream = canvas.captureStream(30);
    }
  }, [canvas]);

  return { isVirtualCamActive, toggleVirtualCam };
};