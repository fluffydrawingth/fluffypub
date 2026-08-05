import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Color Lab's copied tree (src/color-lab/) uses `@/`-aliased imports
      // internally — this alias is scoped to that subtree only, never used
      // by fluffypub's own pages/components. See docs/public-admin-separation.md
      // in fluffy-color-lab for why the tree is kept intact rather than
      // rewritten to relative imports.
      '@': path.resolve(__dirname, './src/color-lab'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
