# Quick Start - WhatsApp Integration

## 🚀 Inicio Rápido (5 minutos)

### **Paso 1: Agregar Variable de Entorno**

Abre tu `.env` y agrega (si no lo tienes):

```bash
# Número para tests
TEST_PHONE_NUMBER=+573138539155  # Tu número de WhatsApp
```

### **Paso 2: Crear Tablas en BD**

```bash
psql -U postgres -d iacalls_db -f database/add_conversation_tables.sql
```

### **Paso 3: Reiniciar Servidor**

```bash
npm run dev
```

Deberías ver:
```
💬 ConversationService inicializado
✅ TwilioWhatsAppService inicializado
📱 Número de envío: whatsapp:+14155238886
```

### **Paso 4: Configurar Webhook en Twilio**

#### Si estás en **local**:

1. **Iniciar ngrok:**
   ```bash
   ngrok http 3000
   ```

2. **Copiar URL:**
   ```
   https://abc123.ngrok.io
   ```

3. **Configurar en Twilio:**
   - Ve a: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
   - En "When a message comes in":
     ```
     https://abc123.ngrok.io/webhook/twilio/incoming
     ```
   - HTTP Method: `POST`
   - Click "Save"

#### Si estás en **producción**:

```
https://tu-servidor.com/webhook/twilio/incoming
```

### **Paso 5: Autorizar Tu Número**

1. Abre WhatsApp
2. Agrega contacto: `+1 415 523 8886`
3. Envía: `join abc-def` (tu código de sandbox)
4. Espera confirmación

### **Paso 6: Ejecutar Test**

```bash
node scripts/test-whatsapp-integration.js
```

Deberías ver:
```
✅ Tests exitosos: 6
🎉 ¡TODOS LOS TESTS PASARON!
```

### **Paso 7: Enviar Mensaje de Prueba**

```bash
node scripts/test-enviar-whatsapp.js
```

Deberías recibir un mensaje en tu WhatsApp.

### **Paso 8: Responder el Mensaje**

Cuando respondas, verás en los logs:

```
📱 Webhook Twilio: whatsapp:+57... → "tu mensaje"
📩 Mensaje recibido de +57...
🤖 Agente respondió (conv_...)
✅ Respuesta enviada → +57...
```

---

## ✅ ¡Listo!

Tu sistema ahora:

1. ✅ Detecta cuando termina una llamada
2. ✅ Envía mensaje automático por WhatsApp
3. ✅ Recibe respuestas del cliente
4. ✅ Consulta al agente de ElevenLabs
5. ✅ Responde automáticamente con contexto
6. ✅ Mantiene conversación infinita

---

## 🧪 Probar el Flujo Completo

### **1. Hacer una llamada**

Desde tu frontend, inicia una llamada de prueba.

### **2. Esperar que termine**

El sistema detectará automáticamente cuando `status = 'completed'`.

### **3. Recibir WhatsApp**

En ~15 segundos (intervalo de monitoreo), recibirás un mensaje:

```
¡Hola Ana! 👋

Hemos completado una breve conversación contigo.

¿En qué más puedo ayudarte? Puedo responder tus preguntas por aquí. 😊
```

### **4. Responder**

Envía cualquier mensaje, por ejemplo:
```
Sí me interesa, ¿cuál es el precio?
```

### **5. Ver la Respuesta**

El agente responderá con contexto de la llamada:
```
¡Claro Ana! Como te mencioné en la llamada, el plan Premium cuesta $99/mes e incluye...
```

---

## 📊 Verificar en Base de Datos

```sql
-- Ver conversaciones activas
SELECT * FROM conversation_state 
WHERE status = 'active'
ORDER BY started_at DESC;

-- Ver mensajes de una conversación
SELECT 
  direction,
  content,
  sent_at
FROM conversation_messages
WHERE conversation_id = 1
ORDER BY sent_at ASC;

-- Ver estadísticas
SELECT * FROM conversation_statistics;
```

---

## 🆘 Troubleshooting Rápido

### No recibo el mensaje inicial

**Verifica:**
```bash
# Logs del servidor
tail -f logs/server.log | grep "WhatsApp"

# Estado de conversaciones
SELECT * FROM conversation_state;
```

### Webhook no se ejecuta

**Verifica:**
```bash
# Test del webhook
curl https://abc123.ngrok.io/webhook/twilio/test

# Logs de Twilio
# Ve a: https://console.twilio.com/us1/monitor/logs/debugger
```

### Agente no responde con contexto

**Verifica:**
```sql
-- Que el conversation_id esté guardado
SELECT phone_number, elevenlabs_conversation_id 
FROM conversation_state;
```

---

## 📚 Documentación Completa

- **Configuración Detallada**: `docs/CONFIGURACION_TWILIO_WEBHOOK.md`
- **Tests**: `docs/BACKEND_UNICO_IMPLEMENTATION.md`
- **Arquitectura**: `docs/WHATSAPP_MICROSERVICE_ARCHITECTURE.md`
- **Agente IA**: `docs/ELEVENLABS_AGENT_AS_AI_ENGINE.md`

---

## 🎯 URLs Importantes

### **Tu Webhook**
```
https://tu-servidor.com/webhook/twilio/incoming
```

### **Twilio Console**
- Sandbox: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
- Logs: https://console.twilio.com/us1/monitor/logs/sms
- Debugger: https://console.twilio.com/us1/monitor/logs/debugger

### **Tests**
```bash
# Test completo
node scripts/test-whatsapp-integration.js

# Enviar mensaje
node scripts/test-enviar-whatsapp.js
```

---

¡Todo está listo para funcionar! 🚀

