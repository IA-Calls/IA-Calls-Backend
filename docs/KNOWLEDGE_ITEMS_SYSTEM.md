# 🧠 Sistema de Retroalimentación de Información para Agentes

## 📋 Resumen

Sistema completo para que los usuarios puedan agregar elementos de conocimiento (enlaces y documentos) que los agentes de WhatsApp utilizarán como retroalimentación inteligente durante las conversaciones.

---

## 🏗️ Arquitectura del Sistema

### Flujo Completo

```
Usuario → Crea/Sube Elemento → Procesa → Extrae Contenido → Normaliza → Sincroniza con Agente → Agente usa en Conversaciones
```

1. **Usuario**: Crea enlace o sube documento
2. **Backend**: Valida y almacena en PostgreSQL
3. **Google Cloud Storage**: Documentos se suben al bucket
4. **Procesamiento**: Extrae contenido según el tipo
5. **Normalización**: Convierte a formato estructurado para Agent Builder
6. **Sincronización**: Se agrega al instructor del agente
7. **Agente**: Usa la información cuando detecta palabras clave o contexto relevante

---

## 🗄️ Estructura de Base de Datos

### Tabla `knowledge_items`

```sql
CREATE TABLE knowledge_items (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('link', 'document')),
  
  -- Configuración de enlaces
  url TEXT,
  link_type VARCHAR(50), -- calendar, form, payment, website, other
  link_title VARCHAR(255),
  link_description TEXT,
  link_metadata JSONB,
  
  -- Configuración de documentos
  file_name VARCHAR(255),
  gcs_bucket VARCHAR(255),
  gcs_object_name VARCHAR(500),
  document_type VARCHAR(50), -- pdf, word, excel, image, other
  
  -- Contenido procesado
  processed_content TEXT,
  processed_data JSONB,
  extraction_status VARCHAR(50), -- pending, processing, completed, failed
  
  -- Parámetros de uso
  triggers JSONB, -- Array de palabras clave
  conversation_types JSONB, -- Tipos de conversación
  priority INTEGER DEFAULT 5, -- 1-10
  usage_context TEXT,
  usage_instructions TEXT,
  
  -- Vinculación
  agent_id UUID REFERENCES whatsapp_agents(id),
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  synced_at TIMESTAMP
);
```

---

## 🔌 Endpoints REST

### 1. Crear Elemento de Conocimiento (Link)

**POST** `/api/knowledge-items`

Crea un nuevo elemento de conocimiento tipo enlace.

**Body:**
```json
{
  "name": "Calendario de Citas",
  "type": "link",
  "url": "https://calendly.com/mi-calendario",
  "link_type": "calendar",
  "link_title": "Agendar Cita",
  "link_description": "Enlace para agendar citas con el equipo",
  "triggers": ["cita", "agendar", "calendario", "reunión"],
  "conversation_types": ["sales", "support"],
  "priority": 8,
  "usage_context": "Cuando el cliente quiere agendar una cita",
  "usage_instructions": "Ofrecer este enlace cuando el cliente mencione querer agendar una cita o reunión",
  "agent_id": "uuid-del-agente"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Elemento de conocimiento creado exitosamente. Procesando enlace...",
  "data": {
    "id": "uuid-del-elemento",
    "name": "Calendario de Citas",
    "type": "link",
    "url": "https://calendly.com/mi-calendario",
    "extraction_status": "processing",
    ...
  }
}
```

---

### 2. Subir Documento

**POST** `/api/knowledge-items/upload`

Sube un documento (PDF, Word, Excel, Imagen) y lo procesa automáticamente.

**Request (multipart/form-data):**
```
Content-Type: multipart/form-data

file: [archivo.pdf o archivo.docx o archivo.xlsx o imagen]
name: "Manual de Usuario"
triggers: ["manual", "ayuda", "instrucciones"]
conversation_types: ["support"]
priority: 7
usage_context: "Cuando el cliente necesita ayuda"
usage_instructions: "Compartir este manual cuando el cliente tenga dudas sobre cómo usar el producto"
agent_id: "uuid-del-agente"
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Documento subido exitosamente. Procesando...",
  "data": {
    "id": "uuid-del-elemento",
    "name": "Manual de Usuario",
    "type": "document",
    "document_type": "pdf",
    "extraction_status": "processing",
    ...
  }
}
```

