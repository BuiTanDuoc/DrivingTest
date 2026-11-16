import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: proxy /api sang backend .NET (mặc định http://localhost:5080) nên không vướng CORS.
// Production: đặt VITE_API_URL=https://api.example.com khi build.
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./tests/setup.js'] },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:5080', changeOrigin: true }
    }
  }
});
