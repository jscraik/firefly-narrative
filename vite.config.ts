import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [tailwindcss(), react()],
  clearScreen: false,
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || 'localhost',
    hmr: {
      protocol: 'ws',
      host: host || 'localhost',
      port: 1421
    },
    watch: {
      ignored: ['**/src-tauri/**']
    }
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG
  }
});
