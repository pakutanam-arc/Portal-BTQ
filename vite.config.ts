import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'rohis-102.png',
          'apple-touch-icon.png',
          'icon.svg',
          'favicon.ico',
          'favicon-32x32.png',
          'favicon-16x16.png'
        ],
        manifest: {
          id: '/',
          name: 'Portal BTQ SMP Negeri 102 Jakarta',
          short_name: 'Portal BTQ',
          description: 'Sistem Informasi dan Manajemen Bimbingan Baca Tulis Al-Qur\'an (BTQ) SMP Negeri 102 Jakarta.',
          theme_color: '#172033',
          background_color: '#F5F6F8',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Local image assets (original JPG logos, avatars, student photos, and stamps)
              // CacheFirst: downloads once, stores in device cache, serves instantly without hitting the server
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)(?:\?.*)?$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'local-images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days retention
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 600,
      modulePreload: {
        resolveDependencies: (_filename, deps, { hostType }) => {
          if (hostType === 'html') {
            // Do not preload heavy chart libraries on initial page load
            return deps.filter(dep => !dep.includes('vendor-charts'));
          }
          return deps;
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            // 1. Firebase Firestore & WebChannel
            if (
              id.includes('/@firebase/firestore') ||
              id.includes('/firebase/firestore') ||
              id.includes('/@firebase/webchannel-wrapper')
            ) {
              return 'vendor-firebase-firestore';
            }
            // 2. Firebase Auth
            if (
              id.includes('/@firebase/auth') ||
              id.includes('/firebase/auth')
            ) {
              return 'vendor-firebase-auth';
            }
            // 3. Firebase Core / App & Utilities
            if (
              id.includes('/@firebase/app') ||
              id.includes('/firebase/app') ||
              id.includes('/@firebase/component') ||
              id.includes('/@firebase/util') ||
              id.includes('/@firebase/logger')
            ) {
              return 'vendor-firebase-app';
            }
            // 4. Visualization libraries (Recharts, d3, victory-vendor, internal chart state tools)
            if (
              id.includes('/recharts/') ||
              id.includes('/d3-') ||
              id.includes('/d3/') ||
              id.includes('/victory-vendor/') ||
              id.includes('/@reduxjs/toolkit/') ||
              id.includes('/react-redux/') ||
              id.includes('/reselect/') ||
              id.includes('/decimal.js-light/') ||
              id.includes('/es-toolkit/')
            ) {
              return 'vendor-charts';
            }
            // 5. Utility libraries (date-fns, clsx, tailwind-merge)
            if (
              id.includes('/date-fns/') ||
              id.includes('/clsx/') ||
              id.includes('/tailwind-merge/')
            ) {
              return 'vendor-utils';
            }
            // 6. Icons
            if (id.includes('/lucide-react/')) {
              return 'vendor-icons';
            }
            // 7. Motion animation
            if (id.includes('/motion/')) {
              return 'vendor-motion';
            }
            // 8. React & React Router Core
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router/') ||
              id.includes('/react-router-dom/')
            ) {
              return 'vendor-react';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      allowedHosts: true as const,
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
