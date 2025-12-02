import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Injecting the provided API Key directly for the environment
      'process.env.API_KEY': JSON.stringify("AIzaSyDKU3a8J6MxFRI9I-JJu9wY-2HcgVz_YDM"),
    }
  };
});