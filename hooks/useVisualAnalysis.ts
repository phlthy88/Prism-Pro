
import React, { useState, useEffect, useRef } from 'react';
import { DetectedObject } from '../types';

declare global {
  interface Window {
    cocoSsd: any;
  }
}

export const useVisualAnalysis = (
  videoRef: React.RefObject<HTMLVideoElement>,
  isEnabled: boolean
) => {
  const [detections, setDetections] = useState<DetectedObject[]>([]);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [model, setModel] = useState<any>(null);
  
  const aiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionTimeoutRef = useRef<number>(0);

  // Initialize Canvas once
  useEffect(() => {
    if (!aiCanvasRef.current) {
      aiCanvasRef.current = document.createElement('canvas');
    }
  }, []);

  // Load Model
  useEffect(() => {
    if (isEnabled && !model && !isModelLoading) {
      const loadModel = async () => {
        setIsModelLoading(true);
        try {
          if (window.cocoSsd) {
            // Using Lite model for speed
            const loadedModel = await window.cocoSsd.load({ base: 'lite_mobilenet_v2' });
            setModel(loadedModel);
          }
        } catch (err) {
          console.error("Failed to load AI model", err);
        } finally {
          setIsModelLoading(false);
        }
      };
      loadModel();
    }
  }, [isEnabled, model, isModelLoading]);

  // Detection Loop
  useEffect(() => {
    const detect = async () => {
      if (isEnabled && model && videoRef.current && videoRef.current.readyState === 4 && aiCanvasRef.current) {
        try {
          const video = videoRef.current;
          const aiCanvas = aiCanvasRef.current;
          
          // Optimization: Downscale to 320px for faster inference
          const processWidth = 320;
          const aspect = video.videoWidth / video.videoHeight || 1.77;
          const processHeight = processWidth / aspect;

          if (aiCanvas.width !== processWidth) {
            aiCanvas.width = processWidth;
            aiCanvas.height = processHeight;
          }

          const ctx = aiCanvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, processWidth, processHeight);
            
            // Run inference
            const predictions = await model.detect(aiCanvas, 10, 0.4);
            
            // Normalize coordinates to percentage (0-100)
            const normalizedDetections = predictions.map((p: any) => ({
              class: p.class,
              score: p.score,
              bbox: [
                (p.bbox[0] / processWidth) * 100,
                (p.bbox[1] / processHeight) * 100,
                (p.bbox[2] / processWidth) * 100,
                (p.bbox[3] / processHeight) * 100
              ]
            }));
            setDetections(normalizedDetections);
          }
        } catch (e) { 
           // Silent fail on frame error
        }
      } else {
        setDetections([]);
      }
      // Loop with delay
      detectionTimeoutRef.current = window.setTimeout(detect, 200); 
    };

    if (isEnabled && model) {
      detect();
    } else {
      setDetections([]);
      if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current);
    }

    return () => {
      if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current);
    };
  }, [isEnabled, model]);

  return { detections, isModelLoading };
};