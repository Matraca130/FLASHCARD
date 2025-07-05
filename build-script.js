import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const sourceDir = __dirname;
const distDir = path.join(__dirname, 'dist');

// Archivos y directorios a copiar
const filesToCopy = [
  'index.html',
  'styles.css',
  'responsive.css',
  'apple-mobile.css',
  'meta-dark-theme.css',
  'manifest.webmanifest',
  'sw.js',
  'pwa-installer.js',
  'main.js',
  'router.js',
  'apiClient.js',
  'charts.js',
  'core-navigation.js',
  'navigation-robust.js',
  'simple-connections.js',
  'algorithms.service.js',
  'dashboard.service.js',
  'create.service.js',
  'study.service.js',
  'storage.service.js',
  'activity-heatmap.service.js'
];

const dirsToCopy = [
  'icons',
  'utils',
  'store',
  'backend_app'
];

// Función para copiar archivo
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied: ${path.basename(src)}`);
  } else {
    console.log(`⚠ Missing: ${src}`);
  }
}

// Función para copiar directorio recursivamente
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⚠ Missing directory: ${src}`);
    return;
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  
  console.log(`✓ Copied directory: ${path.basename(src)}`);
}

// Función principal de build
function build() {
  console.log('🔨 Starting build process...');
  
  // Limpiar directorio dist
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
  
  console.log('📁 Copying files...');
  
  // Copiar archivos individuales
  filesToCopy.forEach(file => {
    const src = path.join(sourceDir, file);
    const dest = path.join(distDir, file);
    copyFile(src, dest);
  });
  
  // Copiar directorios
  dirsToCopy.forEach(dir => {
    const src = path.join(sourceDir, dir);
    const dest = path.join(distDir, dir);
    copyDir(src, dest);
  });
  
  console.log('✅ Build completed successfully!');
  console.log(`📦 Output directory: ${distDir}`);
  
  // Mostrar contenido del directorio dist
  console.log('\n📋 Files in dist/:');
  const distFiles = fs.readdirSync(distDir);
  distFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    const stats = fs.statSync(filePath);
    const type = stats.isDirectory() ? '📁' : '📄';
    console.log(`  ${type} ${file}`);
  });
}

// Ejecutar build
try {
  build();
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

