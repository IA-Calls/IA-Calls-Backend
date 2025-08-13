# IA Calls Backend

Backend para IA Calls - API REST con Node.js y Express

## Características

- **Autenticación JWT** - Sistema de autenticación seguro
- **Gestión de Usuarios** - CRUD completo de usuarios
- **Gestión de Clientes** - Administración de clientes con categorización
- **Gestión de Grupos** - Organización de clientes en grupos
- **Procesamiento de Archivos Excel** - Importación automática de clientes desde archivos Excel
- **Almacenamiento en Google Cloud** - Integración con Google Cloud Storage
- **Base de Datos PostgreSQL** - Persistencia de datos robusta

## Nueva Funcionalidad: Procesamiento de Archivos Excel

### Descripción
Esta funcionalidad permite procesar archivos Excel en formato Base64 al crear grupos, extrayendo automáticamente información de clientes y creándolos en la base de datos.

### Formato del JSON para crear grupos

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

### Columnas requeridas en el Excel

El archivo Excel debe contener al menos estas columnas (los nombres pueden variar):

#### Columnas esenciales:
- **Nombre**: `nombre`, `name`, `nombres`, `cliente`
- **Teléfono**: `telefono`, `phone`, `celular`, `movil`, `tel`

#### Columnas opcionales:
- **Email**: `email`, `correo`, `e-mail`
- **Dirección**: `direccion`, `address`, `domicilio`

### Ejemplo de uso

#### 1. Crear grupo sin archivo
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

#### 2. Crear grupo con archivo Excel
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

### Características del procesamiento

- **Limpieza de datos**: Nombres y teléfonos se limpian automáticamente
- **Validaciones**: Solo se crean clientes con datos válidos
- **Carga masiva**: Procesamiento en lotes de 100 clientes para mayor eficiencia
- **Sin verificación de duplicados**: Se crean todos los clientes del archivo
- **Teléfonos duplicados permitidos**: Se permiten clientes con el mismo teléfono en diferentes grupos
- **Archivo generado**: Se crea un archivo Excel con los datos procesados
- **Almacenamiento en GCP**: Los archivos se suben automáticamente al bucket `gs://ia_calls_documents`
- **Manejo de errores**: El grupo se crea aunque falle el procesamiento del archivo

## Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd IA-Calls-Backend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Configurar base de datos**
```bash
# Ejecutar scripts de migración
npm run migrate
```

5. **Iniciar el servidor**
```bash
npm start
# o para desarrollo
npm run dev
```

## Estructura del Proyecto

```
IA-Calls-Backend/
├── src/
│   ├── controllers/     # Controladores de la API
│   ├── models/         # Modelos de datos
│   ├── routes/         # Rutas de la API
│   ├── middleware/     # Middlewares personalizados
│   ├── services/       # Servicios de negocio
│   ├── config/         # Configuraciones
│   └── utils/          # Utilidades
├── database/           # Scripts de base de datos
├── scripts/            # Scripts de utilidad
├── docs/              # Documentación
├── uploads/           # Archivos procesados
└── tests/             # Pruebas
```

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/refresh` - Renovar token

### Usuarios
- `GET /api/users` - Obtener usuarios
- `GET /api/users/:id` - Obtener usuario por ID
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Clientes
- `GET /api/clients` - Obtener clientes
- `GET /api/clients/:id` - Obtener cliente por ID
- `GET /clients/pending` - Obtener clientes pendientes del usuario autenticado (requiere JWT)
- `GET /clients/pending/:clientId` - Obtener clientes pendientes por ID de cliente específico (requiere JWT)
- `GET /api/clients/pending` - Obtener clientes pendientes del usuario autenticado (API, requiere JWT)
- `GET /api/clients/pending/:clientId` - Obtener clientes pendientes por ID de cliente específico (API, requiere JWT)
- `POST /api/clients` - Crear cliente
- `PUT /api/clients/:id` - Actualizar cliente
- `DELETE /api/clients/:id` - Eliminar cliente

### Grupos
- `GET /api/groups` - Obtener grupos (acepta filtro `clientId`)
- `GET /api/groups/:id` - Obtener grupo por ID
- `POST /api/groups` - Crear grupo (con procesamiento de archivos)
- `PUT /api/groups/:id` - Actualizar grupo
- `DELETE /api/groups/:id` - Eliminar grupo
- `GET /api/groups/download/:fileName` - Descargar archivo procesado

### Gestión de Clientes en Grupos
- `POST /api/groups/:id/clients` - Agregar cliente al grupo
- `GET /api/groups/:id/clients/:client_id` - Obtener cliente específico del grupo
- `PUT /api/groups/:id/clients/:client_id` - Actualizar cliente en el grupo
- `DELETE /api/groups/:id/clients/:client_id` - Eliminar cliente del grupo

### Llamadas
- `POST /calls/outbound` - Realizar llamada saliente (requiere API externa)
- `POST /calls/outbound-dev` - Simular llamada saliente (para desarrollo)

### Almacenamiento
- `POST /api/storage/upload` - Subir archivo
- `GET /api/storage/:filename` - Descargar archivo
- `DELETE /api/storage/:filename` - Eliminar archivo

### Documentos GCP
- `GET /api/gcp-documents` - Obtener todos los documentos (con filtros)
- `GET /api/gcp-documents/my-documents` - Obtener documentos del usuario autenticado
- `GET /api/gcp-documents/group/:groupId` - Obtener documentos por grupo
- `GET /api/gcp-documents/:id` - Obtener documento por ID
- `POST /api/gcp-documents/upload` - Subir documento sin grupo
- `POST /api/gcp-documents/generate-excel` - Generar y subir Excel procesado
- `PUT /api/gcp-documents/:id` - Actualizar documento
- `DELETE /api/gcp-documents/:id` - Eliminar documento

## Almacenamiento en Google Cloud Storage

### ⚠️ Configuración Requerida

**IMPORTANTE**: Si encuentras el error `invalid_grant: Invalid JWT Signature`, necesitas generar nuevas credenciales.

```bash
# Verificar configuración actual
node scripts/quick-gcp-setup.js

