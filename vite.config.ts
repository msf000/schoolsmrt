
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'نظام المدرس الذكي',
          short_name: 'المدرس الذكي',
          description: 'نظام شامل لإدارة الفصول والطلاب والدرجات',
          theme_color: '#0f766e',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: 'https://cdn-icons-png.flaticon.com/512/3429/3429149.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://cdn-icons-png.flaticon.com/512/3429/3429149.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 // Increase limit for large assets
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || ""),
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || env.SUPABASE_URL || ""),
      'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY || env.SUPABASE_KEY || ""),
    }
  };
});