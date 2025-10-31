# Usar Agente de ElevenLabs como Motor de IA

## 🎯 Concepto Clave

**El mismo agente que habla por teléfono puede responder por texto en WhatsApp**, manteniendo TODO el contexto de la conversación.

```
┌─────────────────────────────────────────┐
│     AGENTE ELEVENLABS (Cerebro IA)      │
│  - Prompt personalizado                 │
│  - Memoria de conversación              │
│  - Conocimiento del producto            │
└─────────────────────────────────────────┘
          ↓                    ↓
    [MODO VOZ]          [MODO TEXTO]
          ↓                    ↓
     📞 Llamada         💬 WhatsApp
          ↓                    ↓
       Cliente  ←──────────→  Cliente
       
    MISMO conversation_id = MISMO CONTEXTO
```

## 🔑 Cómo Funciona

### 1. ElevenLabs Conversational AI

ElevenLabs no solo hace TTS (text-to-speech), tiene un **motor conversacional completo**:

- **Agent**: Entidad con personalidad, conocimiento y memoria
- **Conversation**: Sesión de chat con contexto persistente
- **Mode**: Puede ser `voice` (llamada) o `text` (mensajes)

### 2. API de Conversación (No solo llamadas)

```javascript
// Iniciar conversación de TEXTO con el agente
POST https://api.elevenlabs.io/v1/convai/conversations/start
{
  "agent_id": "tu_agent_id",
  "mode": "text",  // ← IMPORTANTE: modo texto
  "message": "Hola, ¿me puedes ayudar con el precio?"
}

// Respuesta
{
  "conversation_id": "conv_123abc",
  "response": "¡Claro! Tenemos varios planes. ¿Qué producto te interesa?",
  "context": {
    "intent": "pricing_inquiry",
    "entities": ["precio", "plan"]
  }
}
```

### 3. Continuar Conversación Existente

```javascript
// Enviar otro mensaje a la MISMA conversación
POST https://api.elevenlabs.io/v1/convai/conversations/conv_123abc/message
{
  "message": "El plan premium",
  "mode": "text"
}

// El agente RECUERDA el contexto anterior
{
  "response": "Perfecto, el plan premium cuesta $99/mes e incluye...",
  "conversation_id": "conv_123abc"
}
```

---

## 🔥 Integración Completa

### Paso 1: Crear Agente Multi-Modo

```javascript
// Crear agente que funcione en VOZ y TEXTO
const agentConfig = {
  name: "Agente Ventas IA Calls",
  conversation_config: {
    agent: {
      prompt: {
        prompt: `Eres un asistente de ventas de IA Calls.
        
        IMPORTANTE: Puedes comunicarte por:
        - Llamadas telefónicas (voz)
        - Mensajes de WhatsApp (texto)
        
        Mantén el mismo tono y contexto en ambos canales.
        
        Si el cliente pregunta por precios, ofrece:
        - Plan Básico: $49/mes
        - Plan Premium: $99/mes
        - Plan Empresarial: Personalizado
        
        Si el cliente llamó antes, recuerda lo que hablaron.`
      },
      first_message: "¡Hola! Soy tu asistente de IA Calls. ¿Cómo puedo ayudarte?",
      language: "es"
    },
    tts: {
      voice_id: "pNInz6obpgDQGcFmaJgB",
      model_id: "eleven_turbo_v2_5"
    }
  }
};

const agent = await elevenlabsService.createAgent(agentConfig);
// agent.agent_id = "agent_xyz789"
```

### Paso 2: Durante la Llamada (Ya lo tienes implementado)

```javascript
// Cuando haces batch call
const batchResult = await elevenlabsService.submitBatchCall({
  agent_id: "agent_xyz789",  // ← Mismo agente
  recipients: [
    {
      phone_number: "+573138539155",
      variables: {
        name: "Alejandro"
      }
    }
  ]
});

// Al finalizar la llamada, obtienes:
// - conversation_id: "conv_call_123"
// - transcript: [...]
// - El agente ya tiene contexto
```

### Paso 3: Continuar por WhatsApp (Nuevo)

