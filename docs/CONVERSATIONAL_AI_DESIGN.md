# Diseño de Conversaciones Continuas con IA

## 🎯 Objetivo

Crear un sistema de conversación continua donde:
1. **ElevenLabs** realiza la llamada telefónica inicial
2. **WhatsApp** continúa la conversación después de la llamada
3. **Agente IA** mantiene contexto entre ambos canales

## 🏗️ Arquitecturas Posibles

### Opción 1: Conversación Multicanal con Contexto Compartido

```
┌─────────────────────────────────────────────────────────┐
│                    AGENTE IA CENTRAL                     │
│         (Mantiene contexto y memoria compartida)         │
└─────────────────────────────────────────────────────────┘
           ↓                                    ↓
    ┌──────────┐                          ┌──────────┐
    │ ElevenLabs│                          │ WhatsApp │
    │  (Voz)   │                          │  (Texto) │
    └──────────┘                          └──────────┘
         ↓                                      ↓
    [Llamada]                            [Mensajes]
         ↓                                      ↓
    👤 Cliente                            👤 Cliente
```

#### Flujo:
1. **Llamada Inicial (ElevenLabs)**
   - Cliente recibe llamada
   - Conversación por voz
   - Sistema extrae: intención, datos, resumen

2. **Transición Automática**
   - Llamada termina → WhatsApp se activa
   - Contexto de llamada se guarda en BD
   - Mensaje inicial incluye resumen

3. **Conversación WhatsApp**
   - Cliente responde por texto
   - IA mantiene contexto de la llamada
   - Puede escalar o completar acción

---

### Opción 2: Sistema de "Handoff" Inteligente

```
Llamada ElevenLabs
       ↓
 [Transcripción + Análisis]
       ↓
 Guardar en Base de Datos:
 - Intención del cliente
 - Temas discutidos
 - Preguntas pendientes
 - Sentimiento
       ↓
 Enviar WhatsApp con:
 - Resumen personalizado
 - Próximos pasos
 - Enlace a recursos
       ↓
 Cliente responde WhatsApp
       ↓
 IA recupera contexto de BD
       ↓
 Continúa conversación
```

---

### Opción 3: Agente Híbrido con Memoria Persistente

```javascript
// Estructura de memoria del agente
{
  clientId: "cliente_123",
  channels: [
    {
      type: "voice",
      platform: "elevenlabs",
      conversationId: "conv_xxx",
      timestamp: "2025-10-28T18:00:00Z",
      transcript: [...],
      summary: "Cliente interesado en producto X",
      intent: "cotización",
      sentiment: "positivo"
    },
    {
      type: "text",
      platform: "whatsapp",
      conversationId: "whatsapp_yyy",
      timestamp: "2025-10-28T18:05:00Z",
      messages: [...],
      lastMessage: "¿Cuál es el precio?",
      status: "active"
    }
  ],
  context: {
    productInterest: "Producto X",
    budget: "estimado $500",
    urgency: "media",
    nextAction: "enviar cotización"
  }
}
```

---

## 🔧 Implementación Recomendada

### 1. Crear Tabla de Conversaciones

```sql
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  client_phone VARCHAR(20) NOT NULL,
  client_name VARCHAR(255),
  
  -- Datos de la llamada
  elevenlabs_conversation_id VARCHAR(255),
  call_started_at TIMESTAMP,
  call_ended_at TIMESTAMP,
  call_duration_seconds INTEGER,
  call_transcript JSONB,
  call_summary TEXT,
  call_intent VARCHAR(100),
  call_sentiment VARCHAR(50),
  
  -- Datos de WhatsApp
  whatsapp_conversation_id VARCHAR(255),
  whatsapp_started_at TIMESTAMP,
  whatsapp_last_message_at TIMESTAMP,
  whatsapp_messages JSONB,
  whatsapp_status VARCHAR(50), -- active, closed, escalated
  
  -- Contexto compartido
  conversation_context JSONB,
  
  -- Metadatos
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Servicio de Gestión de Conversaciones

```javascript
// src/services/conversationManager.js

class ConversationManager {
  
  // Al finalizar llamada de ElevenLabs
  async saveCallContext(callData) {
    const context = {
      clientPhone: callData.phoneNumber,
      clientName: callData.clientName,
      elevenLabsConversationId: callData.conversationId,
      
      // Extraer de transcripción
      transcript: callData.transcript,
      summary: callData.analysis?.summary,
      intent: this.extractIntent(callData.transcript),
      sentiment: callData.analysis?.sentiment,
      
      // Temas clave mencionados
      topics: this.extractTopics(callData.transcript),
      
      // Preguntas sin responder
      pendingQuestions: this.extractPendingQuestions(callData.transcript),
      
      // Próximos pasos acordados
      nextSteps: this.extractNextSteps(callData.transcript)
    };
    
    await Conversation.create(context);
    return context;
  }
  
