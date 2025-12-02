export enum ShapeType {
  HEART = 'HEART',
  FLOWER = 'FLOWER',
  SATURN = 'SATURN',
  MEDITATE = 'MEDITATE', // Approximation of Buddha/Meditating figure
  FIREWORKS = 'FIREWORKS',
}

export interface ParticleState {
  expansion: number; // 0 to 1
  rotationSpeed: number;
}

export interface VisionControlConfig {
  fps: number;
  quality: number;
}
