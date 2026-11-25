/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

// The Claude Artifact build: one script and one stylesheet with relative paths, no service worker.
const artifact = process.env.VITE_ARTIFACT === '1'

export default defineConfig({
  base: artifact ? './' : process.env.BASE_URL || '/',
  resolve: artifact ? { alias: { 'virtual:pwa-register': fileURLToPath(new URL('./src/pwa-register-stub.ts', import.meta.url)) } } : undefined,
  build: {
    outDir: artifact ? 'dist-artifact' : 'dist',
    copyPublicDir: !artifact,
    cssCodeSplit: !artifact,
    rollupOptions: {
      output: {
        inlineDynamicImports: artifact,
        // Keep the React runtime in its own long-lived chunk so page chunks stay small and cacheable
        manualChunks: artifact ? undefined : (id: string) => {
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(artifact ? [] : [VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png', 'icons/apple-touch-icon.png'],
      manifest: false, // use existing public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Exercise demo images: not precached (jpg), cached on first view
            urlPattern: /\/exercise-media\/.*\.jpg$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-media-cache',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    })]),
  ],
})
