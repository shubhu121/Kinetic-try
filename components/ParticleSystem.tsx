import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeType } from '../types';

interface ParticleSystemProps {
  shape: ShapeType;
  color: string;
  expansion: number; // 0 to 1
  audioLevelRef: React.MutableRefObject<number>;
}

const COUNT = 4000;

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

const getPointOnGalaxy = () => {
  const armCount = 3;
  // Weighted random for denser center
  const rRandom = Math.pow(Math.random(), 0.5); 
  const r = rRandom * 4; 
  
  // Angle
  const arm = Math.floor(Math.random() * armCount);
  const spin = 3; 
  const theta = (arm / armCount) * Math.PI * 2 + (r * spin);
  
  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  const y = (Math.random() - 0.5) * (1 - rRandom) * 1.0; // Thicker at center
  
  // Add noise scatter
  const noise = 0.15;
  return new THREE.Vector3(
      x + (Math.random()-0.5) * noise, 
      y + (Math.random()-0.5) * noise, 
      z + (Math.random()-0.5) * noise
  );
};

const getPointOnBlackHole = () => {
    // Accretion disk
    const angle = Math.random() * Math.PI * 2;
    // Distribution: Gap in middle (Event horizon), then dense disk fading out
    const r = 1.2 + Math.random() * Math.random() * 3.5;
    const y = (Math.random() - 0.5) * 0.1 * r; 
    
    // Few particles trapped in center
    if (Math.random() < 0.03) {
       return getPointOnSphere().multiplyScalar(0.4);
    }
    
    return new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle));
};

const getPointOnDNA = () => {
    const t = (Math.random() - 0.5) * 8; // Height range -4 to 4
    const isStrandA = Math.random() > 0.5;
    const r = 1.2;
    const twist = t * 1.0;
    
    let x, z;
    if (isStrandA) {
        x = r * Math.cos(twist);
        z = r * Math.sin(twist);
    } else {
        x = r * Math.cos(twist + Math.PI);
        z = r * Math.sin(twist + Math.PI);
    }
    
    // Ladders (Base pairs)
    if (Math.random() > 0.7) {
        const alpha = Math.random(); 
        const x1 = r * Math.cos(twist);
        const z1 = r * Math.sin(twist);
        const x2 = r * Math.cos(twist + Math.PI);
        const z2 = r * Math.sin(twist + Math.PI);
        x = x1 + (x2 - x1) * alpha;
        z = z1 + (z2 - z1) * alpha;
    }
    
    return new THREE.Vector3(x, t, z);
};

const getPointOnCube = () => {
    const s = 1.5; 
    const face = Math.floor(Math.random() * 6);
    const u = (Math.random() - 0.5) * 2 * s;
    const v = (Math.random() - 0.5) * 2 * s;
    
    switch(face) {
        case 0: return new THREE.Vector3(s, u, v);
        case 1: return new THREE.Vector3(-s, u, v);
        case 2: return new THREE.Vector3(u, s, v);
        case 3: return new THREE.Vector3(u, -s, v);
        case 4: return new THREE.Vector3(u, v, s);
        case 5: return new THREE.Vector3(u, v, -s);
    }
    return new THREE.Vector3();
};

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ shape, color, expansion, audioLevelRef }) => {
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
        case ShapeType.GALAXY:
          vec = getPointOnGalaxy();
          break;
        case ShapeType.BLACKHOLE:
          vec = getPointOnBlackHole();
          break;
        case ShapeType.DNA:
          vec = getPointOnDNA();
          break;
        case ShapeType.CUBE:
          vec = getPointOnCube();
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
    
    // Get Audio Level (0 to 1 range usually, sometimes higher)
    const audioScale = audioLevelRef.current || 0;
    
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
      const dist = Math.sqrt(tx*tx + ty*ty + tz*tz) + 0.001;
      const dirX = tx / dist;
      const dirY = ty / dist;
      const dirZ = tz / dist;

      // Dynamic multiplier based on expansion prop AND Audio
      // Audio adds a "pulse" on top of the expansion
      // Multiplier: 1.0 (base) + handExpansion + audioPulse
      const scale = 1 + (expansion * 2.5) + (audioScale * 1.5); 
      
      // Add some "breathing" or "life" based on time
      const breathe = Math.sin(time * 2 + i) * 0.1;
      
      // Audio "Jitter" - higher energy vibrates particles more
      const jitter = audioScale * 0.2;

      // If Fireworks, we might want chaotic scattering at high expansion
      const chaos = shape === ShapeType.FIREWORKS ? expansion * 5 : expansion * 0.5;

      const currX = tx * scale + (randoms[ix] * chaos) + (dirX * breathe) + (randoms[ix] * jitter);
      const currY = ty * scale + (randoms[iy] * chaos) + (dirY * breathe) + (randoms[iy] * jitter);
      const currZ = tz * scale + (randoms[iz] * chaos) + (dirZ * breathe) + (randoms[iz] * jitter);
      
      positionsAttribute.setXYZ(i, currX, currY, currZ);
    }
    positionsAttribute.needsUpdate = true;
    
    // Rotate the whole group
    // DNA and Blackhole look better with faster rotation
    const baseSpeed = 0.1;
    const extraSpeed = (shape === ShapeType.BLACKHOLE || shape === ShapeType.GALAXY) ? 0.2 : 0;
    
    // Audio increases rotation speed slightly
    const audioRotation = audioScale * 0.5;
    
    pointsRef.current.rotation.y = time * (baseSpeed + extraSpeed + audioRotation) * (1 + expansion);
    if (shape === ShapeType.DNA) {
        pointsRef.current.rotation.z = Math.sin(time * 0.5) * 0.2; // Slight tilt wobble for DNA
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={new Float32Array(COUNT * 3)}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={color}
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
};
