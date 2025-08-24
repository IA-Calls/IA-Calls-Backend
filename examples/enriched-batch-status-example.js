// Ejemplo de consulta de estado enriquecido de batch call
const axios = require('axios');

// Configuración
const API_BASE_URL = 'http://localhost:5000/api';
const BATCH_ID = 'btcal_1901k3d5p4kzf28a7t6ez8mjn78f'; // Reemplazar con ID real

async function consultarEstadoEnriquecido() {
  try {
    console.log('📊 === CONSULTA DE ESTADO ENRIQUECIDO ===\n');
    
    console.log(`🔍 Consultando estado del batch call: ${BATCH_ID}`);
    console.log(`📡 Endpoint: GET ${API_BASE_URL}/batch-calls/${BATCH_ID}/status\n`);
    
    const response = await axios.get(`${API_BASE_URL}/batch-calls/${BATCH_ID}/status`);
    
    if (response.data.success) {
      const batchData = response.data.data;
      
      console.log('✅ === DATOS DEL BATCH CALL ===');
      console.log(`📞 Nombre: ${batchData.name}`);
      console.log(`📊 Estado: ${batchData.status}`);
      console.log(`🤖 Agente: ${batchData.agent_id}`);
      console.log(`👥 Total destinatarios: ${batchData.recipients?.length || 0}\n`);
      
      // Analizar destinatarios
      if (batchData.recipients && batchData.recipients.length > 0) {
        console.log('📋 === ANÁLISIS DE DESTINATARIOS ===');
        
        const completed = batchData.recipients.filter(r => r.status === 'completed');
        const failed = batchData.recipients.filter(r => r.status === 'failed');
        const pending = batchData.recipients.filter(r => r.status === 'pending');
        const inProgress = batchData.recipients.filter(r => r.status === 'in_progress');
        
        console.log(`✅ Completadas: ${completed.length}`);
        console.log(`❌ Fallidas: ${failed.length}`);
        console.log(`⏳ Pendientes: ${pending.length}`);
        console.log(`🔄 En progreso: ${inProgress.length}\n`);
        
        // Mostrar detalles de conversaciones completadas
        if (completed.length > 0) {
          console.log('🎯 === CONVERSACIONES COMPLETADAS ===\n');
          
          completed.forEach((recipient, index) => {
            console.log(`📞 Llamada ${index + 1}:`);
            console.log(`   📱 Teléfono: ${recipient.phone_number}`);
            console.log(`   🆔 Conversación: ${recipient.conversation_id || 'N/A'}`);
            console.log(`   ⏱️ Duración: ${recipient.duration_secs || 'N/A'} segundos`);
            
            if (recipient.summary) {
              console.log(`   📝 Resumen: ${recipient.summary.substring(0, 100)}${recipient.summary.length > 100 ? '...' : ''}`);
            }
            
            if (recipient.transcript && recipient.transcript.length > 0) {
              console.log(`   💬 Mensajes: ${recipient.transcript.length}`);
              console.log(`   🗣️ Primer mensaje: "${recipient.transcript[0]?.message?.substring(0, 50)}${recipient.transcript[0]?.message?.length > 50 ? '...' : ''}"`);
            }
            
                         if (recipient.audio_url) {
               console.log(`   🎵 Audio: ${recipient.audio_size} bytes (${recipient.audio_content_type})`);
               console.log(`   📁 Archivo: ${recipient.audio_file_name}`);
               console.log(`   🔗 URL: ${recipient.audio_url.substring(0, 80)}...`);
               console.log(`   📅 Subido: ${recipient.uploaded_at}`);
             }
            
            console.log('');
          });
        }
        
        // Mostrar detalles de llamadas fallidas
        if (failed.length > 0) {
          console.log('❌ === LLAMADAS FALLIDAS ===\n');
          
          failed.forEach((recipient, index) => {
            console.log(`📞 Llamada fallida ${index + 1}:`);
            console.log(`   📱 Teléfono: ${recipient.phone_number}`);
            console.log(`   ❌ Estado: ${recipient.status}`);
            console.log('');
          });
        }
      }
      
      // Estadísticas finales
      console.log('📊 === ESTADÍSTICAS FINALES ===');
      const totalRecipients = batchData.recipients?.length || 0;
      const completedCount = batchData.recipients?.filter(r => r.status === 'completed').length || 0;
      const successRate = totalRecipients > 0 ? ((completedCount / totalRecipients) * 100).toFixed(1) : 0;
      
      console.log(`📈 Tasa de éxito: ${successRate}% (${completedCount}/${totalRecipients})`);
      
      const totalDuration = batchData.recipients
        ?.filter(r => r.duration_secs)
        .reduce((sum, r) => sum + (r.duration_secs || 0), 0) || 0;
      
      console.log(`⏱️ Tiempo total de conversaciones: ${totalDuration} segundos (${Math.round(totalDuration / 60)} minutos)`);
      
      const avgDuration = completedCount > 0 ? Math.round(totalDuration / completedCount) : 0;
      console.log(`📊 Duración promedio por llamada: ${avgDuration} segundos`);
      
    } else {
      console.error('❌ Error en la respuesta:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error consultando estado:', error.message);
    
    if (error.response) {
      console.error('📡 Código de estado:', error.response.status);
      console.error('📋 Datos del error:', error.response.data);
    }
  }
}

// Función para monitorear con SSE
function monitorearConSSE() {
  console.log('\n🔄 === MONITOREO CON SERVER-SENT EVENTS ===\n');
  console.log(`📡 Conectando a: ${API_BASE_URL}/batch-calls/${BATCH_ID}/status/stream`);
  console.log('💡 Tip: Usa este endpoint para recibir actualizaciones en tiempo real\n');
  
  // Ejemplo de código para el frontend
  console.log('📋 Código JavaScript para el frontend:');
  console.log(`
const eventSource = new EventSource('${API_BASE_URL}/batch-calls/${BATCH_ID}/status/stream');

eventSource.addEventListener('connected', (event) => {
  console.log('🔌 Conectado:', JSON.parse(event.data));
});

eventSource.addEventListener('status-update', (event) => {
  const data = JSON.parse(event.data);
  console.log('📊 Actualización:', data);
  
  // Aquí puedes actualizar tu UI con los datos enriquecidos
  updateBatchCallUI(data.data);
  
     // Ejemplo: Reproducir audio automáticamente
   data.data.recipients.forEach(recipient => {
     if (recipient.status === 'completed' && recipient.audio_url) {
       console.log('🎵 Audio disponible para:', recipient.phone_number);
       // const audio = new Audio(recipient.audio_url);
       // audio.play();
     }
   });
});

eventSource.addEventListener('batch-completed', (event) => {
  const data = JSON.parse(event.data);
  console.log('✅ Batch completado:', data);
  eventSource.close();
});

eventSource.addEventListener('error', (event) => {
  console.error('❌ Error SSE:', JSON.parse(event.data));
});
  `);
}

// Ejecutar ejemplo
async function ejecutarEjemplo() {
  console.log('🚀 Iniciando ejemplo de consulta de estado enriquecido...\n');
  
  await consultarEstadoEnriquecido();
  monitorearConSSE();
  
  console.log('\n🎯 === EJEMPLO COMPLETADO ===');
  console.log('💡 Los datos ahora incluyen transcripciones, resúmenes y URLs de audio automáticamente');
  console.log('🔄 Usa SSE para actualizaciones en tiempo real sin polling manual');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  ejecutarEjemplo().catch(console.error);
}

module.exports = {
  consultarEstadoEnriquecido,
  monitorearConSSE
};
