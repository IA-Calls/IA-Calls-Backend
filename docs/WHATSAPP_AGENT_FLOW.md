# 🔄 Flujo de Agentes en WhatsApp - Mantenimiento de Conversación

## ✅ Sí, el agente mantiene la conversación automáticamente

Una vez que asignas un agente a una conversación, **el sistema mantiene el contexto y responde automáticamente** a todos los mensajes futuros.

---

## 🔄 Flujo Completo

### 1. Asignar Agente a Conversación

```javascript
PUT /api/whatsapp/conversations/573138539155/agent
{
  "agent_id": "uuid-del-agente"
}
```

**Lo que sucede:**
- Se guarda el `agent_id` en la tabla `conversations`
- El agente queda vinculado a ese número de teléfono
- **A partir de este momento, el agente responderá automáticamente**

---

### 2. Primer Mensaje Después de Asignar Agente

Cuando el usuario envía el primer mensaje después de asignar el agente:

1. **Webhook recibe el mensaje** → `POST /api/whatsapp/webhook`
2. **Sistema detecta agente asignado** → Verifica `conversations.agent_id`
3. **Inicia conversación en ElevenLabs** → Crea nueva conversación con el agente
4. **Guarda `elevenlabs_conversation_id`** → En `conversations.metadata`
5. **Procesa mensaje con agente** → Envía mensaje a ElevenLabs
6. **Obtiene respuesta del agente** → ElevenLabs genera respuesta
7. **Envía respuesta automáticamente** → Por WhatsApp al usuario
8. **Guarda respuesta en MongoDB** → Para historial completo

---

### 3. Mensajes Siguientes (Mantiene Contexto)

Cuando el usuario envía mensajes siguientes:

1. **Webhook recibe el mensaje**
2. **Sistema detecta agente asignado**
3. **Reutiliza `elevenlabs_conversation_id`** → Del `metadata` guardado
4. **Envía mensaje a la misma conversación** → Mantiene el contexto
5. **Agente responde con contexto** → Recuerda mensajes anteriores
6. **Envía respuesta automáticamente**

**✨ El contexto se mantiene porque:**
- Se usa el mismo `conversation_id` de ElevenLabs
- ElevenLabs mantiene el historial de la conversación
- El agente tiene acceso a todos los mensajes previos

---

## 📋 Ejemplo Práctico

### Paso 1: Asignar Agente
```javascript
// Asignar agente a la conversación
PUT /api/whatsapp/conversations/573138539155/agent
{
  "agent_id": "abc-123"
}

// Respuesta:
{
  "success": true,
  "message": "Agente asignado exitosamente. El agente responderá automáticamente a los mensajes futuros."
}
```

### Paso 2: Usuario Envía Mensaje
```
Usuario: "Hola, ¿qué productos tienen?"
```

**Sistema automáticamente:**
1. Detecta agente asignado
2. Inicia conversación en ElevenLabs (si es primera vez)
3. Procesa mensaje con agente
4. Agente responde: "¡Hola! Tenemos varios productos disponibles..."
5. Envía respuesta por WhatsApp

### Paso 3: Usuario Envía Otro Mensaje
```
Usuario: "¿Cuáles son los precios?"
```

**Sistema automáticamente:**
1. Detecta agente asignado
2. **Reutiliza la misma conversación** de ElevenLabs (mantiene contexto)
3. Agente recuerda que hablaban de productos
4. Agente responde: "Los precios de nuestros productos son..."
5. Envía respuesta por WhatsApp

**✨ El agente mantiene el contexto porque usa la misma conversación de ElevenLabs**

---

## 🔍 Verificación del Estado

### Ver si una conversación tiene agente asignado:

```javascript
GET /api/whatsapp/conversations/573138539155

// Respuesta incluye:
{
  "data": {
    "phoneNumber": "573138539155",
    "agent": {
      "id": "abc-123",
      "name": "Agente de Soporte",
      "agent_id": "agent_xxx", // ID de ElevenLabs
      "text_only": true
    },
    "messages": [...]
  }
}
```

---

## ⚙️ Configuración Técnica

### Base de Datos

**Tabla `conversations`:**
- `agent_id` → UUID del agente asignado
- `metadata` → JSONB que contiene:
  ```json
  {
    "elevenlabs_conversation_id": "conv_xxx"
  }
  ```

### Flujo en el Código

1. **Webhook recibe mensaje** (`src/controllers/whatsapp.js`)
2. **Verifica agente asignado** → `ConversationPG.findByPhoneWithAgent()`
3. **Procesa con agente** → `whatsappAgentService.processMessageWithAgent()`
4. **Mantiene contexto** → Reutiliza `elevenlabs_conversation_id` del `metadata`
5. **Envía respuesta** → Automáticamente por WhatsApp

---

## ✅ Características

- ✅ **Respuestas automáticas**: El agente responde sin intervención manual
- ✅ **Contexto persistente**: Mantiene el historial de la conversación
- ✅ **Misma conversación**: Reutiliza `conversation_id` de ElevenLabs
- ✅ **Sin límite de mensajes**: Puede mantener conversaciones largas
- ✅ **Historial completo**: Guarda todos los mensajes en MongoDB

---

## 🚨 Notas Importantes

1. **Primera vez**: Cuando se asigna el agente, la conversación en ElevenLabs se crea con el primer mensaje
2. **Contexto**: El contexto se mantiene mientras se use el mismo `conversation_id`
3. **Persistencia**: El `elevenlabs_conversation_id` se guarda en `metadata` y se reutiliza
4. **Sin intervención**: Una vez asignado, todo es automático

---

## 🎯 Resumen

**Sí, el agente mantiene la conversación automáticamente:**

1. ✅ Se asigna el agente → Queda vinculado a la conversación
2. ✅ Primer mensaje → Crea conversación en ElevenLabs y guarda el ID
3. ✅ Mensajes siguientes → Reutiliza el mismo ID, mantiene contexto
4. ✅ Respuestas automáticas → El agente responde sin intervención
5. ✅ Contexto persistente → Recuerda toda la conversación anterior

**Todo funciona automáticamente una vez asignado el agente.** 🚀

