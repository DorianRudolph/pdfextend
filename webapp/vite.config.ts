import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import Markdown from 'vite-plugin-react-markdown';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Markdown(),
    react(),
    VitePWA({
      includeAssets: [
        'favicon-16.png',
        'apple-touch-icon.png',
        'favicon-32.png',
        'favicon.svg',
        'masked-icon.svg'
      ],
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 6e6
      },
      manifest: {
        name: 'PDFextend',
        short_name: 'PDFextend',
        description: 'Add margins with grid lines for annotation to a PDF document.',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
});