  // Al recibir mensaje de WhatsApp
  async getCallContext(phoneNumber) {
    const conversation = await Conversation.findByPhone(phoneNumber);
    
    if (!conversation) {
      return null;
    }
    
    return {
      hadCall: true,
      callSummary: conversation.call_summary,
      topics: conversation.conversation_context?.topics,
      intent: conversation.call_intent,
      pendingQuestions: conversation.conversation_context?.pendingQuestions,
      lastInteraction: conversation.call_ended_at
    };
  }
  
  // Generar mensaje de WhatsApp contextual
  formatWhatsAppMessage(context) {
    let message = `¡Hola ${context.clientName}! 👋\n\n`;
    
    if (context.summary) {
      message += `Hace un momento hablamos sobre: ${context.summary}\n\n`;
    }
    
    if (context.pendingQuestions?.length > 0) {
      message += `Preguntas que quedaron pendientes:\n`;
      context.pendingQuestions.forEach(q => {
        message += `• ${q}\n`;
      });
      message += `\n`;
    }
    
    if (context.nextSteps?.length > 0) {
      message += `Próximos pasos acordados:\n`;
      context.nextSteps.forEach(step => {
        message += `✓ ${step}\n`;
      });
      message += `\n`;
    }
    
    message += `¿En qué más puedo ayudarte? 😊`;
    
    return message;
  }
}
```

### 3. Integración con ElevenLabs Agent

```javascript
// src/agents/conversationalAgent.js

class ConversationalAgent {
  
  async createElevenLabsAgent(userId, context = {}) {
    const agentConfig = {
      name: `Agente ${context.clientName || 'IA'}`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: this.buildContextualPrompt(context)
          },
          // Configurar variables dinámicas
          first_message: context.firstMessage || "¡Hola! ¿Cómo puedo ayudarte?",
          language: "es"
        },
        tts: {
          voice_id: "pNInz6obpgDQGcFmaJgB",
          model_id: "eleven_turbo_v2_5"
        }
      }
    };
    
    return await elevenlabsService.createAgent(agentConfig);
  }
  
  buildContextualPrompt(context) {
    let prompt = `Eres un asistente de IA Calls. `;
    
    if (context.previousCall) {
      prompt += `Anteriormente tuviste una conversación telefónica donde se habló de: ${context.previousCall.summary}. `;
      prompt += `El cliente mostró interés en: ${context.previousCall.topics.join(', ')}. `;
    }
    
    prompt += `Tu objetivo es continuar ayudando al cliente de manera natural y contextual.`;
    
    return prompt;
  }
}
```

### 4. Webhook de WhatsApp para Respuestas

```javascript
// src/controllers/whatsapp.js

async handleIncomingMessage(req, res) {
  const { from, text, messageId } = req.body;
  
  // 1. Obtener contexto de llamada anterior
  const context = await conversationManager.getCallContext(from);
  
  // 2. Generar respuesta contextual
  const response = await this.generateContextualResponse(text, context);
  
  // 3. Enviar respuesta
  await twilioWhatsAppService.sendMessage(from, response);
  
  // 4. Guardar en conversación
  await conversationManager.saveWhatsAppMessage({
    phone: from,
    message: text,
    response: response,
    context: context
  });
  
  res.status(200).json({ success: true });
}

async generateContextualResponse(message, context) {
  // Opción A: Usar OpenAI con contexto
  const prompt = `
    Contexto de llamada anterior:
    - Resumen: ${context?.callSummary || 'No hay llamada previa'}
    - Intención: ${context?.intent || 'desconocida'}
    - Temas: ${context?.topics?.join(', ') || 'ninguno'}
    
    Mensaje del cliente: "${message}"
    
    Genera una respuesta natural y útil manteniendo el contexto.
  `;
  
  return await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
  });
  
  // Opción B: Usar lógica basada en reglas
  if (context?.intent === 'cotización') {
    return this.handleQuoteRequest(message, context);
  }
  // ... más lógica
}
```

---

## 🚀 Flujo Completo Paso a Paso

### Paso 1: Llamada Inicial
```javascript
// Cuando se inicia batch call
const batchResult = await elevenlabsService.submitBatchCall({
  recipients: [
    {
      phone_number: "+573138539155",
      variables: {
        name: "Alejandro",
        product: "Software IA",
        campaign: "octubre_2025"
      }
    }
  ]
});

