import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('/src/content/duas/')) return 'duas';
        },
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ฮัจญ์ & อุมเราะฮ์ 3D',
        short_name: 'ฮัจญ์ & อุมเราะฮ์ 3D',
        description: 'เครื่องจำลองฝึกพิธีฮัจญ์และอุมเราะฮ์แบบ 3 มิติ พร้อมดุอาอ์ คำอ่าน และความหมาย',
        theme_color: '#eef3f0',
        background_color: '#eef3f0',
        display: 'standalone',
        lang: 'th',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});
