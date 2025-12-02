# Kinetic Particle System

A real-time interactive 3D particle system controlled by hand gestures, built with React, Three.js, and MediaPipe.

## Overview

This application allows users to manipulate a complex 3D particle system using their webcam. By analyzing hand gestures in real-time (detecting open palms vs. closed fists), the user can expand and contract the universe of particles.

## Features

- **Gesture Control**: Uses MediaPipe HandLandmarker for high-performance, client-side hand tracking to control particle physics.
- **Generative Shapes**: Includes diverse templates such as Spiral Galaxies, Black Holes, DNA Double Helices, Tesseracts, and more.
- **Real-time Rendering**: Powered by Three.js and React Three Fiber for smooth 60fps visuals.
- **Customizable**: Change colors and shapes on the fly.

## Usage

1. Allow camera access when prompted.
2. Click "Start Hand Tracking".
3. Show your hand to the camera:
   - **Open Hand**: Expands the particles.
   - **Closed Fist**: Contracts the particles.

## Credits

Created by Shubhu and Google AI Studio.