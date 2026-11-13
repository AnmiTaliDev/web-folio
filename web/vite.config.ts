import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

const version = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
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
