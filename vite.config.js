import { defineConfig } from 'vite';

export default defineConfig({
  // Configuração básica de build
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    
    // Configuração simplificada de rollup
    rollupOptions: {
      output: {
        // Nomes de arquivos com hash para cache busting
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // Minificação básica
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Manter console.log para debugging
        drop_debugger: true
      }
    },
    
    // Target para compatibilidade
    target: 'es2020',
    
    // Limite de warning para chunks
    chunkSizeWarningLimit: 1000
  },
  
  // Configuração de desenvolvimento
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
  
  // Configuração de preview
  preview: {
    port: 4173,
    host: true,
    open: false
  },
  
  // Diretório público
  publicDir: 'public',
  
  // Configuração de CSS
  css: {
    devSourcemap: true
  },
  
  // Otimização de dependências
  optimizeDeps: {
    exclude: ['sw.js']
  },
  
  // Base URL para GitHub Pages
  base: process.env.NODE_ENV === 'production' ? '/FLASHCARD/' : '/',
  
  // Configuração de variáveis de ambiente
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});

