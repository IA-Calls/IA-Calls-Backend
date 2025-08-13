# Guía de Configuración de Google Cloud Storage

## 🚨 Problema Actual
Las credenciales en `CLAVE_GCP.json` son inválidas. Error: `invalid_grant: Invalid JWT Signature`

## 🔧 Solución Paso a Paso

### 1. Acceder a Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto: `model-factor-467820-h2`
3. Asegúrate de estar en el proyecto correcto

### 2. Crear una Nueva Cuenta de Servicio
1. Ve a **IAM & Admin** > **Service Accounts**
2. Haz clic en **CREATE SERVICE ACCOUNT**
3. Configuración:
   - **Name**: `ia-calls-storage-service`
   - **Description**: `Cuenta de servicio para IA Calls Storage`
   - **ID**: Se genera automáticamente

### 3. Asignar Permisos
1. En la sección **Grant this service account access to project**
2. Asigna estos roles:
   - **Storage Object Admin** (para leer/escribir archivos)
   - **Storage Object Creator** (para crear archivos)
   - **Storage Object Viewer** (para leer archivos)

### 4. Generar Clave JSON
1. Haz clic en la cuenta de servicio creada
2. Ve a la pestaña **KEYS**
3. Haz clic en **ADD KEY** > **Create new key**
4. Selecciona **JSON**
5. Haz clic en **CREATE**
6. Se descargará un archivo JSON

### 5. Reemplazar Credenciales
1. Renombra el archivo descargado a `CLAVE_GCP.json`
2. Reemplaza el archivo existente en la raíz del proyecto
3. **IMPORTANTE**: Nunca subas este archivo a Git

### 6. Crear el Bucket (si no existe)
1. Ve a **Cloud Storage** > **Buckets**
2. Haz clic en **CREATE BUCKET**
3. Configuración:
   - **Name**: `ia_calls_documents`
   - **Location type**: Region
   - **Location**: Cerca de tu ubicación (ej: `us-central1`)
   - **Storage class**: Standard
   - **Access control**: Uniform
   - **Protection tools**: None (para desarrollo)

### 7. Verificar Configuración
```bash
# Ejecutar script de prueba
node scripts/test-gcp-connection.js
```

## 📋 Estructura del Bucket
```
gs://ia_calls_documents/
├── group-documents/
│   ├── 2024/
│   │   ├── 01/
│   │   │   ├── 15/
│   │   │   │   ├── documento_2024-01-15T10-30-00-000Z_abc123.xlsx
│   │   │   │   └── clientes_grupo_2024-01-15T10-30-00-000Z_def456.xlsx
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── ...
```

## 🔒 Seguridad
- **Nunca** subas `CLAVE_GCP.json` a Git
- Agrega `CLAVE_GCP.json` a `.gitignore`
- Usa variables de entorno en producción
- Rota las claves periódicamente

## 🧪 Pruebas
```bash
# Probar conexión
node scripts/test-gcp-connection.js

# Probar subida de archivo
node scripts/test-gcp-upload.js

# Probar creación de grupo con archivo
curl -X POST http://localhost:5000/api/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Grupo Test",
    "base64": "UEsDBBQAAAAIAA...",
    "document_name": "test.xlsx"
  }'
```

## 🚀 Variables de Entorno
Asegúrate de que tu archivo `.env` contenga:
```env
GOOGLE_APPLICATION_CREDENTIALS=./CLAVE_GCP.json
GOOGLE_CLOUD_PROJECT_ID=model-factor-467820-h2
```

## 📞 Soporte
Si tienes problemas:
1. Verifica que el proyecto esté activo
2. Confirma que la cuenta de servicio tenga permisos
3. Asegúrate de que el bucket exista
4. Revisa los logs de Google Cloud Console

## 🔗 Enlaces Útiles
- [Google Cloud Console](https://console.cloud.google.com/)
- [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
- [Cloud Storage](https://console.cloud.google.com/storage/browser)
- [Documentación de Google Cloud Storage](https://cloud.google.com/storage/docs)
