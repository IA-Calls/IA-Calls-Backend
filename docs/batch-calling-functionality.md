# Funcionalidad de Llamadas en Masa (Batch Calling)

Esta funcionalidad permite realizar llamadas automáticas en masa a todos los clientes de un grupo utilizando la API de ElevenLabs.

## 🎯 Objetivo

Cuando un usuario presiona el botón "Llamar" en un grupo, el sistema:
1. Extrae automáticamente todos los clientes del grupo con números telefónicos válidos
2. Prepara los datos de cada cliente como variables para personalizar las llamadas
3. Inicia un batch call en ElevenLabs con el agente preparado del usuario
4. Proporciona herramientas para monitorear, reintentar y cancelar las llamadas

## 🔧 Endpoints Disponibles

### 1. Iniciar Llamadas en Masa

**POST `/api/groups/:id/call`**

Inicia llamadas automáticas a todos los clientes del grupo.

**Parámetros**:
- `id` (path): ID del grupo

**Body**:
```json
{
  "userId": 19,
  "agentPhoneNumberId": "ph_67890",
  "scheduledTimeUnix": null
}
```

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "message": "Llamadas iniciadas exitosamente para el grupo \"Médicos Test\"",
  "data": {
    "batchId": "batch_12345",
    "groupId": 55,
    "groupName": "Médicos Test",
    "agentId": "agent_67890",
    "recipientsCount": 15,
    "callName": "Llamada Médicos Test - 24/8/2025",
    "batchData": { /* Datos completos del batch de ElevenLabs */ }
  }
}
```

### 2. Consultar Estado de Batch Call

#### 2.1. Versión Tradicional (HTTP Request)

**GET `/api/batch-calls/:batchId/status`**

Obtiene el estado actual de un batch call en una sola consulta.

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "message": "Estado del batch call obtenido exitosamente",
  "data": {
    "batch_id": "batch_12345",
    "status": "in_progress",
    "recipients": [
      {
        "phone_number": "+573001112223",
        "status": "completed",
        "call_duration": 45,
        "variables": { "name": "Dr. García" }
      },
      {
        "phone_number": "+573004445556",
        "status": "in_progress",
        "variables": { "name": "Dra. Pérez" }
      }
    ]
  }
}
```

#### 2.2. Versión en Tiempo Real (Server-Sent Events)

**GET `/api/batch-calls/:batchId/status/stream`**

Establece una conexión SSE que envía actualizaciones automáticas del estado del batch call.

**Eventos SSE disponibles:**

- **`connected`**: Confirmación de conexión establecida
- **`status-update`**: Actualización del estado del batch call
- **`batch-completed`**: Batch call finalizado (completado/cancelado/fallido)
- **`error`**: Error en la consulta del estado
- **`timeout`**: Conexión cerrada por timeout (30 minutos)

**Ejemplo de eventos recibidos:**
```javascript
// Evento: connected
{
  "message": "Conexión SSE establecida",
  "batchId": "batch_12345",
  "timestamp": "2025-08-24T10:30:00.000Z"
}

// Evento: status-update
{
  "success": true,
  "data": {
    "batch_id": "batch_12345",
    "status": "in_progress",
    "recipients": [...]
  },
  "timestamp": "2025-08-24T10:30:03.000Z"
}

// Evento: batch-completed
{
  "message": "Batch call completed",
  "finalStatus": "completed",
  "data": {
    "batch_id": "batch_12345",
    "status": "completed",
    "recipients": [...]
  },
  "timestamp": "2025-08-24T10:35:00.000Z"
}
```

### 3. Listar Todos los Batch Calls

**GET `/api/batch-calls`**

Lista todos los batch calls del workspace para auditoría e histórico.

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "message": "Lista de batch calls obtenida exitosamente",
  "data": [
    {
      "batch_id": "batch_12345",
      "call_name": "Llamada Médicos Test - 24/8/2025",
      "status": "completed",
      "created_at": "2025-08-24T10:30:00Z",
      "recipients_count": 15
    }
  ]
}
```

### 4. Reintentar Llamadas Fallidas

**POST `/api/batch-calls/:batchId/retry`**

Reintenta automáticamente las llamadas que fallaron o no tuvieron respuesta.

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "message": "Batch call reintentado exitosamente",
  "data": {
    "batch_id": "batch_12345",
    "retried_count": 3,
    "status": "retrying"
  }
}
```

