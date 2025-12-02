import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Prioritize Vercel/System env variables, fallback to hardcoded strings if missing
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "AIzaSyDKU3a8J6MxFRI9I-JJu9wY-2HcgVz_YDM"),
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ""),
      'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY || ""),
    }
  };
});