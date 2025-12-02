import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { ParticleSystem } from './components/ParticleSystem';
import { VisionController } from './components/VisionController';
import { ShapeType } from './types';
import { SHAPE_LABELS, INITIAL_COLOR, INITIAL_SHAPE } from './constants';

const App: React.FC = () => {
  const [shape, setShape] = useState<ShapeType>(INITIAL_SHAPE);
  const [color, setColor] = useState<string>(INITIAL_COLOR);
  const [expansion, setExpansion] = useState<number>(0); // 0 to 1
  const [isConnected, setIsConnected] = useState(false);
  
  // Ref for smooth animation of the expansion value from the API
  const targetExpansionRef = useRef(0);
  const currentExpansionRef = useRef(0);

  // Smooth loop for expansion value
  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      // Lerp current towards target
      const diff = targetExpansionRef.current - currentExpansionRef.current;
      if (Math.abs(diff) > 0.001) {
        currentExpansionRef.current += diff * 0.1; // 10% interpolation speed per frame
        setExpansion(currentExpansionRef.current);
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleExpansionUpdate = (val: number) => {
    targetExpansionRef.current = Math.max(0, Math.min(1, val));
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      
      {/* 3D Scene Background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
          <color attach="background" args={['#050505']} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          
          <ParticleSystem shape={shape} color={color} expansion={expansion} />
          
          <OrbitControls enableZoom={true} enablePan={false} autoRotate={!isConnected} autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Main UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 md:p-10">
        
        {/* Header */}
        <header className="flex justify-between items-start pointer-events-auto">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 tracking-tight drop-shadow-sm">
              Kinetic
            </h1>
            <p className="text-gray-400 text-sm mt-1 tracking-wide">Generative Particle System</p>
          </div>
          
          {/* Shape Selector - Top Right */}
          <div className="flex flex-col gap-2 items-end">
            <div className="bg-gray-900/80 backdrop-blur-md rounded-xl p-1.5 flex gap-1 border border-gray-700 shadow-xl">
               {Object.values(ShapeType).map((t) => (
                 <button
                   key={t}
                   onClick={() => setShape(t)}
                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 
                     ${shape === t 
                       ? 'bg-gray-700 text-white shadow-inner' 
                       : 'text-gray-400 hover:text-white hover:bg-white/5'
                     }`}
                 >
                   {SHAPE_LABELS[t]}
                 </button>
               ))}
            </div>
          </div>
        </header>

        {/* Footer Controls */}
        <div className="flex flex-col md:flex-row items-end md:items-end justify-between gap-6 pointer-events-auto">
          
          {/* Vision Panel (Bottom Left) */}
          <VisionController 
            onExpansionChange={handleExpansionUpdate}
            isConnected={isConnected}
            onConnectionChange={setIsConnected}
          />

          {/* Color & Status (Bottom Right) */}
          <div className="flex flex-col items-end gap-4">
            
            {/* Expansion Indicator */}
            <div className="bg-gray-900/80 backdrop-blur-md p-4 rounded-xl border border-gray-700 w-64 shadow-xl">
               <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium uppercase">
                 <span>Tension</span>
                 <span>{Math.round(expansion * 100)}%</span>
               </div>
               <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-75 ease-out"
                   style={{ width: `${expansion * 100}%` }}
                 />
               </div>
            </div>

            {/* Color Picker */}
            <div className="group relative">
               <input 
                 type="color" 
                 value={color}
                 onChange={(e) => setColor(e.target.value)}
                 className="w-12 h-12 rounded-full cursor-pointer border-2 border-white/20 p-0 overflow-hidden bg-transparent shadow-lg transition-transform hover:scale-110"
               />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
