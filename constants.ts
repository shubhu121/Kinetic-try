import { ShapeType } from './types';

export const INITIAL_COLOR = '#4f46e5'; // Indigo-600
export const INITIAL_SHAPE = ShapeType.HEART;

export const SHAPE_LABELS: Record<ShapeType, string> = {
  [ShapeType.HEART]: 'Heart',
  [ShapeType.FLOWER]: 'Rose',
  [ShapeType.SATURN]: 'Saturn',
  [ShapeType.MEDITATE]: 'Meditate',
  [ShapeType.FIREWORKS]: 'Big Bang',
};

// System instruction for the Gemini Live session
export const SYSTEM_INSTRUCTION = `
  You are a kinetic particle controller. 
  Your ONLY job is to analyze the user's hand gestures from the video stream and control the "expansion" parameter.

  Rules:
  1. Continually detect the state of the user's hands.
  2. Map the hand state to an "expansion" value (0.0 to 1.0):
     - 0.0: Hands closed (fist) or hands touching/clenched.
     - 1.0: Hands wide open (fingers splayed) or hands far apart.
  3. You MUST call the 'setExpansion' tool repeatedly (at least once per second) with the current value.
  4. Do not speak. Do not generate text. Only call the tool.
  5. Start immediately upon connection.
`;