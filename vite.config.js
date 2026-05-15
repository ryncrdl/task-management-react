import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy to Laravel API (dev only)
      '/api/laravel': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/laravel/, '/api'),
      },
      // Proxy to Node.js service (dev only)
      '/api/node': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/node/, '/api'),
      },
    },
  },
});
