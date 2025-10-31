# Monitoreo en Segundo Plano de Batch Calls

## 📋 Descripción

El sistema incluye un **servicio de monitoreo global** que se ejecuta continuamente en segundo plano desde que el servidor arranca. Este servicio verifica todos los batch calls activos cada 15 segundos y envía mensajes de WhatsApp automáticamente cuando las llamadas se completan.

## 🚀 Características

### ✅ Monitoreo Automático
- Se inicia automáticamente al arrancar el servidor
- Verifica TODOS los batches activos cada 15 segundos
- No requiere configuración manual
- Se ejecuta de forma independiente y continua

### ✅ Detección Inteligente
- Detecta llamadas en estado `finished`, `completed` o `ended`
- Evita enviar mensajes duplicados
- Procesa múltiples batches simultáneamente
- Filtra batches activos y recientes (último día)

### ✅ Envío Automático de WhatsApp
- Envía mensaje cuando una llamada termina
- Incluye transcripción si está disponible
- Mensaje personalizado con nombre del cliente
- Usa Twilio para máxima confiabilidad

## 🔄 Flujo de Funcionamiento

```
Servidor Inicia
    ↓
Monitoreo Global Activo (en segundo plano)
    ↓
Cada 15 segundos:
    ├─ Obtener lista de todos los batches
    ├─ Filtrar batches activos/recientes
    ├─ Para cada batch:
    │   ├─ Verificar estado de recipients
    │   ├─ Detectar si alguno está "finished"
    │   └─ Si está finished y no procesado:
    │       ├─ Obtener transcripción (opcional)
    │       ├─ Enviar WhatsApp con Twilio
    │       └─ Marcar como procesado
    └─ Continuar verificando...
```

## 📊 Logs del Sistema

### Al Iniciar el Servidor
```
🚀 Servidor corriendo en puerto 3000
📍 Entorno: development
🌐 URL: http://localhost:3000

🚀 ===== INICIANDO MONITOREO GLOBAL DE BATCH CALLS =====
📊 Intervalo de verificación: 15 segundos
🕐 Hora de inicio: 28/10/2025, 18:45:00
⚡ El monitoreo se ejecutará continuamente en segundo plano
✅ Monitoreo global iniciado exitosamente
```

### Durante el Monitoreo
```
🔄 ===== VERIFICACIÓN GLOBAL DE BATCHES =====
🕐 Hora: 28/10/2025, 18:45:15
📋 Total de batches en workspace: 5
🎯 Batches activos/recientes a monitorear: 2

  📦 Verificando batch: btcal_xxx...
  📊 Batch Llamada test:
     Estado batch: completed
     Recipients: { finished: 1 }
  ✅✅✅ LLAMADA FINALIZADA DETECTADA: +573138539155 ✅✅✅
     Estado: finished
     Conversation ID: conv_xxx
  📱 Preparando WhatsApp para: +573138539155 (Alejandro)
  📤 Enviando WhatsApp...
  ✅ WhatsApp enviado exitosamente a Alejandro
  📨 Message SID: SMxxx...

✅ Verificación global completada
```

## ⚙️ Configuración

### Variables de Entorno
```env
# Twilio WhatsApp
TWILIO_ACCOUNT_SID=AC332953b4c00211a282b4c59d45faf749
TWILIO_AUTH_TOKEN=cfd6638b2384981c48edfe84835219da
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# ElevenLabs
ELEVENLABS_API_KEY=tu_api_key_aqui
```

### Sin Configuración Adicional Requerida
El servicio se activa automáticamente. NO necesitas:
- ❌ Iniciar manualmente el monitoreo
- ❌ Configurar webhooks
- ❌ Llamar ningún endpoint especial

## 📱 Mensaje de WhatsApp

El mensaje enviado incluye:

```
¡Hola [Nombre]! 👋

[Si hay transcripción disponible:]
Hemos completado una conversación y me gustaría seguir hablando 
contigo sobre: [Resumen de la transcripción]

[Si NO hay transcripción:]
Acabamos de tener una conversación telefónica y me gustaría 
continuar el diálogo contigo por aquí.

Por favor, comparte tus dudas o comentarios para que pueda 
ayudarte mejor. 😊

---
*IA Calls*
```

## 🔍 Estados Detectados

