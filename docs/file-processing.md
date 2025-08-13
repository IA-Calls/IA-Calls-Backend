# Procesamiento de Archivos Excel

## Descripción

Esta funcionalidad permite procesar archivos Excel en formato Base64 al crear grupos, extrayendo automáticamente información de clientes y creándolos en la base de datos.

## Formato del JSON para crear grupos

```json
{
  "name": "string",           // Requerido - Nombre del grupo
  "description": "string",    // Opcional - Descripción del grupo
  "prompt": "string",         // Opcional - Prompt para el grupo
  "color": "string",          // Opcional - Color en formato hex (#3B82F6)
  "favorite": true,           // Opcional - Si el grupo es favorito
  "createdByClient": "string", // Opcional - ID del cliente que crea el grupo
  "base64": "string",         // Opcional - Archivo en base64
  "document_name": "string"   // Opcional - Nombre del documento original
}
```

## Columnas requeridas en el Excel

El archivo Excel debe contener al menos estas columnas (los nombres pueden variar):

### Columnas esenciales:
- **Nombre**: `nombre`, `name`, `nombres`, `cliente`
- **Teléfono**: `telefono`, `phone`, `celular`, `movil`, `tel`

### Columnas opcionales:
- **Email**: `email`, `correo`, `e-mail`
- **Dirección**: `direccion`, `address`, `domicilio`

## Ejemplo de uso

### 1. Crear grupo sin archivo
```bash
POST /api/groups
Content-Type: application/json

{
  "name": "Mi Grupo",
  "description": "Descripción del grupo",
  "color": "#3B82F6",
  "favorite": false
}
```

### 2. Crear grupo con archivo Excel
```bash
POST /api/groups
Content-Type: application/json

{
  "name": "Clientes Importados",
  "description": "Clientes importados desde Excel",
  "base64": "UEsDBBQAAAAIAA...", // Archivo en base64
  "document_name": "clientes.xlsx"
}
```

## Respuesta del endpoint

### Grupo creado sin archivo:
```json
{
  "success": true,
  "message": "Grupo creado exitosamente",
  "data": {
    "id": 1,
    "name": "Mi Grupo",
    "description": "Descripción del grupo",
    "createdByClient": "CLIENTE_123",
    "fileProcessing": {
      "processed": false
    }
  }
}
```

### Grupo creado con archivo procesado:
```json
{
  "success": true,
  "message": "Grupo creado exitosamente",
  "data": {
    "id": 1,
    "name": "Clientes Importados",
    "description": "Clientes importados desde Excel",
    "createdByClient": "CLIENTE_123",
    "fileProcessing": {
      "processed": true,
      "totalClientsFound": 50,
      "clientsCreated": 45,
      "processedFile": {
        "fileName": "clientes_procesados_2024-01-15T10-30-00-000Z.xlsx",
        "filePath": "/path/to/file.xlsx",
        "totalClients": 45
      }
    },
    "gcpStorage": {
      "uploaded": true,
      "originalFile": {
        "fileName": "group-documents/2024/01/15/clientes_2024-01-15T10-30-00-000Z_abc123.xlsx",
        "bucketUrl": "gs://ia_calls_documents/group-documents/2024/01/15/clientes_2024-01-15T10-30-00-000Z_abc123.xlsx",
        "publicUrl": "https://storage.googleapis.com/ia_calls_documents/group-documents/2024/01/15/clientes_2024-01-15T10-30-00-000Z_abc123.xlsx",
        "downloadUrl": "https://storage.googleapis.com/ia_calls_documents/group-documents/2024/01/15/clientes_2024-01-15T10-30-00-000Z_abc123.xlsx?X-Goog-Algorithm=...",
        "size": 15420,
        "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      },
      "processedExcel": {
        "fileName": "group-documents/2024/01/15/clientes_Clientes_Importados_2024-01-15T10-30-00-000Z_def456.xlsx",
        "bucketUrl": "gs://ia_calls_documents/group-documents/2024/01/15/clientes_Clientes_Importados_2024-01-15T10-30-00-000Z_def456.xlsx",
        "publicUrl": "https://storage.googleapis.com/ia_calls_documents/group-documents/2024/01/15/clientes_Clientes_Importados_2024-01-15T10-30-00-000Z_def456.xlsx",
        "downloadUrl": "https://storage.googleapis.com/ia_calls_documents/group-documents/2024/01/15/clientes_Clientes_Importados_2024-01-15T10-30-00-000Z_def456.xlsx?X-Goog-Algorithm=...",
        "size": 12850,
        "documentType": "processed_excel"
      }
    },
    "createdClients": [
      {
        "id": 1,
        "name": "Juan Pérez",
        "phone": "3001234567",
        "email": "juan@email.com",
        "status": "pending"
      }
    ]
  }
}
```

## Descargar archivo procesado

Para descargar el archivo Excel procesado:

```bash
GET /api/groups/download/clientes_procesados_2024-01-15T10-30-00-000Z.xlsx
```

