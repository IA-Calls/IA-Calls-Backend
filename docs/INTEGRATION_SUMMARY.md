# Resumen de Integración - Backend → Microservicio WhatsApp

## ✅ Cambios Realizados en el Backend Principal

### 1. Modificado: `src/services/batchMonitoringService.js`

**Antes:**
- Enviaba WhatsApp directamente usando `TwilioWhatsAppService`
- Todo el procesamiento en un solo lugar

**Después:**
- Detecta cuando termina una llamada
- Llama al microservicio con toda la información
- El microservicio se encarga del resto

**Cambios específicos:**

```javascript
// ANTES
const TwilioWhatsAppService = require('./twilioWhatsAppService');
this.whatsappService = new TwilioWhatsAppService();

// DESPUÉS
const axios = require('axios');
this.microserviceUrl = process.env.WHATSAPP_MICROSERVICE_URL || 'http://localhost:3001';
this.microserviceToken = process.env.MICROSERVICE_TOKEN;
```

```javascript
// ANTES: Enviaba WhatsApp directamente
const result = await this.whatsappService.sendMessage(formattedPhone, message, clientName);

// DESPUÉS: Llama al microservicio
const response = await axios.post(
  `${this.microserviceUrl}/api/call-completed`,
  payload,
  {
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Token': this.microserviceToken
    }
  }
);
```

### 2. Variables de Entorno Nuevas

Agregar a tu `.env`:

```bash
WHATSAPP_MICROSERVICE_URL=http://localhost:3001
MICROSERVICE_TOKEN=tu-token-secreto-compartido
```

---

## 📋 Estructura del Payload que Se Envía al Microservicio

Cuando el backend detecta que una llamada terminó, envía esta información:

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
    "updated_at_unix": 1761694074,
    "variables": {}
  },
  "call_metadata": {
    "client_name": "Ana García",
    "client_id": 42,
    "group_id": 5,
    "group_name": "Campaña Octubre"
  }
}
```

---

## 🎯 Endpoints del Microservicio (Que Debes Implementar)

### 1. **POST /api/call-completed** (CRÍTICO)

Recibe la notificación de llamada terminada.

**Qué debe hacer:**
1. Guardar registro en BD
2. Enviar mensaje inicial por WhatsApp
3. Guardar `conversation_id` para continuidad
4. Retornar confirmación

### 2. **POST /webhook/twilio/incoming** (CRÍTICO)

Recibe respuestas del cliente por WhatsApp.

**Qué debe hacer:**
1. Buscar `conversation_id` de ElevenLabs
2. Enviar mensaje del cliente al agente (modo texto)
3. Obtener respuesta del agente
4. Enviar respuesta por WhatsApp
5. Guardar en BD

### 3. **GET /api/conversations/:phoneNumber**

Consulta el historial de conversación.

### 4. **GET /api/stats**

Estadísticas del microservicio.

### 5. **GET /health**

Health check.

---

## 🔄 Flujo Completo

```
1. Cliente recibe llamada de ElevenLabs
   ↓
2. Llamada termina (status = "completed")
   ↓
3. batchMonitoringService detecta (cada 15 seg)
   ↓
4. Backend Principal llama:
   POST http://localhost:3001/api/call-completed
   {
     batch_id: "...",
     conversation_id: "conv_...",  ← CLAVE
     phone_number: "+57...",
     ...
   }
   ↓
5. Microservicio:
   - Guarda en conversation_state
   - Envía WhatsApp: "Hola Ana, gracias por..."
   - Guarda conversation_id
   ↓
6. Cliente responde: "Sí me interesa, ¿precio?"
   ↓
7. Twilio webhook:
   POST http://localhost:3001/webhook/twilio/incoming
   {
     From: "whatsapp:+57...",
     Body: "Sí me interesa, ¿precio?"
   }
   ↓
8. Microservicio:
   - Busca conversation_id = "conv_..."
   - Llama a ElevenLabs:
     POST /v1/convai/conversations/conv_.../message
     { message: "...", mode: "text" }
   - Obtiene respuesta del agente
   - Envía por WhatsApp: "El plan cuesta $99/mes..."
   ↓
9. Conversación continúa automáticamente...
```

---

## 📊 Base de Datos (Ya Creada)

Las tablas ya existen en `database/schema.sql`:

- ✅ `users`
- ✅ `clients`
- ✅ `groups`
- ✅ `batch_calls`
- ✅ `call_records`
- ✅ `whatsapp_conversations`

**Tablas adicionales para el microservicio** (debes crearlas):

```sql
-- Para estado de conversaciones activas
CREATE TABLE conversation_state (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(50) UNIQUE NOT NULL,
  client_name VARCHAR(255),
  elevenlabs_conversation_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  call_summary TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW(),
  message_count INTEGER DEFAULT 0
);

-- Para mensajes individuales
CREATE TABLE conversation_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversation_state(id),
  direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  twilio_message_id VARCHAR(255),
  sent_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 Próximos Pasos

