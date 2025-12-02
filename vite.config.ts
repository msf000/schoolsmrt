import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the app code to work without changes
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || process.env.API_KEY)
    }
  };
});