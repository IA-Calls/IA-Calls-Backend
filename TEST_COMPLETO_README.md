# 🧪 Test Completo del Sistema WhatsApp + ElevenLabs

## 📋 **¿Qué hace este test?**

Este test verifica **TODO el sistema de principio a fin**:

1. ✅ Servidor corriendo y monitoreo activo
2. ✅ Crear y ejecutar llamada con ElevenLabs
3. ✅ Detectar automáticamente cuando termina la llamada
4. ✅ Verificar que se envió WhatsApp automáticamente
5. ✅ Verificar que se creó WebSocket (o sistema de fallback funciona)
6. ✅ Verificar mensajes guardados en BD
7. ✅ Simular respuesta del usuario
8. ✅ Verificar que el agente responde correctamente

---

## 🚀 **Cómo Ejecutar**

### **Prerequisitos:**

1. **Servidor corriendo:**
   ```bash
   npm run dev
   ```

2. **Variables de entorno configuradas:**
   - `ELEVENLABS_API_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM`
   - `DEFAULT_AGENT_ID`

### **Ejecutar el test:**

```bash
node scripts/test-completo-sistema.js
```

---

## 📊 **Fases del Test**

### **FASE 1: Verificación Inicial** ⏱️ 5 segundos
- Verifica que el servidor esté corriendo
- Valida health check (DB, monitoreo, WhatsApp)
- Carga servicios necesarios

### **FASE 2: Preparación** ⏱️ 10 segundos
- Obtiene agente de ElevenLabs
- Obtiene número de teléfono disponible
- Limpia conversaciones previas en BD

### **FASE 3: Iniciar Llamada** ⏱️ 5 segundos
- Crea batch call en ElevenLabs
- Inicia llamada a tu número de prueba
- Te indica que contestes el teléfono

### **FASE 4: Monitorear Llamada** ⏱️ Variable (hasta 10 minutos)
- Monitorea el estado de la llamada cada 5 segundos
- Muestra cambios de estado en tiempo real
- Espera a que termine (completed/finished)

**👤 ACCIÓN REQUERIDA:** Contesta el teléfono y habla con el agente

### **FASE 5: Verificar Procesamiento Automático** ⏱️ 20 segundos
- Espera a que el `batchMonitoringService` procese la llamada
- Verifica que se creó conversación en BD
- Si no se procesó automáticamente, lo hace manualmente
- Muestra detalles de la conversación
- Verifica que se envió mensaje de WhatsApp

### **FASE 6: Verificación de WhatsApp** ⏱️ 10 segundos
- Te pide que revises tu WhatsApp
- Espera 10 segundos para que confirmes

**👤 ACCIÓN REQUERIDA:** Revisa tu WhatsApp (+573138539155)

### **FASE 7: Probar Respuesta Bidireccional** ⏱️ 10 segundos
- Simula un mensaje del usuario
- Verifica que el sistema procesa el mensaje
- Verifica que el agente responde
- Muestra todos los mensajes en BD

### **FASE 8: Verificar WebSocket** ⏱️ 5 segundos
- Verifica si hay WebSocket activo
- Muestra información de la conexión
- Si no está activo, indica que se creará cuando el usuario responda

---

## ✅ **Resultado Exitoso**

Si todo funciona correctamente, verás:

```
╔════════════════════════════════════════════════════════════╗
║                  ✅ TEST COMPLETADO                        ║
╚════════════════════════════════════════════════════════════╝

📊 RESUMEN DE RESULTADOS:

   ✅ Servidor: Funcionando
   ✅ Monitoreo: Activo
   ✅ Llamada: Completada (Batch: btcal_xxx)
   ✅ Conversación BD: Creada (ID: 123)
   ✅ WhatsApp: Enviado (2 mensajes totales)
   ✅ WebSocket: Activo
   ⏱️  Duración total: 145 segundos

🎯 PRÓXIMOS PASOS:

   1. Revisa tu WhatsApp (+573138539155)
   2. Responde el mensaje
   3. El agente debería responder automáticamente
   4. La conversación debe mantenerse con contexto

═══════════════════════════════════════════════════════════
✨ El sistema está funcionando correctamente
```

---

## ❌ **Si el Test Falla**

### **Error: "Servidor no disponible"**
```bash
# Solución: Asegúrate de que el servidor esté corriendo
npm run dev
```

