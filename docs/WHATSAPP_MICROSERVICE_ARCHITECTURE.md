# Arquitectura del Microservicio de WhatsApp

## 🎯 Objetivo

Microservicio independiente que:
1. Recibe mensajes de WhatsApp (webhook de Twilio)
2. Mantiene conversaciones activas con contexto
3. Usa agente de ElevenLabs como motor de IA
4. Procesa mensajes de forma asíncrona
5. Notifica al sistema principal cuando sea necesario

---

## 📁 Estructura del Microservicio

```
whatsapp-service/
├── src/
│   ├── server.js                    # Express server
│   ├── config/
│   │   ├── database.js              # Conexión a BD
│   │   ├── twilio.js                # Config Twilio
│   │   └── elevenlabs.js            # Config ElevenLabs
│   ├── controllers/
│   │   ├── webhookController.js     # Recibe mensajes de Twilio
│   │   └── conversationController.js # Gestiona conversaciones
│   ├── services/
│   │   ├── twilioService.js         # Envía/recibe WhatsApp
│   │   ├── elevenlabsAgentService.js # Comunica con agente IA
│   │   ├── queueService.js          # Cola de mensajes (Bull)
│   │   └── conversationService.js   # Lógica de conversación
│   ├── models/
│   │   ├── Conversation.js          # Modelo de conversación
│   │   └── Message.js               # Modelo de mensaje
│   ├── workers/
│   │   └── messageWorker.js         # Procesa mensajes async
│   └── utils/
│       └── logger.js                # Logs estructurados
├── package.json
├── .env
└── README.md
```

---

## 🔧 Implementación Paso a Paso

### 1. Crear Proyecto del Microservicio

```bash
mkdir whatsapp-service
cd whatsapp-service
npm init -y

npm install express dotenv twilio axios bull redis
npm install mongoose  # Si usas MongoDB
# O: npm install pg sequelize  # Si usas PostgreSQL
```

### 2. Configuración Básica (`server.js`)

```javascript
const express = require('express');
const dotenv = require('dotenv');
const webhookRoutes = require('./routes/webhook');
const conversationRoutes = require('./routes/conversation');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; // Puerto diferente al principal

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'whatsapp-microservice' });
});

// Routes
app.use('/webhook/twilio', webhookRoutes);
app.use('/api/conversations', conversationRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Microservicio WhatsApp corriendo en puerto ${PORT}`);
});

module.exports = app;
```

### 3. Servicio de Cola Asíncrona (`services/queueService.js`)

```javascript
const Queue = require('bull');
const redis = require('redis');

// Cola de mensajes entrantes
const messageQueue = new Queue('whatsapp-messages', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

class QueueService {
  
  // Agregar mensaje a la cola
  async addMessage(messageData) {
    const job = await messageQueue.add('process-message', messageData, {
      attempts: 3, // Reintentar 3 veces si falla
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
    
    console.log(`📥 Mensaje agregado a cola: Job ID ${job.id}`);
    return job;
  }
  
  // Procesar mensajes de la cola
  processMessages(handler) {
    messageQueue.process('process-message', async (job) => {
      console.log(`⚙️ Procesando mensaje: Job ID ${job.id}`);
      return await handler(job.data);
    });
    
    // Eventos
    messageQueue.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completado`);
    });
    
    messageQueue.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} falló:`, err.message);
    });
  }
  
  // Obtener estadísticas
  async getStats() {
    return {
      waiting: await messageQueue.getWaitingCount(),
      active: await messageQueue.getActiveCount(),
      completed: await messageQueue.getCompletedCount(),
      failed: await messageQueue.getFailedCount()
    };
  }
}

module.exports = new QueueService();
```

### 4. Servicio del Agente ElevenLabs (`services/elevenlabsAgentService.js`)

**CLAVE: Usar el mismo agente para mantener contexto**

```javascript
const axios = require('axios');

