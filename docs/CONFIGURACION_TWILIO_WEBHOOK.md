# Configuración del Webhook de Twilio WhatsApp

## 📡 URL del Webhook

Tu webhook debe apuntar a:

```
https://tu-servidor.com/webhook/twilio/incoming
```

---

## 🔧 Configuración Paso a Paso

### **Paso 1: Acceder a Twilio Console**

1. Ve a: https://console.twilio.com/
2. Inicia sesión con tu cuenta

### **Paso 2: Ir a WhatsApp Sandbox**

1. En el menú lateral, ve a: **Messaging** → **Try it out** → **Send a WhatsApp message**
2. O directamente: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox

### **Paso 3: Configurar Webhook**

En la sección **"Sandbox Configuration"**, encontrarás:

```
WHEN A MESSAGE COMES IN
┌──────────────────────────────────────────────────────────┐
│ https://tu-servidor.com/webhook/twilio/incoming         │
└──────────────────────────────────────────────────────────┘

HTTP METHOD
┌──────────┐
│ POST  ▼  │
└──────────┘

[Save Configuration]
```

**Configuración:**
- **URL**: `https://tu-servidor.com/webhook/twilio/incoming`
- **HTTP Method**: `POST`
- Click en **"Save Configuration"**

---

## 🏠 Para Desarrollo Local (ngrok)

Si estás desarrollando localmente, necesitas exponer tu servidor con **ngrok**:

### **1. Instalar ngrok**

```bash
# macOS/Linux
brew install ngrok

# Windows
choco install ngrok

# O descarga desde: https://ngrok.com/download
```

### **2. Iniciar ngrok**

```bash
ngrok http 3000
```

Verás algo como:
```
ngrok

Session Status                online
Account                       tu-email@gmail.com
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

### **3. Usar URL de ngrok en Twilio**

Copia la URL de **Forwarding** y agrégale `/webhook/twilio/incoming`:

```
https://abc123.ngrok.io/webhook/twilio/incoming
```

Pégala en la configuración de Twilio.

---

## 🔐 Autorizar Tu Número (Sandbox)

Para recibir/enviar mensajes en el sandbox de Twilio:

### **1. Obtén tu código de sandbox**

En la página de WhatsApp Sandbox verás:

```
To connect to your sandbox, send this code in a WhatsApp message to the number below:

join <tu-codigo-sandbox>

Example: join abc-def
```

### **2. Envía el mensaje**

1. Abre WhatsApp en tu teléfono
2. Agrega el número de Twilio a tus contactos: `+1 415 523 8886`
3. Envía el mensaje: `join abc-def` (con tu código)
4. Recibirás confirmación de Twilio

### **3. ¡Listo!**

Ahora puedes enviar/recibir mensajes desde ese número.

---

## ✅ Verificación

### **1. Verifica que el webhook esté configurado**

```bash
curl https://tu-servidor.com/webhook/twilio/test
```

Deberías ver:
```json
{
  "success": true,
  "message": "Webhook de Twilio funcionando correctamente",
  "timestamp": "2025-10-29T..."
}
```

### **2. Ejecuta el test de integración**

```bash
node scripts/test-whatsapp-integration.js
```

Deberías ver:
```
🧪 ===== TEST DE INTEGRACIÓN WHATSAPP =====

✅ Servidor corriendo correctamente
✅ Webhook endpoint configurado correctamente
✅ Webhook procesó mensaje correctamente
✅ Variables de entorno de Twilio configuradas
✅ API Key de ElevenLabs configurada
✅ Tabla conversation_state existe
✅ Tabla conversation_messages existe

📊 RESUMEN DE TESTS
✅ Tests exitosos: 6
❌ Tests fallidos: 0
📈 Total: 6

