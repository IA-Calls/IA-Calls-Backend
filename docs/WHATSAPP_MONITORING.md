# Monitoreo Automático de Llamadas y WhatsApp

## 📋 Descripción

Este sistema monitorea automáticamente las llamadas de batch realizadas con ElevenLabs y envía mensajes de WhatsApp a través de Twilio cuando las llamadas se completan.

## 🔄 Flujo de Funcionamiento

```
1. Se inicia un Batch Call en ElevenLabs
   ↓
2. Sistema inicia monitoreo automático (cada 30 segundos)
   ↓
3. Primera verificación después de 5 segundos
   ↓
4. Cuando una llamada se completa:
   ├─ Detecta el estado "completed" o "finished"
   ├─ Obtiene transcripción de la conversación (opcional)
   ├─ Formatea mensaje personalizado
   └─ Envía WhatsApp con Twilio
   ↓
5. Proceso continúa hasta que todas las llamadas terminen
```

## ⚙️ Configuración

### Variables de Entorno

Agrega estas variables en tu archivo `.env`:

```env
# Twilio WhatsApp
TWILIO_ACCOUNT_SID=AC332953b4c00211a282b4c59d45faf749
TWILIO_AUTH_TOKEN=cfd6638b2384981c48edfe84835219da
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# ElevenLabs
ELEVENLABS_API_KEY=tu_api_key_aqui
```

### Instalación de Dependencias

```bash
npm install twilio
```

## 🚀 Uso

### Inicio Automático

El monitoreo se inicia automáticamente cuando creas un batch call:

```javascript
const batchResult = await elevenlabsService.submitBatchCall({
  callName: 'Mi Batch Call',
  agentId: 'agent_id_here',
  agentPhoneNumberId: 'phone_id_here',
  recipients: [
    {
      phone_number: '+573138539155',
      variables: {
        name: 'Alejandro'
      }
    }
  ]
});

// El monitoreo se inicia automáticamente
// No necesitas hacer nada más
```

### Características del Monitoreo

- **Primera verificación**: 5 segundos después de iniciar
- **Verificaciones periódicas**: Cada 30 segundos
- **Timeout**: Se detiene automáticamente después de 2 horas
- **Sin duplicados**: Cada cliente recibe solo 1 mensaje
- **Logs detallados**: Seguimiento completo en consola

## 📱 Formato de Mensaje de WhatsApp

El mensaje enviado incluye:

```
¡Hola [Nombre]! 👋

Acabamos de tener una conversación telefónica y me gustaría continuar el diálogo contigo por aquí.

Por favor, comparte tus dudas o comentarios para que pueda ayudarte mejor. 😊

---
*IA Calls*
```

## 🔍 Monitoreo de Estados

El sistema detecta los siguientes estados:

| Estado | Descripción | Acción |
|--------|-------------|--------|
| `in_progress` | Llamada en progreso | Esperar |
| `completed` | Llamada completada | ✅ Enviar WhatsApp |
| `finished` | Llamada finalizada | ✅ Enviar WhatsApp |
| `failed` | Llamada fallida | No enviar |
| `cancelled` | Llamada cancelada | No enviar |

## 📊 Logs del Sistema

### Logs de Inicio
```
📊 ===== INICIANDO MONITOREO DE BATCH =====
📊 Batch ID: batch_123
📊 Total destinatarios originales: 5
📊 Intervalo de verificación: 30 segundos
📊 Timeout máximo: 2 horas
📊 Hora de inicio: 28/10/2025, 18:30:00
⏱️  Programando primera verificación en 5 segundos...
✅ Monitoreo configurado exitosamente para batch batch_123
```

### Logs de Verificación
```
🔄 ===== VERIFICACIÓN #1 DEL BATCH batch_123 =====
🕐 Hora: 28/10/2025, 18:30:05
📊 Estado del batch: in_progress
📋 Procesando 5 recipients...
📊 Resumen de estados: { in_progress: 3, completed: 2 }
📞 Recipient: +573138539155, Status: completed
```

### Logs de Envío de WhatsApp
```
✅ Llamada completada detectada para: +573138539155
📱 ===== INICIANDO ENVÍO DE WHATSAPP =====
📱 Número original: +573138539155
📱 Nombre del cliente: Alejandro
📱 Número formateado para Twilio: +573138539155
📤 Enviando mensaje de WhatsApp a +573138539155...
✅ Mensaje enviado exitosamente
📨 Message SID: SM123...
```

## 🧪 Testing

### Test Manual

Ejecuta el test de WhatsApp:

```bash
node scripts/test-twilio-whatsapp.js
```

### Test de Llamada Real

1. Inicia un batch call desde el frontend
2. Observa los logs en la consola del backend
3. Espera a que la llamada se complete
4. Verifica que el mensaje de WhatsApp llegue

## 🔧 Solución de Problemas

### El mensaje no llega

1. **Verifica las credenciales de Twilio**:
   ```bash
   # En el test deberías ver:
   ✅ TwilioWhatsAppService inicializado
   Account SID: AC332953b4...
   ```

2. **Verifica que el monitoreo esté activo**:
   ```bash
   # Deberías ver en logs:
   📊 ===== INICIANDO MONITOREO DE BATCH =====
   ```

3. **Verifica el formato del número**:
   - Debe incluir código de país: `+573138539155`
   - Sin espacios ni caracteres especiales

4. **Revisa el estado de la llamada**:
   ```bash
   # En logs deberías ver:
   📊 Resumen de estados: { completed: 1 }
   ```

### El monitoreo se detiene

- El monitoreo se detiene automáticamente cuando:
  - Todas las llamadas están completadas
  - El batch está en estado `completed`, `cancelled` o `failed`
  - Han pasado 2 horas (timeout de seguridad)

### Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Cannot find module 'twilio'` | Paquete no instalado | `npm install twilio` |
| `Error 20003` | Credenciales inválidas | Verifica TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN |
| `Error 21211` | Número inválido | Verifica formato del número (+código_país + número) |

## 📈 Métricas

El sistema registra:
- Número de verificaciones realizadas
- Llamadas completadas detectadas
- Mensajes de WhatsApp enviados
- Errores y reintentos
- Tiempo total de monitoreo

## 🔐 Seguridad

- Las credenciales se almacenan en variables de entorno
- Los logs no muestran tokens completos
- El monitoreo se detiene automáticamente (timeout)
- Prevención de duplicados de mensajes

## 📞 Soporte

Para problemas o preguntas:
1. Revisa los logs detallados en consola
2. Ejecuta el test: `node scripts/test-twilio-whatsapp.js`
3. Verifica la documentación de Twilio: https://www.twilio.com/docs/whatsapp

