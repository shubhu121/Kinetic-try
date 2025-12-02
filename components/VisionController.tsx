import React, { useEffect, useRef, useState } from 'react';
import { geminiLiveService } from '../services/geminiService';

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
  const frameIntervalRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Initialize Camera & Audio
  useEffect(() => {
    const initMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true
          }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error("Camera/Mic access denied:", err);
        setError("Camera & Mic access needed.");
      }
    };

    initMedia();

    return () => {
      if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Frame Capture Loop
  useEffect(() => {
    if (!isConnected || !videoRef.current || !canvasRef.current) {
      if (frameIntervalRef.current) {
        window.clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Increased to 5 FPS for better responsiveness
    const FPS = 5; 

    frameIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const v = videoRef.current;
      if (v.readyState !== 4) return; // Wait for enough data

      // Draw video frame to canvas
      canvasRef.current.width = v.videoWidth;
      canvasRef.current.height = v.videoHeight;
      ctx.drawImage(v, 0, 0, v.videoWidth, v.videoHeight);

      // Convert to Base64 (remove data prefix)
      const base64 = canvasRef.current.toDataURL('image/jpeg', 0.7).split(',')[1];
      
      await geminiLiveService.sendFrame(base64);
    }, 1000 / FPS);

    return () => {
      if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    };
  }, [isConnected]);

  // Audio Streaming Setup
  useEffect(() => {
    if (!isConnected || !stream) {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        return;
    }

    const setupAudio = async () => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass({ sampleRate: 16000 });
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
            if (!isConnected) return;
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Downsample/Encode to PCM 16-bit
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                // Clamp and scale
                const s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            
            // Convert to Base64 string manually to avoid import issues
            let binary = '';
            const bytes = new Uint8Array(pcm16.buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64Audio = btoa(binary);

            geminiLiveService.sendAudio(base64Audio);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination); // Destination is mute usually if not connected to speaker
    };

    setupAudio();

    return () => {
        if (processorRef.current) processorRef.current.disconnect();
        if (sourceRef.current) sourceRef.current.disconnect();
        if (audioContextRef.current) audioContextRef.current.close();
    };

  }, [isConnected, stream]);

  const toggleConnection = async () => {
    if (isConnected) {
      geminiLiveService.disconnect();
      onConnectionChange(false);
    } else {
      try {
        await geminiLiveService.connect({
          onOpen: () => console.log('Connected to Gemini'),
          onClose: () => onConnectionChange(false),
          onError: (e) => {
            console.error(e);
            onConnectionChange(false);
            setError(e.message);
          },
          onExpansionUpdate: (val) => {
            onExpansionChange(val);
          }
        });
        onConnectionChange(true);
        setError(null);
      } catch (e) {
        console.error(e);
        setError("Failed to connect to Gemini.");
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-gray-900/80 p-4 rounded-xl backdrop-blur-md border border-gray-700 w-full max-w-xs shadow-2xl">
      <div className="flex justify-between items-center mb-1">
         <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Vision Control</h3>
         <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
      </div>

      {/* Webcam Preview */}
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video border border-gray-800 group">
        <video 
          ref={videoRef} 
          muted 
          playsInline 
          className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
        />
        <canvas ref={canvasRef} className="hidden" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-2 text-center text-red-400 text-xs">
            {error}
          </div>
        )}
        {!isConnected && !error && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-xs text-white/70">Paused</span>
             </div>
        )}
      </div>

      <button
        onClick={toggleConnection}
        className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 
          ${isConnected 
            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30' 
            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
          }`}
      >
        {isConnected ? 'Disconnect' : 'Connect Gemini Vision'}
      </button>

      <div className="text-[10px] text-gray-500 leading-tight">
        * Hands: Open to expand, Close to contract. Audio is streamed to improve latency.
      </div>
    </div>
  );
};