import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'pwa/icon-192.png',
        'pwa/icon-512.png',
        'pwa/maskable-192.png',
        'pwa/maskable-512.png',
        'pwa/apple-touch-icon.png'
      ],
      manifest: {
        name: 'Descansos CPE',
        short_name: 'Descansos CPE',
        description: 'Intercambio de dias de descanso para trabajadores del Puerto de Valencia',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f0f4f8',
        theme_color: '#3b82f6',
        icons: [
          { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        // Important: don't serve the SPA shell for real assets like PDFs (or images).
        // Otherwise "Abrir PDF" can open the app instead of the file in the PWA.
        navigateFallbackDenylist: [
          /^\/assets\/.*\.(?:pdf|png|jpg|jpeg|webp|gif|svg)$/i,
          /^\/pwa\/.*$/i,
        ],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,pdf,jpg,jpeg,webp}']
      }
    })
  ],
})
