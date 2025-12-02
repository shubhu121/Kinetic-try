import { ThreeElements } from '@react-three/fiber';

export enum ShapeType {
  HEART = 'HEART',
  FLOWER = 'FLOWER',
  SATURN = 'SATURN',
  MEDITATE = 'MEDITATE', // Approximation of Buddha/Meditating figure
  FIREWORKS = 'FIREWORKS',
  GALAXY = 'GALAXY',
  BLACKHOLE = 'BLACKHOLE',
  DNA = 'DNA',
  CUBE = 'CUBE'
}

export interface ParticleState {
  expansion: number; // 0 to 1
  rotationSpeed: number;
}

export interface VisionControlConfig {
  fps: number;
  quality: number;
}

// Augment global JSX namespace to include Three.js elements for R3F
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

// Augment React namespace to include Three.js elements for R3F (required for certain TS configurations)
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}