// Ejemplo de uso de la funcionalidad de Batch Calling
require('dotenv').config();

const axios = require('axios');

// Configuración del servidor (ajustar según tu configuración)
const BASE_URL = 'http://localhost:5000/api';

// Ejemplo completo de uso de batch calling
async function batchCallingExample() {
  console.log('📞 Ejemplo de Batch Calling - IA-Calls\n');

  try {
    // Datos de ejemplo (ajustar según tu base de datos)
    const groupId = 55; // ID del grupo
    const userId = 19;  // ID del usuario
    const agentPhoneNumberId = 'ph_example123'; // ID del número telefónico del agente

    // 1. Preparar el agente con información del grupo
    console.log('1. 🤖 Preparando agente con información del grupo...');
    try {
      const prepareResponse = await axios.post(`${BASE_URL}/groups/${groupId}/prepare-agent`, {
        userId: userId
      });
      
      if (prepareResponse.data.success) {
        console.log('✅ Agente preparado exitosamente');
        console.log(`   Agente ID: ${prepareResponse.data.data.agentId}`);
        console.log(`   Grupo: ${prepareResponse.data.data.groupName}`);
      }
    } catch (error) {
      console.log('⚠️ Error preparando agente (continuando con el ejemplo):', error.response?.data?.message || error.message);
    }

    // 2. Iniciar las llamadas en masa
    console.log('\n2. 📞 Iniciando llamadas en masa...');
    try {
      const callResponse = await axios.post(`${BASE_URL}/groups/${groupId}/call`, {
        userId: userId,
        agentPhoneNumberId: agentPhoneNumberId,
        scheduledTimeUnix: null // null = inmediato
      });

      if (callResponse.data.success) {
        const batchData = callResponse.data.data;
        console.log('✅ Batch call iniciado exitosamente');
        console.log(`   Batch ID: ${batchData.batchId}`);
        console.log(`   Destinatarios: ${batchData.recipientsCount}`);
        console.log(`   Nombre: ${batchData.callName}`);

        // 3. Monitorear el progreso
        console.log('\n3. 📊 Monitoreando progreso...');
        await monitorBatchProgress(batchData.batchId);

      } else {
        console.log('❌ Error iniciando batch call:', callResponse.data.message);
      }

    } catch (error) {
      console.log('❌ Error en batch call:', error.response?.data?.message || error.message);
      
      // Si el error es por falta de número telefónico, mostrar ejemplo de gestión
      if (error.response?.status === 400) {
        console.log('\n💡 Ejemplo de gestión de batch calls existentes...');
        await showBatchManagementExample();
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Función para monitorear el progreso de un batch call
async function monitorBatchProgress(batchId, maxChecks = 5) {
  console.log(`   Monitoreando batch: ${batchId}`);
  
  for (let i = 0; i < maxChecks; i++) {
    try {
      const statusResponse = await axios.get(`${BASE_URL}/batch-calls/${batchId}/status`);
      
      if (statusResponse.data.success) {
        const batchData = statusResponse.data.data;
        console.log(`   Estado: ${batchData.status}`);
        
        if (batchData.recipients) {
          const completed = batchData.recipients.filter(r => r.status === 'completed').length;
          const total = batchData.recipients.length;
          console.log(`   Progreso: ${completed}/${total} llamadas completadas`);
        }

        // Si está completado, salir del loop
        if (['completed', 'cancelled', 'failed'].includes(batchData.status)) {
          console.log('✅ Batch call finalizado');
          break;
        }
      }

      // Esperar 3 segundos antes del siguiente check
      if (i < maxChecks - 1) {
        console.log('   Esperando 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.log(`   ⚠️ Error consultando estado: ${error.response?.data?.message || error.message}`);
      break;
    }
  }
}

// Ejemplo de gestión de batch calls (listar, reintentar, cancelar)
async function showBatchManagementExample() {
  try {
    // Listar batch calls existentes
    console.log('\n📋 Listando batch calls existentes...');
    const listResponse = await axios.get(`${BASE_URL}/batch-calls`);
    
    if (listResponse.data.success && listResponse.data.data.length > 0) {
      const batchCalls = listResponse.data.data;
      console.log(`✅ ${batchCalls.length} batch calls encontrados:`);
      
      batchCalls.slice(0, 3).forEach((batch, index) => {
        console.log(`   ${index + 1}. ${batch.call_name || batch.batch_id} - Estado: ${batch.status}`);
      });

      // Ejemplo de reintento con el primer batch call
      if (batchCalls.length > 0) {
        const firstBatch = batchCalls[0];
        console.log(`\n🔄 Ejemplo de reintento para: ${firstBatch.batch_id}`);
        
        try {
          const retryResponse = await axios.post(`${BASE_URL}/batch-calls/${firstBatch.batch_id}/retry`);
          if (retryResponse.data.success) {
            console.log('✅ Reintento iniciado exitosamente');
          }
        } catch (error) {
          console.log('⚠️ Error en reintento (esperado si ya está completado):', error.response?.data?.message);
        }

        // Ejemplo de cancelación (comentado para no afectar batch calls reales)
        /*
        console.log(`\n❌ Ejemplo de cancelación para: ${firstBatch.batch_id}`);
        try {
          const cancelResponse = await axios.post(`${BASE_URL}/batch-calls/${firstBatch.batch_id}/cancel`);
          if (cancelResponse.data.success) {
            console.log('✅ Batch call cancelado exitosamente');
          }
        } catch (error) {
          console.log('⚠️ Error en cancelación:', error.response?.data?.message);
        }
        */
      }

    } else {
      console.log('ℹ️ No se encontraron batch calls existentes');
    }

  } catch (error) {
    console.log('❌ Error en gestión de batch calls:', error.response?.data?.message || error.message);
  }
}

// Función auxiliar para mostrar el payload de ejemplo
function showExamplePayload() {
  console.log('\n📋 Ejemplo de payload para iniciar batch call:');
  console.log(JSON.stringify({
    userId: 19,
    agentPhoneNumberId: "ph_example123",
    scheduledTimeUnix: null
  }, null, 2));

  console.log('\n📋 Ejemplo de respuesta exitosa:');
  console.log(JSON.stringify({
    success: true,
    message: "Llamadas iniciadas exitosamente para el grupo \"Médicos Test\"",
    data: {
      batchId: "batch_12345",
      groupId: 55,
      groupName: "Médicos Test",
      agentId: "agent_67890",
      recipientsCount: 15,
      callName: "Llamada Médicos Test - 24/8/2025"
    }
  }, null, 2));
}

// Ejecutar ejemplo
console.log('🚀 Iniciando ejemplo de Batch Calling...');
console.log('💡 Asegúrate de que el servidor esté corriendo en http://localhost:5000\n');

// Mostrar payload de ejemplo
showExamplePayload();

// Ejecutar ejemplo completo
batchCallingExample().then(() => {
  console.log('\n🏁 Ejemplo completado');
  console.log('\n📚 Para más información, consulta: docs/batch-calling-functionality.md');
}).catch(error => {
  console.error('\n❌ Error ejecutando ejemplo:', error.message);
});
