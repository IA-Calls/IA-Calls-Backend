# 📞 Endpoint de Prueba Rápida de Llamada

## Endpoint

```
POST /api/agents/test-call
```

## Descripción

Endpoint para realizar pruebas rápidas de llamadas con agentes de ElevenLabs. Permite hacer una llamada inmediata a un número específico usando un agente seleccionado.

---

## Autenticación

Requiere autenticación mediante token JWT en el header:

```
Authorization: Bearer <token>
```

---

## Body Request

```json
{
  "agent_id": "abc123def456...",
  "agent_phone_number_id": "phnum_5301k8z2pdqbfmf958wxpq0z0wb7",
  "recipient_name": "Juan Pérez",
  "recipient_phone_number": "+573001234567",
  "dynamic_variables": {
    "name": "Juan Pérez",
    "category": "Cliente VIP",
    "custom_field": "valor personalizado"
  }
}
```

### Campos del Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `agent_id` | String | ✅ Sí | ID del agente de ElevenLabs a usar para la llamada |
| `agent_phone_number_id` | String | ❌ No | ID del número de teléfono de ElevenLabs a usar. Si no se proporciona, se obtiene automáticamente el primer número disponible |
| `recipient_name` | String | ❌ No | Nombre del destinatario de la llamada |
| `recipient_phone_number` | String | ✅ Sí | Número de teléfono del destinatario (formato internacional con +) |
| `dynamic_variables` | Object | ❌ No | Variables dinámicas para usar en el prompt del agente. Por defecto incluye `name` con el valor de `recipient_name` |

---

## Validaciones

El endpoint valida automáticamente:

1. ✅ **Usuario autenticado** - Si no está autenticado, retorna error 401
2. ✅ **agent_id requerido** - Si no se proporciona, retorna error 400
3. ✅ **recipient_phone_number requerido** - Si no se proporciona, retorna error 400
4. ✅ **Agente pertenece al usuario** - Si el agente no pertenece al usuario autenticado, retorna error 403
5. ✅ **Número de teléfono disponible** - Si no se proporciona `agent_phone_number_id` y no hay números disponibles, retorna error 400

---

## Response Exitoso (200)