## Características del procesamiento

### Limpieza de datos:
- **Nombres**: Se eliminan espacios en blanco al inicio y final
- **Teléfonos**: 
  - Se eliminan caracteres no numéricos
  - Se remueve el prefijo 0 si existe
  - Se remueve el código de país 57 (Colombia) si existe
  - Se valida que tenga al menos 7 dígitos

### Validaciones:
- Solo se crean clientes que tengan nombre y teléfono válidos
- Se crean todos los clientes sin verificar duplicados (carga masiva)
- Se permiten clientes con el mismo teléfono en diferentes grupos
- Procesamiento en lotes de 100 clientes para mayor eficiencia

### Archivo generado:
- Se crea un archivo Excel con los datos procesados
- El archivo se guarda en la carpeta `uploads/` (local)
- **Se sube automáticamente al bucket `gs://ia_calls_documents`** (GCP)
- El nombre incluye timestamp para evitar conflictos
- Se genera tanto el archivo original como el archivo procesado

## Manejo de errores

- Si el archivo no tiene las columnas requeridas, se devuelve un error
- Si hay errores al procesar clientes individuales, se continúa con los demás
- El grupo se crea exitosamente aunque falle el procesamiento del archivo
- Los errores se registran en los logs del servidor

## Endpoints adicionales para gestión de clientes en grupos

### Obtener cliente específico del grupo
```bash
GET /api/groups/:id/clients/:client_id
```

### Actualizar cliente en el grupo
```bash
PUT /api/groups/:id/clients/:client_id
Content-Type: application/json

{
  "name": "Nuevo Nombre",
  "phone": "3001234567",
  "email": "nuevo@email.com",
  "address": "Nueva Dirección",
  "category": "actualizado",
  "status": "active"
}
```

### Eliminar cliente del grupo
```bash
DELETE /api/groups/:id/clients/:client_id
```

## Nuevos endpoints con filtrado por usuario

### Seguridad y Filtrado por Usuario

Todos los endpoints de clientes pendientes ahora requieren autenticación JWT y filtran los datos por usuario:

- **`/clients/pending`** y **`/api/clients/pending`**: Solo muestran grupos y clientes del usuario autenticado
- **`/clients/pending/:clientId`** y **`/api/clients/pending/:clientId`**: Solo muestran grupos creados por el cliente específico
- **No se incluyen clientes sin grupo** de otros usuarios para mantener la privacidad de datos

### Obtener todos los clientes pendientes del usuario autenticado
```bash
GET /clients/pending
GET /api/clients/pending
Authorization: Bearer <token>
```

**Nota:** Este endpoint requiere autenticación JWT y solo muestra los grupos y clientes del usuario autenticado.

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Mi Grupo",
      "description": "Descripción del grupo",
      "createdByClient": "CLIENTE_123",
      "clientCount": 5,
      "clients": [
        {
          "id": 1,
          "name": "Cliente 1",
          "phone": "3001234567",
          "email": "cliente1@email.com",
          "status": "pending"
        }
      ]
    }
  ],
  "totalGroups": 1,
  "totalClients": 5,
  "message": "Datos locales organizados por grupos",
  "source": "local"
}
```

### Obtener clientes pendientes por ID de cliente específico
```bash
GET /clients/pending/:clientId
GET /api/clients/pending/:clientId
Authorization: Bearer <token>
```

**Nota:** Este endpoint requiere autenticación JWT y solo muestra los grupos creados por el cliente específico. No incluye clientes sin grupo de otros usuarios.

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Mi Grupo",
      "description": "Descripción del grupo",
      "createdByClient": "CLIENTE_123",
      "clientCount": 5,
      "clients": [
        {
          "id": 1,
          "name": "Cliente 1",
          "phone": "3001234567",
          "email": "cliente1@email.com",
          "status": "pending"
        }
      ]
    }
  ],
  "totalGroups": 1,
  "totalClients": 5,
  "clientId": "CLIENTE_123",
  "message": "Datos locales organizados por grupos para el cliente CLIENTE_123",
  "source": "local"
}
```

### Obtener grupos filtrados por ID de cliente
```bash
GET /api/groups?clientId=CLIENTE_123
```

**Parámetros de query:**
- `clientId` (opcional): Filtrar grupos por ID del cliente que los creó
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Límite de resultados (default: 10)
- `include_clients` (opcional): Incluir clientes recientes (true/false)

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Mi Grupo",
      "description": "Descripción del grupo",
      "prompt": null,
      "color": "#3B82F6",
      "favorite": false,
      "isActive": true,
      "createdBy": 1,
      "createdByClient": "CLIENTE_123",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "clientCount": 5,
      "recentClients": [
        {
          "id": 1,
          "name": "Cliente 1",
          "phone": "3001234567",
          "email": "cliente1@email.com",
          "status": "pending"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalAllGroups": 5
  },
  "filters": {
    "clientId": "CLIENTE_123",
    "applied": true
  }
}
```
