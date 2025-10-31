# 🔌 Implementación de WebSocket para Conversaciones ElevenLabs

## 📋 Resumen

Se ha implementado un sistema de **WebSocket persistente** para mantener conversaciones continuas con agentes de ElevenLabs después de las llamadas telefónicas.

---

## 🏗️ Arquitectura

### **Componentes Principales**

1. **`elevenlabsWebSocketService.js`**
   - Maneja conexiones WebSocket con ElevenLabs
   - Mantiene un mapa de conexiones activas por número de teléfono
   - Gestiona lifecycle de conexiones (abrir, mensaje, cerrar)

2. **`conversationService.js`** (Actualizado)
   - Inicia WebSocket cuando termina una llamada
   - Usa WebSocket para enviar/recibir mensajes
   - Guarda historial en BD

3. **`batchMonitoringService.js`** (Sin cambios)
   - Detecta llamadas finalizadas
   - Llama a `conversationService.handleCallCompleted()`

---

## 🔄 Flujo Completo

```
┌─────────────────┐
│  Llamada Inicia │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Llamada Termina │
└────────┬────────┘
         │
         v
┌──────────────────────────────────────┐
│ batchMonitoringService detecta       │
└────────┬─────────────────────────────┘
         │
         v
┌──────────────────────────────────────┐
│ conversationService.handleCallCompleted │
│ 1. Inicia WebSocket con agent_id    │
│ 2. Guarda conversation_id en BD      │
│ 3. Envía mensaje inicial por WhatsApp│
└────────┬─────────────────────────────┘
         │
         v
┌──────────────────────────────────────┐
│ Usuario responde por WhatsApp        │
└────────┬─────────────────────────────┘
         │
         v
┌──────────────────────────────────────┐
│ Twilio webhook → conversationService │
└────────┬─────────────────────────────┘
         │
         v
┌──────────────────────────────────────┐
│ conversationService:                 │
│ 1. Verifica WebSocket activo         │
│ 2. Envía mensaje al agente           │
│ 3. Recibe respuesta                  │
│ 4. Envía por WhatsApp                │
│ 5. Guarda en BD                      │
└──────────────────────────────────────┘
```

---

## 🔌 Detalles del WebSocket

### **Endpoint**

```
wss://api.elevenlabs.io/v1/convai/conversation?agent_id={agent_id}
```

### **Headers**

```javascript
{
  'xi-api-key': process.env.ELEVENLABS_API_KEY
}
```

### **Mensaje de Iniciación**

```json
{
  "type": "conversation_initiation",
  "conversation_config": {
    "conversation_id": "conv_xxx",
    "input_audio_format": null,
    "output_audio_format": null,
    "mode": "text"
  },
  "user": {
    "name": "Alejandro",
    "metadata": {
      "source": "whatsapp",
      "phone": "+573138539155"
    }
  }
}
```

### **Envío de Mensaje**

```json
{
  "type": "user_message",
  "message": "Hola, ¿cómo estás?"
}
```

### **Respuesta del Agente**

```json
{
  "type": "agent_response",
  "message": "¡Hola! Estoy bien, gracias. ¿En qué puedo ayudarte?"
}
```

---

## 💾 Base de Datos

### **Tabla: `conversation_state`**

```sql
CREATE TABLE conversation_state (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  client_name VARCHAR(255),
  elevenlabs_conversation_id VARCHAR(255), -- ID de WebSocket
  agent_id VARCHAR(255),
  batch_id VARCHAR(255),
  recipient_id VARCHAR(255),
  call_duration_secs INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  started_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP,
  message_count INTEGER DEFAULT 0
);
```

### **Tabla: `conversation_messages`**

```sql
CREATE TABLE conversation_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversation_state(id),
  direction VARCHAR(10), -- 'inbound' o 'outbound'
  content TEXT,
  twilio_message_id VARCHAR(255),
  sent_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 Características Clave

### ✅ **Conexiones Persistentes**

- WebSocket se mantiene abierto durante la conversación
- Se cierra automáticamente después de 30 minutos de inactividad
- Se puede reabrir automáticamente si el usuario vuelve a escribir

### ✅ **Manejo de Errores**

- Si WebSocket se cierra, se reinicia automáticamente en el próximo mensaje
- Mensajes de fallback si hay errores de conexión
- Timeout de 15 segundos para respuestas del agente

### ✅ **Múltiples Conversaciones**

- Cada número de teléfono tiene su propia conexión WebSocket
- El mapa `activeConnections` mantiene todas las conexiones activas
- Identificación por `phone_number`

### ✅ **Limpieza Automática**

- Conexiones inactivas se limpian cada 5 minutos
- Se cierran conexiones con más de 30 minutos sin actividad

---

## 🧪 Testing

### **Test Principal**

```bash
node scripts/test-websocket-flow.js
```

**Este test:**
1. ✅ Inicia una llamada real con ElevenLabs
2. ✅ Espera a que termine
3. ✅ Verifica que se envía mensaje WhatsApp
4. ✅ Espera tu respuesta en WhatsApp
5. ✅ Verifica que el agente responde correctamente

### **Verificar WebSocket Activo**

```javascript
const elevenlabsWebSocketService = require('./src/services/elevenlabsWebSocketService');

// Ver conexiones activas
console.log(elevenlabsWebSocketService.activeConnections);

// Verificar conexión específica
const hasConnection = elevenlabsWebSocketService.hasActiveConnection('+573138539155');

// Ver info de conexión
const info = elevenlabsWebSocketService.getConnectionInfo('+573138539155');
```

---

## 📝 Variables de Entorno

```bash
# ElevenLabs
ELEVENLABS_API_KEY=tu_clave_api

# Agente por defecto
DEFAULT_AGENT_ID=agent_4701k8fcsvhaes5s1h6tw894g98s

# Twilio
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Base de datos
DATABASE_URL=postgresql://...
```

---

## 🚀 Próximos Pasos

### **Mejoras Opcionales**

1. **Reconexión Automática**
   - Reintentar conexión WebSocket si falla
   - Exponential backoff

2. **Métricas**
   - Tiempo de respuesta del agente
   - Cantidad de mensajes por conversación
   - Tasa de error de WebSocket

3. **Panel de Admin**
   - Ver conversaciones activas
   - Cerrar conexiones manualmente
   - Ver logs de WebSocket

4. **Notificaciones**
   - Avisar cuando se cae una conexión
   - Alertas de timeout

---

## ⚠️ Consideraciones

### **Escalabilidad**

- Cada WebSocket consume una conexión persistente
- En producción, considerar:
  - Load balancer con sticky sessions
  - Redis para compartir estado entre instancias
  - Límite de conexiones simultáneas

### **Seguridad**

- API Key de ElevenLabs debe estar en variable de entorno
- Validar números de teléfono antes de crear conexión
- Limpiar datos sensibles de logs

### **Costos**

- Cada conversación activa consume recursos
- Limpieza automática ayuda a reducir costos
- Considerar límite de tiempo por conversación

---

## 📚 Referencias

- [ElevenLabs WebSocket Documentation](https://elevenlabs.io/docs/conversational-ai/websocket)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp/api)
- [Node.js ws Library](https://github.com/websockets/ws)

---

## ✅ Estado

**Implementación:** ✅ Completa
**Testing:** ⏳ Pendiente de prueba real
**Producción:** ⚠️ Revisar consideraciones de escalabilidad

---

¿Listo para probar? Ejecuta:

```bash
node scripts/test-websocket-flow.js
```

Y sigue las instrucciones en pantalla! 🚀

