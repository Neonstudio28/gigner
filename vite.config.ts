import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true, port: 5173, watch: { ignored: ['**/.hoplite/**', '**/dist/**'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 2500 },
});
