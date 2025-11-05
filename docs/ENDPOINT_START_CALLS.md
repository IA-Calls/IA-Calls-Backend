# 📞 Endpoint para Iniciar Llamadas en un Grupo

## Endpoint

```
POST /api/groups/:id/call
```

## Descripción

Inicia llamadas masivas (batch calls) para todos los clientes asignados a un grupo específico usando el agente de ElevenLabs asignado al grupo.

---

## Autenticación

Requiere autenticación mediante token JWT en el header:

```
Authorization: Bearer <token>
```

---

## Parámetros de URL

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | Integer | ✅ Sí | ID del grupo para el cual se iniciarán las llamadas |

---

## Body Request

```json
{
  "userId": 5,
  "agentPhoneNumberId": "phnum_5301k8z2pdqbfmf958wxpq0z0wb7",
  "scheduledTimeUnix": null
}
```

### Campos del Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `userId` | Integer | ✅ Sí | ID del usuario que está iniciando las llamadas (para tracking) |
| `agentPhoneNumberId` | String | ❌ No | ID del número de teléfono de ElevenLabs a usar. Si no se proporciona, se usa el del grupo o se obtiene uno disponible automáticamente |
| `scheduledTimeUnix` | Integer/null | ❌ No | Timestamp Unix para programar las llamadas. Si es `null`, las llamadas se inician inmediatamente |

---

## Validaciones

El endpoint valida automáticamente:

1. ✅ **El grupo existe** - Si no existe, retorna error 404
2. ✅ **El grupo tiene un agente asignado** - Si no tiene `agentId`, retorna error 400
3. ✅ **El grupo tiene clientes** - Si no tiene clientes asignados, retorna error 400
4. ✅ **El usuario existe** - Si el `userId` no existe, retorna error 404
5. ✅ **Hay números de teléfono disponibles** - Si no hay `phoneNumberId` y no se puede obtener uno de ElevenLabs, retorna error 400

---

## Response Exitoso (200)

```json
{
  "success": true,
  "message": "Llamadas iniciadas exitosamente para el grupo \"Nombre del Grupo\"",
  "data": {
    "batchId": "btcal_6701k8rhhgr7fcnbj9fdsdtxnmnc",
    "groupId": 18,
    "groupName": "Nombre del Grupo",
    "agentId": "agent_1601k8xw7yc5ex893rd7qj9ybppn",
    "recipientsCount": 100,
    "callName": "Llamada Nombre del Grupo - 02/11/2025",
    "batchData": {
      "id": "btcal_6701k8rhhgr7fcnbj9fdsdtxnmnc",
      "name": "Llamada Nombre del Grupo - 02/11/2025",
      "status": "pending",
      "agent_id": "agent_1601k8xw7yc5ex893rd7qj9ybppn",
      "recipients": [
        {
          "phone_number": "+573138539155",
          "recipient_id": "recipient_123"
        }
      ]
    }
  }
}
```

### Campos de la Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | Boolean | Indica si la operación fue exitosa |
| `message` | String | Mensaje descriptivo |
| `data.batchId` | String | ID del batch de llamadas en ElevenLabs |
| `data.groupId` | Integer | ID del grupo |
| `data.groupName` | String | Nombre del grupo |
| `data.agentId` | String | ID del agente usado para las llamadas |
| `data.recipientsCount` | Integer | Número de clientes a los que se llamará |
| `data.callName` | String | Nombre de la llamada batch |
| `data.batchData` | Object | Datos completos del batch de ElevenLabs |

---

## Errores Comunes

### Error 400: Grupo sin agente

```json
{
  "success": false,
  "message": "El grupo no tiene un agente asignado. Por favor, asigna un agente al crear el grupo."
}
```

**Solución**: Asegúrate de que el grupo tenga un `agentId` asignado al crearlo usando `POST /api/groups`.

---

### Error 400: Grupo sin clientes

```json
{
  "success": false,
  "message": "El grupo no tiene clientes asignados para llamar"
}
```

**Solución**: Asegúrate de que el grupo tenga clientes asignados (cargados desde un archivo Excel/CSV o agregados manualmente).

---

### Error 400: No hay números de teléfono disponibles

