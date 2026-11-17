import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local development Vite proxies /api to the Spring Boot backend,
// which keeps the browser on a single origin (no CORS surprises).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
