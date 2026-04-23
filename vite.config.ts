import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'node:path'

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ['buffer', 'process'],
      globals: { Buffer: true, process: true },
    }),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo-kozegho.png'],
      manifest: {
        name: 'Kozegho Proposals',
        short_name: 'KP',
        description: 'Create and export Kozegho commercial proposals',
        theme_color: '#7AB648',
        background_color: '#7AB648',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname === 'yrlnvtiuonrjkvdoievj.supabase.co' &&
              url.pathname.includes('/storage/v1/object/public/datasheets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kp-datasheets',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: ({ url }) =>
              url.hostname === 'yrlnvtiuonrjkvdoievj.supabase.co' &&
              url.pathname.includes('/storage/v1/object/public/logos/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kp-logos',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: ({ url }) =>
              url.hostname === 'yrlnvtiuonrjkvdoievj.supabase.co' &&
              (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')),
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kp-google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
    include: ['@react-pdf/renderer'],
  },
  build: {
    commonjsOptions: {
      include: [/@react-pdf\/renderer/, /node_modules/],
    },
  },
})
