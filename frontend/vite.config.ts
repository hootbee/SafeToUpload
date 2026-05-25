import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  resolve: {
    alias: {
      '@shared/risk-scoring': resolve(__dirname, '../shared/risk-scoring/index.ts'),
      '@shared/privacy-memory': resolve(__dirname, '../shared/privacy-memory/index.ts'),
      '@shared/analysis-prompt-schema': resolve(__dirname, '../shared/analysis-prompt-schema.ts'),
    },
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs',
          dest: 'ort',
        },
        {
          src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm',
          dest: 'ort',
        },
      ],
    }),
  ],
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        background: resolve(__dirname, 'src/extension/background.ts'),
        contentScript: resolve(__dirname, 'src/extension/contentScript.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'contentScript') return 'contentScript.js';
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
