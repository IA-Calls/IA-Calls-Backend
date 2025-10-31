# Microservicio WhatsApp - Especificación de API

## 🎯 Propósito

Recibir notificaciones cuando termina una llamada de ElevenLabs y continuar la conversación por WhatsApp usando el mismo agente de IA.

---

## 📡 Endpoints del Microservicio

### **Puerto:** 3001 (independiente del backend principal)

---

## 1. Notificar Llamada Terminada (CRÍTICO)

**Endpoint:** `POST /api/call-completed`

**Descripción:** El backend principal llama a este endpoint cuando detecta que una llamada finalizó.

**Request Body:**
```json
{
  "batch_id": "btcal_9201k8pjch8teq3t428mqt82xe3d",
  "agent_id": "agent_4701k8fcsvhaes5s1h6tw894g98s",
  "agent_name": "Agente Admin - test ana 4",
  "phone_number_id": "phnum_1401k8gyww19evptjqeqnm8hs3x5",
  "batch_name": "Llamada test ana 4 - 28/10/2025",
  "recipient": {
    "id": "rcpt_1901k8pjch8ve1c9v4d3jbmqamtn",
    "phone_number": "+573138539155",
    "status": "completed",
    "conversation_id": "conv_9601k8pjchj6fnvamdmbsvdq5ptv",
    "created_at_unix": 1761694074,
    "updated_at_unix": 1761694074
  },
  "call_metadata": {
    "client_name": "Ana García",
    "client_id": 42,
    "group_id": 5,
    "group_name": "Campaña Octubre"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Conversación iniciada exitosamente",
  "conversation_id": "conv_local_123",
  "whatsapp_message_id": "SM1234567890abcdef",
  "status": "message_sent"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Failed to send WhatsApp message",
  "details": "Phone number not whitelisted"
}
```

**Qué hace internamente:**
1. Guarda registro en BD (`conversation_state`)
2. Obtiene resumen de la llamada (opcional, vía API de ElevenLabs)
3. Formatea mensaje inicial personalizado
4. Envía mensaje por WhatsApp (Twilio)
5. Guarda `conversation_id` de ElevenLabs para continuidad
6. Retorna confirmación

---

## 2. Webhook de Twilio (CRÍTICO - Conversación Continua)

**Endpoint:** `POST /webhook/twilio/incoming`

**Descripción:** Twilio llama a este endpoint cuando el cliente responde por WhatsApp.

**Request Body (de Twilio):**
```
SmsMessageSid=SM1234567890abcdef
From=whatsapp:+573138539155
To=whatsapp:+14155238886
Body=Sí me interesa, ¿cuál es el precio?
MessageSid=SM0987654321fedcba
```

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

**Qué hace internamente:**
1. Extrae `From` (número del cliente) y `Body` (mensaje)
2. Busca `conversation_id` de ElevenLabs en BD
3. Llama a ElevenLabs Conversational AI API:
   ```
   POST https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}/message
   {
     "message": "Sí me interesa, ¿cuál es el precio?",
     "mode": "text"
   }
   ```
4. Obtiene respuesta del agente (mantiene contexto de la llamada)
5. Envía respuesta por WhatsApp
6. Guarda mensaje en BD
7. Retorna 200 OK a Twilio

---

## 3. Consultar Estado de Conversación

**Endpoint:** `GET /api/conversations/:phoneNumber`

**Descripción:** Consulta el estado actual de la conversación con un cliente.

**Request:**
```
GET /api/conversations/+573138539155
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "phone_number": "+573138539155",
    "client_name": "Ana García",
    "status": "active",
    "elevenlabs_conversation_id": "conv_9601k8pjchj6fnvamdmbsvdq5ptv",
    "agent_id": "agent_4701k8fcsvhaes5s1h6tw894g98s",
    "started_at": "2025-10-28T10:34:34Z",
    "last_message_at": "2025-10-28T10:45:12Z",
    "message_count": 5,
    "messages": [
      {
        "direction": "outbound",
        "content": "¡Hola Ana! Gracias por tu tiempo en la llamada...",
        "timestamp": "2025-10-28T10:34:34Z"
      },
      {
        "direction": "inbound",
        "content": "Sí me interesa, ¿cuál es el precio?",
        "timestamp": "2025-10-28T10:45:12Z"
      },
      {
        "direction": "outbound",
        "content": "El plan Premium cuesta $99/mes...",
        "timestamp": "2025-10-28T10:45:15Z"
      }
    ]
  }
}
```

