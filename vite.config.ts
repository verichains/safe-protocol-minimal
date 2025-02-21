import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess';

export default defineConfig({
  base: '/safe-protocol-minimal/',  // Repository name
  build: {
    outDir: 'docs',  // Build output directory
    emptyOutDir: true
  },
  plugins: [svelte({
    preprocess: sveltePreprocess()
  })],
  optimizeDeps: {
    include: ['@safe-global/protocol-kit', 'ethers']
  },
  define: {
    'process.env': {}
  },
}) 