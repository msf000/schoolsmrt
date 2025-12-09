
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || "AIzaSyDKU3a8J6MxFRI9I-JJu9wY-2HcgVz_YDM"),
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || env.SUPABASE_URL || ""),
      'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY || env.SUPABASE_KEY || ""),
    }
  };
});
