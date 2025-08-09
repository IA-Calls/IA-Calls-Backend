const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando proceso de build...');

// Función para crear directorio si no existe
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Directorio creado: ${dir}`);
  }
}

// Función para copiar archivos
function copyFiles(src, dest) {
  if (fs.existsSync(src)) {
    if (fs.lstatSync(src).isDirectory()) {
      ensureDir(dest);
      const files = fs.readdirSync(src);
      files.forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        copyFiles(srcPath, destPath);
      });
    } else {
      fs.copyFileSync(src, dest);
      console.log(`📋 Archivo copiado: ${src} -> ${dest}`);
    }
  }
}

// Función para limpiar directorios
function cleanDirs() {
  const dirsToClean = ['dist', 'build'];
  dirsToClean.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`🧹 Directorio limpiado: ${dir}`);
    }
  });
}

// Función para crear build de producción
function createProductionBuild() {
  console.log('🏗️ Creando build de producción...');
  
  // Crear directorio dist
  ensureDir('dist');
  
  // Copiar archivos del servidor
  copyFiles('server.js', 'dist/server.js');
  copyFiles('src', 'dist/src');
  copyFiles('package.json', 'dist/package.json');
  
  // Copiar archivos de configuración
  if (fs.existsSync('.env')) {
    copyFiles('.env', 'dist/.env');
  }
  
  // Crear package.json optimizado para producción
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const productionPackage = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    main: packageJson.main,
    scripts: {
      start: packageJson.scripts.start
    },
    dependencies: packageJson.dependencies,
    engines: {
      node: '>=14.0.0'
    }
  };
  
  fs.writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));
  console.log('📦 package.json optimizado creado');
  
  // Crear archivo de inicio
  const startScript = `#!/usr/bin/env node
console.log('🚀 IA-Calls Backend iniciando...');
console.log('📅 Build generado: ${new Date().toISOString()}');
require('./server.js');
`;
  
  fs.writeFileSync('dist/start.js', startScript);
  console.log('🎯 Script de inicio creado');
}

// Función principal
function main() {
  try {
    // Limpiar directorios anteriores
    cleanDirs();
    
    // Crear build de producción
    createProductionBuild();
    
    console.log('🎉 Build completado exitosamente!');
    console.log('📁 Archivos generados en: dist/');
    console.log('🚀 Para ejecutar: cd dist && npm install && npm start');
    
  } catch (error) {
    console.error('❌ Error durante el build:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { main, createProductionBuild, cleanDirs };
