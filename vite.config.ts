import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { es } from './src/i18n/es.ts';

/** Inserta en index.html los textos de src/i18n/es.ts (única fuente de textos). */
function htmlTexts(): Plugin {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return {
    name: 'html-texts',
    transformIndexHtml(html) {
      return html
        .replace(/%APP_NAME%/g, escape(es.app.name))
        .replace(/%APP_DESCRIPTION%/g, escape(es.app.description))
        .replace(/%APP_NOSCRIPT%/g, escape(es.app.noscript));
    },
  };
}

// Para GitHub Pages en una subcarpeta: BASE_PATH=/mi-repo/ npm run build
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    htmlTexts(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: es.app.name,
        short_name: es.app.shortName,
        description: es.app.description,
        lang: 'es-CO',
        dir: 'ltr',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
});