---

## 4. Estadísticas del Microservicio

**Endpoint:** `GET /api/stats`

**Descripción:** Estadísticas del microservicio.

**Response:**
```json
{
  "success": true,
  "stats": {
    "active_conversations": 12,
    "total_conversations_today": 45,
    "messages_sent_today": 127,
    "messages_received_today": 89,
    "response_rate": 74.5,
    "avg_response_time_seconds": 45,
    "queue": {
      "waiting": 2,
      "active": 3,
      "completed": 120,
      "failed": 1
    }
  }
}
```

---

## 5. Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "service": "whatsapp-microservice",
  "version": "1.0.0",
  "uptime": 3600,
  "dependencies": {
    "database": "connected",
    "redis": "connected",
    "twilio": "ok",
    "elevenlabs": "ok"
  }
}
```

---

## 🔧 Configuración de Twilio

### Webhook URL para mensajes entrantes:
```
https://tu-servidor.com:3001/webhook/twilio/incoming
```

Configurar en: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sender

---

## 📊 Estructura de Base de Datos

### Tabla: `conversation_state`
```sql
CREATE TABLE conversation_state (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(50) UNIQUE NOT NULL,
  client_name VARCHAR(255),
  
  -- IDs de ElevenLabs
  elevenlabs_conversation_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  batch_id VARCHAR(255),
  recipient_id VARCHAR(255),
  
  -- Estado
  status VARCHAR(50) DEFAULT 'active', -- active, closed, escalated
  
  -- Contexto de la llamada
  call_summary TEXT,
  call_duration_secs INTEGER,
  
  -- Tracking
  started_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_conversation_state_phone ON conversation_state(phone_number);
CREATE INDEX idx_conversation_state_elevenlabs_conv_id ON conversation_state(elevenlabs_conversation_id);
CREATE INDEX idx_conversation_state_status ON conversation_state(status);
```

### Tabla: `conversation_messages`
```sql
CREATE TABLE conversation_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversation_state(id) ON DELETE CASCADE,
  
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  
  -- IDs externos
  twilio_message_id VARCHAR(255),
  elevenlabs_response JSONB,
  
  -- Timestamps
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX idx_conversation_messages_direction ON conversation_messages(direction);
CREATE INDEX idx_conversation_messages_sent_at ON conversation_messages(sent_at);
```

---

## 🔄 Flujo Completo (Diagrama)

```
Backend Principal (3000)               Microservicio WhatsApp (3001)
     │                                         │
     │ 1. Detecta llamada terminada           │
     │    (batchMonitoringService)            │
     │                                         │
     │──── POST /api/call-completed ─────────>│
     │    { batch_id, conversation_id, ... }  │
     │                                         │
     │                                         │ 2. Guarda en BD
     │                                         │ 3. Envía WhatsApp inicial
     │                                         │    "Hola Ana, gracias..."
     │                                         │
     │<──── { success: true } ────────────────│
     │                                         │
                                               │
                    Cliente responde WhatsApp  │
                    "Sí me interesa el precio" │
                                               │
                Twilio ─────────────────────> │
                POST /webhook/twilio/incoming  │
                                               │
                                               │ 4. Busca conversation_id
                                               │ 5. Llama a ElevenLabs:
                                               │    POST /convai/conversations/{id}/message
                                               │    { message: "...", mode: "text" }
                                               │
                                       ElevenLabs API
                                               │
                                               │<── Respuesta del agente
                                               │    "El plan cuesta $99/mes..."
                                               │
                                               │ 6. Envía respuesta por WhatsApp
                                               │ 7. Guarda en BD
                                               │
                    Cliente ────────────────── │ Mensaje enviado
                    
                    ... Conversación continúa ...
```

---

## 🚀 Ejemplo de Uso desde Backend Principal

```javascript
// En batchMonitoringService.js
async sendWhatsAppToRecipient(recipient, batchData) {
  try {
    const clientName = recipient.name || 
                      recipient.variables?.name || 
                      'Cliente';
    
    // Preparar datos para el microservicio
    const payload = {
      batch_id: batchData.id,
      agent_id: batchData.agent_id,
      agent_name: batchData.agent_name,
      phone_number_id: batchData.phone_number_id,
      batch_name: batchData.name,
      recipient: {
        id: recipient.id,
        phone_number: recipient.phone_number,
        status: recipient.status,
        conversation_id: recipient.conversation_id,
        created_at_unix: recipient.created_at_unix,
        updated_at_unix: recipient.updated_at_unix
      },
      call_metadata: {
        client_name: clientName,
        client_id: recipient.client_id,
        group_id: batchData.group_id,
        group_name: batchData.group_name || 'N/A'
      }
    };
    
    // Llamar al microservicio
    console.log(`📞 Notificando al microservicio WhatsApp...`);
    
    const response = await axios.post(
      'http://localhost:3001/api/call-completed',
      payload,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': process.env.MICROSERVICE_TOKEN // Seguridad
        }
      }
    );
    
    if (response.data.success) {
      console.log(`✅ Microservicio procesó exitosamente: ${clientName}`);
      console.log(`   WhatsApp Message ID: ${response.data.whatsapp_message_id}`);
      console.log(`   Conversation ID: ${response.data.conversation_id}`);
    } else {
      console.error(`❌ Error en microservicio:`, response.data.error);
    }
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ Error llamando al microservicio:`, error.message);
    
    // Si el microservicio falla, puedes tener un fallback
    // (enviar WhatsApp directamente desde aquí)
    
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

## 🔐 Seguridad

### Token de Autenticación entre Servicios
```javascript
// Backend principal
headers: {
  'X-Service-Token': process.env.MICROSERVICE_TOKEN
}

// Microservicio verifica el token
if (req.headers['x-service-token'] !== process.env.MICROSERVICE_TOKEN) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

---

## 📝 Variables de Entorno del Microservicio

```bash
# .env del microservicio
PORT=3001

# Twilio
TWILIO_ACCOUNT_SID=AC332953b4c00211a282b4c59d45faf749
TWILIO_AUTH_TOKEN=cfd6638b2384981c48edfe84835219da
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# ElevenLabs
ELEVENLABS_API_KEY=tu_api_key

# Base de Datos (puede ser la misma del backend principal)
DATABASE_URL=postgresql://user:password@localhost:5432/iacalls_db

# Redis (para cola de mensajes)
REDIS_HOST=localhost
REDIS_PORT=6379

# Seguridad
MICROSERVICE_TOKEN=tu_token_secreto_compartido_con_backend

# Backend Principal
BACKEND_URL=http://localhost:3000
```

---

## ✅ Checklist de Implementación

- [ ] Crear proyecto Node.js separado (puerto 3001)
- [ ] Implementar endpoint `POST /api/call-completed`
- [ ] Implementar endpoint `POST /webhook/twilio/incoming`
- [ ] Crear tablas `conversation_state` y `conversation_messages`
- [ ] Integrar Twilio WhatsApp Service
- [ ] Integrar ElevenLabs Conversational AI (modo texto)
- [ ] Configurar webhook en Twilio
- [ ] Implementar sistema de colas con Bull/Redis
- [ ] Modificar `batchMonitoringService` para llamar al microservicio
- [ ] Agregar token de seguridad
- [ ] Logging y monitoreo
- [ ] Pruebas end-to-end

---

## 🎯 Diferencias Clave con la Propuesta Inicial

| Propuesta Inicial | Nuestra Solución |
|---|---|
| `POST /api/traceability/create` (manual) | `POST /api/call-completed` (automático) |
| Sin webhook de respuestas | `POST /webhook/twilio/incoming` (crítico) |
| Sin integración con agente IA | Usa mismo `conversation_id` de ElevenLabs |
| Envío manual de WhatsApp | Sistema automático completo |
| Sin conversación continua | Conversación bidireccional infinita |

---

## 💡 Ventajas de Esta Arquitectura

1. ✅ **Automatización total** - Una vez configurado, funciona solo
2. ✅ **Continuidad de contexto** - Mismo agente de llamada a WhatsApp
3. ✅ **Escalable** - Cola de mensajes con Redis/Bull
4. ✅ **Independiente** - Microservicio puede reiniciarse sin afectar llamadas
5. ✅ **Trazabilidad** - Todo queda registrado en BD
6. ✅ **Flexible** - Puedes agregar más canales (SMS, Email, etc.)

