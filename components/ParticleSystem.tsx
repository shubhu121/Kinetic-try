import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeType } from '../types';

interface ParticleSystemProps {
  shape: ShapeType;
  color: string;
  expansion: number; // 0 to 1
}

const COUNT = 3000;

// Math helpers for shapes
const getPointOnHeart = (t: number, p: number) => {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  const z = p * 4; // Thickness
  return new THREE.Vector3(x, y, z).multiplyScalar(0.1);
};

const getPointOnSphere = () => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 2;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
};

const getPointOnRose = (k: number, theta: number) => {
  const r = Math.cos(k * theta);
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
  const z = (Math.random() - 0.5) * 0.5;
  return new THREE.Vector3(x, y, z).multiplyScalar(2.5);
};

const getPointMeditate = () => {
    // Simple composite: Cone body + Sphere head
    if (Math.random() > 0.3) {
        // Body (Pyramid/Cone ish)
        const h = Math.random() * 2; // Height 0 to 2
        const r = (2 - h) * 0.8; // Radius shrinks as height grows
        const theta = Math.random() * Math.PI * 2;
        return new THREE.Vector3(r * Math.cos(theta), h - 1.5, r * Math.sin(theta));
    } else {
        // Head
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 0.6;
        return new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta) + 0.8, // Offset up
            r * Math.cos(phi)
        );
    }
}

const getPointSaturn = () => {
    if (Math.random() > 0.4) {
        // Planet
        return getPointOnSphere().multiplyScalar(0.8);
    } else {
        // Rings
        const theta = Math.random() * Math.PI * 2;
        const r = 2.5 + Math.random() * 1.5;
        return new THREE.Vector3(r * Math.cos(theta), (Math.random() - 0.5) * 0.1, r * Math.sin(theta));
    }
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ shape, color, expansion }) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate target positions based on shape
  const { positions, randoms } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const rnd = new Float32Array(COUNT * 3); // For random noise movement

    for (let i = 0; i < COUNT; i++) {
      let vec = new THREE.Vector3();
      
      switch (shape) {
        case ShapeType.HEART:
          vec = getPointOnHeart(Math.random() * Math.PI * 2, (Math.random() - 0.5));
          break;
        case ShapeType.FLOWER:
          vec = getPointOnRose(4, Math.random() * Math.PI * 2);
          break;
        case ShapeType.SATURN:
          vec = getPointSaturn();
          break;
        case ShapeType.MEDITATE:
          vec = getPointMeditate();
          break;
        case ShapeType.FIREWORKS:
        default:
           vec = getPointOnSphere().multiplyScalar(Math.random()); // Solid ball
           break;
      }

      pos[i * 3] = vec.x;
      pos[i * 3 + 1] = vec.y;
      pos[i * 3 + 2] = vec.z;

      rnd[i * 3] = (Math.random() - 0.5); // vx
      rnd[i * 3 + 1] = (Math.random() - 0.5); // vy
      rnd[i * 3 + 2] = (Math.random() - 0.5); // vz
    }
    return { positions: pos, randoms: rnd };
  }, [shape]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const time = clock.getElapsedTime();
    const positionsAttribute = pointsRef.current.geometry.attributes.position;
    
    // Animate positions directly
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      // Base target position
      const tx = positions[ix];
      const ty = positions[iy];
      const tz = positions[iz];

      // Expansion effect: push away from center (0,0,0)
      // If expansion is 0 (closed), particles are tight.
      // If expansion is 1 (open), particles explode/expand outward.
      
      // Calculate expansion vector
      const dist = Math.sqrt(tx*tx + ty*ty + tz*tz) + 0.001;
      const dirX = tx / dist;
      const dirY = ty / dist;
      const dirZ = tz / dist;

      // Dynamic multiplier based on expansion prop
      // 1.0 expansion = 2x size + jitter
      const scale = 1 + (expansion * 2.5); 
      
      // Add some "breathing" or "life" based on time
      const breathe = Math.sin(time * 2 + i) * 0.1;

      // If Fireworks, we might want chaotic scattering at high expansion
      const chaos = shape === ShapeType.FIREWORKS ? expansion * 5 : expansion * 0.5;

      const currX = tx * scale + (randoms[ix] * chaos) + (dirX * breathe);
      const currY = ty * scale + (randoms[iy] * chaos) + (dirY * breathe);
      const currZ = tz * scale + (randoms[iz] * chaos) + (dirZ * breathe);

      // Smooth interpolation handled by React state updates is okay, 
      // but doing it per frame in shader or here is smoother. 
      // Since we reconstruct geometry only on shape change, we modify current positions here.
      
      positionsAttribute.setXYZ(i, currX, currY, currZ);
    }
    positionsAttribute.needsUpdate = true;
    
    // Rotate the whole group slowly
    pointsRef.current.rotation.y = time * 0.1 * (1 + expansion);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={new Float32Array(COUNT * 3)} // Init with zeros, filled in useFrame/useEffect
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={color}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
      />
    </points>
  );
};
