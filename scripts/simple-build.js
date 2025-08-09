const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando build simple...');

// Crear directorio dist si no existe
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
  console.log('📁 Directorio dist creado');
}

// Función para copiar archivos
function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`📋 Copiado: ${src} -> ${dest}`);
  } else {
    console.log(`⚠️ Archivo no encontrado: ${src}`);
  }
}

// Función para copiar directorio
function copyDir(src, dest) {
  if (fs.existsSync(src)) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    files.forEach(file => {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      
      if (fs.lstatSync(srcPath).isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        copyFile(srcPath, destPath);
      }
    });
  }
}

try {
  // Limpiar directorio dist
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
    console.log('🧹 Directorio dist limpiado');
  }
  
  // Crear nuevo directorio dist
  fs.mkdirSync('dist', { recursive: true });
  
  // Copiar archivos principales
  copyFile('server.js', 'dist/server.js');
  copyFile('package.json', 'dist/package.json');
  
  // Copiar directorio src
  copyDir('src', 'dist/src');
  
  // Copiar archivos de configuración si existen
  if (fs.existsSync('.env')) {
    copyFile('.env', 'dist/.env');
  }
  
  // Crear package.json optimizado para producción
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const productionPackage = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    main: 'server.js',
    scripts: {
      start: 'node server.js'
    },
    dependencies: packageJson.dependencies,
    engines: {
      node: '>=14.0.0'
    }
  };
  
  fs.writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));
  console.log('📦 package.json optimizado creado');
  
  // Crear archivo README para el build
  const readmeContent = `# IA-Calls Backend - Build de Producción

Este es el build de producción generado el ${new Date().toLocaleString()}.

## Para ejecutar:

1. Instalar dependencias:
   \`\`\`bash
   npm install --production
   \`\`\`

2. Iniciar servidor:
   \`\`\`bash
   npm start
   \`\`\`

## Archivos incluidos:
- server.js - Servidor principal
- src/ - Código fuente
- package.json - Dependencias optimizadas
- .env - Variables de entorno (si existe)
`;
  
  fs.writeFileSync('dist/README.md', readmeContent);
  console.log('📖 README.md creado');
  
  console.log('🎉 Build completado exitosamente!');
  console.log('📁 Archivos generados en: dist/');
  console.log('🚀 Para ejecutar: cd dist && npm install --production && npm start');
  
} catch (error) {
  console.error('❌ Error durante el build:', error.message);
  process.exit(1);
}
