# 🚀 PASOS PARA PROBAR TODO EL SISTEMA

## ❌ PROBLEMA ENCONTRADO

**Falta configuración de Twilio en tu `.env`** - Por eso no funciona WhatsApp

---

## ✅ SOLUCIÓN (5 minutos)

### **PASO 1: Agregar Variables de Entorno**

Abre tu archivo `.env` y agrega estas líneas:

```env
# Twilio WhatsApp (OBLIGATORIO)
TWILIO_ACCOUNT_SID=AC332953b4c00211a282b4c59d45faf749
TWILIO_AUTH_TOKEN=cfd6638b2384981c48edfe84835219da
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Para tests
TEST_PHONE_NUMBER=+573138539155
```

### **PASO 2: Configurar Webhook en Twilio**

1. Ve a: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox

2. Si estás en **desarrollo local**, inicia ngrok:
   ```bash
   ngrok http 3000
   ```
   Copia la URL que te da (ej: `https://abc123.ngrok.io`)

3. En Twilio, pega:
   ```
   https://abc123.ngrok.io/webhook/twilio/incoming
   ```
   - HTTP Method: POST
   - Click "Save"

4. Autoriza tu número:
   - Abre WhatsApp
   - Agrega: `+1 415 523 8886`
   - Envía: `join abc-def` (tu código)

### **PASO 3: Reiniciar el Servidor**

```bash
# Detener (Ctrl+C)
# Iniciar de nuevo:
npm run dev
```

Deberías ver:
```
✅ Servicio de monitoreo de llamadas iniciado
🚀 ===== INICIANDO MONITOREO GLOBAL DE BATCH CALLS =====
📊 Intervalo de verificación: 15 segundos
```

### **PASO 4: Verificar Sistema**

```bash
node scripts/verificar-sistema.js
```

Debe decir: `✅ SISTEMA OPERATIVO - Todo configurado correctamente`

### **PASO 5: Test Rápido de WhatsApp**

```bash
node scripts/test-enviar-whatsapp.js
```

Deberías recibir un mensaje en tu WhatsApp.

### **PASO 6: Test de Llamada Completa**

```bash
node scripts/test-llamada-completa.js
```

Este script:
1. ✅ Hace una llamada REAL al número +573138539155
2. ✅ Espera a que contestes y termines
3. ✅ Detecta automáticamente cuando cuelgas
4. ✅ Envía mensaje de WhatsApp automáticamente
5. ✅ Verifica que todo se guardó en la BD

---

## 📊 VERIFICAR QUE TODO FUNCIONE

### **1. Ver Logs del Servidor**

Deberías ver cuando termine una llamada:
```
🔍 Batch: completed | Recipients: 1
     → Recipient status: completed
💬 WhatsApp → Alejandro (+573138539155) ✓
```

### **2. Ver en Base de Datos**

```sql
-- Ver conversaciones
SELECT * FROM conversation_state 
ORDER BY started_at DESC;

-- Ver mensajes
SELECT * FROM conversation_messages
ORDER BY sent_at DESC;
```

### **3. Responder el WhatsApp**

Cuando respondas, deberías ver:
```
📱 Webhook Twilio: whatsapp:+57... → "tu respuesta"
📩 Mensaje recibido de +57...
🤖 Agente respondió (conv_...)
✅ Respuesta enviada → +57...
```

---

## 🔥 QUICK START (ALTERNATIVA)

Si no quieres editar el `.env`, ejecuta directamente:

```bash
scripts/ejecutar-test-completo.bat
```

Este script configura las variables temporalmente y ejecuta el test.

---

## ❓ ¿QUÉ CAMBIÓ?

### **Archivos Modificados:**

1. **`src/app.js`**
   - ✅ Agregado inicio automático de `batchMonitoringService`
   - ✅ Agregado endpoint `/health` para tests

2. **Scripts Creados:**
   - `scripts/test-llamada-completa.js` - Test completo de llamada + WhatsApp
   - `scripts/verificar-sistema.js` - Verificación de configuración
   - `scripts/test-enviar-whatsapp.js` - Test simple de WhatsApp
   - `scripts/ejecutar-test-completo.bat` - Ejecutor con variables temporales

3. **Documentación:**
   - `docs/CONFIGURACION_TWILIO_WEBHOOK.md` - Configuración detallada
   - `docs/QUICK_START_WHATSAPP.md` - Inicio rápido
   - `AGREGAR_A_ENV.txt` - Variables faltantes

---

## 🎯 RESULTADO ESPERADO

Después de seguir estos pasos:

1. ✅ Servidor iniciará con monitoreo automático
2. ✅ Cada llamada finalizada enviará WhatsApp
3. ✅ Los clientes podrán responder
4. ✅ El agente IA contestará con contexto
5. ✅ Conversación continua funcionando

---

## 🆘 ¿PROBLEMAS?

Ejecuta el verificador:
```bash
node scripts/verificar-sistema.js
```

Te dirá exactamente qué falta.

---

## 📞 RESUMEN

**El problema:** Faltaban variables de Twilio + servicio de monitoreo no iniciaba

**La solución:**
1. Agregar variables al `.env`
2. Configurar webhook en Twilio
3. Reiniciar servidor
4. ¡Listo!

**Tiempo:** 5 minutos máximo

---

¿Listo para probar? 🚀