// Monitoreo detecta llamada finalizada
// → Ya implementado en tu código actual
```

### Paso 2: Guardar Contexto
```javascript
// En sendWhatsAppAfterCall (modificado)
async sendWhatsAppAfterCall(recipient, batchData) {
  // Obtener transcripción
  const conversation = await this.getConversationDetails(
    recipient.conversation_id
  );
  
  // Guardar contexto en BD
  await conversationManager.saveCallContext({
    phoneNumber: recipient.phone_number,
    clientName: recipient.variables?.name,
    conversationId: recipient.conversation_id,
    transcript: conversation.data?.transcript,
    analysis: conversation.data?.analysis,
    metadata: recipient.variables
  });
  
  // Enviar WhatsApp contextual
  const context = await conversationManager.getCallContext(
    recipient.phone_number
  );
  
  const message = conversationManager.formatWhatsAppMessage(context);
  
  await this.whatsappService.sendMessage(
    recipient.phone_number,
    message,
    recipient.variables?.name
  );
}
```

### Paso 3: Recibir y Responder WhatsApp
```javascript
// Configurar webhook de Twilio
app.post('/api/webhook/twilio/incoming', async (req, res) => {
  const { From, Body, MessageSid } = req.body;
  
  // Obtener contexto
  const context = await conversationManager.getCallContext(From);
  
  // Generar respuesta
  const response = await conversationalAgent.generateResponse(Body, context);
  
  // Enviar respuesta
  await twilioWhatsAppService.sendMessage(From, response);
  
  // Guardar en BD
  await conversationManager.saveMessage({
    phone: From,
    direction: 'inbound',
    message: Body,
    messageSid: MessageSid
  });
  
  res.sendStatus(200);
});
```

---

## 📊 Modelo de Datos Completo

```javascript
// models/UnifiedConversation.js
class UnifiedConversation {
  static schema = {
    id: 'uuid',
    clientPhone: 'string',
    clientName: 'string',
    
    // Timeline de interacciones
    interactions: [
      {
        type: 'call' | 'whatsapp' | 'email' | 'sms',
        timestamp: 'datetime',
        platform: 'elevenlabs' | 'twilio' | ...,
        externalId: 'string',
        content: {
          // Para llamadas
          transcript: [],
          summary: 'string',
          duration: 'number',
          // Para mensajes
          messages: [],
          lastMessage: 'string'
        },
        metadata: {}
      }
    ],
    
    // Análisis acumulado
    analysis: {
      intents: ['cotización', 'soporte', ...],
      topics: ['precio', 'características', ...],
      sentiment: 'positivo' | 'neutral' | 'negativo',
      urgency: 'alta' | 'media' | 'baja',
      stage: 'prospecto' | 'interesado' | 'cliente'
    },
    
    // Próximas acciones
    nextActions: [
      {
        type: 'enviar_cotización' | 'hacer_seguimiento' | ...,
        priority: 'alta' | 'media' | 'baja',
        dueDate: 'datetime',
        status: 'pending' | 'completed'
      }
    ]
  }
}
```

---

## 💡 Recomendaciones

### Corto Plazo (1-2 semanas)
1. ✅ Crear tabla `conversations` en BD
2. ✅ Guardar contexto de llamadas finalizadas
3. ✅ Personalizar mensaje inicial de WhatsApp con contexto
4. ✅ Configurar webhook de Twilio para recibir respuestas

### Mediano Plazo (1 mes)
1. Implementar servicio de IA para respuestas automáticas
2. Crear dashboard de conversaciones activas
3. Sistema de alertas para conversaciones que requieren atención
4. Integración con CRM

### Largo Plazo (3 meses)
1. Agente IA multicanal unificado
2. Análisis predictivo de intenciones
3. Automatización completa de flujos comunes
4. A/B testing de estrategias conversacionales

---

## 🔗 Próximos Pasos Inmediatos

¿Qué te gustaría implementar primero?

1. **Sistema básico de memoria** - Guardar y recuperar contexto
2. **Webhook de WhatsApp** - Recibir y responder mensajes
3. **IA conversacional** - Respuestas automáticas con contexto
4. **Dashboard de conversaciones** - Ver el historial completo

Puedo ayudarte a implementar cualquiera de estas opciones. ¿Por cuál empezamos?

