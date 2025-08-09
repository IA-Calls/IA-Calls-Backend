# 📁 API de Almacenamiento en Google Cloud Storage

Esta documentación describe las funcionalidades de almacenamiento en la nube implementadas para guardar y gestionar archivos Excel subidos durante la extracción de datos.

## 🚀 Configuración Requerida

### Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# Google Cloud Storage
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
GOOGLE_CLOUD_PROJECT_ID=tu-proyecto-id
GOOGLE_CLOUD_BUCKET_NAME=tu-bucket-name
```

### Instalación de Dependencias

```bash
npm install @google-cloud/storage
```

### Migración de Base de Datos

```bash
node scripts/migrate_storage.js
```

## 📋 Endpoints Disponibles

### 🔍 Listar Archivos
**GET** `/api/storage/files`

Lista todos los archivos subidos por el usuario autenticado.

**Parámetros de Query:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Archivos por página (default: 20)
- `groupId` (opcional): Filtrar por grupo específico
- `contentType` (opcional): Filtrar por tipo de contenido
- `uploadedBy` (opcional): Filtrar por usuario que subió

**Ejemplo de Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "originalName": "clientes_ejemplo.xlsx",
      "fileName": "excel-uploads/2025/08/02/clientes_ejemplo_2025-08-02T19-36-36-123Z_abc123.xlsx",
      "bucketUrl": "gs://mi-bucket/excel-uploads/2025/08/02/clientes_ejemplo_2025-08-02T19-36-36-123Z_abc123.xlsx",
      "publicUrl": "https://storage.googleapis.com/mi-bucket/excel-uploads/2025/08/02/clientes_ejemplo_2025-08-02T19-36-36-123Z_abc123.xlsx",
      "downloadUrl": "https://storage.googleapis.com/mi-bucket/excel-uploads/2025/08/02/clientes_ejemplo_2025-08-02T19-36-36-123Z_abc123.xlsx?X-Goog-Algorithm=...",
      "fileSize": 15420,
      "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "uploadedBy": 1,
      "groupId": 19,
      "metadata": {
        "extractedClients": 5,
        "successfullyProcessed": 5,
        "processingErrors": 0,
        "parsingErrors": 0,
        "groupName": "karol test",
        "uploadMethod": "excel_extraction"
      },
      "isActive": true,
      "createdAt": "2025-08-02T19:36:36.123Z",
      "updatedAt": "2025-08-02T19:36:36.123Z",
      "downloadUrlExpiresAt": "2025-08-02T20:36:36.123Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 📄 Obtener Información de Archivo
**GET** `/api/storage/files/:id`

Obtiene información detallada de un archivo específico.

**Parámetros:**
- `id`: ID del archivo

**Ejemplo de Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "originalName": "clientes_ejemplo.xlsx",
    "fileName": "excel-uploads/2025/08/02/clientes_ejemplo_2025-08-02T19-36-36-123Z_abc123.xlsx",
    "bucketUrl": "gs://mi-bucket/excel-uploads/2025/08/02/clientes_ejemplo_2025-08-02T19-36-36-123Z_abc123.xlsx",
    "publicUrl": "https://storage.googleapis.com/mi-bucket/excel-uploads/2025/08/02/clientes_ejemplo_2025-08-02T19-36-36-123Z_abc123.xlsx",
    "downloadUrl": "https://storage.googleapis.com/mi-bucket/excel-uploads/2025/08/02/clientes_ejemplo_2025-08-02T19-36-36-123Z_abc123.xlsx?X-Goog-Algorithm=...",
    "fileSize": 15420,
    "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "uploadedBy": 1,
    "groupId": 19,
    "metadata": {
      "extractedClients": 5,
      "successfullyProcessed": 5,
      "processingErrors": 0,
      "parsingErrors": 0,
      "groupName": "karol test",
      "uploadMethod": "excel_extraction"
    },
    "isActive": true,
    "createdAt": "2025-08-02T19:36:36.123Z",
    "updatedAt": "2025-08-02T19:36:36.123Z",
    "downloadUrlExpiresAt": "2025-08-02T20:36:36.123Z"
  }
}
```

### 📥 Descargar Archivo
**GET** `/api/storage/files/:id/download`

Descarga directamente el archivo del bucket.

**Parámetros:**
- `id`: ID del archivo

**Respuesta:** Archivo binario con headers apropiados para descarga.

### 🔗 Generar URL de Descarga
**GET** `/api/storage/files/:id/url`

Genera una URL temporal para descargar el archivo.

**Parámetros:**
- `id`: ID del archivo
- `expiresIn` (opcional): Horas de validez de la URL (default: 1)

