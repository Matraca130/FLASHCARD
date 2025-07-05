import { defineConfig } from 'vite';

export default defineConfig({
  // Base path para GitHub Pages
  base: '/FLASHCARD/',
  
  // Configuración de build que copia archivos sin bundling
  build: {
    // Directorio de salida
    outDir: 'dist',
    
    // Limpiar directorio antes de build
    emptyOutDir: true,
    
    // Configuración para copiar archivos sin bundling
    rollupOptions: {
      // No hacer bundling de módulos
      external: () => true,
      input: 'index.html'
    },
    
    // No minificar para evitar problemas
    minify: false,
    
    // Copiar archivos estáticos
    copyPublicDir: true
  },
  
  // Configuración de archivos públicos
  publicDir: false, // No usar directorio public por defecto
  
  // Configuración de servidor de desarrollo
  server: {
    port: 3000,
    open: true,
    cors: true
  }
});

