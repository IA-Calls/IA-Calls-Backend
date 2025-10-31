/**
 * Verificar si el BatchMonitoringService está activo
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('\n🔍 ===== VERIFICACIÓN DE MONITOREO =====\n');

async function verificarMonitoreo() {
  try {
    const batchMonitoringService = require('../src/services/batchMonitoringService');
    
    console.log('📊 Estado del servicio de monitoreo:\n');
    console.log(`   ⏰ Intervalo: ${batchMonitoringService.intervalId ? 'ACTIVO' : 'INACTIVO'}`);
    console.log(`   📋 Batches procesados: ${batchMonitoringService.processedCalls ? batchMonitoringService.processedCalls.size : 0}`);
    
    if (batchMonitoringService.intervalId) {
      console.log('\n✅ El servicio de monitoreo ESTÁ CORRIENDO\n');
    } else {
      console.log('\n⚠️  El servicio de monitoreo NO está corriendo\n');
      console.log('💡 Iniciando servicio manualmente...\n');
      batchMonitoringService.start();
      console.log('✅ Servicio iniciado\n');
    }
    
    console.log('🔄 Forzando revisión inmediata...\n');
    await batchMonitoringService.checkAllBatches();
    
    console.log('\n✅ Revisión completada\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verificarMonitoreo();


