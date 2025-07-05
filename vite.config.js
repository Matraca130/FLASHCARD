import { defineConfig } from 'vite';

export default defineConfig({
  // Base path para GitHub Pages
  base: '/FLASHCARD/',
  
  // Configuración de build simplificada
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    
    // Configuración simplificada de rollup
    rollupOptions: {
      output: {
        // Nombres de archivos con hash para cache busting
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // Minificación básica
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Mantener console.log para debugging
        drop_debugger: true
      }
    },
    
    // Target para compatibilidad
    target: 'es2020',
    
    // Límite de warning para chunks
    chunkSizeWarningLimit: 1000
  },
  
  // Configuración de desarrollo
  server: {
    port: 5173,
    host: true,
    open: false,
    
    // Proxy para API backend
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  // Configuración de preview
  preview: {
    port: 4173,
    host: true,
    open: false
  },
  
  // Directorio público
  publicDir: 'public',
  
  // Configuración de CSS
  css: {
    devSourcemap: true
  },
  
  // Optimización de dependencias
  optimizeDeps: {
    exclude: ['sw.js']
  }
});