---

### 3. Listar Elementos de Conocimiento

**GET** `/api/knowledge-items`

Lista todos los elementos del usuario autenticado.

**Query Parameters:**
- `type` (opcional): Filtrar por tipo (`link`, `document`)
- `agent_id` (opcional): Filtrar por agente
- `is_active` (opcional): Filtrar por estado activo (`true`, `false`)
- `extraction_status` (opcional): Filtrar por estado de procesamiento
- `search` (opcional): Buscar en nombre y contenido

**Ejemplo:**
```bash
GET /api/knowledge-items?type=link&is_active=true&search=calendario
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Calendario de Citas",
      "type": "link",
      "url": "https://calendly.com/...",
      "priority": 8,
      "triggers": ["cita", "agendar"],
      "extraction_status": "completed",
      "synced_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "uuid-2",
      "name": "Manual de Usuario",
      "type": "document",
      "document_type": "pdf",
      "priority": 7,
      "triggers": ["manual", "ayuda"],
      "extraction_status": "completed"
    }
  ],
  "total": 2
}
```

---

### 4. Obtener Elemento Específico

**GET** `/api/knowledge-items/:id`

Obtiene los detalles de un elemento específico.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-del-elemento",
    "name": "Calendario de Citas",
    "type": "link",
    "url": "https://calendly.com/...",
    "processed_content": "Enlace: https://calendly.com/...\nTipo: calendar\n...",
    "triggers": ["cita", "agendar"],
    "priority": 8,
    "usage_instructions": "Ofrecer este enlace cuando...",
    "extraction_status": "completed",
    "processed_at": "2024-01-15T10:35:00.000Z"
  }
}
```

---

### 5. Actualizar Elemento

**PUT** `/api/knowledge-items/:id`

Actualiza un elemento de conocimiento.

**Body (campos opcionales):**
```json
{
  "name": "Nuevo Nombre",
  "triggers": ["nueva", "palabra", "clave"],
  "priority": 9,
  "usage_instructions": "Nuevas instrucciones",
  "is_active": true
}
```

---

### 6. Procesar Elemento

**POST** `/api/knowledge-items/:id/process`

Inicia el procesamiento de un elemento (útil para reprocesar).

**Respuesta:**
```json
{
  "success": true,
  "message": "Procesamiento iniciado. El elemento se actualizará cuando termine."
}
```

---

### 7. Sincronizar Elemento con Agente

**POST** `/api/knowledge-items/:id/sync`

Sincroniza un elemento procesado con su agente asignado.

**Requisitos:**
- El elemento debe estar en estado `completed`
- El elemento debe tener un `agent_id` asignado

**Respuesta:**
```json
{
  "success": true,
  "message": "Elemento sincronizado exitosamente con el agente"
}
```

---

### 8. Sincronizar Todos los Elementos de un Agente

**POST** `/api/knowledge-items/sync-agent/:agentId`

Sincroniza todos los elementos completados de un agente de una vez.

**Respuesta:**
```json
{
  "success": true,
  "message": "5 elementos de conocimiento sincronizados exitosamente",
  "synced_count": 5
}
```

---

### 9. Buscar Conocimiento por Palabras Clave

**GET** `/api/knowledge-items/search`

Busca elementos de conocimiento relevantes basados en palabras clave.

**Query Parameters:**
- `keywords` (requerido): Palabras clave separadas por comas
- `agent_id` (opcional): Filtrar por agente específico

**Ejemplo:**
```bash
GET /api/knowledge-items/search?keywords=cita,agendar,reunión&agent_id=uuid-del-agente
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Calendario de Citas",
      "type": "link",
      "priority": 8,
      "content": "Enlace: https://calendly.com/...",
      "url": "https://calendly.com/...",
      "triggers": ["cita", "agendar"]
    }
  ],
  "count": 1
}
```

---

### 10. Eliminar Elemento

**DELETE** `/api/knowledge-items/:id`

Elimina un elemento de conocimiento.

**Respuesta:**
```json
{
  "success": true,
  "message": "Elemento de conocimiento eliminado exitosamente"
}
```

---

## 📚 Tipos de Elementos Soportados

### 1. Enlaces (Links)

**Tipos de enlaces detectados automáticamente:**
- `calendar`: Calendly, Cal.com, etc.
- `payment`: Stripe, PayPal, pasarelas de pago
- `form`: Google Forms, Typeform, etc.
- `website`: Otros sitios web

**Procesamiento:**
- Extrae metadata (og:tags, título, descripción)
- Valida la URL
- Genera contenido estructurado

**Ejemplo:**
```json
{
  "name": "Formulario de Contacto",
  "type": "link",
  "url": "https://forms.gle/ABC123",
  "link_type": "form",
  "triggers": ["formulario", "contacto", "solicitud"],
  "priority": 6
}
```

---

### 2. Documentos

**Tipos soportados:**
- **PDF**: Extracción de texto completo
- **Word (.docx, .doc)**: Extracción de texto con Mammoth
- **Excel (.xlsx, .xls)**: Conversión a JSON estructurado
- **Imágenes (.jpg, .png, .gif, .webp)**: Almacenamiento (OCR pendiente)

**Procesamiento:**
- Sube a Google Cloud Storage
- Extrae contenido según el tipo
- Normaliza para Agent Builder

---

## 🎯 Parámetros de Uso

### Triggers (Palabras Clave)

Array de palabras que disparan el uso del elemento:

```json
{
  "triggers": ["cita", "agendar", "calendario", "reunión", "horario"]
}
```

### Conversation Types

Tipos de conversación donde se usa:

```json
{
  "conversation_types": ["sales", "support", "onboarding"]
}
```

### Priority

Prioridad del elemento (1-10, donde 10 es más importante):

```json
{
  "priority": 8
}
```

### Usage Context

Contexto descriptivo de cuándo usar:

```json
{
  "usage_context": "Cuando el cliente quiere agendar una cita o reunión"
}
```

### Usage Instructions

Instrucciones específicas para el agente:

```json
{
  "usage_instructions": "Ofrecer este enlace cuando el cliente mencione querer agendar una cita. Explicar que pueden elegir el horario que mejor les convenga."
}
```

---

## 🔄 Flujo de Trabajo Completo

### Caso 1: Agregar Enlace de Calendario

```bash
# 1. Crear elemento de conocimiento
POST /api/knowledge-items
{
  "name": "Calendario de Citas",
  "type": "link",
  "url": "https://calendly.com/mi-calendario",
  "link_type": "calendar",
  "triggers": ["cita", "agendar"],
  "priority": 8,
  "agent_id": "uuid-del-agente"
}

