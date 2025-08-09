# 🔧 Configuración de Variables de Entorno para Almacenamiento

## 📋 Variables Requeridas

Agrega las siguientes variables a tu archivo `.env` para habilitar el almacenamiento en Google Cloud Storage:

```env
# ========================================
# GOOGLE CLOUD STORAGE CONFIGURATION
# ========================================

# Ruta al archivo de credenciales de servicio de Google Cloud
# Ejemplo: /path/to/your/service-account-key.json
# O en Windows: C:\\path\\to\\your\\service-account-key.json
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json

# ID del proyecto de Google Cloud
# Ejemplo: my-project-123456
GOOGLE_CLOUD_PROJECT_ID=tu-proyecto-id

# Nombre del bucket de Google Cloud Storage
# Ejemplo: ia-calls-excel-files
GOOGLE_CLOUD_BUCKET_NAME=tu-bucket-name
```

## 🔑 Configuración de Credenciales

### 1. Crear Cuenta de Servicio

1. Ve a la [Consola de Google Cloud](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **IAM & Admin** > **Service Accounts**
4. Haz clic en **Create Service Account**
5. Dale un nombre descriptivo (ej: `ia-calls-storage`)
6. Asigna los siguientes roles:
   - **Storage Object Admin** (para subir/eliminar archivos)
   - **Storage Object Viewer** (para leer archivos)

### 2. Descargar Clave JSON

1. En la lista de cuentas de servicio, haz clic en la que creaste
2. Ve a la pestaña **Keys**
3. Haz clic en **Add Key** > **Create new key**
4. Selecciona **JSON**
5. Descarga el archivo y guárdalo en una ubicación segura
6. Actualiza `GOOGLE_APPLICATION_CREDENTIALS` con la ruta completa

### 3. Crear Bucket

1. Ve a **Cloud Storage** > **Buckets**
2. Haz clic en **Create Bucket**
3. Configura:
   - **Name**: `ia-calls-excel-files` (o el nombre que prefieras)
   - **Location**: `us-central1` (o la región más cercana)
   - **Storage class**: `Standard`
   - **Access control**: `Uniform`
4. Haz clic en **Create**

## 🔒 Configuración de Seguridad

### Permisos del Bucket

Para mayor seguridad, puedes configurar permisos específicos:

```bash
# Dar permisos solo a la cuenta de servicio
gsutil iam ch serviceAccount:ia-calls-storage@tu-proyecto.iam.gserviceaccount.com:objectAdmin gs://tu-bucket-name
```

### CORS (si es necesario)

Si planeas acceder a los archivos desde el navegador, configura CORS:

```json
[
  {
    "origin": ["http://localhost:3000", "https://tu-dominio.com"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
```

Guarda esto como `cors.json` y ejecuta:
```bash
gsutil cors set cors.json gs://tu-bucket-name
```

## 🧪 Verificación

Una vez configurado, ejecuta el script de prueba:

```bash
node test-storage-setup.js
```

Deberías ver:
```
🧪 Probando configuración de almacenamiento...

1️⃣ Probando conexión al bucket...
✅ Conexión exitosa: { success: true, message: 'Conexión a Google Cloud Storage exitosa', bucketName: 'tu-bucket-name', projectId: 'tu-proyecto-id' }

2️⃣ Probando listado de archivos...
✅ Listado exitoso: { total: 0, files: 0 }

3️⃣ Probando generación de nombres únicos...
✅ Nombres generados:
   - Archivo 1: excel-uploads/2025/08/02/test1_2025-08-02T19-36-36-123Z_abc123.xlsx
   - Archivo 2: excel-uploads/2025/08/02/test2_2025-08-02T19-36-36-123Z_def456.xlsx

4️⃣ Probando determinación de tipos de contenido...
✅ Tipos de contenido:
   - .xlsx: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   - .xls: application/vnd.ms-excel
   - .csv: text/csv

🎉 Todas las pruebas pasaron exitosamente!
📁 El servicio de almacenamiento está configurado correctamente.
```

## 🚨 Solución de Problemas

### Error: "Invalid credentials"
- Verifica que la ruta a `GOOGLE_APPLICATION_CREDENTIALS` sea correcta
- Asegúrate de que el archivo JSON existe y es válido
- Confirma que la cuenta de servicio tiene los permisos necesarios

### Error: "Bucket not found"
- Verifica que `GOOGLE_CLOUD_BUCKET_NAME` sea correcto
- Confirma que el bucket existe en el proyecto especificado
- Asegúrate de que la cuenta de servicio tiene acceso al bucket

### Error: "Project not found"
- Verifica que `GOOGLE_CLOUD_PROJECT_ID` sea correcto
- Confirma que el proyecto existe y está activo
- Asegúrate de que la cuenta de servicio pertenece al proyecto

### Error: "Permission denied"
- Verifica que la cuenta de servicio tiene el rol `Storage Object Admin`
- Confirma que no hay políticas de IAM que bloqueen el acceso
- Revisa los logs de auditoría en Google Cloud Console

## 📝 Notas Importantes

1. **Seguridad**: Nunca subas el archivo de credenciales a Git
2. **Costo**: Google Cloud Storage tiene costos por almacenamiento y transferencia
3. **Límites**: Considera configurar políticas de lifecycle para archivos antiguos
4. **Backup**: Los archivos se almacenan de forma redundante automáticamente
5. **Monitoreo**: Usa Cloud Monitoring para supervisar el uso del bucket 