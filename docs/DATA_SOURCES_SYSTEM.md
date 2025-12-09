# 📚 Sistema de Fuentes de Información para Agentes de WhatsApp

## 📋 Resumen

Sistema completo para que los usuarios puedan cargar y vincular múltiples fuentes de información (bases de datos, archivos Excel, Google Sheets, PDFs) que alimentan a los agentes de WhatsApp usando Vertex AI Agent Builder.

---

## 🏗️ Arquitectura del Sistema

### Flujo Completo

```
Frontend → Backend → Google Cloud Storage → Procesamiento → Normalización → Agent Builder → Agente WhatsApp
```

1. **Frontend**: Usuario carga/selecciona fuente de información
2. **Backend**: Valida y almacena en PostgreSQL
3. **Google Cloud Storage**: Archivos se suben al bucket
4. **Procesamiento**: Extrae y procesa datos según el tipo
5. **Normalización**: Convierte a formato consumible por Agent Builder
6. **Agent Builder**: Se agrega como contexto/herramienta al agente
7. **Agente WhatsApp**: Usa la información en conversaciones

---

## 🗄️ Estructura de Base de Datos

### Tabla `data_sources`

```sql
CREATE TABLE data_sources (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('database', 'excel', 'google_sheet', 'pdf')),
  
  -- Configuración de base de datos
  db_host VARCHAR(255),
  db_port INTEGER,
  db_name VARCHAR(255),
  db_user VARCHAR(255),
  db_password_encrypted TEXT, -- Encriptada
  db_type VARCHAR(50),
  selected_database VARCHAR(255),
  selected_table VARCHAR(255),
  
  -- Configuración de archivos
  file_name VARCHAR(255),
  file_path TEXT,
  gcs_bucket VARCHAR(255),
  gcs_object_name VARCHAR(500),
  
  -- Configuración de Google Sheets
  google_sheet_url TEXT,
  sheet_id VARCHAR(255),
  
  -- Estado y procesamiento
  status VARCHAR(50) DEFAULT 'pending',
  processed_data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  agent_id UUID REFERENCES whatsapp_agents(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  synced_at TIMESTAMP
);
```

---

## 🔌 Endpoints REST

### 1. Crear Fuente de Información

**POST** `/api/data-sources`

Crea un registro de fuente de información (sin procesar aún).

**Body (Base de Datos):**
```json
{
  "name": "Base de Datos de Clientes",
  "type": "database",
  "db_host": "localhost",
  "db_port": 3306,
  "db_name": "clientes_db",
  "db_user": "usuario",
  "db_password": "contraseña",
  "db_type": "mysql",
  "agent_id": "uuid-del-agente"
}
```

**Body (Google Sheet):**
```json
{
  "name": "Hoja de Productos",
  "type": "google_sheet",
  "google_sheet_url": "https://docs.google.com/spreadsheets/d/ABC123...",
  "agent_id": "uuid-del-agente"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Fuente de información creada exitosamente",
  "data": {
    "id": "uuid-de-la-fuente",
    "name": "Base de Datos de Clientes",
    "type": "database",
    "status": "pending",
    ...
  }
}
```

---

### 2. Subir Archivo (Excel o PDF)

**POST** `/api/data-sources/upload`

Sube un archivo Excel o PDF y lo procesa automáticamente.

**Request (multipart/form-data):**
```
Content-Type: multipart/form-data

file: [archivo.xlsx o archivo.pdf]
name: "Mi Archivo de Productos"
agent_id: "uuid-del-agente"
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Archivo subido exitosamente. Procesando...",
  "data": {
    "id": "uuid-de-la-fuente",
    "name": "Mi Archivo de Productos",
    "type": "excel",
    "status": "processing",
    "file_name": "productos.xlsx",
    "gcs_bucket": "ia-calls-data-sources",
    "gcs_object_name": "data-sources/5/1234567890_productos.xlsx"
  }
}
```

---

### 3. Listar Fuentes de Información

**GET** `/api/data-sources`

Lista todas las fuentes del usuario autenticado.

**Query Parameters:**
- `type` (opcional): Filtrar por tipo (`database`, `excel`, `google_sheet`, `pdf`)
- `status` (opcional): Filtrar por estado (`pending`, `processing`, `completed`, `failed`, `synced`)
- `agent_id` (opcional): Filtrar por agente

**Ejemplo:**
```bash
GET /api/data-sources?type=excel&status=completed
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Base de Datos de Clientes",
      "type": "database",
      "status": "completed",
      "agent_id": "uuid-del-agente",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "uuid-2",
      "name": "Productos.xlsx",
      "type": "excel",
      "status": "synced",
      "agent_id": "uuid-del-agente",
      "created_at": "2024-01-15T11:00:00.000Z"
    }
  ],
  "total": 2
}
```

---

### 4. Obtener Fuente Específica

**GET** `/api/data-sources/:id`

