import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Prioritize Vercel/System env variables, fallback to .env files, then hardcoded strings
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || "AIzaSyDitKffPRLn5kzdVZtw9Y9se1vdejoZWdc"),
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || env.SUPABASE_URL || ""),
      'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY || env.SUPABASE_KEY || ""),
    }
  };
});