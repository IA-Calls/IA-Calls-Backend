# 📞 Test de Flujo Completo - Activo y Persistente

## 🎯 QUÉ HACE ESTE TEST

Este test simula el flujo COMPLETO de una llamada con WhatsApp:

1. ✅ **Hace una llamada REAL** al número configurado
2. ✅ **Se mantiene ACTIVO** esperando que termines la llamada
3. ✅ **Confía en el monitoreo del servidor** para detectar cuando cuelgas
4. ✅ **Verifica que llegue WhatsApp** automáticamente
5. ✅ **Prueba la conversación bidireccional** por WhatsApp

**Es un test E2E (End-to-End) completo.**

---

## 🚀 CÓMO USAR

### **Requisitos Previos:**

1. ✅ Servidor corriendo: `npm run dev`
2. ✅ Variables de entorno configuradas (.env)
3. ✅ Número autorizado en Twilio Sandbox
4. ✅ Monitoreo del servidor activo

---

### **Ejecutar el Test:**

```powershell
node scripts/test-flujo-completo-activo.js
```

---

## 📋 QUÉ VERÁS

### **Paso 1: Iniciando Llamada**

```
🚀 ===== TEST DE FLUJO COMPLETO ACTIVO =====

📞 PASO 1: INICIANDO LLAMADA

   ✅ Agente: Agente Admin - test ana 4
   🆔 ID: agent_4701k8fcsvhaes5s1h6tw894g98s

   ✅ Número: +15707769534
   🆔 Phone ID: phnum_1401k8gyww19evptjqeqnm8hs3x5

✅ LLAMADA INICIADA EXITOSAMENTE

📊 Batch ID: btcal_...
📱 Llamando a: +573138539155

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 TU TELÉFONO DEBERÍA SONAR AHORA
   👆 CONTESTA LA LLAMADA
   💬 HABLA CON EL AGENTE
   📴 CUELGA CUANDO TERMINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ Esperando que contestes y cuelgues...
```

**En este punto:**
- ✅ Tu teléfono suena
- ✅ Contestas y hablas
- ✅ El test se queda esperando

---

### **Paso 2: Monitoreando**

Mientras hablas, verás cada 10 segundos:

```
🔄 PASO 2: MONITOREANDO LLAMADA

   El monitoreo del servidor está detectando automáticamente
   Esperando que el servidor procese la llamada finalizada...

[1] ⏱️  Tiempo: 0m 10s
   📊 Estado de llamada: in_progress

[2] ⏱️  Tiempo: 0m 20s

[3] ⏱️  Tiempo: 0m 30s
   📊 Estado de llamada: completed
```

**El test está:**
- ✅ Verificando el estado en ElevenLabs
- ✅ Verificando si el monitoreo del servidor ya procesó
- ✅ Esperando que aparezca la conversación en BD

---

### **Paso 3: Detección de Finalización**

Cuando el **monitoreo del servidor** detecta que terminaste:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ¡EL MONITOREO DEL SERVIDOR DETECTÓ LA LLAMADA!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CONVERSACIÓN CREADA EN BD:

   ID: 1
   Teléfono: +573138539155
   Cliente: Alejandro
   Agente: agent_4701k8fcsvhaes5s1h6tw894g98s
   Conversation ID: conv_...
   Estado: active
   Mensajes: 1

📨 MENSAJES ENVIADOS:

   1. [outbound] ¡Hola Alejandro! 👋 Hemos completado una conversación sobre...
      Twilio SID: SM...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 REVISA TU WHATSAPP
   Deberías tener un mensaje del sistema
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**En este punto:**
- ✅ El monitoreo del servidor procesó la llamada
- ✅ Se envió WhatsApp automáticamente
- ✅ Se guardó todo en BD

---

### **Paso 4: Prueba de Conversación**

El test automáticamente envía un mensaje de prueba:

```
📱 PASO 3: PROBANDO CONVERSACIÓN WHATSAPP

   📩 Enviando mensaje de prueba: "¿Puedes darme más información?"
   ✅ Mensaje procesado exitosamente
   🤖 Respuesta del agente: "¡Claro! Con gusto te doy más información..."
   📱 Revisa tu WhatsApp para ver la respuesta
```

**Deberías recibir:**
- ✅ Primer WhatsApp automático
- ✅ Segundo WhatsApp (respuesta al test)

---

### **Paso 5: Resumen Final**

```
═════════════════════════════════════════════════════════════
🎉 ===== TEST COMPLETADO =====
═════════════════════════════════════════════════════════════

📊 RESUMEN:

   ✅ Llamada iniciada: Batch btcal_...
   ✅ Llamada detectada por monitoreo del servidor
   ✅ WhatsApp enviado automáticamente
   ✅ Conversación guardada en BD
   ✅ Conversación bidireccional funcionando

📱 AHORA PUEDES:

   1. Responder el WhatsApp que recibiste
   2. El agente IA te responderá automáticamente
   3. Conversar todo lo que quieras
   4. El contexto de la llamada se mantiene

═════════════════════════════════════════════════════════════

✅ Sistema completamente funcional
```