# 2. El sistema procesa automáticamente el enlace
# Estado: pending → processing → completed

# 3. Verificar estado
GET /api/knowledge-items/{id}

# 4. Sincronizar con agente
POST /api/knowledge-items/{id}/sync
```

### Caso 2: Subir Manual PDF

```bash
# 1. Subir documento
POST /api/knowledge-items/upload
Content-Type: multipart/form-data
file: manual.pdf
name: "Manual de Usuario"
triggers: ["manual", "ayuda", "instrucciones"]
priority: 7
agent_id: "uuid-del-agente"

# 2. El sistema procesa automáticamente
# Estado: pending → processing → completed

# 3. Sincronizar con agente
POST /api/knowledge-items/{id}/sync
```

### Caso 3: Buscar Conocimiento Relevante

```bash
# Durante una conversación, buscar conocimiento relevante
GET /api/knowledge-items/search?keywords=cita,agendar

# El agente puede usar estos resultados para responder
```

---

## 🔒 Seguridad

### Validaciones Implementadas

1. **Autenticación Requerida**: Todas las rutas requieren JWT
2. **Validación de Ownership**: Cada usuario solo ve/edita sus propios elementos
3. **Validación de Tipos**: Solo tipos permitidos
4. **Límites de Archivo**: Máximo 100MB por archivo
5. **Validación de Agente**: Solo puedes sincronizar con agentes que te pertenezcan

---

## 📦 Dependencias Necesarias

```bash
npm install mammoth
```

Ya está agregada al `package.json`.

---

## 🚀 Instalación

### Paso 1: Crear la Tabla

```bash
npm run create:knowledge-items-table
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

### Paso 3: Configurar Variables de Entorno

