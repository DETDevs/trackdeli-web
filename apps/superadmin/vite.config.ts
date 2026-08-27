import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target = 'https://trackdeli-api-production.up.railway.app';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target,
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target,
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          recharts: ['recharts'],
          icons: ['@phosphor-icons/react'],
        },
      },
    },
  },
});