| Estado | Descripción | Acción |
|--------|-------------|--------|
| `initiated` | Llamada iniciada | ⏳ Esperar |
| `in_progress` | Llamada en curso | ⏳ Esperar |
| `finished` | Llamada finalizada | ✅ Enviar WhatsApp |
| `completed` | Llamada completada | ✅ Enviar WhatsApp |
| `ended` | Llamada terminada | ✅ Enviar WhatsApp |
| `failed` | Llamada fallida | ✅ Enviar WhatsApp |

## 🛡️ Prevención de Duplicados

El sistema mantiene un registro en memoria de todas las llamadas procesadas:
- Clave única: `{phone_number}_{conversation_id}`
- Limpieza automática: Elimina registros de más de 7 días
- Reinicio del servidor: Limpia el registro (se reenviarán mensajes si hay llamadas recientes)

## 📈 Ventajas del Monitoreo Global

### vs. Monitoreo Individual por Batch
| Característica | Monitoreo Global | Monitoreo Individual |
|---------------|------------------|----------------------|
| **Inicio** | Automático | Manual por cada batch |
| **Alcance** | Todos los batches | Un batch específico |
| **Persistencia** | Continua | Limitada (timeout) |
| **Recursos** | Eficiente (1 proceso) | Múltiples procesos |
| **Mantenimiento** | Cero | Requiere gestión |
| **Reinicio** | Se recupera solo | Se pierde el seguimiento |

### Beneficios Clave
- ✅ **Cero configuración**: Funciona desde el primer momento
- ✅ **Altamente confiable**: No depende de webhooks externos
- ✅ **Eficiente**: Un solo proceso para todos los batches
- ✅ **Robusto**: Sobrevive a reinicios y errores
- ✅ **Escalable**: Maneja múltiples batches simultáneamente

## 🔧 Gestión del Servicio

### Verificar Estado
```javascript
const batchMonitoringService = require('./src/services/batchMonitoringService');

// Obtener estadísticas
const stats = batchMonitoringService.getStats();
console.log(stats);
// {
//   isRunning: true,
//   checkInterval: 15,
//   processedCallsCount: 42,
//   lastCheck: "2025-10-28T18:45:30.000Z"
// }
```

### Detener/Reiniciar (Avanzado)
```javascript
// Detener temporalmente
batchMonitoringService.stop();

// Reiniciar
batchMonitoringService.start();
```

## 🧪 Testing

El servicio se probará automáticamente:
1. Inicia el servidor
2. Crea un batch call desde el frontend
3. Espera a que la llamada termine
4. Observa los logs del backend
5. Verifica que el WhatsApp llegue

## 🐛 Solución de Problemas

### El monitoreo no inicia
```bash
# Verifica los logs al arrancar el servidor
# Deberías ver:
🚀 ===== INICIANDO MONITOREO GLOBAL DE BATCH CALLS =====
```

### No detecta llamadas finalizadas
```bash
# Verifica que haya batches activos
# En los logs cada 15 segundos verás:
📋 Total de batches en workspace: X
🎯 Batches activos/recientes a monitorear: Y
```

### WhatsApp no se envía
1. Verifica credenciales de Twilio en `.env`
2. Revisa los logs de error específicos
3. Verifica formato del número de teléfono

## 📊 Métricas

El servicio registra:
- Total de batches monitoreados
- Llamadas detectadas como finalizadas
- WhatsApps enviados exitosamente
- Errores y reintentos
- Tiempo de cada verificación

## 🔐 Consideraciones de Seguridad

- ✅ Credenciales en variables de entorno
- ✅ Logs sanitizados (sin tokens completos)
- ✅ Límite de memoria (limpieza automática)
- ✅ Manejo robusto de errores
- ✅ No expone endpoints públicos

## 💡 Recomendaciones

### Para Desarrollo
- Mantén los logs activos para debugging
- Intervalo recomendado: 15 segundos
- Verifica el dashboard de Twilio

### Para Producción
- Considera aumentar el intervalo a 30 segundos si tienes muchos batches
- Implementa monitoreo de métricas
- Configura alertas para errores críticos
- Usa un proceso manager (PM2) para auto-reinicio

## 🔄 Actualizaciones Futuras

Posibles mejoras:
- [ ] Dashboard de monitoreo en tiempo real
- [ ] Métricas exportadas a Prometheus
- [ ] Notificaciones de errores por email
- [ ] Configuración dinámica del intervalo
- [ ] Soporte para múltiples canales (SMS, Email)

