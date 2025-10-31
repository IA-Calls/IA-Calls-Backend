/**
 * Forzar Monitoreo Manual
 * Ejecuta una verificación inmediata de todos los batches
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('\n⚡ ===== FORZANDO MONITOREO MANUAL =====\n');

async function forzarMonitoreo() {
  try {
    // Cargar el servicio de monitoreo (es un singleton, ya está instanciado)
    const batchMonitoringService = require('../src/services/batchMonitoringService');
    
    console.log('🔍 Ejecutando verificación manual de todos los batches...\n');
    
    // Ejecutar el check de todos los batches
    await batchMonitoringService.checkAllBatches();
    
    console.log('\n✅ Verificación completada');
    console.log('📱 Si había llamadas finalizadas, deberías recibir WhatsApp ahora\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error ejecutando monitoreo:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

forzarMonitoreo();