```json
{
  "success": false,
  "message": "No hay números de teléfono disponibles. Por favor, configura un phoneNumberId.",
  "error": "..."
}
```

**Solución**: Proporciona un `agentPhoneNumberId` en el body o asegúrate de que el grupo tenga un `phoneNumberId` configurado.

---

### Error 400: userId no proporcionado

```json
{
  "success": false,
  "message": "ID de usuario es requerido en el body de la petición"
}
```

**Solución**: Incluye el campo `userId` en el body de la petición.

---

### Error 404: Grupo no encontrado

```json
{
  "success": false,
  "message": "Grupo no encontrado"
}
```

**Solución**: Verifica que el ID del grupo en la URL sea correcto.

---

### Error 404: Usuario no encontrado

```json
{
  "success": false,
  "message": "Usuario no encontrado"
}
```

**Solución**: Verifica que el `userId` proporcionado exista en la base de datos.

---

## Ejemplo de Uso

### JavaScript/Fetch

```javascript
const startCalls = async (groupId, userId) => {
  try {
    const response = await fetch(`/api/groups/${groupId}/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: userId,
        agentPhoneNumberId: null, // Opcional: usa el del grupo
        scheduledTimeUnix: null  // Inmediato
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Llamadas iniciadas:', data.data.batchId);
      console.log(`📊 Clientes a llamar: ${data.data.recipientsCount}`);
      return data;
    } else {
      console.error('❌ Error:', data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error de red:', error);
    return null;
  }
};

// Uso
startCalls(18, 5);
```

---

### cURL

```bash
curl -X POST http://localhost:5000/api/groups/18/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": 5,
    "agentPhoneNumberId": null,
    "scheduledTimeUnix": null
  }'
```

---

### Axios

```javascript
import axios from 'axios';

const startCalls = async (groupId, userId) => {
  try {
    const response = await axios.post(
      `/api/groups/${groupId}/call`,
      {
        userId: userId,
        agentPhoneNumberId: null,
        scheduledTimeUnix: null
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error iniciando llamadas:', error.response?.data || error.message);
    throw error;
  }
};
```

---

## Flujo Completo

1. **Crear grupo con agente** (requerido primero):
   ```
   POST /api/groups
   {
     "name": "Mi Grupo",
     "agentId": "agent_1601k8xw7yc5ex893rd7qj9ybppn",
     "base64": "...",
     "document_name": "clientes.xlsx",
     ...
   }
   ```

2. **Iniciar llamadas**:
   ```
   POST /api/groups/:id/call
   {
     "userId": 5,
     "agentPhoneNumberId": null,
     "scheduledTimeUnix": null
   }
   ```

3. **Monitorear estado** (opcional):
   ```
   GET /api/groups/:id/batch-status
   GET /api/groups/:id/batch-status/:batchId
   ```

---

## Notas Importantes

1. ⚠️ **El grupo DEBE tener un `agentId` asignado** antes de iniciar llamadas
2. ⚠️ **El grupo DEBE tener clientes asignados** (cargados desde archivo o agregados manualmente)
3. ✅ El `agentPhoneNumberId` es opcional - se usa el del grupo si está disponible
4. ✅ Si no se proporciona `phoneNumberId`, el sistema intenta obtener uno automáticamente de ElevenLabs
5. ✅ Los números de teléfono se formatean automáticamente usando el `prefix` del grupo (ej: `+57` para Colombia)
6. ✅ Las llamadas se inician inmediatamente si `scheduledTimeUnix` es `null`

---

## Endpoints Relacionados

- **Crear grupo**: `POST /api/groups` (ver `docs/CAMBIOS_ENDPOINT_GRUPOS.md`)
- **Obtener estado del batch**: `GET /api/groups/:id/batch-status/:batchId`
- **Historial de llamadas**: `GET /api/groups/:id/call-history`
- **Estadísticas de llamadas**: `GET /api/groups/:id/call-stats`

---

## Referencias

- Documentación de cambios en grupos: `docs/CAMBIOS_ENDPOINT_GRUPOS.md`
- Documentación de agentes: `docs/ENDPOINT_LIST_AGENTS.md`