### 5. Cancelar Batch Call

**POST `/api/batch-calls/:batchId/cancel`**

Cancela un batch call en curso, deteniendo las llamadas pendientes.

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "message": "Batch call cancelado exitosamente",
  "data": {
    "batch_id": "batch_12345",
    "status": "cancelled",
    "cancelled_count": 8
  }
}
```

## 🔄 Flujo Completo de Uso

### 1. Preparación Previa
```bash
# 1. Preparar el agente con información del grupo
POST /api/groups/55/prepare-agent
{
  "userId": 19
}
```

### 2. Iniciar Llamadas
```bash
# 2. Iniciar las llamadas en masa
POST /api/groups/55/call
{
  "userId": 19,
  "agentPhoneNumberId": "ph_67890"
}
```

### 3. Monitoreo
```bash
# 3. Consultar estado periódicamente
GET /api/batch-calls/batch_12345/status
```

### 4. Gestión (Opcional)
```bash
# Reintentar fallidas
POST /api/batch-calls/batch_12345/retry

# O cancelar si es necesario
POST /api/batch-calls/batch_12345/cancel
```

## 📊 Datos de los Clientes

El sistema extrae automáticamente los siguientes datos de cada cliente del grupo:

```json
{
  "phone_number": "+573001112223",
  "variables": {
    "name": "Dr. García",
    "email": "garcia@hospital.com",
    "empresa": "Hospital Central",
    "cargo": "Cardiólogo",
    // Variables adicionales del grupo
    "especialidad": "Medicina General",
    "ciudad": "Barranquilla"
  }
}
```

### 📱 Formateo Automático de Números Telefónicos

El sistema aplica formateo automático a todos los números telefónicos para asegurar compatibilidad con ElevenLabs:

**Transformaciones aplicadas:**
- Limpia caracteres especiales (espacios, guiones, paréntesis)
- Agrega automáticamente el código de país **+57** (Colombia)
- Valida que el formato final sea `+57XXXXXXXXXX`

**Ejemplos de formateo:**
```
"3001234567"      → "+573001234567"
"300-123-4567"    → "+573001234567"
"(300) 123-4567"  → "+573001234567"
"57 300 123 4567" → "+573001234567"
"+573001234567"   → "+573001234567" (ya correcto)
```

**Ventajas:**
- ✅ **Compatibilidad**: Todos los números funcionan con ElevenLabs
- ✅ **Flexibilidad**: Acepta múltiples formatos de entrada
- ✅ **Consistencia**: Formato uniforme para todas las llamadas
- ✅ **Logs**: Muestra la transformación aplicada a cada número

## 🎨 Implementación en Frontend

### Botón "Llamar"

```html
<div class="group-actions">
  <button 
    id="call-group-btn" 
    class="btn btn-success"
    onclick="startGroupCall(groupId, userId, phoneNumberId)"
  >
    📞 Llamar
  </button>
</div>
```

### JavaScript para Iniciar Llamadas

```javascript
async function startGroupCall(groupId, userId, phoneNumberId) {
  try {
    // Mostrar loading
    const btn = document.getElementById('call-group-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Iniciando llamadas...';
    btn.disabled = true;

    // Iniciar batch call
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
      showNotification('success', result.message);
      
      // Mostrar detalles del batch
      showBatchDetails(result.data);
      
      // Cambiar botón a "Llamadas en Curso"
      btn.innerHTML = '📞 Llamadas en Curso';
      btn.classList.remove('btn-success');
      btn.classList.add('btn-warning');
      
      // Iniciar monitoreo del progreso con SSE
      startBatchMonitoringSSE(result.data.batchId);
      
    } else {
      showNotification('error', result.message);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }

  } catch (error) {
    console.error('Error:', error);
    showNotification('error', 'Error iniciando las llamadas');
    
    // Restaurar botón
    const btn = document.getElementById('call-group-btn');
    btn.innerHTML = '📞 Llamar';
    btn.disabled = false;
  }
}

