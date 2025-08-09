const fs = require('fs');

console.log('🔄 Restaurando configuración de desarrollo...');

function restoreDevelopmentConfig() {
  try {
    // Restaurar package.json original
    if (fs.existsSync('package.json.backup')) {
      fs.copyFileSync('package.json.backup', 'package.json');
      fs.unlinkSync('package.json.backup');
      console.log('✅ package.json original restaurado');
    } else {
      console.log('⚠️ No se encontró backup de package.json');
    }
    
    // Eliminar archivos de producción si existen
    const filesToRemove = [
      '.env.production',
      'start.js',
      'ecosystem.config.js',
      'DEPLOYMENT.md'
    ];
    
    filesToRemove.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`🗑️ Archivo eliminado: ${file}`);
      }
    });
    
    // Eliminar directorio logs si está vacío
    if (fs.existsSync('logs')) {
      const logsContent = fs.readdirSync('logs');
      if (logsContent.length === 0) {
        fs.rmdirSync('logs');
        console.log('🗑️ Directorio logs vacío eliminado');
      } else {
        console.log('📁 Directorio logs mantenido (contiene archivos)');
      }
    }
    
    console.log('🎉 Configuración de desarrollo restaurada exitosamente!');
    console.log('🚀 Para desarrollo: npm run dev');
    
  } catch (error) {
    console.error('❌ Error al restaurar configuración:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  restoreDevelopmentConfig();
}

module.exports = { restoreDevelopmentConfig };
