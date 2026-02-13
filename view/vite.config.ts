import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../dist/PrismaUI/views/TulliusWidgets',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
})
