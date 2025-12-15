
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'نظام متابعة الطلاب الذكي',
          short_name: 'المتابع الذكي',
          description: 'نظام شامل لتسجيل الحضور ومتابعة الأداء الأكاديمي',
          theme_color: '#0f766e',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      // Polyfill the 'process' object completely for the browser environment.
      // This fixes "process is not defined" errors from 3rd party libs and allows safe access to env vars.
      'process': JSON.stringify({
        env: {
          API_KEY: env.API_KEY || env.VITE_API_KEY || "",
          SUPABASE_URL: env.SUPABASE_URL || env.VITE_SUPABASE_URL || "",
          SUPABASE_KEY: env.SUPABASE_KEY || env.VITE_SUPABASE_KEY || "",
          NODE_ENV: mode
        }
      }),
      // Also polyfill 'global' for some older libraries
      'global': 'window',
    }
  };
});