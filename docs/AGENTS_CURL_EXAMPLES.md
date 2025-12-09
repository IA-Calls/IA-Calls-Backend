# 📡 Ejemplos de cURL para Agentes de ElevenLabs

## 🔑 Configuración Inicial

### 1. Obtener Token JWT

```bash
# Login para obtener token
curl -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tu_usuario",
    "password": "tu_contraseña"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "username": "tu_usuario"
  }
}
```

**Guarda el token en una variable:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
BASE_URL="http://localhost:5050"
```

---

## 📋 Operaciones CRUD

### 1. Crear un Agente

```bash
curl -X POST ${BASE_URL}/api/agents/create-agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Mi Agente de Soporte",
    "prompt_text": "Eres un asistente de soporte técnico. Responde preguntas sobre nuestros productos de manera amigable y profesional.",
    "tts_voice_id": "WOSzFvlJRm2hkYb3KA5w",
    "agent_language": "es",
    "agent_first_message": "Hola, ¿en qué puedo ayudarte hoy?",
    "tts_stability": 0.5,
    "tts_speed": 1.0,
    "tts_similarity_boost": 0.8
  }'
```

**Ejemplo con campos mínimos:**
```bash
curl -X POST ${BASE_URL}/api/agents/create-agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Agente Simple",
    "prompt_text": "Eres un asistente útil",
    "tts_voice_id": "WOSzFvlJRm2hkYb3KA5w"
  }'
```

---

### 2. Listar Agentes del Usuario

```bash
curl -X GET ${BASE_URL}/api/agents \
  -H "Authorization: Bearer ${TOKEN}"
```

**Con formato JSON (requiere jq):**
```bash
curl -X GET ${BASE_URL}/api/agents \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
```

---

### 3. Obtener un Agente Específico

```bash
# Reemplaza AGENT_ID con el ID real del agente
AGENT_ID="abc123def456..."

curl -X GET ${BASE_URL}/api/agents/${AGENT_ID} \
  -H "Authorization: Bearer ${TOKEN}"
```

**Ejemplo completo:**
```bash
curl -X GET http://localhost:5050/api/agents/abc123def456... \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | jq '.'
```

---

### 4. Actualizar un Agente

```bash
AGENT_ID="abc123def456..."

curl -X PATCH ${BASE_URL}/api/agents/${AGENT_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Nombre Actualizado",
    "prompt_text": "Nuevas instrucciones para el agente"
  }'
```

**Actualizar solo el nombre:**
```bash
curl -X PATCH ${BASE_URL}/api/agents/${AGENT_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Nuevo Nombre"
  }'
```

**Usando PUT (alternativa):**
```bash
curl -X PUT ${BASE_URL}/api/agents/${AGENT_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Nombre Actualizado"
  }'
```

---

### 5. Eliminar un Agente

```bash
AGENT_ID="abc123def456..."

curl -X DELETE ${BASE_URL}/api/agents/${AGENT_ID} \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### 6. Crear Agente con Prompt (Vertex AI)

```bash
curl -X POST ${BASE_URL}/api/agents/create-with-prompt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Agente Generado con IA",
    "prompt": "Crea un agente que sea un experto en ventas de productos tecnológicos",
    "tts_voice_id": "WOSzFvlJRm2hkYb3KA5w"
  }'
```

---

## 🧪 Script de Prueba Completo

Copia y pega este script completo en un archivo `test-agents.sh`:

```bash
#!/bin/bash

# ============================================
# Script de Prueba para Agentes de ElevenLabs
# ============================================

# Configuración
BASE_URL="http://localhost:5050"
USERNAME="tu_usuario"
PASSWORD="tu_contraseña"

echo "🔐 === 1. Autenticación ==="
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"${USERNAME}\",
    \"password\": \"${PASSWORD}\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.user.id')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Error de autenticación"
  echo $LOGIN_RESPONSE | jq '.'
  exit 1
fi

echo "✅ Token obtenido: ${TOKEN:0:20}..."
echo "👤 Usuario ID: ${USER_ID}"
echo ""

echo "🤖 === 2. Crear Agente ==="
CREATE_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/agents/create-agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Agente de Prueba",
    "prompt_text": "Eres un agente de prueba para testing",
    "tts_voice_id": "WOSzFvlJRm2hkYb3KA5w",
    "agent_language": "es"
  }')

AGENT_ID=$(echo $CREATE_RESPONSE | jq -r '.data.agent_id')

if [ "$AGENT_ID" == "null" ] || [ -z "$AGENT_ID" ]; then
  echo "❌ Error creando agente"
  echo $CREATE_RESPONSE | jq '.'
  exit 1
fi

echo "✅ Agente creado: ${AGENT_ID}"
echo $CREATE_RESPONSE | jq '.data | {id, agent_id, name, user_id}'
echo ""

echo "📋 === 3. Listar Agentes ==="
LIST_RESPONSE=$(curl -s -X GET ${BASE_URL}/api/agents \
  -H "Authorization: Bearer ${TOKEN}")

echo $LIST_RESPONSE | jq '.data | {count, agents: [.agents[] | {id, agent_id, name}]}'
echo ""

echo "🔍 === 4. Obtener Agente Específico ==="
GET_RESPONSE=$(curl -s -X GET ${BASE_URL}/api/agents/${AGENT_ID} \
  -H "Authorization: Bearer ${TOKEN}")

echo $GET_RESPONSE | jq '.data | {agent_id, name, local_data: .local_data | {id, user_id, name}}'
echo ""

echo "🔄 === 5. Actualizar Agente ==="
UPDATE_RESPONSE=$(curl -s -X PATCH ${BASE_URL}/api/agents/${AGENT_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Agente Actualizado"
  }')

echo $UPDATE_RESPONSE | jq '.data | {agent_id, name}'
echo ""

echo "🗑️ === 6. Eliminar Agente ==="
DELETE_RESPONSE=$(curl -s -X DELETE ${BASE_URL}/api/agents/${AGENT_ID} \
  -H "Authorization: Bearer ${TOKEN}")

echo $DELETE_RESPONSE | jq '.'
echo ""

echo "✅ Pruebas completadas"
```

