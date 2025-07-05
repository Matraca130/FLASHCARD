import { defineConfig } from 'vite'

export default defineConfig({
  // Configuración de build optimizada
  build: {
    // Directorio de salida
    outDir: 'dist',
    
    // Limpiar directorio antes de build
    emptyOutDir: true,
    
    // Generar sourcemaps para debugging
    sourcemap: true,
    
    // Optimizaciones de bundle
    rollupOptions: {
      output: {
        // Separar chunks por tipo
        manualChunks: {
          // Vendor chunk para librerías externas
          vendor: ['./utils/helpers.js', './utils/validation.js'],
          
          // Core chunk para funcionalidad principal
          core: ['./core-navigation.js', './apiClient.js'],
          
          // PWA chunk para funcionalidad offline
          pwa: ['./pwa-installer.js']
        },
        
        // Nombres de archivos con hash para cache busting
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          if (/\.(css)$/.test(assetInfo.name)) {
            return 'assets/css/[name]-[hash].[ext]';
          }
          
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return 'assets/images/[name]-[hash].[ext]';
          }
          
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return 'assets/fonts/[name]-[hash].[ext]';
          }
          
          return 'assets/[name]-[hash].[ext]';
        }
      }
    },
    
    // Configuración de minificación
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remover console.log en producción
        drop_console: true,
        drop_debugger: true,
        
        // Optimizaciones adicionales
        pure_funcs: ['console.log', 'console.info'],
        passes: 2
      },
      mangle: {
        // Mantener nombres de clases para debugging
        keep_classnames: false,
        keep_fnames: false
      },
      format: {
        // Remover comentarios
        comments: false
      }
    },
    
    // Configuración de assets
    assetsInlineLimit: 4096, // 4kb - inline assets pequeños como base64
    
    // Configuración de CSS
    cssCodeSplit: true, // Separar CSS por chunks
    cssMinify: true,
    
    // Target para compatibilidad
    target: ['es2020', 'chrome80', 'firefox78', 'safari14', 'edge88'],
    
    // Configuración de reportes
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000 // Warning si chunk > 1MB
  },
  
  // Configuración de desarrollo
  server: {
    port: 5173,
    host: true, // Permitir acceso desde red local
    open: true, // Abrir navegador automáticamente
    
    // Configuración de proxy para API
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    },
    
    // Headers de seguridad en desarrollo
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
  },
  
  // Configuración de preview (para testing de build)
  preview: {
    port: 4173,
    host: true,
    open: true
  },
  
  // Configuración de assets públicos
  publicDir: 'public',
  
  // Configuración de resolución de módulos
  resolve: {
    alias: {
      '@': '/src', // Alias para imports más limpios
      '@utils': '/utils',
      '@assets': '/assets'
    }
  },
  
  // Configuración de CSS
  css: {
    // Configuración de preprocesadores
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    },
    
    // PostCSS plugins
    postcss: {
      plugins: [
        // Autoprefixer para compatibilidad de navegadores
        require('autoprefixer')({
          overrideBrowserslist: [
            '> 1%',
            'last 2 versions',
            'not dead',
            'not ie 11'
          ]
        })
      ]
    },
    
    // Configuración de CSS modules (si se usan)
    modules: {
      localsConvention: 'camelCase'
    }
  },
  
  // Configuración de optimización de dependencias
  optimizeDeps: {
    // Incluir dependencias que necesitan pre-bundling
    include: [
      // Agregar aquí librerías que necesiten optimización
    ],
    
    // Excluir dependencias del pre-bundling
    exclude: [
      // Service Worker no debe ser pre-bundled
      'sw.js'
    ]
  },
  
  // Configuración de plugins
  plugins: [
    // Plugin para PWA (si se instala @vite/plugin-pwa)
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg}']
    //   }
    // })
  ],
  
  // Configuración de variables de entorno
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  
  // Configuración de worker
  worker: {
    format: 'es'
  },
  
  // Configuración experimental
  experimental: {
    // Renderizado optimizado
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/${filename}` }
      } else {
        return { relative: true }
      }
    }
  },
  
  // Configuración de logging
  logLevel: 'info',
  clearScreen: false, // No limpiar consola en cada rebuild
  
  // Configuración de base URL (para deployment)
  base: process.env.NODE_ENV === 'production' ? '/FLASHCARD/' : '/'
})

