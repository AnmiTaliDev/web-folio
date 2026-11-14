import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'
import packageJson from './package.json'

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(packageJson.version) },
  plugins: [solid(), tailwindcss()],
  server: { proxy: { '/api': 'http://localhost:3000' }, fs: { allow: ['..'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 700 },
  resolve: { conditions: ['browser'] },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    server: { deps: { inline: [/solid-js/, /@solidjs/, /material-color-utilities/] } },
  },
})