**Ejecutar:**
```bash
chmod +x test-agents.sh
./test-agents.sh
```

---

## 🔒 Pruebas de Seguridad (Multiusuario)

### Test 1: Usuario A crea agente, Usuario B no lo ve

```bash
# Usuario A crea agente
TOKEN_A="token_del_usuario_a"
curl -X POST ${BASE_URL}/api/agents/create-agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN_A}" \
  -d '{"name": "Agente Usuario A", "prompt_text": "...", "tts_voice_id": "WOSzFvlJRm2hkYb3KA5w"}'

# Usuario B lista agentes (no debe ver el de A)
TOKEN_B="token_del_usuario_b"
curl -X GET ${BASE_URL}/api/agents \
  -H "Authorization: Bearer ${TOKEN_B}"
```

### Test 2: Usuario B intenta acceder al agente de Usuario A

```bash
AGENT_ID_A="agent_id_del_usuario_a"
TOKEN_B="token_del_usuario_b"

curl -X GET ${BASE_URL}/api/agents/${AGENT_ID_A} \
  -H "Authorization: Bearer ${TOKEN_B}"
```

**Debería devolver 403 Forbidden:**
```json
{
  "success": false,
  "message": "Acceso denegado: El agente no pertenece al usuario autenticado"
}
```

---

## 📝 Ejemplos con PowerShell (Windows)

```powershell
# Configuración
$baseUrl = "http://localhost:5050"
$token = "TU_TOKEN_AQUI"

# Crear agente
$body = @{
    name = "Mi Agente"
    prompt_text = "Eres un asistente útil"
    tts_voice_id = "WOSzFvlJRm2hkYb3KA5w"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$baseUrl/api/agents/create-agent" `
    -Method Post `
    -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    } `
    -Body $body

# Listar agentes
Invoke-RestMethod -Uri "$baseUrl/api/agents" `
    -Method Get `
    -Headers @{
        "Authorization" = "Bearer $token"
    }
```

---

## 🌐 Ejemplos con Postman

### Collection JSON para importar en Postman:

```json
{
  "info": {
    "name": "Agentes ElevenLabs",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:5050"
    },
    {
      "key": "token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Crear Agente",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Mi Agente\",\n  \"prompt_text\": \"Eres un asistente útil\",\n  \"tts_voice_id\": \"WOSzFvlJRm2hkYb3KA5w\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/agents/create-agent",
          "host": ["{{base_url}}"],
          "path": ["api", "agents", "create-agent"]
        }
      }
    },
    {
      "name": "Listar Agentes",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/agents",
          "host": ["{{base_url}}"],
          "path": ["api", "agents"]
        }
      }
    }
  ]
}
```

---

## ⚠️ Errores Comunes

### Error 401: Unauthorized
```bash
# Verifica que el token sea válido
curl -X GET ${BASE_URL}/api/agents \
  -H "Authorization: Bearer ${TOKEN}" \
  -v
```

### Error 403: Forbidden
```bash
# El agente no pertenece al usuario autenticado
# Verifica que estés usando el token correcto
```

### Error 404: Not Found
```bash
# El agent_id no existe o no está en ElevenLabs
# Verifica el ID del agente
```

### Error 500: Internal Server Error
```bash
# Revisa los logs del servidor
# Verifica que la tabla agents existe: npm run create:agents-table
```

---

## 📚 Referencias

- [Documentación Completa](./AGENTS_MULTIUSER.md)
- [API de ElevenLabs](https://elevenlabs.io/docs/api-reference)
- [Documentación de cURL](https://curl.se/docs/)