```javascript
// En tu microservicio de WhatsApp
class ElevenLabsAgentService {
  
  /**
   * Enviar mensaje de WhatsApp al MISMO agente
   */
  async sendTextMessage(phoneNumber, message) {
    
    // 1. Buscar conversation_id de la llamada anterior
    const lastCall = await CallRecord.findOne({
      where: { phone_number: phoneNumber },
      order: [['created_at', 'DESC']]
    });
    
    const conversationId = lastCall?.elevenlabs_conversation_id;
    const agentId = lastCall?.agent_id || process.env.DEFAULT_AGENT_ID;
    
    // 2. Si hay conversation_id (hubo llamada), continuar esa conversación
    if (conversationId) {
      console.log(`✅ Continuando conversación ${conversationId} de llamada anterior`);
      
      return await this.continueConversation(conversationId, message);
    }
    
    // 3. Si no hay llamada anterior, iniciar nueva conversación
    else {
      console.log(`🆕 Iniciando nueva conversación por WhatsApp`);
      
      return await this.startNewConversation(agentId, message, phoneNumber);
    }
  }
  
  /**
   * Continuar conversación existente (de la llamada)
   */
  async continueConversation(conversationId, message) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/convai/conversations/${conversationId}/message`,
        {
          message: message,
          mode: 'text'  // Ahora es texto, no voz
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        response: response.data.response,
        conversationId: conversationId,
        hadPriorContext: true  // El agente recuerda la llamada!
      };
      
    } catch (error) {
      console.error('Error continuando conversación:', error.response?.data);
      
      // Si la conversación expiró, iniciar nueva
      if (error.response?.status === 404) {
        return await this.startNewConversation(null, message);
      }
      
      throw error;
    }
  }
  
  /**
   * Iniciar nueva conversación
   */
  async startNewConversation(agentId, message, phoneNumber = null) {
    try {
      // Obtener contexto adicional si existe
      let additionalContext = '';
      if (phoneNumber) {
        const previousInteractions = await this.getPreviousInteractions(phoneNumber);
        if (previousInteractions) {
          additionalContext = `\n\n[Contexto previo: ${previousInteractions}]`;
        }
      }
      
      const response = await axios.post(
        `${this.baseUrl}/convai/conversations/start`,
        {
          agent_id: agentId,
          message: message + additionalContext,
          mode: 'text',
          metadata: {
            channel: 'whatsapp',
            phone_number: phoneNumber
          }
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Guardar nuevo conversation_id para próximos mensajes
      if (phoneNumber) {
        await WhatsAppConversation.create({
          phone_number: phoneNumber,
          elevenlabs_conversation_id: response.data.conversation_id,
          agent_id: agentId
        });
      }
      
      return {
        success: true,
        response: response.data.response,
        conversationId: response.data.conversation_id,
        hadPriorContext: false
      };
      
    } catch (error) {
      console.error('Error iniciando conversación:', error.response?.data);
      throw error;
    }
  }
  
  /**
   * Obtener interacciones previas para contexto
   */
  async getPreviousInteractions(phoneNumber) {
    const lastCall = await CallRecord.findOne({
      where: { phone_number: phoneNumber },
      order: [['created_at', 'DESC']]
    });
    
    if (!lastCall) return null;
    
    const timeSince = Date.now() - new Date(lastCall.created_at).getTime();
    const hoursSince = Math.floor(timeSince / (1000 * 60 * 60));
    
    return `Hace ${hoursSince} horas tuviste una llamada telefónica donde se habló de: ${lastCall.summary}`;
  }
}
```

---

## 🎭 Ejemplo de Conversación Continua

### Escenario: Cliente Alejandro

#### 1. Llamada Telefónica (10:00 AM)
```
🤖 Agente: "Hola Alejandro, soy tu asistente de IA Calls. ¿En qué puedo ayudarte?"
👤 Alejandro: "Quiero saber los precios de sus planes"
🤖 Agente: "Claro, tenemos tres planes:
           - Básico: $49/mes
           - Premium: $99/mes  
           - Empresarial: Personalizado
           ¿Cuál te interesa?"
👤 Alejandro: "El premium suena bien, pero déjame pensarlo"
🤖 Agente: "Perfecto Alejandro, cuando quieras más info, escríbeme"

[Llamada termina]
[Se guarda: conversation_id = "conv_call_abc123"]
```

#### 2. Sistema Envía WhatsApp (10:05 AM)
```
🤖 (WhatsApp): "¡Hola Alejandro! 👋
                Hace un momento hablamos sobre los planes.
                Te interesaba el Premium ($99/mes).
                ¿Tienes alguna pregunta?"
```

#### 3. Cliente Responde por WhatsApp (2:30 PM)
```
👤 Alejandro: "Sí, ¿el plan premium incluye llamadas ilimitadas?"

[Tu microservicio recibe el mensaje]
[Busca conversation_id: "conv_call_abc123"]
[Envía al agente de ElevenLabs con mode: 'text']
```

#### 4. Agente Responde (con CONTEXTO de la llamada)
```javascript
// El agente RECUERDA que:
// - El cliente se llama Alejandro
// - Preguntó por precios en la llamada
// - Mostró interés en el plan Premium

Response del agente:
{
  "response": "¡Sí Alejandro! El plan Premium incluye:
               ✅ Llamadas ilimitadas
               ✅ 500 minutos de conversación IA
               ✅ Integración WhatsApp (como esta!)
               ✅ Soporte prioritario
               
               ¿Te gustaría que te envíe más detalles?",
  "conversation_id": "conv_call_abc123",
  "context": {
    "current_topic": "premium_plan_features",
    "customer_intent": "purchase_consideration",
    "mentioned_products": ["premium_plan"]
  }
}
```

---

## 💡 Ventajas de Usar ElevenLabs como Motor de IA

### ✅ Contexto Automático
- No necesitas programar lógica de conversación
- El agente mantiene memoria entre mensajes
- Entiende el flujo natural de la conversación

### ✅ Multimodal (Voz + Texto)
- Mismo agente para llamadas y WhatsApp
- Consistencia en respuestas
- Transiciones suaves entre canales

### ✅ NLU Incluido
- Entiende intenciones sin código adicional
- Extrae entidades automáticamente
- Maneja errores de forma natural

### ✅ Personalización
- Prompt personalizado por agente
- Variables dinámicas (nombre, producto, etc.)
- Puedes inyectar contexto adicional

---

## 🔧 Configuración Avanzada

### Inyectar Contexto Adicional

```javascript
// Antes de que el usuario envíe su mensaje, puedes agregar contexto
async addContextToConversation(conversationId, context) {
  // Opción 1: Mensaje del sistema (invisible para el usuario)
  await axios.post(
    `${this.baseUrl}/convai/conversations/${conversationId}/context`,
    {
      context: {
        type: 'system',
        data: {
          customer_tier: 'premium',
          previous_purchases: ['plan_basico'],
          account_balance: 150.00
        }
      }
    },
    { headers: { 'xi-api-key': this.apiKey } }
  );
  
  // Opción 2: Mensaje oculto al prompt
  const systemMessage = `[INFO INTERNA - No mencionar al cliente]:
    - Cliente VIP
    - Compró plan básico hace 3 meses
    - Saldo actual: $150
    - Ofrecer descuento del 20% si pregunta por upgrade`;
  
  await axios.post(
    `${this.baseUrl}/convai/conversations/${conversationId}/message`,
    {
      message: systemMessage,
      mode: 'text',
      visibility: 'agent_only'
    },
    { headers: { 'xi-api-key': this.apiKey } }
  );
}
```

### Detectar Intenciones y Escalar

```javascript
async processMessageWithIntent(conversationId, message) {
  const response = await this.continueConversation(conversationId, message);
  
  // Analizar la respuesta del agente
  const intent = response.context?.intent;
  
  // Escalar si es necesario
  if (intent === 'complaint' || intent === 'refund_request') {
    console.log('⚠️ Escalando a humano...');
    
    await this.notifyHumanAgent({
      conversationId: conversationId,
      issue: intent,
      urgency: 'high'
    });
    
    return {
      ...response,
      escalated: true,
      message: 'He notificado a un especialista que se comunicará contigo pronto.'
    };
  }
  
  return response;
}
```

### Actualizar Agente Dinámicamente

```javascript
// Puedes cambiar el comportamiento del agente sobre la marcha
async updateAgentPrompt(agentId, newPrompt) {
  await axios.patch(
    `${this.baseUrl}/convai/agents/${agentId}`,
    {
      conversation_config: {
        agent: {
          prompt: {
            prompt: newPrompt
          }
        }
      }
    },
    { headers: { 'xi-api-key': this.apiKey } }
  );
  
  console.log('✅ Prompt del agente actualizado');
}

// Ejemplo: Agregar promoción temporal
const promoPrompt = `${originalPrompt}

PROMOCIÓN ACTIVA (Solo hoy):
- 30% descuento en plan Premium
- Mencionar: "Por tiempo limitado, el plan Premium está a solo $69/mes"`;

await updateAgentPrompt(agentId, promoPrompt);
```

---

## 📊 Monitoreo y Análisis

### Obtener Historial de Conversación

```javascript
async getConversationHistory(conversationId) {
  const response = await axios.get(
    `${this.baseUrl}/convai/conversations/${conversationId}`,
    { headers: { 'xi-api-key': this.apiKey } }
  );
  
  return {
    messages: response.data.messages,
    summary: response.data.summary,
    intents: response.data.detected_intents,
    entities: response.data.extracted_entities,
    sentiment: response.data.sentiment_analysis
  };
}
```

### Métricas del Agente

```javascript
async getAgentMetrics(agentId, dateRange) {
  // Consultar todas las conversaciones del agente
  const conversations = await Conversation.findAll({
    where: {
      agent_id: agentId,
      created_at: {
        $between: [dateRange.start, dateRange.end]
      }
    }
  });
  
  return {
    totalConversations: conversations.length,
    avgMessagesPerConversation: conversations.reduce((sum, c) => sum + c.message_count, 0) / conversations.length,
    channels: {
      voice: conversations.filter(c => c.source === 'call').length,
      whatsapp: conversations.filter(c => c.source === 'whatsapp').length
    },
    outcomes: {
      completed: conversations.filter(c => c.status === 'completed').length,
      escalated: conversations.filter(c => c.status === 'escalated').length
    }
  };
}
```

---

## 🎯 Resumen

### El Flujo Completo

```
1. Crear Agente ElevenLabs
   ↓
2. Usar agente en batch call (modo voz)
   - Guardar conversation_id
   ↓
3. Al finalizar llamada
   - Sistema envía mensaje inicial por WhatsApp
   ↓
4. Cliente responde por WhatsApp
   ↓
5. Microservicio recibe mensaje
   ↓
6. Buscar conversation_id de la llamada
   ↓
7. Continuar MISMA conversación (modo texto)
   - El agente recuerda TODO
   ↓
8. Agente genera respuesta contextual
   ↓
9. Enviar respuesta por WhatsApp
   ↓
10. Repetir 4-9 hasta que conversación termine
```

### Código Simplificado

```javascript
// Al recibir mensaje de WhatsApp
const handleWhatsAppMessage = async (from, message) => {
  
  // 1. Buscar llamada anterior
  const call = await CallRecord.findLast(from);
  
  // 2. Enviar al agente de ElevenLabs
  const response = await axios.post(
    `https://api.elevenlabs.io/v1/convai/conversations/${call.conversation_id}/message`,
    { message, mode: 'text' },
    { headers: { 'xi-api-key': ELEVENLABS_API_KEY } }
  );
  
  // 3. Enviar respuesta por WhatsApp
  await twilioService.sendMessage(from, response.data.response);
};
```

---

## ✅ Ventajas vs Alternativas

| Característica | ElevenLabs Agent | OpenAI/Claude | Custom NLU |
|---|---|---|---|
| Contexto voz + texto | ✅ Nativo | ❌ Manual | ❌ Complejo |
| Setup inicial | ✅ Minutos | ⚠️ Horas | ❌ Semanas |
| Costo | ⚠️ Medio | ⚠️ Medio | ✅ Bajo |
| Personalización | ✅ Alta | ✅ Muy Alta | ✅ Total |
| Mantenimiento | ✅ Bajo | ⚠️ Medio | ❌ Alto |

---

## 🚀 Recomendación

**Usa ElevenLabs como motor de IA** porque:

1. Ya lo tienes configurado
2. Contexto automático entre llamada y WhatsApp
3. Menos código que mantener
4. Respuestas más naturales
5. Fácil de escalar

**Crea el microservicio de WhatsApp** porque:

1. Maneja procesamiento asíncrono
2. No sobrecarga tu backend principal
3. Fácil de monitorear y debuggear
4. Puede escalar independientemente
5. Mejor organización del código

---

## 📝 Próximos Pasos

1. ¿Quieres que implemente el servicio de ElevenLabs conversacional?
2. ¿Necesitas el microservicio completo?
3. ¿Probamos primero con un endpoint simple?

¡Dime y empezamos! 🔥

