# ✅ Agente por Defecto Implementado

## 🎯 PROBLEMA RESUELTO

Cuando alguien escribía por WhatsApp **sin haber tenido una llamada previa**, el sistema no sabía qué agente de ElevenLabs usar para responder.

---

## ✅ SOLUCIÓN

Ahora el sistema:
1. ✅ Detecta cuando llega un mensaje sin conversación previa
2. ✅ Crea una nueva conversación con el **agente por defecto**
3. ✅ Guarda todo en la base de datos
4. ✅ Responde automáticamente con IA
5. ✅ Mantiene la conversación continua

---

## 🔧 CAMBIOS IMPLEMENTADOS

### **1. Nuevo Método en ElevenLabsService**

Archivo: `src/agents/elevenlabsService.js`

```javascript
async startConversation(agentId, firstMessage = null)
```

**Qué hace:**
- Inicia una nueva conversación de texto con un agente
- Opcionalmente envía el primer mensaje
- Retorna el `conversation_id` de ElevenLabs

---

### **2. Agente por Defecto en ConversationService**

Archivo: `src/services/conversationService.js`

```javascript
constructor() {
  this.whatsappService = new TwilioWhatsAppService();
  // Agente por defecto para nuevas conversaciones
  this.defaultAgentId = process.env.DEFAULT_AGENT_ID || 
                        'agent_4701k8fcsvhaes5s1h6tw894g98s';
}
```

**Qué hace:**
- Define el agente que se usará para conversaciones nuevas
- Se puede configurar vía variable de entorno
- Si no está definida, usa el agente por defecto

---

### **3. Lógica de Creación Automática**

Cuando llega un mensaje sin conversación previa:

```javascript
if (!conversation) {
  // Crear nueva conversación con agente por defecto
  const newConversation = await elevenlabsService.startConversation(
    this.defaultAgentId
  );
  
  // Guardar en BD
  // Continuar con el flujo normal
}
```

---

## 📝 CONFIGURACIÓN

### **1. Agregar Variable de Entorno**

En tu `.env`:

```env
DEFAULT_AGENT_ID=agent_4701k8fcsvhaes5s1h6tw894g98s
```

**Esto es opcional.** Si no la defines, usa el valor por defecto arriba.

---

### **2. Reiniciar Servidor**

```powershell
# Presiona Ctrl+C

# Reinicia:
npm run dev
```

Deberías ver:
```
💬 ConversationService inicializado
🤖 Agente por defecto: agent_4701k8fcsvhaes5s1h6tw894g98s
```

---

## 🧪 PRUEBAS

### **Test 1: Mensaje sin Llamada Previa**

```powershell
node scripts/test-whatsapp-sin-llamada.js
```

**Qué hace:**
1. Limpia conversaciones previas del número de prueba
2. Simula un mensaje entrante
3. Verifica que se cree la conversación automáticamente
4. Muestra los mensajes guardados en BD

**Resultado esperado:**
```
✅ CONVERSACIÓN CREADA:
   ID: 1
   Teléfono: +573138539155
   Cliente: Cliente
   Agente ID: agent_4701k8fcsvhaes5s1h6tw894g98s
   Conversation ID: conv_...
   Estado: active

✅ 2 MENSAJE(S) GUARDADO(S):
   1. [inbound] Hola, quiero información sobre sus servicios
   2. [outbound] [Respuesta del agente IA]
```

---

### **Test 2: WhatsApp Real**

1. **Envía un mensaje** al número de Twilio:
   - Al: `+1 415 523 8886`
   - Mensaje: `"Hola"`

2. **Deberías recibir** respuesta automática del agente IA

3. **Verifica los logs:**
   ```
   📱 Webhook Twilio: whatsapp:+57... → "Hola"
   📩 Mensaje recibido de +57...
   📝 Creando nueva conversación con agente: agent_4701k8fcsvhaes5s1h6tw894g98s
   🆕 Iniciando conversación con agente: agent_4701k8fcsvhaes5s1h6tw894g98s
   ✅ Conversación iniciada: conv_...
   🤖 Agente respondió (conv_...)
   ✅ Respuesta enviada → +57...
   ```