🎉 ¡TODOS LOS TESTS PASARON!
```

### **3. Envía un mensaje de prueba**

```bash
node scripts/test-enviar-whatsapp.js
```

Deberías recibir un mensaje en tu WhatsApp.

### **4. Responde el mensaje**

Cuando respondas, verás en los logs del servidor:

```
📱 Webhook Twilio: whatsapp:+57... → "Hola, prueba..."
📩 Mensaje recibido de +57...
🤖 Agente respondió (conv_9601k8pjch...)
✅ Respuesta enviada → +57...
```

---

## 🌐 Para Producción

### **Opción 1: Servidor con IP Pública**

Si tu servidor tiene IP pública:

```
https://tu-ip-o-dominio.com/webhook/twilio/incoming
```

### **Opción 2: Dominio Personalizado**

Si tienes un dominio:

```
https://api.tu-empresa.com/webhook/twilio/incoming
```

### **Opción 3: Heroku/Railway/Render**

Si usas plataformas de hosting:

```
https://tu-app.herokuapp.com/webhook/twilio/incoming
https://tu-app.up.railway.app/webhook/twilio/incoming
https://tu-app.onrender.com/webhook/twilio/incoming
```

---

## 🔍 Troubleshooting

### Problema: "Webhook timeout"

**Causa:** El servidor tarda más de 15 segundos en responder.

**Solución:**
- ✅ El webhook responde inmediatamente (200 OK)
- ✅ El procesamiento se hace asíncronamente
- Ya está implementado en el código

### Problema: "Webhook not reachable"

**Causa:** Twilio no puede acceder a tu servidor.

**Solución:**
- Verifica que el servidor esté corriendo
- Verifica que la URL sea accesible públicamente
- Si usas ngrok, asegúrate de que esté activo

### Problema: "Unauthorized"

**Causa:** Credenciales de Twilio incorrectas.

**Solución:**
- Verifica `TWILIO_ACCOUNT_SID` en `.env`
- Verifica `TWILIO_AUTH_TOKEN` en `.env`
- Obtén las correctas de: https://console.twilio.com/

### Problema: "Number not whitelisted"

**Causa:** Tu número no está autorizado en el sandbox.

**Solución:**
- Envía `join abc-def` al número de Twilio desde WhatsApp
- Espera confirmación

---

## 📊 Verificar en Twilio Console

### Ver Logs de Mensajes

1. Ve a: https://console.twilio.com/us1/monitor/logs/sms
2. Busca tus mensajes
3. Verás status de cada uno

### Ver Webhooks Ejecutados

1. Ve a: https://console.twilio.com/us1/monitor/logs/debugger
2. Verás cada webhook que Twilio llamó
3. Puedes ver request/response

---

## 🚀 Endpoints Disponibles

Tu servidor tiene estos endpoints relacionados con WhatsApp:

### **1. Recibir Mensajes (Webhook Principal)**
```
POST /webhook/twilio/incoming
```
- Llamado por Twilio cuando llega un mensaje
- Procesa mensaje asíncronamente
- Responde 200 OK inmediatamente

### **2. Status Callback**
```
POST /webhook/twilio/status
```
- Recibe actualizaciones de estado de mensajes
- Opcional, para tracking avanzado

### **3. Test Endpoint**
```
GET /webhook/twilio/test
```
- Para verificar que el webhook esté activo
- Retorna JSON con status

---

## 📝 Resumen de URLs

### Desarrollo Local
```
http://localhost:3000/webhook/twilio/incoming
```

### Desarrollo Local con ngrok
```
https://abc123.ngrok.io/webhook/twilio/incoming
```

### Producción
```
https://tu-servidor.com/webhook/twilio/incoming
```

---

## ✅ Checklist Final

- [ ] Webhook configurado en Twilio Console
- [ ] HTTP Method configurado como POST
- [ ] Número autorizado en sandbox (mensaje `join` enviado)
- [ ] Variables de entorno en `.env` correctas
- [ ] Test de integración ejecutado exitosamente
- [ ] Mensaje de prueba recibido en WhatsApp
- [ ] Respuesta del sistema recibida al contestar

---

## 📞 Soporte

Si tienes problemas:

1. **Ejecuta el test**: `node scripts/test-whatsapp-integration.js`
2. **Revisa los logs** del servidor
3. **Verifica la configuración** en Twilio Console
4. **Prueba el webhook** con el endpoint de test

¡Todo está listo para funcionar! 🚀