class ElevenLabsAgentService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
  }
  
  /**
   * Enviar mensaje de texto al agente de ElevenLabs
   * El agente responde como lo haría en una llamada
   */
  async sendMessageToAgent(agentId, message, conversationId = null) {
    try {
      // Si hay conversationId, continuamos la conversación existente
      // Si no, iniciamos una nueva
      
      const endpoint = conversationId 
        ? `${this.baseUrl}/convai/conversations/${conversationId}/message`
        : `${this.baseUrl}/convai/conversations/start`;
      
      const payload = conversationId 
        ? {
            message: message,
            mode: 'text' // Modo texto en lugar de voz
          }
        : {
            agent_id: agentId,
            message: message,
            mode: 'text',
            metadata: {
              channel: 'whatsapp',
              timestamp: new Date().toISOString()
            }
          };
      
      const response = await axios.post(endpoint, payload, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      return {
        success: true,
        response: response.data.response, // Respuesta del agente
        conversationId: response.data.conversation_id,
        context: response.data.context // Contexto actualizado
      };
      
    } catch (error) {
      console.error('Error comunicando con agente ElevenLabs:', error.response?.data || error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Obtener el agente asociado a un cliente/grupo
   */
  async getAgentForClient(clientPhone) {
    // Consultar BD para obtener el agentId usado en la llamada
    // O usar un agente por defecto
    
    // Por ahora, retornamos el agentId desde env o BD
    return process.env.DEFAULT_AGENT_ID || 'agent_xxx';
  }
  
  /**
   * Obtener contexto de conversación anterior (de la llamada)
   */
  async getCallContext(phoneNumber) {
    try {
      // Buscar en tu BD la última llamada de este número
      // Retornar el conversation_id de ElevenLabs
      
      const lastCall = await CallRecord.findOne({
        where: { phone_number: phoneNumber },
        order: [['created_at', 'DESC']]
      });
      
      if (lastCall && lastCall.elevenlabs_conversation_id) {
        return {
          hasContext: true,
          conversationId: lastCall.elevenlabs_conversation_id,
          agentId: lastCall.agent_id,
          callSummary: lastCall.summary
        };
      }
      
      return { hasContext: false };
      
    } catch (error) {
      console.error('Error obteniendo contexto:', error);
      return { hasContext: false };
    }
  }
  
  /**
   * Enviar contexto adicional al agente antes del mensaje
   */
  async injectContext(conversationId, context) {
    try {
      // Inyectar información adicional al agente
      // Ej: "El cliente llamó hace 10 minutos y preguntó sobre precios"
      
      const systemMessage = `[CONTEXTO]: ${context}`;
      
      return await this.sendMessageToAgent(null, systemMessage, conversationId);
      
    } catch (error) {
      console.error('Error inyectando contexto:', error);
      return { success: false };
    }
  }
}

module.exports = new ElevenLabsAgentService();
```

### 5. Servicio de Conversación (`services/conversationService.js`)

```javascript
const elevenlabsAgentService = require('./elevenlabsAgentService');
const twilioService = require('./twilioService');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

class ConversationService {
  
  /**
   * Procesar mensaje entrante de WhatsApp
   */
  async processIncomingMessage(messageData) {
    const { from, body, messageId, timestamp } = messageData;
    
    try {
      console.log(`\n📨 Procesando mensaje de ${from}: "${body}"`);
      
      // 1. Buscar o crear conversación
      let conversation = await Conversation.findOne({
        where: { 
          phone_number: from,
          status: 'active'
        }
      });
      
      if (!conversation) {
        conversation = await this.createConversation(from);
      }
      
      // 2. Guardar mensaje entrante
      await Message.create({
        conversation_id: conversation.id,
        direction: 'inbound',
        content: body,
        whatsapp_message_id: messageId,
        timestamp: timestamp
      });
      
      // 3. Obtener contexto de llamada anterior (si existe)
      const callContext = await elevenlabsAgentService.getCallContext(from);
      
      // 4. Enviar mensaje al agente de ElevenLabs
      const agentId = callContext.agentId || 
                     await elevenlabsAgentService.getAgentForClient(from);
      
      const conversationId = callContext.conversationId || 
                            conversation.elevenlabs_conversation_id;
      
      // Si hay contexto de llamada, inyectarlo primero
      if (callContext.hasContext && callContext.callSummary) {
        await elevenlabsAgentService.injectContext(
          conversationId,
          `Llamada anterior: ${callContext.callSummary}`
        );
      }
      
      // Enviar mensaje del usuario al agente
      const agentResponse = await elevenlabsAgentService.sendMessageToAgent(
        agentId,
        body,
        conversationId
      );
      
      if (!agentResponse.success) {
        throw new Error('Error obteniendo respuesta del agente');
      }
      
      // 5. Actualizar conversation_id si es nueva
      if (!conversation.elevenlabs_conversation_id) {
        await conversation.update({
          elevenlabs_conversation_id: agentResponse.conversationId
        });
      }
      
      // 6. Enviar respuesta por WhatsApp
      const response = agentResponse.response;
      await twilioService.sendMessage(from, response);
      
      // 7. Guardar mensaje saliente
      await Message.create({
        conversation_id: conversation.id,
        direction: 'outbound',
        content: response,
        timestamp: new Date()
      });
      
      // 8. Actualizar última actividad
      await conversation.update({
        last_message_at: new Date(),
        message_count: conversation.message_count + 2 // Entrada + salida
      });
      
      console.log(`✅ Conversación procesada exitosamente`);
      
      return {
        success: true,
        response: response,
        conversationId: conversation.id
      };
      
    } catch (error) {
      console.error(`❌ Error procesando mensaje:`, error);
      
      // Enviar mensaje de error al usuario
      await twilioService.sendMessage(
        from,
        'Disculpa, tuve un problema procesando tu mensaje. ¿Puedes intentar de nuevo?'
      );
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Crear nueva conversación
   */
  async createConversation(phoneNumber) {
    return await Conversation.create({
      phone_number: phoneNumber,
      status: 'active',
      started_at: new Date(),
      message_count: 0
    });
  }
  
  /**
   * Iniciar conversación después de llamada
   */
  async startPostCallConversation(data) {
    const { phoneNumber, clientName, callSummary, agentId, conversationId } = data;
    
    try {
      // 1. Crear registro de conversación
      const conversation = await Conversation.create({
        phone_number: phoneNumber,
        client_name: clientName,
        elevenlabs_conversation_id: conversationId,
        agent_id: agentId,
        status: 'active',
        started_at: new Date(),
        call_summary: callSummary,
        source: 'post_call'
      });
      
      // 2. Enviar mensaje inicial
      const initialMessage = `¡Hola ${clientName}! 👋\n\n` +
        `Hace un momento hablamos sobre: ${callSummary}\n\n` +
        `¿En qué más puedo ayudarte?`;
      
      await twilioService.sendMessage(phoneNumber, initialMessage, clientName);
      
      // 3. Guardar mensaje
      await Message.create({
        conversation_id: conversation.id,
        direction: 'outbound',
        content: initialMessage,
        timestamp: new Date()
      });
      
      console.log(`✅ Conversación post-llamada iniciada para ${clientName}`);
      
      return { success: true, conversationId: conversation.id };
      
    } catch (error) {
      console.error('Error iniciando conversación post-llamada:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Cerrar conversación inactiva
   */
  async closeInactiveConversations() {
    const inactiveTime = 24 * 60 * 60 * 1000; // 24 horas
    const cutoff = new Date(Date.now() - inactiveTime);
    
    const updated = await Conversation.update(
      { status: 'closed' },
      {
        where: {
          status: 'active',
          last_message_at: { $lt: cutoff }
        }
      }
    );
    
    console.log(`🔒 ${updated} conversaciones cerradas por inactividad`);
    return updated;
  }
}

module.exports = new ConversationService();
```

### 6. Webhook Controller (`controllers/webhookController.js`)

```javascript
const queueService = require('../services/queueService');

class WebhookController {
  
  /**
   * Recibir mensaje de Twilio
   */
  async receiveMessage(req, res) {
    try {
      const { From, Body, MessageSid, Timestamp } = req.body;
      
      console.log(`📱 Webhook recibido de ${From}`);
      
      // Agregar a cola para procesamiento asíncrono
      await queueService.addMessage({
        from: From,
        body: Body,
        messageId: MessageSid,
        timestamp: Timestamp || new Date()
      });
      
      // Responder inmediatamente a Twilio
      res.status(200).send('OK');
      
    } catch (error) {
      console.error('Error en webhook:', error);
      res.status(500).send('Error');
    }
  }
  
  /**
   * Status callback de Twilio
   */
  async statusCallback(req, res) {
    const { MessageSid, MessageStatus } = req.body;
    
    console.log(`📊 Status: ${MessageSid} -> ${MessageStatus}`);
    
    // Actualizar estado en BD si es necesario
    
    res.status(200).send('OK');
  }
}

module.exports = new WebhookController();
```

### 7. Worker de Mensajes (`workers/messageWorker.js`)

```javascript
const queueService = require('../services/queueService');
const conversationService = require('../services/conversationService');

// Iniciar procesamiento de cola
queueService.processMessages(async (messageData) => {
  return await conversationService.processIncomingMessage(messageData);
});

console.log('🔧 Worker de mensajes iniciado');

// Limpiar conversaciones inactivas cada hora
setInterval(async () => {
  await conversationService.closeInactiveConversations();
}, 60 * 60 * 1000);
```

### 8. Modelos de Base de Datos

```javascript
// models/Conversation.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Conversation = sequelize.define('Conversation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false
    },
    client_name: DataTypes.STRING,
    
    // IDs de ElevenLabs
    elevenlabs_conversation_id: DataTypes.STRING,
    agent_id: DataTypes.STRING,
    
    // Contexto
    call_summary: DataTypes.TEXT,
    
    // Estado
    status: {
      type: DataTypes.ENUM('active', 'closed', 'escalated'),
      defaultValue: 'active'
    },
    source: {
      type: DataTypes.ENUM('post_call', 'inbound', 'manual'),
      defaultValue: 'inbound'
    },
    
    // Timestamps
    started_at: DataTypes.DATE,
    last_message_at: DataTypes.DATE,
    closed_at: DataTypes.DATE,
    
    // Contadores
    message_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  });
  
  return Conversation;
};

// models/Message.js
module.exports = (sequelize) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    direction: {
      type: DataTypes.ENUM('inbound', 'outbound'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    whatsapp_message_id: DataTypes.STRING,
    timestamp: DataTypes.DATE
  });
  
  return Message;
};
```

---

## 🔗 Integración con Sistema Principal

### En tu Backend Principal

```javascript
// Después de que termina la llamada
// batchMonitoringService.js

async sendWhatsAppToRecipient(recipient, batchData) {
  try {
    // ... código existente ...
    
    // Llamar al microservicio de WhatsApp
    await axios.post('http://localhost:3001/api/conversations/start-post-call', {
      phoneNumber: formattedPhone,
      clientName: clientName,
      callSummary: conversationSummary,
      agentId: batchData.agent_id,
      conversationId: recipient.conversation_id
    });
    
    console.log(`✅ Conversación delegada al microservicio WhatsApp`);
    
  } catch (error) {
    console.error('Error llamando microservicio WhatsApp:', error);
  }
}
```

---

## 🚀 Deployment

### Opción 1: Mismo Servidor, Puerto Diferente
```bash
# Backend principal: puerto 3000
# Microservicio WhatsApp: puerto 3001
pm2 start server.js --name backend-principal
pm2 start whatsapp-service/server.js --name whatsapp-service
```

### Opción 2: Servidores Separados
```bash
# Servidor 1: backend-principal.com
# Servidor 2: whatsapp.backend-principal.com
```

### Opción 3: Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3000:3000"
  
  whatsapp-service:
    build: ./whatsapp-service
    ports:
      - "3001:3001"
    depends_on:
      - redis
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

---

## 📊 Flujo Completo

```
1. Cliente recibe llamada de ElevenLabs
   ↓
2. Llamada termina, se guarda conversation_id
   ↓
3. Backend principal llama a microservicio WhatsApp
   POST /api/conversations/start-post-call
   ↓
4. Microservicio envía mensaje inicial por WhatsApp
   ↓
5. Cliente responde por WhatsApp
   ↓
6. Twilio envía webhook al microservicio
   POST /webhook/twilio/incoming
   ↓
7. Mensaje se agrega a cola Redis (asíncrono)
   ↓
8. Worker procesa mensaje
   ↓
9. Microservicio consulta agente ElevenLabs
   (Con el mismo conversation_id de la llamada!)
   ↓
10. Agente genera respuesta con contexto completo
   ↓
11. Microservicio envía respuesta por WhatsApp
   ↓
12. Se repite 5-11 hasta que conversación termine
```

---

## ✅ Ventajas de Esta Arquitectura

1. **Escalabilidad**: Procesa miles de mensajes simultáneos
2. **Resiliencia**: Si falla, los mensajes están en cola
3. **Contexto continuo**: Mismo agente de llamada → WhatsApp
4. **Mantenimiento**: Código separado, fácil de actualizar
5. **Monitoreo**: Logs y métricas independientes

---

## 🎯 Próximos Pasos

1. ¿Quieres que cree el microservicio completo?
2. ¿Prefieres integrarlo en el backend actual primero?
3. ¿Necesitas help con Redis/Bull para las colas?

¡Dime y empezamos! 🚀

