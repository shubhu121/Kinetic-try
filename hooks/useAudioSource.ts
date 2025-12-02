import { useState, useRef, useEffect, useCallback } from 'react';

export const useAudioSource = () => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  // audioLevel is a mutable ref (0.0 to 1.0) to be read inside the animation loop without re-renders
  const audioLevelRef = useRef(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Calculate average volume from frequency data
    let sum = 0;
    // Focus on lower frequencies for "beat" detection (first half of the array)
    const length = dataArrayRef.current.length;
    for (let i = 0; i < length; i++) {
        sum += dataArrayRef.current[i];
    }
    
    const average = sum / length;
    const normalized = average / 128.0; // Normalize closer to 0-1 range (max byte is 255)

    // Smooth output using linear interpolation
    audioLevelRef.current += (normalized - audioLevelRef.current) * 0.2;

    rafIdRef.current = requestAnimationFrame(analyze);
  }, []);

  const toggleAudio = async () => {
    if (isAudioEnabled) {
      // Stop
      if (audioContextRef.current) {
        audioContextRef.current.suspend();
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setIsAudioEnabled(false);
      audioLevelRef.current = 0;
    } else {
      // Start
      try {
        if (!audioContextRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContextClass();
          
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256; // Smaller FFT size for performance
          analyserRef.current.smoothingTimeConstant = 0.8;
          
          dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
          
          sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
          sourceRef.current.connect(analyserRef.current);
        }

        await audioContextRef.current.resume();
        setIsAudioEnabled(true);
        analyze();
      } catch (error) {
        console.error("Microphone access denied:", error);
        alert("Please allow microphone access to use audio reactivity.");
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return { isAudioEnabled, toggleAudio, audioLevelRef };
};