### 1. Agregar Variables de Entorno

En tu `.env` del backend principal:

```bash
WHATSAPP_MICROSERVICE_URL=http://localhost:3001
MICROSERVICE_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### 2. Crear Proyecto del Microservicio

```bash
mkdir whatsapp-microservice
cd whatsapp-microservice
npm init -y
npm install express axios twilio dotenv pg bull redis
```

### 3. Implementar Endpoints

Ver archivo completo: `whatsapp-microservice-spec.md`

### 4. Configurar Twilio Webhook

En Twilio Console → WhatsApp Sandbox Settings:

```
When a message comes in: 
https://tu-servidor.com:3001/webhook/twilio/incoming
```

### 5. Iniciar Servicios

```bash
# Terminal 1: Backend principal
npm run dev

# Terminal 2: Microservicio
cd whatsapp-microservice
npm start
```

### 6. Probar

1. Inicia una llamada desde el frontend
2. Espera a que termine (status = completed)
3. Verás en los logs:
   ```
   📞 Notificando al microservicio WhatsApp...
   ✅ Microservicio procesó exitosamente
   ```
4. Recibirás un mensaje por WhatsApp
5. Responde al mensaje
6. El sistema responde automáticamente

---

## 🔍 Logs Esperados

### Backend Principal

```
🔄 Monitoreando 1 batch(es) activo(s) - 10:35:24

✅ Llamada finalizada: +573138539155 | completed

📞 Notificando al microservicio WhatsApp...
   Cliente: Ana García | Teléfono: +573138539155
   Conversation ID: conv_9601k8pjchj6fnvamdmbsvdq5ptv

✅ Microservicio procesó exitosamente: Ana García
   WhatsApp Message ID: SM1234567890abcdef
   Conversation ID: conv_local_123
   Status: message_sent
```

### Microservicio

```
📥 POST /api/call-completed
   Batch ID: btcal_9201k8pjch8teq3t428mqt82xe3d
   Cliente: Ana García (+573138539155)

💾 Guardando estado de conversación...
📱 Enviando mensaje inicial por WhatsApp...
✅ Mensaje enviado: SM1234567890abcdef

📥 POST /webhook/twilio/incoming
   From: whatsapp:+573138539155
   Body: "Sí me interesa, ¿precio?"

🔍 Buscando conversation_id: conv_9601k8pjchj6fnvamdmbsvdq5ptv
🤖 Consultando agente ElevenLabs...
💬 Agente responde: "El plan Premium cuesta $99/mes..."
📱 Enviando respuesta por WhatsApp...
✅ Mensaje enviado
```

---

## 🎯 Ventajas de Esta Arquitectura

1. ✅ **Separación de responsabilidades**
   - Backend principal: Llamadas
   - Microservicio: WhatsApp + IA conversacional

2. ✅ **Escalabilidad**
   - Cada servicio puede escalar independientemente
   - Cola de mensajes con Redis/Bull

3. ✅ **Continuidad de contexto**
   - Mismo `conversation_id` de la llamada a WhatsApp
   - El agente recuerda toda la llamada

4. ✅ **Resiliencia**
   - Si el microservicio falla, se reintenta
   - Mensajes en cola no se pierden

5. ✅ **Mantenibilidad**
   - Código organizado
   - Fácil de debuggear
   - Logs separados

---

## 🆘 Troubleshooting

### Microservicio no responde

```bash
# Verificar que está corriendo
curl http://localhost:3001/health

# Revisar logs
tail -f logs/whatsapp-microservice.log
```

### WhatsApp no se envía

```bash
# Verificar configuración de Twilio
curl -X POST http://localhost:3001/api/test-whatsapp \
  -H "Content-Type: application/json" \
  -d '{"to": "+573138539155", "message": "Test"}'
```

### Cliente responde pero no hay respuesta automática

```bash
# Verificar webhook de Twilio
curl -X POST http://localhost:3001/webhook/twilio/incoming \
  -d "From=whatsapp:+573138539155" \
  -d "Body=Hola"
```

---

## 📚 Documentación Adicional

- `whatsapp-microservice-spec.md` - Especificación completa de API
- `docs/WHATSAPP_MICROSERVICE_ARCHITECTURE.md` - Arquitectura detallada
- `docs/ELEVENLABS_AGENT_AS_AI_ENGINE.md` - Uso del agente de ElevenLabs
- `database/schema.sql` - Estructura de BD
- `docs/ENVIRONMENT_VARIABLES.md` - Variables de entorno

---

## ✅ Checklist Final

- [ ] Variables de entorno agregadas
- [ ] Microservicio creado
- [ ] Endpoints implementados
- [ ] Tablas de BD creadas
- [ ] Webhook de Twilio configurado
- [ ] Prueba end-to-end exitosa
- [ ] Logs funcionando correctamente
- [ ] Documentación actualizada

---

**¿Quieres que implemente el microservicio completo ahora?** 🚀

