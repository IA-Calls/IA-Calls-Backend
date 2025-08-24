// Ejemplo de monitoreo de batch calls usando Server-Sent Events (SSE)
// Este ejemplo muestra cómo implementar el monitoreo en tiempo real en el frontend

// Función principal para iniciar y monitorear un batch call con SSE
async function startBatchCallWithSSE(groupId, userId, phoneNumberId) {
  console.log('🚀 Iniciando batch call con monitoreo SSE...');

  try {
    // 1. Iniciar el batch call
    const response = await fetch(`/api/groups/${groupId}/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        agentPhoneNumberId: phoneNumberId
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Batch call iniciado:', result.message);
      console.log('📊 Datos del batch:', result.data);

      // 2. Iniciar monitoreo SSE inmediatamente
      const eventSource = startSSEMonitoring(result.data.batchId);
      
      return {
        batchId: result.data.batchId,
        eventSource: eventSource,
        batchData: result.data
      };

    } else {
      console.error('❌ Error iniciando batch call:', result.message);
      throw new Error(result.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Función para iniciar el monitoreo SSE
function startSSEMonitoring(batchId) {
  console.log(`🔄 Iniciando monitoreo SSE para batch: ${batchId}`);
  
  // Crear conexión EventSource
  const eventSource = new EventSource(`/api/batch-calls/${batchId}/status/stream`);
  
  // Estado del monitoreo
  let isConnected = false;
  let lastUpdate = null;
  
  // Manejar conexión establecida
  eventSource.addEventListener('connected', (event) => {
    const data = JSON.parse(event.data);
    isConnected = true;
    
    console.log('✅ Conexión SSE establecida');
    console.log(`   Batch ID: ${data.batchId}`);
    console.log(`   Timestamp: ${data.timestamp}`);
    
    // Actualizar UI
    updateConnectionStatus(true);
    showNotification('success', 'Monitoreo en tiempo real iniciado');
  });
  
  // Manejar actualizaciones de estado
  eventSource.addEventListener('status-update', (event) => {
    const data = JSON.parse(event.data);
    lastUpdate = data.timestamp;
    
    console.log('📊 Actualización recibida:', data.timestamp);
    console.log(`   Estado: ${data.data.status}`);
    
    if (data.data.recipients) {
      const stats = calculateBatchStats(data.data.recipients);
      console.log(`   Progreso: ${stats.completed}/${stats.total} (${stats.percentage}%)`);
      console.log(`   En progreso: ${stats.inProgress}`);
      console.log(`   Fallidas: ${stats.failed}`);
      
      // Actualizar UI con progreso
      updateBatchProgress(data.data, stats);
    }
  });
  
  // Manejar finalización del batch
  eventSource.addEventListener('batch-completed', (event) => {
    const data = JSON.parse(event.data);
    
    console.log('🎉 Batch call finalizado!');
    console.log(`   Estado final: ${data.finalStatus}`);
    console.log(`   Timestamp: ${data.timestamp}`);
    
    const finalStats = calculateBatchStats(data.data.recipients);
    console.log(`   Resultado final: ${finalStats.completed}/${finalStats.total} llamadas exitosas`);
    
    // Actualizar UI final
    onBatchCompleted(data.data, finalStats);
    
    // Cerrar conexión
    eventSource.close();
    updateConnectionStatus(false);
  });
  
  // Manejar errores específicos
  eventSource.addEventListener('error', (event) => {
    const data = JSON.parse(event.data);
    
    console.error('❌ Error en SSE:', data.message);
    console.error('   Error:', data.error);
    
    showNotification('error', `Error: ${data.message}`);
  });
  
  // Manejar timeout
  eventSource.addEventListener('timeout', (event) => {
    const data = JSON.parse(event.data);
    
    console.log('⏰ Timeout de conexión SSE');
    console.log('   Mensaje:', data.message);
    
    showNotification('warning', 'Conexión cerrada por timeout (30 min)');
    eventSource.close();
    updateConnectionStatus(false);
  });
  
  // Manejar errores de conexión generales
  eventSource.onerror = (error) => {
    console.error('❌ Error de conexión SSE:', error);
    
    if (isConnected) {
      showNotification('error', 'Conexión perdida con el servidor');
      
      // Intentar reconectar después de 5 segundos
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('🔄 Intentando reconectar...');
          showNotification('info', 'Reintentando conexión...');
          
          // Crear nueva conexión
          const newEventSource = startSSEMonitoring(batchId);
          return newEventSource;
        }
      }, 5000);
    }
  };
  
  // Limpiar al cerrar la página
  window.addEventListener('beforeunload', () => {
    console.log('🔌 Cerrando conexión SSE...');
    eventSource.close();
  });
  
  return eventSource;
}

// Función para calcular estadísticas del batch
function calculateBatchStats(recipients) {
  const total = recipients.length;
  const completed = recipients.filter(r => r.status === 'completed').length;
  const inProgress = recipients.filter(r => r.status === 'in_progress').length;
  const failed = recipients.filter(r => ['failed', 'cancelled'].includes(r.status)).length;
  const pending = recipients.filter(r => r.status === 'pending').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return {
    total,
    completed,
    inProgress,
    failed,
    pending,
    percentage
  };
}

// Función para actualizar el progreso en la UI
function updateBatchProgress(batchData, stats) {
  console.log(`📈 Actualizando progreso: ${stats.percentage}%`);
  
  // Actualizar barra de progreso
  const progressBar = document.getElementById('batch-progress');
  if (progressBar) {
    progressBar.style.width = `${stats.percentage}%`;
    progressBar.textContent = `${stats.completed}/${stats.total} completadas (${stats.percentage}%)`;
    progressBar.setAttribute('aria-valuenow', stats.percentage);
  }
  
  // Actualizar contadores detallados
  const counters = {
    'completed-count': stats.completed,
    'in-progress-count': stats.inProgress,
    'failed-count': stats.failed,
    'pending-count': stats.pending,
    'total-count': stats.total
  };
  
  Object.entries(counters).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
  
  // Actualizar estado general
  const statusElement = document.getElementById('batch-status');
  if (statusElement) {
    statusElement.textContent = batchData.status;
    statusElement.className = `status ${batchData.status}`;
  }
}

// Función para manejar la finalización del batch
function onBatchCompleted(batchData, stats) {
  console.log('🏁 Procesando finalización del batch...');
  
  // Actualizar botón
  const btn = document.getElementById('call-group-btn');
  if (btn) {
    btn.innerHTML = '✅ Llamadas Completadas';
    btn.classList.remove('btn-warning');
    btn.classList.add('btn-success');
    btn.disabled = false;
  }
  
  // Mostrar resumen final
  const summary = `
    📊 Resumen Final:
    • Total: ${stats.total} llamadas
    • Exitosas: ${stats.completed} (${stats.percentage}%)
    • Fallidas: ${stats.failed}
    • Estado: ${batchData.status}
  `;
  
  console.log(summary);
  showNotification('success', `Batch completado: ${stats.completed}/${stats.total} exitosas`);
  
  // Mostrar modal con detalles si existe
  showBatchSummaryModal(batchData, stats);
}

// Función para actualizar el estado de conexión
function updateConnectionStatus(connected) {
  const statusIndicator = document.getElementById('connection-status');
  if (statusIndicator) {
    statusIndicator.textContent = connected ? '🟢 Conectado' : '🔴 Desconectado';
    statusIndicator.className = connected ? 'connected' : 'disconnected';
  }
}

// Función para mostrar notificaciones
function showNotification(type, message) {
  console.log(`📢 ${type.toUpperCase()}: ${message}`);
  
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span class="icon">${getNotificationIcon(type)}</span>
    <span class="message">${message}</span>
  `;
  
  // Agregar al DOM
  const container = document.getElementById('notifications') || document.body;
  container.appendChild(notification);
  
  // Remover después de 5 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

// Función auxiliar para iconos de notificación
function getNotificationIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type] || 'ℹ️';
}

// Función para mostrar modal de resumen
function showBatchSummaryModal(batchData, stats) {
  // Implementar modal con detalles completos del batch
  console.log('📋 Mostrando resumen detallado...');
  
  // Ejemplo de estructura del modal
  const modalContent = {
    batchId: batchData.batch_id,
    status: batchData.status,
    stats: stats,
    recipients: batchData.recipients,
    duration: calculateBatchDuration(batchData),
    timestamp: new Date().toISOString()
  };
  
  console.log('📊 Datos del modal:', modalContent);
}

// Función auxiliar para calcular duración
function calculateBatchDuration(batchData) {
  // Implementar cálculo de duración basado en timestamps
  return 'N/A';
}

// Ejemplo de uso
console.log('📚 Ejemplo de SSE para Batch Calling cargado');
console.log('💡 Uso: startBatchCallWithSSE(groupId, userId, phoneNumberId)');

// Exportar funciones para uso global
if (typeof window !== 'undefined') {
  window.startBatchCallWithSSE = startBatchCallWithSSE;
  window.startSSEMonitoring = startSSEMonitoring;
}
