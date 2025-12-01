
import React, { useEffect, useRef, useState, useCallback } from 'react';

// Worker Code as String
// Replaced direct MediaPipe loader with TensorFlow.js Body Segmentation
// to resolve strict MIME type checking issues with .tflite files.
const WORKER_CODE = `
  importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js');
  importScripts('https://cdn.jsdelivr.net/npm/@tensorflow-models/body-segmentation@1.0.1/dist/body-segmentation.min.js');

  let segmenter = null;
  let isReady = false;

  self.onmessage = async (e) => {
    const { type, bitmap } = e.data;
    
    if (type === 'INIT') {
      try {
        await tf.ready();
        
        // Create BodyPix/Selfie segmenter using TFJS runtime
        const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
        const segmenterConfig = {
          runtime: 'tfjs', 
          modelType: 'landscape'
        };
        
        segmenter = await bodySegmentation.createSegmenter(model, segmenterConfig);
        
        isReady = true;
        self.postMessage({ type: 'READY' });
      } catch (err) {
        console.error("Worker Segmenter Init Error", err);
      }
    } 
    else if (type === 'PROCESS' && segmenter && isReady) {
       try {
         // TFJS requires ImageData or HTMLVideoElement. In a worker, we use OffscreenCanvas.
         const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height);
         const ctx = offscreen.getContext('2d');
         ctx.drawImage(bitmap, 0, 0);
         const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

         // Run segmentation
         const people = await segmenter.segmentPeople(imageData);
         
         if (people && people.length > 0) {
            // Convert the mask to ImageBitmap
            const mask = await people[0].mask.toImageData();
            const maskBitmap = await createImageBitmap(mask);
            
            self.postMessage({ type: 'MASK', mask: maskBitmap }, [maskBitmap]);
         }
       } catch (err) {
         // Silently fail on frame error
       } finally {
         // Close bitmap to prevent memory leaks
         if (bitmap && typeof bitmap.close === 'function') {
            bitmap.close();
         }
       }
    }
  };
`;

export const useSegmentation = (
  videoRef: React.RefObject<HTMLVideoElement>,
  isEnabled: boolean
) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  
  // Throttle frame processing
  const lastVideoTimeRef = useRef(-1);
  const processingRef = useRef(false);
  const latestMaskRef = useRef<ImageBitmap | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    if (isEnabled && !workerRef.current) {
        try {
          const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
          const workerUrl = URL.createObjectURL(blob);
          const worker = new Worker(workerUrl);
          
          worker.onmessage = (e) => {
             if (e.data.type === 'READY') {
                setIsModelLoaded(true);
             } else if (e.data.type === 'MASK') {
                // If there was an unconsumed mask, close it to prevent leaks
                if (latestMaskRef.current) latestMaskRef.current.close();
                
                latestMaskRef.current = e.data.mask;
                processingRef.current = false; // Release lock
             }
          };

          worker.onerror = (e) => {
             console.warn("Segmentation Worker Error:", e);
             processingRef.current = false;
          };

          worker.postMessage({ type: 'INIT' });
          workerRef.current = worker;

          return () => {
              worker.terminate();
              workerRef.current = null;
              URL.revokeObjectURL(workerUrl);
          };
        } catch (e) {
          console.error("Failed to create segmentation worker", e);
        }
    }
  }, [isEnabled]);

  useEffect(() => {
    const process = async () => {
        if (isEnabled && workerRef.current && videoRef.current && isModelLoaded && !processingRef.current) {
            const video = videoRef.current;
            // Only process if frame has changed and video is playing
            if (video.currentTime !== lastVideoTimeRef.current && video.readyState >= 2 && !video.paused && !video.ended) {
                lastVideoTimeRef.current = video.currentTime;
                
                try {
                   // Create bitmap to transfer to worker
                   // Using small res (320px) for mask is faster and sufficient for blur
                   const bitmap = await createImageBitmap(video, { resizeWidth: 320 }); 
                   processingRef.current = true;
                   workerRef.current.postMessage({ type: 'PROCESS', bitmap }, [bitmap]);
                } catch(e) {
                   processingRef.current = false;
                }
            }
        }
        requestRef.current = requestAnimationFrame(process);
    };
    
    if (isEnabled) {
        requestRef.current = requestAnimationFrame(process);
    }

    return () => cancelAnimationFrame(requestRef.current);
  }, [isEnabled, isModelLoaded]);

  const getLatestMask = useCallback(() => {
      const bmp = latestMaskRef.current;
      // CRITICAL FIX: Consume the mask by setting ref to null.
      // This ensures we never try to transfer the same ImageBitmap twice,
      // which was causing the "Object cannot be cloned" error and freezing the render loop.
      latestMaskRef.current = null;
      return bmp;
  }, []);

  return { isModelLoaded, getLatestMask };
};
