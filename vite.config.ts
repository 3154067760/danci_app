import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { localDataPlugin } from './scripts/vite-local-data-plugin.mjs'

export default defineConfig({
  plugins: [react(), localDataPlugin()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 3002,
  },
})
