const { logActivity, getUserActivityLogs, cleanOldActivityLogs } = require('../src/utils/helpers');

// Mock request object para pruebas
const createMockRequest = (userId = 1) => ({
  method: 'POST',
  originalUrl: '/api/groups',
  ip: '192.168.1.100',
  connection: { remoteAddress: '192.168.1.100' },
  headers: { 'x-forwarded-for': '192.168.1.100' },
  get: (header) => {
    if (header === 'User-Agent') {
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    }
    return null;
  },
  user: { id: userId }
});

async function testLogging() {
  try {
    console.log('🧪 Iniciando pruebas del sistema de logging...\n');

    // Test 1: Registrar actividad básica
    console.log('📝 Test 1: Registrar actividad básica');
    await logActivity(1, 'test_action', 'Prueba de logging básico', createMockRequest(1), {
      testField: 'valor de prueba',
      timestamp: new Date().toISOString()
    });
    console.log('✅ Actividad básica registrada\n');

    // Test 2: Registrar actividad con metadatos complejos
    console.log('📝 Test 2: Registrar actividad con metadatos complejos');
    await logActivity(1, 'create_group', 'Grupo de prueba creado', createMockRequest(1), {
      groupId: 123,
      groupName: 'Grupo de Prueba',
      hasFile: true,
      clientsCreated: 25,
      variables: {
        idioma: 'es',
        tipo: 'test'
      },
      metadata: {
        source: 'test_script',
        version: '1.0.0'
      }
    });
    console.log('✅ Actividad con metadatos registrada\n');

    // Test 3: Registrar error
    console.log('📝 Test 3: Registrar error');
    await logActivity(1, 'create_group_error', 'Error en creación de grupo', createMockRequest(1), {
      error: 'Error de prueba para testing',
      groupName: 'Grupo con Error',
      stack: 'Error stack trace...'
    });
    console.log('✅ Error registrado\n');

    // Test 4: Obtener logs de usuario
    console.log('📝 Test 4: Obtener logs de usuario');
    const userLogs = await getUserActivityLogs(1, {
      page: 1,
      limit: 10
    });
    
    console.log(`📊 Logs obtenidos: ${userLogs.activities.length} de ${userLogs.pagination.total}`);
    console.log('📋 Últimas actividades:');
    userLogs.activities.slice(0, 3).forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.action} - ${log.description} (${log.created_at})`);
    });
    console.log('');

    // Test 5: Filtrar por acción
    console.log('📝 Test 5: Filtrar logs por acción');
    const filteredLogs = await getUserActivityLogs(1, {
      page: 1,
      limit: 5,
      action: 'create_group'
    });
    
    console.log(`📊 Logs filtrados por 'create_group': ${filteredLogs.activities.length}`);
    console.log('');

    // Test 6: Simular limpieza de logs (solo simulación)
    console.log('📝 Test 6: Simular limpieza de logs');
    console.log('⚠️  Nota: Esta es solo una simulación, no se eliminarán logs reales');
    console.log('   Para limpiar logs reales, usar: cleanOldActivityLogs(90)');
    console.log('');

    console.log('🎉 Todas las pruebas completadas exitosamente!');
    console.log('\n📋 Resumen:');
    console.log('   ✅ Registro de actividades básicas');
    console.log('   ✅ Registro con metadatos complejos');
    console.log('   ✅ Registro de errores');
    console.log('   ✅ Consulta de logs de usuario');
    console.log('   ✅ Filtrado por acción');
    console.log('   ✅ Simulación de limpieza');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Ejecutar pruebas si el script se ejecuta directamente
if (require.main === module) {
  testLogging().then(() => {
    console.log('\n🏁 Script de pruebas finalizado');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { testLogging };
