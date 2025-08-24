// Script para limpiar archivos antiguos de la carpeta uploads
// Ya que ahora todo se guarda en GCP, podemos eliminar los archivos locales

const fs = require('fs');
const path = require('path');

async function cleanupUploads() {
  try {
    console.log('🧹 === LIMPIEZA DE CARPETA UPLOADS ===\n');
    
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // Verificar si existe la carpeta
    if (!fs.existsSync(uploadsDir)) {
      console.log('✅ La carpeta uploads no existe, no hay nada que limpiar');
      return;
    }
    
    // Leer archivos en la carpeta
    const files = fs.readdirSync(uploadsDir);
    
    if (files.length === 0) {
      console.log('✅ La carpeta uploads está vacía');
      return;
    }
    
    console.log(`📁 Encontrados ${files.length} archivos en la carpeta uploads:`);
    
    let deletedCount = 0;
    let totalSize = 0;
    
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      
      console.log(`   📄 ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      
      // Eliminar archivo
      fs.unlinkSync(filePath);
      deletedCount++;
      totalSize += stats.size;
    }
    
    // Intentar eliminar la carpeta vacía
    try {
      fs.rmdirSync(uploadsDir);
      console.log(`\n🗑️  Carpeta uploads eliminada`);
    } catch (rmdirError) {
      console.log(`\n⚠️  No se pudo eliminar la carpeta uploads (puede que no esté vacía)`);
    }
    
    console.log(`\n✅ Limpieza completada:`);
    console.log(`   • Archivos eliminados: ${deletedCount}`);
    console.log(`   • Espacio liberado: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`\n💡 A partir de ahora, todos los archivos se guardan directamente en Google Cloud Storage`);
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  cleanupUploads().catch(console.error);
}

module.exports = { cleanupUploads };
