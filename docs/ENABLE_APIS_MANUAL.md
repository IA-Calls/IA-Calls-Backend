# 🌐 Habilitar APIs Manualmente desde Google Cloud Console

## 🔗 Enlaces Directos

### 1. Habilitar Dialogflow API

Abre este enlace en tu navegador:

```
https://console.cloud.google.com/apis/library/dialogflow.googleapis.com?project=nextvoice
```

1. Haz clic en **"HABILITAR"** (ENABLE)
2. Espera unos segundos hasta que se habilite
3. Verás un mensaje de confirmación

### 2. Habilitar Cloud Resource Manager API

```
https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com?project=nextvoice
```

1. Haz clic en **"HABILITAR"** (ENABLE)
2. Espera la confirmación

### 3. Verificar Service Account Permissions

```
https://console.cloud.google.com/iam-admin/iam?project=nextvoice
```

1. Busca: `nextvoice@nextvoice.iam.gserviceaccount.com`
2. Verifica que tenga uno de estos roles:
   - **Dialogflow API Admin** (`roles/dialogflow.admin`) ✅
   - O **Editor** (`roles/editor`)
   - O **Owner** (`roles/owner`)

#### Si NO tiene el rol, agregarlo:

1. Haz clic en **"GRANT ACCESS"** o **"OTORGAR ACCESO"**
2. En **"New principals"**, escribe: `nextvoice@nextvoice.iam.gserviceaccount.com`
3. En **"Role"**, selecciona: **Dialogflow API Admin**
4. Haz clic en **"SAVE"** o **"GUARDAR"**

## ✅ Verificación

Una vez habilitadas las APIs, verifica que todo esté listo:

### Desde Google Cloud Console:

```
https://console.cloud.google.com/apis/dashboard?project=nextvoice
```

Deberías ver en la lista:
- ✅ Dialogflow API
- ✅ Cloud Resource Manager API

## 🚀 Siguiente Paso

Una vez habilitadas las APIs, **reinicia tu servidor**:

```bash
# Detener el servidor (Ctrl+C)
npm run dev
```

Y prueba creando un agente:

```bash
curl -X POST http://localhost:5000/api/whatsapp/agents \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Mi Agente\", \"instructor\": \"Eres un asistente amable.\", \"language\": \"es\"}"
```

## 🔍 Si Hay Errores

### Error: "User project denied"

Tu cuenta no tiene permisos en el proyecto. Debes:
1. Ser Owner o Editor del proyecto `nextvoice`
2. O pedirle a un administrador del proyecto que habilite las APIs

### Error: "Billing not enabled"

El proyecto necesita tener facturación habilitada:

```
https://console.cloud.google.com/billing/linkedaccount?project=nextvoice
```

1. Asocia una cuenta de facturación
2. Ten en cuenta que Dialogflow CX tiene 3M de solicitudes gratis al mes

### Error: "Invalid authentication credentials"

Verifica que el archivo `vertex-ai-key.json` existe y está bien formado:

```bash
# Verificar que existe
ls vertex-ai-key.json

# Ver su contenido (primeras líneas)
head -n 5 vertex-ai-key.json
```

Debería mostrar:
```json
{
  "type": "service_account",
  "project_id": "nextvoice",
  ...
}
```

## 💡 Consejo

Si no tienes permisos para habilitar APIs, contacta al administrador del proyecto Google Cloud y comparte estos enlaces con él.

