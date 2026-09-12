import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'sl_avatar.jpg'],
      manifest: {
        name: 'FITSO System',
        short_name: 'FITSO',
        description: 'Advanced Training Protocol System',
        theme_color: '#030814',
        background_color: '#030814',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'sl_avatar.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'sl_avatar.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})
