import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface VisionControllerProps {
  onExpansionChange: (val: number) => void;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

export const VisionController: React.FC<VisionControllerProps> = ({ 
  onExpansionChange, 
  isConnected,
  onConnectionChange 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize MediaPipe Model
  useEffect(() => {
    const initModel = async () => {
      setIsModelLoading(true);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        setModelReady(true);
        console.log("HandLandmarker loaded");
      } catch (e) {
        console.error("Failed to load MediaPipe:", e);
        setError("Failed to load hand tracking model.");
      } finally {
        setIsModelLoading(false);
      }
    };
    initModel();
  }, []);

  // Handle Camera Stream
  useEffect(() => {
    const startCamera = async () => {
      if (isConnected && !stream) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user'
            }
          });
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play();
          }
        } catch (err) {
          console.error("Camera denied:", err);
          setError("Camera access required.");
          onConnectionChange(false);
        }
      } else if (!isConnected && stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
        if (videoRef.current) videoRef.current.srcObject = null;
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
        }
        // Clear canvas
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };

    startCamera();
  }, [isConnected, stream, onConnectionChange]);

  // Prediction Loop
  useEffect(() => {
    if (!isConnected || !modelReady || !videoRef.current || !canvasRef.current) return;

    const predict = () => {
      if (!handLandmarkerRef.current || !videoRef.current || !canvasRef.current) return;

      if (videoRef.current.currentTime > 0 && !videoRef.current.paused && !videoRef.current.ended) {
        let startTimeMs = performance.now();
        const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Draw
            ctx.save();
            ctx.scale(-1, 1); // Mirror
            ctx.translate(-canvasRef.current.width, 0);

            let totalOpenness = 0;
            let handCount = 0;

            if (results.landmarks) {
              for (const landmarks of results.landmarks) {
                handCount++;
                
                // Draw Connectors (Simple implementation since DrawingUtils might be tricky to import via CDN)
                ctx.strokeStyle = "#00FF00";
                ctx.lineWidth = 2;
                
                const connections = HandLandmarker.HAND_CONNECTIONS;
                for (const conn of connections) {
                    const p1 = landmarks[conn.start];
                    const p2 = landmarks[conn.end];
                    ctx.beginPath();
                    ctx.moveTo(p1.x * canvasRef.current.width, p1.y * canvasRef.current.height);
                    ctx.lineTo(p2.x * canvasRef.current.width, p2.y * canvasRef.current.height);
                    ctx.stroke();
                }

                // Draw Points
                ctx.fillStyle = "#FF0000";
                for (const p of landmarks) {
                    ctx.beginPath();
                    ctx.arc(p.x * canvasRef.current.width, p.y * canvasRef.current.height, 3, 0, 2 * Math.PI);
                    ctx.fill();
                }

                // Calculate Openness Logic
                // Reference Scale: Wrist (0) to Index MCP (5)
                const wrist = landmarks[0];
                const indexMCP = landmarks[5];
                const scale = Math.sqrt(Math.pow(indexMCP.x - wrist.x, 2) + Math.pow(indexMCP.y - wrist.y, 2));

                // Tips: 4 (Thumb), 8 (Index), 12 (Middle), 16 (Ring), 20 (Pinky)
                const tips = [4, 8, 12, 16, 20];
                let distSum = 0;
                for (const tIndex of tips) {
                    const tip = landmarks[tIndex];
                    distSum += Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
                }
                const avgDist = distSum / 5;
                
                // Heuristic: 
                // Closed fist: avgDist ~ 0.8 * scale or less (fingers folded in)
                // Open palm: avgDist ~ 2.0 * scale or more
                // Let's normalize
                let ratio = avgDist / (scale || 0.1);
                
                // Tuning
                // Fist often around 1.0 - 1.2
                // Open hand around 2.0 - 2.5
                const minR = 1.0;
                const maxR = 2.4;
                
                let openness = (ratio - minR) / (maxR - minR);
                openness = Math.max(0, Math.min(1, openness));
                
                totalOpenness += openness;
              }
            }
            
            if (handCount > 0) {
               // Smooth damping done in App.tsx, here we send raw target
               onExpansionChange(totalOpenness / handCount);
            } else {
               onExpansionChange(0);
            }
            
            ctx.restore();
        }
      }
      
      requestRef.current = requestAnimationFrame(predict);
    };

    requestRef.current = requestAnimationFrame(predict);

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isConnected, modelReady]);


  const toggleConnection = () => {
    if (isConnected) {
      onConnectionChange(false);
    } else {
      onConnectionChange(true);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-gray-900/80 p-4 rounded-xl backdrop-blur-md border border-gray-700 w-full max-w-xs shadow-2xl">
      <div className="flex justify-between items-center mb-1">
         <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Hand Tracking</h3>
         <div className={`h-2 w-2 rounded-full ${isConnected && modelReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
      </div>

      {/* Webcam Preview */}
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video border border-gray-800 group">
        <video 
          ref={videoRef} 
          muted 
          playsInline 
          className="w-full h-full object-cover transform scale-x-[-1] opacity-60" 
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-2 text-center text-red-400 text-xs">
            {error}
          </div>
        )}
        
        {isModelLoading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-xs text-indigo-300 animate-pulse">Loading Model...</span>
            </div>
        )}

        {!isConnected && !error && !isModelLoading && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-xs text-white/70">Paused</span>
             </div>
        )}
      </div>

      <button
        onClick={toggleConnection}
        disabled={isModelLoading}
        className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 
          ${isConnected 
            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30' 
            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
      >
        {isModelLoading ? 'Initializing...' : isConnected ? 'Stop Tracking' : 'Start Hand Tracking'}
      </button>

      <div className="text-[10px] text-gray-500 leading-tight">
        * Powered by MediaPipe. Open hands to expand particles. Close hands to contract.
      </div>
    </div>
  );
};