---

## 🔄 FLUJOS COMPLETOS

### **Flujo 1: Usuario con Llamada Previa**

```
1. Usuario recibe llamada de ElevenLabs
   ↓
2. Llamada termina (detected por monitoreo)
   ↓
3. Sistema envía WhatsApp inicial
   ↓
4. Conversación guardada en BD
   ↓
5. Usuario responde por WhatsApp
   ↓
6. Sistema encuentra conversación existente
   ↓
7. Usa el mismo conversation_id para responder
   ↓
8. Conversación continúa con contexto
```

---

### **Flujo 2: Usuario SIN Llamada Previa (NUEVO)**

```
1. Usuario escribe directamente por WhatsApp
   ↓
2. Sistema busca conversación → NO existe
   ↓
3. Sistema crea nueva conversación con agente por defecto
   ↓
4. ElevenLabs retorna conversation_id
   ↓
5. Sistema guarda en BD
   ↓
6. Sistema envía mensaje del usuario al agente
   ↓
7. Agente responde con IA
   ↓
8. Sistema envía respuesta por WhatsApp
   ↓
9. Conversación continúa normalmente
```

---

## 📊 VERIFICACIÓN EN BASE DE DATOS

```sql
-- Ver todas las conversaciones
SELECT 
  id,
  phone_number,
  client_name,
  agent_id,
  elevenlabs_conversation_id,
  status,
  message_count,
  started_at
FROM conversation_state
ORDER BY started_at DESC;

-- Ver mensajes de una conversación
SELECT 
  direction,
  content,
  sent_at
FROM conversation_messages
WHERE conversation_id = 1
ORDER BY sent_at ASC;

-- Estadísticas
SELECT 
  agent_id,
  COUNT(*) as total_conversaciones,
  SUM(message_count) as total_mensajes
FROM conversation_state
GROUP BY agent_id;
```

---

## 🚀 RESUMEN

| Característica | Estado |
|----------------|--------|
| Conversaciones por llamada | ✅ Funcionando |
| Conversaciones nuevas automáticas | ✅ Implementado |
| Agente por defecto configurable | ✅ Implementado |
| Contexto preservado | ✅ Funcionando |
| WhatsApp bidireccional | ✅ Funcionando |
| Base de datos actualizada | ✅ Funcionando |

---

## 📝 ARCHIVOS MODIFICADOS

1. ✅ `src/agents/elevenlabsService.js` - Agregado método `startConversation()`
2. ✅ `src/services/conversationService.js` - Lógica de creación automática
3. ✅ `src/routes/webhook.js` - Fix de contexto con `.bind()`
4. ✅ `src/app.js` - Rutas de webhook agregadas

---

## 🆘 TROUBLESHOOTING

### **Problema: "Error iniciando conversación"**

**Posibles causas:**
1. API Key de ElevenLabs incorrecta
2. Agente ID no existe
3. Problema de red con ElevenLabs

**Solución:**
```powershell
# Verifica que el agente exista:
node scripts/test-llamada-simple.js
# Debería listar tus agentes
```

---

### **Problema: "No se crea conversación en BD"**

**Verifica:**
```sql
-- ¿Existen las tablas?
SELECT * FROM conversation_state LIMIT 1;
SELECT * FROM conversation_messages LIMIT 1;
```

**Si no existen:**
```powershell
psql -U postgres -d iacalls_db -f database/add_conversation_tables.sql
```

---

## ✅ CHECKLIST FINAL

- [x] Método `startConversation()` implementado
- [x] Agente por defecto configurado
- [x] Lógica de creación automática funcionando
- [x] Base de datos actualizada
- [x] Tests creados
- [x] Webhooks corregidos
- [x] Documentación actualizada

---

¡Todo listo para usar! 🎉

Ahora cualquier persona puede escribir por WhatsApp, tenga o no una llamada previa, y el sistema responderá automáticamente con IA.

