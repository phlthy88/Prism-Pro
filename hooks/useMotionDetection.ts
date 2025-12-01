
import React, { useEffect, useRef, useState } from 'react';

export const useMotionDetection = (
    videoRef: React.RefObject<HTMLVideoElement>,
    isEnabled: boolean,
    onMotion: () => void
) => {
    const canvasRef = useRef<OffscreenCanvas | null>(null);
    const ctxRef = useRef<OffscreenCanvasRenderingContext2D | null>(null);
    const prevFrameDataRef = useRef<Uint8Array | null>(null);
    const requestRef = useRef<number>(0);
    const cooldownRef = useRef(false);

    useEffect(() => {
        if (!isEnabled) {
            prevFrameDataRef.current = null;
            return;
        }

        if (!canvasRef.current) {
            canvasRef.current = new OffscreenCanvas(64, 36); // Small res for perf
            ctxRef.current = canvasRef.current.getContext('2d', { willReadFrequently: true });
        }

        const checkMotion = () => {
            if (!videoRef.current || videoRef.current.readyState < 2 || !ctxRef.current || !canvasRef.current) {
                requestRef.current = requestAnimationFrame(checkMotion);
                return;
            }

            const ctx = ctxRef.current;
            const width = 64;
            const height = 36;

            ctx.drawImage(videoRef.current, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            if (prevFrameDataRef.current) {
                const prev = prevFrameDataRef.current;
                let diffCount = 0;
                const totalPixels = width * height;
                const threshold = 30; // Sensitivity per pixel
                
                // Diff loop (R channel sufficient for luma approx)
                for (let i = 0; i < data.length; i += 4) {
                    if (Math.abs(data[i] - prev[i]) > threshold) {
                        diffCount++;
                    }
                }

                const diffRatio = diffCount / totalPixels;
                
                // If > 10% of pixels changed
                if (diffRatio > 0.1) {
                   if (!cooldownRef.current) {
                       onMotion();
                       cooldownRef.current = true;
                       setTimeout(() => cooldownRef.current = false, 5000); // 5s cooldown
                   }
                }
            }

            // Store current as prev
            prevFrameDataRef.current = new Uint8Array(data);
            
            // Check every 200ms approx (skip frames)
            setTimeout(() => {
                if (isEnabled) requestRef.current = requestAnimationFrame(checkMotion);
            }, 200);
        };

        checkMotion();

        return () => cancelAnimationFrame(requestRef.current);
    }, [isEnabled, onMotion]);
};