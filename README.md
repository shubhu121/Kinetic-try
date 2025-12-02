# Kinetic Particle System

A real-time interactive 3D particle system controlled by hand gestures and audio, built with React, Three.js, and MediaPipe.

## Overview

This application allows users to manipulate a complex 3D particle system using their webcam and microphone.
- **Hand Tracking**: Analyze gestures (Open Palm vs Closed Fist) to expand/contract the universe.
- **Audio Reactivity**: Particles pulse and jitter to the beat of your music or voice.

## Features

- **Gesture Control**: Uses MediaPipe HandLandmarker for high-performance, client-side hand tracking.
- **Audio Visualization**: Web Audio API integration for real-time sound reactivity.
- **Generative Shapes**: Templates including Galaxy, Black Hole, DNA, Tesseract, and more.
- **Real-time Rendering**: Powered by Three.js and React Three Fiber.

## Running Locally

To run this project on your local machine, you need [Node.js](https://nodejs.org/) installed.

1.  **Clone the project**:
    Download the files to a local directory.

2.  **Install dependencies**:
    Open your terminal in the project directory and run:
    ```bash
    npm install
    ```

3.  **Set up API Key (Optional)**:
    If you plan to use any cloud AI features (like Gemini), create a `.env.local` file and add:
    ```
    VITE_API_KEY=your_api_key_here
    ```
    *(Note: The current version heavily uses client-side MediaPipe, so an API key might not be strictly necessary for basic gesture control).*

4.  **Start the development server**:
    ```bash
    npm run dev
    ```
    Open the URL shown in the terminal (usually `http://localhost:5173`).

## Deploying to Vercel

This project is optimized for deployment on Vercel.

1.  **Push to GitHub**: Upload your code to a GitHub repository.
2.  **Import in Vercel**:
    - Go to [Vercel Dashboard](https://vercel.com/dashboard).
    - Click **"Add New..."** -> **"Project"**.
    - Select your GitHub repository.
3.  **Configure Build**:
    - Framework Preset: **Vite** (Vercel should detect this automatically).
    - Build Command: `npm run build`
    - Output Directory: `dist`
4.  **Deploy**: Click "Deploy".

## Credits

Created by Shubhu and Google AI Studio.
