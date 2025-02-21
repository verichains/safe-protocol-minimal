import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: '/safe-protocol-minimal',  // Repository name
  build: {
    outDir: 'docs',  // Build output directory
    emptyOutDir: true
  },
  plugins: [svelte({
    preprocess: sveltePreprocess()
  }), nodePolyfills({
    globals: {
      Buffer: true,
      process: true
    }
  })],
  optimizeDeps: {
    include: ['@safe-global/protocol-kit', 'ethers']
  },
  define: {
    'process.env': {}
  },
}) 