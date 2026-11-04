import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Relative asset paths: the build works at the web root and in any sub-folder (/archiv/).
  base: './',
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Dev: /api geht an die lokale PHP-API (scripts/dev-api.ps1).
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