```env
# Google Cloud Storage
GOOGLE_CLOUD_BUCKET_NAME=ia-calls-knowledge
GOOGLE_CLOUD_PROJECT_ID=tu-proyecto
```

---

## 🔧 Integración con Agent Builder

### Cómo se Agrega el Conocimiento al Agente

Cuando sincronizas un elemento con un agente:

1. **Se obtiene el agente** de WhatsApp desde la BD
2. **Se construye contexto** estructurado con el contenido del elemento
3. **Se actualiza el `instructor`** del agente agregando el contexto
4. **El agente usa esta información** cuando detecta palabras clave o contexto relevante

**Ejemplo de contexto agregado:**

```
=== Conocimiento: Calendario de Citas ===
Tipo: link
Prioridad: 8/10
Palabras clave: cita, agendar, calendario, reunión
Usar en: sales, support
URL: https://calendly.com/mi-calendario
Tipo de enlace: calendar

Contenido:
Enlace: https://calendly.com/mi-calendario
Tipo: calendar
Título: Agendar Cita
Descripción: Enlace para agendar citas con el equipo

Instrucciones de uso:
Ofrecer este enlace cuando el cliente mencione querer agendar una cita. Explicar que pueden elegir el horario que mejor les convenga.

Contexto:
Cuando el cliente quiere agendar una cita o reunión
=== Fin de Conocimiento ===
```

---

## 📡 Ejemplos de cURL

### Crear Enlace

```bash
curl -X POST http://localhost:5050/api/knowledge-items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "name": "Calendario de Citas",
    "type": "link",
    "url": "https://calendly.com/mi-calendario",
    "link_type": "calendar",
    "triggers": ["cita", "agendar"],
    "priority": 8,
    "agent_id": "uuid-del-agente"
  }'
```

### Subir Documento

```bash
curl -X POST http://localhost:5050/api/knowledge-items/upload \
  -H "Authorization: Bearer TU_TOKEN" \
  -F "file=@manual.pdf" \
  -F "name=Manual de Usuario" \
  -F "triggers=[\"manual\",\"ayuda\"]" \
  -F "priority=7" \
  -F "agent_id=uuid-del-agente"
```

### Buscar Conocimiento

```bash
curl -X GET "http://localhost:5050/api/knowledge-items/search?keywords=cita,agendar" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Sincronizar con Agente

```bash
curl -X POST http://localhost:5050/api/knowledge-items/{id}/sync \
  -H "Authorization: Bearer TU_TOKEN"
```

---

## 🐛 Troubleshooting

### Error: "Usuario no autenticado"

**Solución:** Asegúrate de enviar el token JWT en el header `Authorization: Bearer <token>`

### Error: "El elemento no pertenece al usuario"

**Solución:** Solo puedes acceder a elementos que hayas creado tú

### Error: "Tipo de archivo no permitido"

**Solución:** Solo se permiten PDF, Word, Excel e imágenes

### Error: "El elemento debe estar procesado antes de sincronizar"

**Solución:** Espera a que el estado sea `completed` o reprocesa con `POST /api/knowledge-items/:id/process`

---

## 📊 Estados de los Elementos

| Estado | Descripción |
|--------|-------------|
| `pending` | Creado pero no procesado |
| `processing` | En proceso de extracción |
| `completed` | Procesado exitosamente, lista para sincronizar |
| `failed` | Error en el procesamiento |

---

## ✅ Checklist de Implementación

- [x] Tabla `knowledge_items` creada
- [x] Modelo `KnowledgeItem` implementado
- [x] Servicio de procesamiento creado
- [x] Servicio de integración con Agent Builder
- [x] Controlador con endpoints REST
- [x] Rutas configuradas
- [x] Validación de ownership
- [x] Documentación completa

---

## 🔄 Próximos Pasos

1. **Ejecutar migración**: `npm run create:knowledge-items-table`
2. **Instalar dependencias**: `npm install`
3. **Probar endpoints** con los ejemplos de cURL
4. **Integrar en frontend** usando los endpoints documentados

---

## 📚 Referencias

- [Documentación de Vertex AI Agent Builder](https://cloud.google.com/vertex-ai/docs/agents)
- [Mammoth (Word to Text)](https://github.com/mwilliamson/mammoth.js)
- [PDF Parse](https://github.com/mozilla/pdf.js)

