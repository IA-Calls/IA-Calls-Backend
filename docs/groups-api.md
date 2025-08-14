# API de Grupos - IA Calls Backend

## Crear Grupo

### Endpoint
```
POST /api/groups
```

### Headers
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Campos del Body

| Campo | Tipo | Requerido | Descripción | Default |
|-------|------|-----------|-------------|---------|
| `name` | string | ✅ | Nombre del grupo | - |
| `description` | string | ❌ | Descripción del grupo | null |
| `prompt` | string | ❌ | Prompt personalizado para el grupo | null |
| `color` | string | ❌ | Color en formato hex (#RRGGBB) | "#3B82F6" |
| `favorite` | boolean | ❌ | Si el grupo es favorito | false |
| `idioma` | string | ❌ | Código de idioma (es, en, fr, etc.) | "es" |
| `variables` | object | ❌ | Variables dinámicas en formato JSON | {} |
| `clientId` | integer | ❌ | ID del cliente que crea el grupo | req.user.id |
| `base64` | string | ❌ | Archivo Excel en base64 | - |
| `document_name` | string | ❌ | Nombre del documento original | - |

### Ejemplo de Request

#### Grupo básico
```json
{
  "name": "Clientes VIP",
  "description": "Clientes de alto valor",
  "color": "#10B981",
  "favorite": true
}
```

#### Grupo con nuevos campos
```json
{
  "name": "Grupo Internacional",
  "description": "Clientes de diferentes países",
  "prompt": "Eres un asistente multilingüe",
  "color": "#F59E0B",
  "favorite": false,
  "idioma": "en",
  "variables": {
    "pais": "Estados Unidos",
    "zona_horaria": "EST",
    "moneda": "USD",
    "configuracion": {
      "idioma_secundario": "es",
      "notificaciones": true
    }
  }
}
```

#### Grupo con archivo Excel
```json
{
  "name": "Clientes Importados",
  "description": "Clientes importados desde Excel",
  "idioma": "es",
  "variables": {
    "fuente": "excel_import",
    "fecha_importacion": "2025-01-27"
  },
  "base64": "UEsDBBQAAAAIAA...",
  "document_name": "clientes.xlsx"
}
```

### Respuesta Exitosa

```json
{
  "success": true,
  "message": "Grupo creado exitosamente",
  "data": {
    "id": 123,
    "name": "Clientes VIP",
    "description": "Clientes de alto valor",
    "prompt": "Eres un asistente especializado",
    "color": "#10B981",
    "favorite": true,
    "idioma": "es",
    "variables": {
      "tipo_cliente": "premium",
      "region": "Bogotá"
    },
    "isActive": true,
    "createdBy": 1,
    "createdByClient": 1,
    "createdAt": "2025-01-27T10:30:00.000Z",
    "updatedAt": "2025-01-27T10:30:00.000Z",
    "fileProcessing": {
      "processed": true,
      "totalClientsFound": 50,
      "clientsCreated": 50,
      "processedFile": "clientes_procesados.xlsx"
    },
    "gcpStorage": {
      "uploaded": true,
      "originalFile": {
        "fileName": "uploads/groups/123/original.xlsx",
        "bucketUrl": "gs://ia_calls_documents/uploads/groups/123/original.xlsx"
      }
    }
  }
}
```

### Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Datos inválidos o campos requeridos faltantes |
| 401 | No autorizado |
| 500 | Error interno del servidor |

## Obtener Grupos

### Endpoint
```
GET /api/groups
```

### Query Parameters

| Parámetro | Tipo | Descripción | Default |
|-----------|------|-------------|---------|
| `limit` | integer | Número máximo de grupos | 50 |
| `offset` | integer | Número de grupos a saltar | 0 |
| `includeInactive` | boolean | Incluir grupos inactivos | false |

### Respuesta

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "name": "Clientes VIP",
      "description": "Clientes de alto valor",
      "prompt": "Eres un asistente especializado",
      "color": "#10B981",
      "favorite": true,
      "idioma": "es",
      "variables": {
        "tipo_cliente": "premium",
        "region": "Bogotá"
      },
      "isActive": true,
      "createdBy": 1,
      "createdByClient": 1,
      "createdAt": "2025-01-27T10:30:00.000Z",
      "updatedAt": "2025-01-27T10:30:00.000Z"
    }
  ]
}
```

## Actualizar Grupo

### Endpoint
```
PUT /api/groups/:id
```

### Campos Actualizables

- `name`
- `description`
- `prompt`
- `color`
- `favorite`
- `idioma`
- `variables`

### Ejemplo

```json
{
  "name": "Clientes VIP Actualizado",
  "idioma": "en",
  "variables": {
    "tipo_cliente": "premium",
    "region": "Nueva York",
    "actualizado": true
  }
}
```

## Eliminar Grupo

### Endpoint
```
DELETE /api/groups/:id
```

**Nota**: Los grupos se eliminan de forma lógica (soft delete), marcándolos como inactivos.

## Notas sobre los Nuevos Campos

### Campo `idioma`
- Acepta códigos de idioma estándar (ISO 639-1)
- Ejemplos: `es`, `en`, `fr`, `pt`, `de`
- Valor por defecto: `"es"`

### Campo `variables`
- Campo JSONB que permite almacenar cualquier estructura de datos
- Útil para configuraciones dinámicas, metadatos, o datos específicos del grupo
- Valor por defecto: `{}`
- Ejemplos de uso:
  - Configuraciones de notificaciones
  - Metadatos del grupo
  - Variables de personalización
  - Configuraciones regionales
  - Datos específicos del negocio
