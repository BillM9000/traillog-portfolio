import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000, // ExcelJS (940KB) is dynamically imported on-demand
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3614',
      '/auth': 'http://localhost:3614',
    },
  },
});
