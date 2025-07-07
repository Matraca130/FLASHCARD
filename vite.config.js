import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Configuración de build optimizada
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // Mantener nombres de archivos para compatibilidad
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    // Optimizaciones para GitHub Pages
    assetsDir: 'assets',
    target: 'es2020',
  },

  // Configuración de servidor de desarrollo
  server: {
    port: 3000,
    open: true,
    cors: true,
  },

  // Configuración de preview
  preview: {
    port: 4173,
    open: true,
  },

  // Optimizaciones de dependencias
  optimizeDeps: {
    include: ['chart.js'],
  },

  // Configuración de base para GitHub Pages
  base: process.env.NODE_ENV === 'production' ? '/FLASHCARD/' : '/',

  // Plugins y configuraciones adicionales
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },

  // Configuración de CSS
  css: {
    devSourcemap: true,
  },
});