# Probar conexión después de configurar
node scripts/test-gcp-connection.js
```

**Guía completa**: [docs/gcp-setup-guide.md](docs/gcp-setup-guide.md)

### Bucket de Documentos
El sistema utiliza el bucket `gs://ia_calls_documents` para almacenar automáticamente:

- **Archivos originales**: Los archivos Excel subidos durante la creación de grupos
- **Archivos procesados**: Excel generados con los datos extraídos y procesados
- **Metadatos**: Información adicional sobre cada archivo

### Estructura de Archivos
```
gs://ia_calls_documents/
├── group-documents/
│   ├── 2024/
│   │   ├── 01/
│   │   │   ├── 15/
│   │   │   │   ├── clientes_2024-01-15T10-30-00-000Z_abc123.xlsx (original)
│   │   │   │   └── clientes_Grupo_Test_2024-01-15T10-30-00-000Z_def456.xlsx (procesado)
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── ...
```

### Funciones de Utilidad
- `uploadDocumentToGCP(base64Data, fileName, metadata)` - Subir documento base64
- `generateAndUploadExcel(clientsData, groupName, groupId)` - Generar y subir Excel procesado

### Configuración Requerida
```env
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

## Endpoints de Documentos GCP

### Obtener todos los documentos
```bash
GET /api/gcp-documents?page=1&limit=10&groupId=1&documentType=original_upload&uploadedBy=1
```

### Obtener documentos del usuario autenticado
```bash
GET /api/gcp-documents/my-documents?page=1&limit=10&documentType=processed_excel
Authorization: Bearer <token>
```

### Obtener documentos por grupo
```bash
GET /api/gcp-documents/group/1?page=1&limit=10
Authorization: Bearer <token>
```

### Subir documento sin grupo
```bash
POST /api/gcp-documents/upload
Authorization: Bearer <token>
Content-Type: application/json