// Monitorear progreso del batch call con Server-Sent Events (RECOMENDADO)
function startBatchMonitoringSSE(batchId) {
  console.log(`🔄 Iniciando monitoreo SSE para batch: ${batchId}`);
  
  // Crear conexión EventSource
  const eventSource = new EventSource(`/api/batch-calls/${batchId}/status/stream`);
  
  // Manejar conexión establecida
  eventSource.addEventListener('connected', (event) => {
    const data = JSON.parse(event.data);
    console.log('✅ Conexión SSE establecida:', data.message);
    showNotification('info', 'Monitoreo en tiempo real iniciado');
  });
  
  // Manejar actualizaciones de estado
  eventSource.addEventListener('status-update', (event) => {
    const data = JSON.parse(event.data);
    console.log('📊 Actualización de estado recibida:', data);
    
    if (data.success) {
      updateBatchProgress(data.data);
    }
  });
  
  // Manejar finalización del batch
  eventSource.addEventListener('batch-completed', (event) => {
    const data = JSON.parse(event.data);
    console.log('✅ Batch completado:', data);
    
    onBatchCompleted(data.data);
    eventSource.close();
  });
  
  // Manejar errores
  eventSource.addEventListener('error', (event) => {
    const data = JSON.parse(event.data);
    console.error('❌ Error en SSE:', data);
    showNotification('error', data.message || 'Error en el monitoreo');
  });
  
  // Manejar timeout
  eventSource.addEventListener('timeout', (event) => {
    const data = JSON.parse(event.data);
    console.log('⏰ Timeout SSE:', data.message);
    showNotification('warning', 'Conexión cerrada por timeout');
    eventSource.close();
  });
  
  // Manejar errores de conexión
  eventSource.onerror = (error) => {
    console.error('❌ Error de conexión SSE:', error);
    showNotification('error', 'Error de conexión con el servidor');
    
    // Reconectar después de 5 segundos si es necesario
    setTimeout(() => {
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('🔄 Reintentando conexión SSE...');
        startBatchMonitoringSSE(batchId);
      }
    }, 5000);
  };
  
  // Cerrar conexión cuando se cierre la página
  window.addEventListener('beforeunload', () => {
    eventSource.close();
  });
  
  return eventSource;
}

// Monitorear progreso del batch call (versión tradicional con polling)
async function startBatchMonitoringPolling(batchId) {
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`/api/batch-calls/${batchId}/status`);
      const result = await response.json();
      
      if (result.success) {
        updateBatchProgress(result.data);
        
        // Detener monitoreo si está completado
        if (['completed', 'cancelled', 'failed'].includes(result.data.status)) {
          clearInterval(interval);
          onBatchCompleted(result.data);
        }
      }
    } catch (error) {
      console.error('Error monitoreando batch:', error);
    }
  }, 5000); // Consultar cada 5 segundos
}

function updateBatchProgress(batchData) {
  // Actualizar UI con progreso
  const progressBar = document.getElementById('batch-progress');
  const completed = batchData.recipients.filter(r => r.status === 'completed').length;
  const total = batchData.recipients.length;
  const percentage = (completed / total) * 100;
  
  progressBar.style.width = `${percentage}%`;
  progressBar.textContent = `${completed}/${total} completadas`;
}

function onBatchCompleted(batchData) {
  // Restaurar botón y mostrar resultados
  const btn = document.getElementById('call-group-btn');
  btn.innerHTML = '✅ Llamadas Completadas';
  btn.classList.remove('btn-warning');
  btn.classList.add('btn-success');
  btn.disabled = false;
  
  showBatchResults(batchData);
}
```

### CSS para Estados del Botón

```css
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

