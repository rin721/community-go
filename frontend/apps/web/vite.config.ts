import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 4173, strictPort: true },
  preview: { port: 4174, strictPort: true },
  build: {
    manifest: true,
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    setupFiles: './src/test/setup.ts',
  },
});