---

## ⏱️ TIEMPOS

- **Llamada:** 30s - 5 minutos (lo que hables)
- **Detección:** ~15-30 segundos después de colgar
- **WhatsApp:** Inmediato una vez detectado
- **Timeout máximo:** 15 minutos

---

## 🔍 CÓMO FUNCIONA POR DENTRO

### **El Test:**
```javascript
1. Inicia llamada con ElevenLabs
   ↓
2. Se queda en loop cada 10 segundos verificando:
   - Estado en ElevenLabs
   - Si existe conversación en BD
   ↓
3. Cuando detecta conversación en BD:
   → Sabe que el monitoreo procesó
   → Muestra detalles
   → Prueba conversación
   ↓
4. Termina exitosamente
```

### **El Monitoreo del Servidor** (corriendo en `npm run dev`):
```javascript
Cada 15 segundos:
1. Lista todos los batches activos
   ↓
2. Por cada batch, verifica recipients
   ↓
3. Si encuentra status = 'completed':
   → Llama a conversationService.handleCallCompleted()
   → Envía WhatsApp
   → Guarda en BD
   → Marca como procesado
```

**El test CONFÍA en que el monitoreo hará su trabajo.**

---

## 🆘 TROUBLESHOOTING

### **Problema: "El servidor no parece estar corriendo"**

**Solución:**
```powershell
# En otra terminal:
npm run dev
```

---

### **Problema: "Tiempo máximo alcanzado"**

**Posibles causas:**
1. No contestaste el teléfono
2. La llamada está muy larga (>15 min)
3. El monitoreo del servidor no está corriendo

**Solución:**
```powershell
# Verifica que en los logs del servidor veas:
🔄 X batch(es) activo(s) - HH:MM:SS

# Si no lo ves, reinicia el servidor
```

---

### **Problema: "Estado: completed pero no hay conversación en BD"**

**Causa:** El monitoreo detectó pero hubo error al enviar WhatsApp.

**Solución:**
```powershell
# Forzar manualmente:
node scripts/forzar-monitoreo.js

# Luego verifica:
node scripts/debug-ultimo-batch.js
```

---

### **Problema: "WhatsApp no llega"**

**Verifica:**
```powershell
# 1. Credenciales de Twilio
node scripts/verificar-sistema.js

# 2. Mensajes en Twilio
node scripts/verificar-mensaje-twilio.js

# 3. Que tu número esté autorizado
# Envía "join abc-def" al +1 415 523 8886
```

---

## 📊 VERIFICAR EN BASE DE DATOS

Mientras el test corre, puedes verificar en otra terminal:

```sql
-- Ver si ya se creó la conversación
SELECT * FROM conversation_state 
WHERE phone_number = '+573138539155'
ORDER BY started_at DESC 
LIMIT 1;

-- Ver mensajes
SELECT 
  direction,
  content,
  sent_at
FROM conversation_messages
WHERE conversation_id = 1
ORDER BY sent_at ASC;
```

---

## 🎯 CASOS DE USO

### **1. Verificar que todo funciona end-to-end**
```powershell
node scripts/test-flujo-completo-activo.js
```

### **2. Demostrar el sistema a alguien**
```powershell
# Ejecuta el test mientras explicas
node scripts/test-flujo-completo-activo.js
```

### **3. Debugging de problemas**
```powershell
# El test te dirá exactamente dónde falla
node scripts/test-flujo-completo-activo.js
```

---

## ✅ QUÉ VALIDA ESTE TEST

| Componente | Validación |
|------------|------------|
| ElevenLabs API | ✅ Puede hacer llamadas |
| Llamada telefónica | ✅ Llega al número |
| Monitoreo del servidor | ✅ Detecta finalizaciones |
| WhatsApp automático | ✅ Se envía al terminar |
| Conversación bidireccional | ✅ Funciona con IA |
| Base de datos | ✅ Guarda todo correctamente |
| Contexto | ✅ Se mantiene en WhatsApp |

---

## 🎉 RESULTADO ESPERADO

**Después de ejecutar este test:**

1. ✅ Recibes llamada
2. ✅ Hablas con agente IA
3. ✅ Cuelgas
4. ✅ En ~30 segundos recibes WhatsApp
5. ✅ Respondes el WhatsApp
6. ✅ El agente te contesta con contexto
7. ✅ Conversación continúa infinitamente

**Todo automático, sin intervención manual.**

---

## 📝 NOTAS IMPORTANTES

- ⚠️ **El test hace llamada REAL** - consume créditos de ElevenLabs
- ⚠️ **Requiere servidor corriendo** - el monitoreo debe estar activo
- ⚠️ **Debes contestar** - si no contestas, timeout
- ✅ **Puedes interrumpir** - Ctrl+C en cualquier momento
- ✅ **Es idempotente** - puedes ejecutarlo múltiples veces

---

¡Listo para probar! 🚀

```powershell
node scripts/test-flujo-completo-activo.js
```