### **Error: "Timeout: La llamada no terminó"**
- Verifica que contestaste el teléfono
- La llamada puede tomar hasta 10 minutos
- Puedes cancelar con Ctrl+C y procesar manualmente:
  ```bash
  node scripts/procesar-batch-especifico.js btcal_XXXXX
  ```

### **Error: "No se encontró conversación en BD"**
- El test intentará procesar manualmente
- Si sigue fallando, revisa los logs del servidor
- Verifica que el `batchMonitoringService` esté corriendo

### **Error: "No se encontró mensaje de WhatsApp"**
- Verifica configuración de Twilio
- Revisa logs del servidor para errores de Twilio
- Verifica que `TWILIO_WHATSAPP_FROM` esté correcto

---

## 🔍 **Debugging**

### **Ver logs en tiempo real:**

En una terminal separada:
```bash
# Ver logs del servidor
tail -f logs/server.log  # Si tienes logging a archivo
```

### **Verificar estado manualmente:**

```bash
# Ver último batch
node scripts/debug-ultimo-batch.js

# Procesar batch específico
node scripts/procesar-batch-especifico.js btcal_XXXXX

# Verificar monitoreo activo
node scripts/verificar-monitoreo-activo.js
```

### **Limpiar datos de prueba:**

```bash
node scripts/limpiar-y-probar.js
```

---

## 📝 **Qué Verifica Este Test**

| Componente | Verificación |
|------------|-------------|
| **ElevenLabs API** | ✅ Crear llamada, obtener status |
| **BatchMonitoringService** | ✅ Detectar llamadas finalizadas automáticamente |
| **WebSocket** | ✅ Conectar con ElevenLabs para conversación |
| **Fallback System** | ✅ Enviar WhatsApp aunque WebSocket falle |
| **Twilio WhatsApp** | ✅ Enviar y recibir mensajes |
| **ConversationService** | ✅ Manejar flujo completo de conversación |
| **Base de Datos** | ✅ Guardar conversaciones y mensajes |
| **Health Check** | ✅ Servidor funcionando correctamente |

---

## 🎯 **Casos de Uso**

### **1. Test Rápido**
```bash
# Solo verificar que el sistema funciona
node scripts/test-completo-sistema.js
```

### **2. Test con Debugging**
```bash
# Ver todos los detalles
DEBUG=* node scripts/test-completo-sistema.js
```

### **3. Test después de cambios**
```bash
# Reiniciar servidor
npm run dev

# En otra terminal
node scripts/test-completo-sistema.js
```

---

## ⚙️ **Configuración del Test**

Puedes modificar estas variables en el script:

```javascript
const NUMERO_PRUEBA = '+573138539155';  // Tu número de prueba
const maxAttempts = 120;                // Timeout (120 * 5s = 10 minutos)
```

---

## 📞 **Flujo Completo Visual**

```
Usuario ejecuta test
       │
       ▼
┌──────────────────┐
│ Servidor Running │  ← Verifica health
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Crear Llamada    │  ← ElevenLabs API
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Usuario Contesta │  ← Acción manual
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Llamada Termina  │  ← Detectado por monitoring
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Iniciar WebSocket│  ← ElevenLabs WebSocket
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Enviar WhatsApp  │  ← Twilio API
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Guardar en BD    │  ← PostgreSQL
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Usuario Responde │  ← Twilio Webhook
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Agente Responde  │  ← ElevenLabs via WebSocket
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ✅ Test Completo │
└──────────────────┘
```

---

## 🆘 **Soporte**

Si el test falla consistentemente:

1. Verifica todas las variables de entorno
2. Revisa logs del servidor
3. Ejecuta tests individuales para aislar el problema:
   - `node scripts/test-whatsapp-integration.js`
   - `node scripts/test-llamada-simple.js`
   - `node scripts/debug-ultimo-batch.js`

---

## ✨ **Éxito del Test = Sistema Funcionando**

Si este test pasa, significa que:

- ✅ Todo el flujo de llamadas funciona
- ✅ El monitoreo automático está operativo
- ✅ WhatsApp se envía correctamente
- ✅ Las conversaciones se mantienen con contexto
- ✅ El sistema está listo para producción

**¡Ahora puedes usarlo con confianza!** 🚀