**Ejemplo de Respuesta:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://storage.googleapis.com/mi-bucket/excel-uploads/2025/08/02/clientes_ejemplo_2025-08-02T19-36-36-123Z_abc123.xlsx?X-Goog-Algorithm=...",
    "expiresAt": "2025-08-02T20:36:36.123Z",
    "fileName": "clientes_ejemplo.xlsx",
    "fileSize": 15420
  }
}
```

### 🗑️ Eliminar Archivo
**DELETE** `/api/storage/files/:id`

Elimina un archivo del bucket y de la base de datos.

**Parámetros:**
- `id`: ID del archivo

**Ejemplo de Respuesta:**
```json
{
  "success": true,
  "message": "Archivo eliminado exitosamente",
  "data": {
    "id": 1,
    "originalName": "clientes_ejemplo.xlsx",
    "fileName": "excel-uploads/2025/08/02/clientes_ejemplo_2025-08-02T19-36-36-123Z_abc123.xlsx",
    "isActive": false
  }
}
```

### 🧪 Probar Conexión
**GET** `/api/storage/test`

Prueba la conexión al bucket de Google Cloud Storage.

**Ejemplo de Respuesta:**
```json
{
  "success": true,
  "message": "Conexión al bucket exitosa",
  "data": {
    "success": true,
    "message": "Conexión a Google Cloud Storage exitosa",
    "bucketName": "mi-bucket",
    "projectId": "mi-proyecto"
  }
}
```

### 📊 Estadísticas
**GET** `/api/storage/stats`

Obtiene estadísticas de los archivos del usuario.

**Ejemplo de Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalFiles": 5,
    "excelFiles": 4,
    "csvFiles": 1,
    "otherFiles": 0,
    "filesByGroup": {
      "19": 3,
      "4": 2
    }
  }
}
```

## 🔄 Integración con Extracción de Excel

El endpoint `/clients/extract-excel` ahora incluye automáticamente la funcionalidad de almacenamiento:

### Respuesta Actualizada
```json
{
  "success": true,
  "message": "Extracción completada: 5 clientes procesados, 5 asignados al grupo \"karol test\"",
  "data": {
    "filename": "clientes_ejemplo.xlsx",
    "totalRows": 5,
    "totalExtracted": 5,
    "successfullyProcessed": 5,
    "processingErrors": 0,
    "parsingErrors": 0,
    "clients": [...],
    "errors": [],
    "groupAssignment": {
      "groupId": 19,
      "groupName": "karol test",
      "totalClients": 5,
      "successfullyAssigned": 5,
      "assignmentErrors": 0,
      "assignmentDetails": [...]
    },
    "fileStorage": {
      "uploaded": true,
      "fileName": "excel-uploads/2025/08/02/clientes_ejemplo_2025-08-02T19-36-36-123Z_abc123.xlsx",
      "bucketUrl": "gs://mi-bucket/excel-uploads/2025/08/02/clientes_ejemplo_2025-08-02T19-36-36-123Z_abc123.xlsx",
      "downloadUrl": "https://storage.googleapis.com/mi-bucket/excel-uploads/2025/08/02/clientes_ejemplo_2025-08-02T19-36-36-123Z_abc123.xlsx?X-Goog-Algorithm=...",
      "size": 15420
    }
  }
}
```

## 🏗️ Estructura de Archivos

### Organización en el Bucket
Los archivos se organizan automáticamente en la siguiente estructura:
```
excel-uploads/
├── 2025/
│   ├── 08/
│   │   ├── 02/
│   │   │   ├── archivo1_2025-08-02T19-36-36-123Z_abc123.xlsx
│   │   │   └── archivo2_2025-08-02T20-15-45-456Z_def456.xlsx
│   │   └── 03/
│   │       └── archivo3_2025-08-03T10-30-12-789Z_ghi789.xlsx
│   └── 09/
└── 2026/
```

### Metadatos Almacenados
Cada archivo incluye metadatos detallados:
- **Información de extracción**: Número de clientes extraídos, procesados, errores
- **Asociación con grupos**: ID y nombre del grupo asignado
- **Información de usuario**: ID del usuario que subió el archivo
- **Método de carga**: Tipo de proceso que generó el archivo

## 🔐 Seguridad

### Autenticación
- Todos los endpoints requieren autenticación JWT
- Los usuarios solo pueden acceder a sus propios archivos
- Verificación de permisos en cada operación

### URLs Firmadas
- Las URLs de descarga son temporales y firmadas
- Validez configurable (por defecto 1 hora)
- Acceso seguro sin exponer credenciales

### Soft Delete
- Los archivos se marcan como inactivos en lugar de eliminarse físicamente
- Permite recuperación y auditoría

## 🚨 Manejo de Errores

### Errores Comunes
```json
{
  "success": false,
  "message": "Archivo no encontrado",
  "error": "Archivo no encontrado en el bucket"
}
```

```json
{
  "success": false,
  "message": "No tienes permisos para acceder a este archivo",
  "error": "Acceso denegado"
}
```

```json
{
  "success": false,
  "message": "Error de conexión al bucket",
  "error": "Error de conexión: Invalid credentials"
}
```

## 📝 Notas de Implementación

### Dependencias
- `@google-cloud/storage`: Cliente oficial de Google Cloud Storage
- `crypto`: Para generar nombres únicos de archivos
- `path`: Para manejo de rutas y extensiones

### Configuración de Bucket
- Asegúrate de que el bucket tenga los permisos correctos
- Configura CORS si es necesario para acceso web
- Considera políticas de retención y lifecycle

### Rendimiento
- Los archivos se procesan en memoria para mayor velocidad
- URLs firmadas se generan bajo demanda
- Paginación implementada para listas grandes

## 🔧 Próximas Mejoras

- [ ] Compresión automática de archivos grandes
- [ ] Procesamiento asíncrono para archivos muy grandes
- [ ] Notificaciones por email cuando se complete la subida
- [ ] Integración con Google Drive para archivos adicionales
- [ ] Dashboard de estadísticas de uso de almacenamiento 