#batch-progress {
  background-color: #007bff;
  color: white;
  text-align: center;
  line-height: 30px;
  height: 30px;
  border-radius: 15px;
  transition: width 0.3s ease;
}
```

## 📈 Monitoreo y Análisis

### Estados de Llamadas Individuales
- `pending`: Llamada en cola
- `in_progress`: Llamada en curso
- `completed`: Llamada completada exitosamente
- `failed`: Llamada falló
- `cancelled`: Llamada cancelada

### Estados de Batch Call
- `pending`: Batch en cola
- `in_progress`: Batch ejecutándose
- `completed`: Todas las llamadas completadas
- `partially_completed`: Algunas llamadas completadas
- `failed`: Batch falló completamente
- `cancelled`: Batch cancelado

## 🔒 Seguridad y Validaciones

- ✅ **Validación de usuario**: Solo usuarios con agente asignado
- ✅ **Validación de grupo**: Grupo debe existir y tener clientes
- ✅ **Validación de teléfonos**: Solo clientes con números válidos
- ✅ **Número telefónico requerido**: ID del número del agente obligatorio
- ✅ **Logs detallados**: Monitoreo completo de todas las operaciones

## 💡 Casos de Uso

1. **Campañas de Marketing**: Llamar a todos los clientes de un segmento
2. **Recordatorios**: Notificar citas o eventos importantes
3. **Encuestas**: Realizar encuestas telefónicas automatizadas
4. **Seguimiento**: Contactar clientes para seguimiento post-venta
5. **Emergencias**: Notificaciones urgentes a grupos específicos

## 📊 **Datos Enriquecidos Automáticamente**

### 🔍 **Procesamiento Inteligente de Conversaciones**

El sistema ahora enriquece automáticamente cada `recipient` completado con datos detallados de la conversación:

**📝 Transcripción y Análisis:**
- `summary`: Resumen automático de la conversación generado por IA
- `duration_secs`: Duración exacta de la llamada en segundos
- `transcript`: Array con mensajes simplificados (role + message)

**🎵 Audio:**
- `audio_url`: URL directa para descargar/reproducir el audio de la conversación

### ✅ **Ejemplo de Respuesta Enriquecida**

```json
{
  "success": true,
  "message": "Estado del batch call obtenido exitosamente",
  "data": {
    "id": "btcal_12345",
    "name": "Llamada Medicos Test 2 - 14/1/2025",
    "status": "completed",
    "agent_id": "agent_xxx",
    "recipients": [
      {
        "id": "rcpt_67890",
        "phone_number": "+573001234567",
        "status": "completed",
        "conversation_id": "conv_abc123",
        "summary": "El usuario contactó para consultar sobre servicios médicos disponibles. Se proporcionó información detallada sobre especialidades y horarios de atención.",
        "duration_secs": 45,
        "transcript": [
          { "role": "user", "message": "Hola, ¿con quién hablo?" },
          { "role": "agent", "message": "Hola, soy tu asistente médico virtual de IA-Calls..." },
          { "role": "user", "message": "Necesito información sobre consultas de cardiología." },
          { "role": "agent", "message": "Por supuesto, tenemos especialistas en cardiología disponibles..." }
        ],
        "audio_url": "https://api.elevenlabs.io/v1/convai/conversations/conv_abc123/audio"
      }
    ]
  }
}
```

### ⚡ **Características del Enriquecimiento**

- **🎯 Selectivo**: Solo procesa recipients con `status: "completed"` y `conversation_id`
- **🛡️ Robusto**: Si falla una conversación, continúa con las demás
- **📊 Transparente**: Logs detallados del proceso de enriquecimiento
- **🚀 Automático**: Funciona tanto en endpoints tradicionales como SSE
- **💾 Eficiente**: Cachea datos para evitar consultas repetitivas

### 🔄 **Flujo de Enriquecimiento**

1. **Obtener estado básico** del batch call desde ElevenLabs
2. **Identificar recipients completados** con conversation_id
3. **Consultar detalles** de cada conversación:
   - `GET /v1/convai/conversations/{conversation_id}` → Transcripción y análisis
   - Generar URL de audio → `audio_url`
4. **Combinar datos** y enviar respuesta enriquecida al frontend

## 🚀 Beneficios

- **Automatización**: Sin intervención manual para cada llamada
- **Escalabilidad**: Maneja cientos de llamadas simultáneamente
- **Personalización**: Cada llamada incluye datos específicos del cliente
- **Monitoreo**: Seguimiento en tiempo real del progreso
- **Flexibilidad**: Reintentar, cancelar o programar llamadas
- **Eficiencia**: Reduce tiempo y recursos significativamente
- **📊 Análisis Completo**: Transcripciones, resúmenes y audios automáticos
- **🎵 Acceso a Audio**: URLs directas para reproducir conversaciones
