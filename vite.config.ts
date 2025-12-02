import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill process.env for the Google GenAI SDK if needed, though mostly used on server.
    // We map strictly used keys to avoid leaking logic.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  }
});