```json
{
  "success": true,
  "message": "Llamada de prueba iniciada exitosamente",
  "data": {
    "batch_id": "batch_abc123...",
    "agent_id": "abc123def456...",
    "agent_phone_number_id": "phnum_5301k8z2pdqbfmf958wxpq0z0wb7",
    "recipient": {
      "name": "Juan Pérez",
      "phone_number": "+573001234567",
      "variables": {
        "name": "Juan Pérez",
        "category": "Cliente VIP"
      }
    },
    "call_name": "Prueba Rápida - Juan Pérez - 15/1/2024 10:30:00",
    "scheduled_time": null,
    "status": "pending"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Errores

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Usuario no autenticado",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 400 Bad Request

**Falta agent_id:**
```json
{
  "success": false,
  "message": "El campo \"agent_id\" es requerido",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Falta recipient_phone_number:**
```json
{
  "success": false,
  "message": "El campo \"recipient_phone_number\" es requerido",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**No hay números disponibles:**
```json
{
  "success": false,
  "message": "No hay números de teléfono disponibles. Por favor, proporciona \"agent_phone_number_id\"",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Acceso denegado: El agente no pertenece al usuario autenticado",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Error al iniciar la llamada de prueba",
  "error": "Error detallado de ElevenLabs",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Ejemplos de cURL

### Ejemplo Básico

```bash
curl -X POST http://localhost:5050/api/agents/test-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI" \
  -d '{
    "agent_id": "abc123def456...",
    "recipient_name": "Juan Pérez",
    "recipient_phone_number": "+573001234567"
  }'
```

### Ejemplo Completo con Variables Dinámicas

```bash
curl -X POST http://localhost:5050/api/agents/test-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI" \
  -d '{
    "agent_id": "abc123def456...",
    "agent_phone_number_id": "phnum_5301k8z2pdqbfmf958wxpq0z0wb7",
    "recipient_name": "María García",
    "recipient_phone_number": "+573001234567",
    "dynamic_variables": {
      "name": "María García",
      "category": "Cliente Premium",
      "product": "Servicio VIP",
      "discount": "20%"
    }
  }'
```

### Ejemplo con Variables Personalizadas

```bash
curl -X POST http://localhost:5050/api/agents/test-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI" \
  -d '{
    "agent_id": "abc123def456...",
    "recipient_name": "Carlos Rodríguez",
    "recipient_phone_number": "+573001234567",
    "dynamic_variables": {
      "name": "Carlos Rodríguez",
      "appointment_date": "2024-01-20",
      "appointment_time": "10:00 AM",
      "location": "Oficina Principal"
    }
  }'
```

---

## Flujo de Ejecución

1. **Validación de autenticación** - Verifica que el usuario esté autenticado
2. **Validación de datos** - Verifica que `agent_id` y `recipient_phone_number` estén presentes
3. **Validación de ownership** - Verifica que el agente pertenezca al usuario autenticado
4. **Obtención de número de teléfono** - Si no se proporciona `agent_phone_number_id`, obtiene uno disponible automáticamente
5. **Preparación de datos** - Construye el payload para ElevenLabs con:
   - Nombre de la llamada (incluye nombre del destinatario y timestamp)
   - ID del agente
   - ID del número de teléfono del agente
   - Lista de destinatarios con variables dinámicas
   - Tiempo programado (null = inmediato)
6. **Envío a ElevenLabs** - Llama a `submitBatchCall` con los datos preparados
7. **Respuesta** - Devuelve el `batch_id` y los detalles de la llamada iniciada

---

## Variables Dinámicas

Las variables dinámicas se pasan al agente y pueden ser usadas en el prompt del agente usando la sintaxis `{{variable_name}}`.

**Ejemplo de prompt del agente:**
```
Hola {{name}}, te llamamos para informarte sobre {{product}}.
Tienes un descuento del {{discount}} disponible.
```

**Variables por defecto:**
- `name`: Se establece automáticamente con el valor de `recipient_name` si se proporciona

**Variables personalizadas:**
- Cualquier campo en `dynamic_variables` estará disponible para el agente

---

## Notas Importantes

1. **Llamada Inmediata**: La llamada se inicia inmediatamente (no se programa)
2. **Un Solo Destinatario**: Este endpoint está diseñado para pruebas rápidas con un solo destinatario
3. **Validación de Ownership**: Solo puedes usar agentes que te pertenezcan
4. **Números Disponibles**: Si no proporcionas `agent_phone_number_id`, se usa el primer número disponible de ElevenLabs
5. **Formato de Teléfono**: El número debe estar en formato internacional con `+` (ej: `+573001234567`)

---

## Monitoreo de la Llamada

Después de iniciar la llamada, puedes monitorear su estado usando:

```bash
# Obtener estado del batch call
curl -X GET http://localhost:5050/api/batch-calls/${batch_id} \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI"
```

O consultar directamente en ElevenLabs usando el `batch_id` devuelto.

---

## Troubleshooting

### Error: "El agente no pertenece al usuario autenticado"

**Solución:** Verifica que el `agent_id` pertenezca al usuario autenticado. Lista tus agentes primero:

```bash
curl -X GET http://localhost:5050/api/agents \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI"
```

### Error: "No hay números de teléfono disponibles"

**Solución:** Proporciona explícitamente un `agent_phone_number_id`. Obtén los números disponibles:

```bash
curl -X GET http://localhost:5050/api/agents/phone-numbers
```

### Error: "Error al iniciar la llamada de prueba"

**Solución:** Revisa los logs del servidor para ver el error detallado de ElevenLabs. Puede ser:
- El agente no existe en ElevenLabs
- El número de teléfono no es válido
- Problemas de conectividad con ElevenLabs

---

## Ejemplo Completo con Script

```bash
#!/bin/bash

BASE_URL="http://localhost:5050"
TOKEN="TU_TOKEN_JWT_AQUI"

# 1. Obtener agentes del usuario
echo "📋 Obteniendo agentes..."
AGENTS=$(curl -s -X GET ${BASE_URL}/api/agents \
  -H "Authorization: Bearer ${TOKEN}")

AGENT_ID=$(echo $AGENTS | jq -r '.data.agents[0].agent_id')
echo "✅ Usando agente: ${AGENT_ID}"

# 2. Obtener números disponibles
echo "📞 Obteniendo números disponibles..."
PHONES=$(curl -s -X GET ${BASE_URL}/api/agents/phone-numbers)

PHONE_ID=$(echo $PHONES | jq -r '.data.phoneNumbers[0].phone_number_id')
echo "✅ Usando número: ${PHONE_ID}"

# 3. Hacer llamada de prueba
echo "📞 Iniciando llamada de prueba..."
RESULT=$(curl -s -X POST ${BASE_URL}/api/agents/test-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"agent_id\": \"${AGENT_ID}\",
    \"agent_phone_number_id\": \"${PHONE_ID}\",
    \"recipient_name\": \"Juan Pérez\",
    \"recipient_phone_number\": \"+573001234567\",
    \"dynamic_variables\": {
      \"name\": \"Juan Pérez\",
      \"test\": \"true\"
    }
  }")

echo $RESULT | jq '.'

BATCH_ID=$(echo $RESULT | jq -r '.data.batch_id')
echo "✅ Llamada iniciada. Batch ID: ${BATCH_ID}"
```