Obtiene los detalles de una fuente específica.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-de-la-fuente",
    "name": "Base de Datos de Clientes",
    "type": "database",
    "status": "completed",
    "processed_data": {
      "raw": { ... },
      "normalized": {
        "source_type": "database",
        "content": "...",
        "metadata": { ... }
      }
    },
    "metadata": {
      "database": "clientes_db",
      "table": "clientes",
      "columns": ["id", "nombre", "email"]
    },
    "created_at": "2024-01-15T10:30:00.000Z",
    "processed_at": "2024-01-15T10:35:00.000Z"
  }
}
```

---

### 5. Procesar Fuente de Información

**POST** `/api/data-sources/:id/process`

Inicia el procesamiento de una fuente de información.

**Respuesta:**
```json
{
  "success": true,
  "message": "Procesamiento iniciado. La fuente se actualizará cuando termine."
}
```

**Estados del procesamiento:**
- `pending`: Creada pero no procesada
- `processing`: En proceso
- `completed`: Procesada exitosamente
- `failed`: Error en el procesamiento
- `synced`: Sincronizada con el agente

---

### 6. Obtener Bases de Datos Disponibles

**GET** `/api/data-sources/:id/databases`

Obtiene la lista de bases de datos disponibles (solo para tipo `database`).

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "type": "database",
    "db_type": "mysql",
    "database": "clientes_db",
    "tables": [
      "clientes",
      "productos",
      "pedidos"
    ]
  }
}
```

**Para obtener datos de una tabla específica:**
1. Actualiza la fuente con `selected_database` y `selected_table`
2. Vuelve a procesar con `POST /api/data-sources/:id/process`

---

### 7. Sincronizar Fuente con Agente

**POST** `/api/data-sources/:id/sync`

Sincroniza una fuente procesada con su agente asignado.

**Requisitos:**
- La fuente debe estar en estado `completed`
- La fuente debe tener un `agent_id` asignado

**Respuesta:**
```json
{
  "success": true,
  "message": "Fuente sincronizada exitosamente con el agente"
}
```

**Qué hace:**
- Agrega el contenido procesado al `instructor` del agente
- Actualiza `synced_at` de la fuente
- Cambia el estado a `synced`

---

### 8. Sincronizar Todas las Fuentes de un Agente

**POST** `/api/data-sources/sync-agent/:agentId`

Sincroniza todas las fuentes completadas de un agente de una vez.

**Respuesta:**
```json
{
  "success": true,
  "message": "3 fuentes sincronizadas exitosamente",
  "synced_count": 3
}
```

---

### 9. Eliminar Fuente de Información

**DELETE** `/api/data-sources/:id`

Elimina una fuente de información.

**Respuesta:**
```json
{
  "success": true,
  "message": "Fuente de información eliminada exitosamente"
}
```

---

## 🔄 Flujo de Trabajo Completo

### Caso 1: Base de Datos Externa

```bash
# 1. Crear fuente de base de datos
POST /api/data-sources
{
  "name": "BD Clientes",
  "type": "database",
  "db_host": "localhost",
  "db_port": 3306,
  "db_name": "clientes",
  "db_user": "usuario",
  "db_password": "contraseña",
  "db_type": "mysql"
}

# 2. Obtener bases de datos disponibles
GET /api/data-sources/{id}/databases

# 3. Actualizar fuente con base de datos seleccionada
PUT /api/data-sources/{id}
{
  "selected_database": "clientes_db"
}

# 4. Obtener tablas (procesar de nuevo)
POST /api/data-sources/{id}/process

# 5. Actualizar con tabla seleccionada
PUT /api/data-sources/{id}
{
  "selected_table": "clientes"
}

# 6. Procesar datos de la tabla
POST /api/data-sources/{id}/process

# 7. Asignar a agente y sincronizar
PUT /api/data-sources/{id}
{
  "agent_id": "uuid-del-agente"
}

POST /api/data-sources/{id}/sync
```

### Caso 2: Archivo Excel

```bash
# 1. Subir archivo
POST /api/data-sources/upload
Content-Type: multipart/form-data
file: productos.xlsx
name: "Productos"
agent_id: "uuid-del-agente"

# 2. El sistema procesa automáticamente
# Estado cambia: pending → processing → completed

# 3. Verificar estado
GET /api/data-sources/{id}

# 4. Sincronizar con agente (si no se asignó antes)
POST /api/data-sources/{id}/sync
```

### Caso 3: Google Sheet

```bash
# 1. Crear fuente de Google Sheet
POST /api/data-sources
{
  "name": "Hoja de Productos",
  "type": "google_sheet",
  "google_sheet_url": "https://docs.google.com/spreadsheets/d/ABC123...",
  "agent_id": "uuid-del-agente"
}

# 2. Procesar
POST /api/data-sources/{id}/process

# 3. Sincronizar
POST /api/data-sources/{id}/sync
```

---

## 🔒 Seguridad

### Validaciones Implementadas

1. **Autenticación Requerida**: Todas las rutas requieren JWT
2. **Validación de Ownership**: Cada usuario solo ve/edita sus propias fuentes
3. **Contraseñas Encriptadas**: Las contraseñas de BD se almacenan encriptadas
4. **Validación de Tipos**: Solo tipos permitidos (`database`, `excel`, `google_sheet`, `pdf`)
5. **Límites de Archivo**: Máximo 50MB por archivo
6. **Validación de Agente**: Solo puedes sincronizar con agentes que te pertenezcan

