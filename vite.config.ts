import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  // Project-site base path for GitHub Pages (github.io/plain-regex/).
  base: process.env.DEPLOY_BASE ?? '/plain-regex/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
