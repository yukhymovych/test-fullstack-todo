import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      // `autoUpdate` reloads on every SW activate; in dev that races with offline/HMR and can
      // leave no controlling worker. `prompt` matches plugin default and avoids surprise reloads.
      registerType: 'prompt',
      manifest: false,
      includeAssets: ['logo.png', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
        // Dev uses a temporary Workbox-generated SW (not `src/sw.ts`). Plugin default allowlist is
        // only `/`, so deep links like `/notes/:id` never get `index.html` offline → dinosaur page.
        navigateFallbackAllowlist: [
          /^\/$/,
          /^\/login(?:\/|$)/,
          /^\/notes(?:\/|$)/,
          /^\/learning(?:\/|$)/,
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  envPrefix: ['VITE_', 'DEBUG_'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
