import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:3000';

  return {
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
  };
});