---

## 📦 Dependencias Necesarias

```bash
npm install pdf-parse mysql2 mssql
```

Ya están agregadas al `package.json`.

---

## 🚀 Instalación

### Paso 1: Crear la Tabla

```bash
npm run create:data-sources-table
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

### Paso 3: Configurar Variables de Entorno

```env
# Google Cloud Storage
GOOGLE_CLOUD_BUCKET_NAME=ia-calls-data-sources
GOOGLE_CLOUD_PROJECT_ID=tu-proyecto

# Encriptación de contraseñas
ENCRYPTION_KEY=tu-clave-de-32-caracteres-minimo

# Vertex AI
VERTEX_AI_LOCATION=us-central1
```

---

## 🔧 Integración con Agent Builder

### Cómo se Agrega la Información al Agente

Cuando sincronizas una fuente con un agente:

1. **Se obtiene el agente** de WhatsApp desde la BD
2. **Se construye contexto** con el contenido normalizado de la fuente
3. **Se actualiza el `instructor`** del agente agregando el contexto
4. **El agente usa esta información** en sus respuestas

**Ejemplo de contexto agregado:**

```
=== Fuente de Información: Base de Datos de Clientes ===
Tipo: database
Extraído: 2024-01-15T10:35:00.000Z

Contenido:
Base de datos: clientes_db
Tabla: clientes
Columnas: id, nombre, email, telefono
Total de filas: 150

Registro 1: {"id":1,"nombre":"Juan Pérez","email":"juan@example.com"}
Registro 2: {"id":2,"nombre":"María García","email":"maria@example.com"}
...

Metadatos:
{
  "database": "clientes_db",
  "table": "clientes",
  "columns": ["id", "nombre", "email", "telefono"],
  "total_rows": 150
}
=== Fin de Fuente de Información ===
```

---

## 📡 Ejemplos de cURL

### Crear Fuente de Base de Datos

```bash
curl -X POST http://localhost:5050/api/data-sources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "name": "BD Clientes",
    "type": "database",
    "db_host": "localhost",
    "db_port": 3306,
    "db_name": "clientes",
    "db_user": "usuario",
    "db_password": "contraseña",
    "db_type": "mysql"
  }'
```

### Subir Archivo Excel

```bash
curl -X POST http://localhost:5050/api/data-sources/upload \
  -H "Authorization: Bearer TU_TOKEN" \
  -F "file=@productos.xlsx" \
  -F "name=Productos" \
  -F "agent_id=uuid-del-agente"
```

### Listar Fuentes

```bash
curl -X GET http://localhost:5050/api/data-sources \
  -H "Authorization: Bearer TU_TOKEN"
```

### Procesar Fuente

```bash
curl -X POST http://localhost:5050/api/data-sources/{id}/process \
  -H "Authorization: Bearer TU_TOKEN"
```

### Sincronizar con Agente

```bash
curl -X POST http://localhost:5050/api/data-sources/{id}/sync \
  -H "Authorization: Bearer TU_TOKEN"
```

---

## 🐛 Troubleshooting

### Error: "Usuario no autenticado"

**Solución:** Asegúrate de enviar el token JWT en el header `Authorization: Bearer <token>`

### Error: "La fuente no pertenece al usuario autenticado"

**Solución:** Solo puedes acceder a fuentes que hayas creado tú

### Error: "Tipo de archivo no permitido"

**Solución:** Solo se permiten PDF y Excel (.xlsx, .xls)

### Error: "Error conectando a base de datos"

**Solución:** Verifica las credenciales y que la BD sea accesible desde el servidor

### Error: "No hay datos normalizados"

**Solución:** Asegúrate de procesar la fuente antes de sincronizar (`POST /api/data-sources/:id/process`)

---

## 📊 Estados de las Fuentes

| Estado | Descripción |
|--------|-------------|
| `pending` | Creada pero no procesada |
| `processing` | En proceso de extracción/procesamiento |
| `completed` | Procesada exitosamente, lista para sincronizar |
| `failed` | Error en el procesamiento |
| `synced` | Sincronizada con el agente |

---

## ✅ Checklist de Implementación

- [x] Tabla `data_sources` creada
- [x] Modelo `DataSource` implementado
- [x] Servicio de procesamiento creado
- [x] Servicio de integración con Agent Builder
- [x] Controlador con endpoints REST
- [x] Rutas configuradas
- [x] Validación de ownership
- [x] Encriptación de contraseñas
- [x] Documentación completa

---

## 🔄 Próximos Pasos

1. **Ejecutar migración**: `npm run create:data-sources-table`
2. **Instalar dependencias**: `npm install`
3. **Probar endpoints** con los ejemplos de cURL
4. **Integrar en frontend** usando los endpoints documentados

---

## 📚 Referencias

- [Documentación de Vertex AI Agent Builder](https://cloud.google.com/vertex-ai/docs/agents)
- [Google Cloud Storage Node.js SDK](https://cloud.google.com/nodejs/docs/reference/storage/latest)
- [XLSX Library](https://github.com/SheetJS/sheetjs)

