import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  base: './',

  build: {
    outDir: 'build',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',

    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },

    chunkSizeWarningLimit: 500,
  },
});