{
  "base64": "UEsDBBQAAAAIAA...",
  "fileName": "documento.xlsx",
  "documentType": "general",
  "metadata": {
    "description": "Documento de prueba",
    "category": "test"
  }
}
```

### Generar y subir Excel procesado
```bash
POST /api/gcp-documents/generate-excel
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientsData": [
    {
      "name": "Juan Pérez",
      "phone": "3001234567",
      "email": "juan@email.com",
      "status": "pending"
    }
  ],
  "groupName": "Mi Grupo",
  "groupId": 1
}
```

### Respuesta de ejemplo
```json
{
  "success": true,
  "message": "Documento subido exitosamente",
  "data": {
    "id": 1,
    "fileName": "group-documents/2024/01/15/documento_2024-01-15T10-30-00-000Z_abc123.xlsx",
    "originalName": "documento.xlsx",
    "bucketUrl": "gs://ia_calls_documents/group-documents/2024/01/15/documento_2024-01-15T10-30-00-000Z_abc123.xlsx",
    "publicUrl": "https://storage.googleapis.com/ia_calls_documents/group-documents/2024/01/15/documento_2024-01-15T10-30-00-000Z_abc123.xlsx",
    "downloadUrl": "https://storage.googleapis.com/ia_calls_documents/group-documents/2024/01/15/documento_2024-01-15T10-30-00-000Z_abc123.xlsx?X-Goog-Algorithm=...",
    "fileSize": 15420,
    "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "documentType": "original_upload",
    "groupId": 1,
    "uploadedBy": 1,
    "metadata": {
      "description": "Documento de prueba",
      "category": "test"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Configuración de Credenciales de Google Cloud

1. **Crear un proyecto en Google Cloud Console**
2. **Habilitar Google Cloud Storage API**
3. **Crear una cuenta de servicio** con permisos de Storage Admin
4. **Descargar la clave JSON** de la cuenta de servicio
5. **Configurar las variables de entorno**:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./CLAVE_GCP.json
   GOOGLE_CLOUD_PROJECT_ID=tu-proyecto-id
   ```

### Permisos Requeridos
La cuenta de servicio debe tener los siguientes roles:
- `Storage Object Admin` para el bucket `ia_calls_documents`
- `Storage Object Creator` para crear archivos
- `Storage Object Viewer` para leer archivos

## Scripts Disponibles

### Procesamiento de Archivos
```bash
# Crear archivo de prueba y generar base64
node scripts/test-file-processing.js

# Probar endpoints de documentos GCP
node scripts/test-gcp-endpoints.js
```

### Base de Datos
```bash
# Migrar base de datos
npm run migrate

# Migrar tabla de documentos GCP
node scripts/migrate-gcp-documents.js

# Restaurar desarrollo
npm run restore-dev

# Construir
npm run build
```

## Manejo de Llamadas Salientes

### Problema del Endpoint Principal
El endpoint `POST /calls/outbound` actualmente devuelve error 500 porque la API externa (`https://369bbe0501eb.ngrok-free.app/outbound-call`) no está funcionando correctamente y devuelve HTML en lugar de JSON.

### Soluciones Implementadas

#### 1. Endpoint Principal Mejorado
- **Validación mejorada** del formato del número de teléfono
- **Mejor manejo de errores** con códigos de estado específicos
- **Logs detallados** para diagnóstico
- **Configuración por variable de entorno** para la URL de la API externa

#### 2. Endpoint de Desarrollo
- **`POST /calls/outbound-dev`** - Simula llamadas para desarrollo
- **No requiere API externa** - funciona independientemente
- **Respuesta realista** con ID de llamada y timestamp
- **Validación de formato** del número de teléfono

### Uso de los Endpoints

#### Endpoint Principal (cuando la API externa funcione)
```bash
POST /calls/outbound
Content-Type: application/json

{
  "number": "3006120261"
}
```

#### Endpoint de Desarrollo (recomendado para pruebas)
```bash
POST /calls/outbound-dev
Content-Type: application/json

{
  "number": "3006120261"
}
```

**Respuesta del endpoint de desarrollo:**
```json
{
  "success": true,
  "message": "Llamada iniciada exitosamente",
  "data": {
    "callId": "call_1734567890_abc123def",
    "number": "3006120261",
    "status": "initiated",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "estimatedDuration": "30-60 segundos"
  },
  "note": "Esta es una simulación para desarrollo. La API externa no está disponible."
}
```

### Configuración de la API Externa
Para usar el endpoint principal, configura la variable de entorno:
```env
OUTBOUND_CALL_API_URL=https://tu-api-externa.com/outbound-call
```

## Configuración

### Variables de Entorno

```env
# Servidor
PORT=3000
NODE_ENV=development

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ia_calls
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name
GOOGLE_CLOUD_KEY_FILE=path/to/key.json
```

## Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas en modo watch
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage
```

## Documentación Adicional

- [Documentación de Procesamiento de Archivos](docs/file-processing.md)
- [Guía de API](docs/api-guide.md)
- [Configuración de Base de Datos](docs/database-setup.md)

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles. 