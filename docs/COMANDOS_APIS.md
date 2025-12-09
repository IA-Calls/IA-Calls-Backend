# 🚀 Comandos para Habilitar APIs de Google Cloud

## 📋 APIs Necesarias para Vertex AI Dialogflow CX

Necesitas habilitar estas 3 APIs en tu proyecto `nextvoice`:

1. **Dialogflow API** - Para crear y usar agentes conversacionales
2. **Cloud Resource Manager API** - Para gestionar recursos del proyecto
3. **IAM API** - Para gestionar permisos y service accounts

---

## 🔧 Opción 1: Desde Google Cloud Console (MÁS FÁCIL)

### 1. Habilitar Dialogflow API

Abre este enlace en tu navegador:

```
https://console.cloud.google.com/apis/library/dialogflow.googleapis.com?project=nextvoice
```

1. Haz clic en el botón **"HABILITAR"** o **"ENABLE"**
2. Espera unos segundos hasta que aparezca el checkmark verde ✅
3. Listo!

### 2. Habilitar Cloud Resource Manager API

Abre este enlace:

```
https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com?project=nextvoice
```

1. Haz clic en **"HABILITAR"** o **"ENABLE"**
2. Espera la confirmación ✅

### 3. Habilitar IAM API

Abre este enlace:

```
https://console.cloud.google.com/apis/library/iam.googleapis.com?project=nextvoice
```

1. Haz clic en **"HABILITAR"** o **"ENABLE"**
2. Espera la confirmación ✅

---

## 💻 Opción 2: Desde Terminal (gcloud CLI)

### Requisito Previo

Asegúrate de tener `gcloud` instalado y autenticado:

```bash
# Verificar instalación
gcloud --version

# Autenticarse (si no lo has hecho)
gcloud auth login

# Configurar proyecto
gcloud config set project nextvoice
```

### Comandos para Ejecutar

Copia y pega estos comandos uno por uno:

```bash
# 1. Habilitar Dialogflow API
gcloud services enable dialogflow.googleapis.com --project=nextvoice

# 2. Habilitar Cloud Resource Manager API
gcloud services enable cloudresourcemanager.googleapis.com --project=nextvoice

# 3. Habilitar IAM API
gcloud services enable iam.googleapis.com --project=nextvoice
```

### Verificar que se Habilitaron

```bash
# Listar todas las APIs habilitadas
gcloud services list --enabled --project=nextvoice | grep -E "(dialogflow|cloudresourcemanager|iam)"
```

Deberías ver algo como:

```
dialogflow.googleapis.com
cloudresourcemanager.googleapis.com
iam.googleapis.com
```

---

## 🔐 Verificar Permisos del Service Account

Después de habilitar las APIs, verifica que tu service account tenga los permisos correctos:

### Desde Google Cloud Console

Abre este enlace:

```
https://console.cloud.google.com/iam-admin/iam?project=nextvoice
```

1. Busca: `nextvoice@nextvoice.iam.gserviceaccount.com`
2. Verifica que tenga el rol: **Dialogflow API Admin** o **Editor**

### Si NO tiene el rol, agregarlo:

#### Opción A: Desde la Consola Web

1. En la página de IAM, haz clic en **"GRANT ACCESS"** o **"OTORGAR ACCESO"**
2. En **"New principals"**, escribe: `nextvoice@nextvoice.iam.gserviceaccount.com`
3. En **"Role"**, selecciona: **Dialogflow API Admin**
4. Haz clic en **"SAVE"** o **"GUARDAR"**

#### Opción B: Desde Terminal

```bash
# Asignar rol de Dialogflow Admin al service account
gcloud projects add-iam-policy-binding nextvoice \
  --member="serviceAccount:nextvoice@nextvoice.iam.gserviceaccount.com" \
  --role="roles/dialogflow.admin"
```

---

## ✅ Verificación Completa

### 1. Verificar APIs Habilitadas

```bash
gcloud services list --enabled --project=nextvoice \
  --filter="name:dialogflow.googleapis.com OR name:cloudresourcemanager.googleapis.com OR name:iam.googleapis.com"
```

### 2. Verificar Permisos del Service Account

```bash
gcloud projects get-iam-policy nextvoice \
  --flatten="bindings[].members" \
  --filter="bindings.members:nextvoice@nextvoice.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

Deberías ver `roles/dialogflow.admin` en la lista.

### 3. Probar Creando un Agente

```bash
# Desde tu backend (después de reiniciar el servidor)
curl -X POST http://localhost:5000/api/whatsapp/agents \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Agente de Prueba\", \"instructor\": \"Eres un asistente amable.\", \"language\": \"es\"}"
```

Si todo está bien, deberías recibir una respuesta con `"success": true`.

---

## 🛠️ Solución de Problemas

### Error: "PERMISSION_DENIED"

**Causa**: Tu cuenta no tiene permisos para habilitar APIs.

**Solución**: 
- Usa la Opción 1 (Google Cloud Console) en lugar de terminal
- O pide a un administrador del proyecto que habilite las APIs

### Error: "API not enabled"

**Causa**: La API no se habilitó correctamente.

**Solución**:
```bash
# Intentar habilitar de nuevo
gcloud services enable dialogflow.googleapis.com --project=nextvoice

# Verificar estado
gcloud services list --enabled --project=nextvoice | grep dialogflow
```

### Error: "Service account does not have permission"

**Causa**: El service account no tiene el rol correcto.

**Solución**:
```bash
# Asignar rol manualmente
gcloud projects add-iam-policy-binding nextvoice \
  --member="serviceAccount:nextvoice@nextvoice.iam.gserviceaccount.com" \
  --role="roles/dialogflow.admin"
```

### Error: "Billing not enabled"

**Causa**: El proyecto necesita facturación habilitada.

**Solución**:
1. Ve a: https://console.cloud.google.com/billing/linkedaccount?project=nextvoice
2. Asocia una cuenta de facturación
3. Nota: Dialogflow CX tiene 3M de solicitudes gratis al mes

---

## 📋 Checklist Rápido

- [ ] Habilitar Dialogflow API
- [ ] Habilitar Cloud Resource Manager API
- [ ] Habilitar IAM API
- [ ] Verificar permisos del service account
- [ ] Agregar `GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json` al `.env`
- [ ] Reiniciar servidor (`npm run dev`)
- [ ] Probar creando un agente

---

## 🎯 Comandos Resumidos (Copia y Pega)

```bash
# Configurar proyecto
gcloud config set project nextvoice

# Habilitar APIs (ejecuta uno por uno)
gcloud services enable dialogflow.googleapis.com --project=nextvoice
gcloud services enable cloudresourcemanager.googleapis.com --project=nextvoice
gcloud services enable iam.googleapis.com --project=nextvoice

# Asignar permisos al service account
gcloud projects add-iam-policy-binding nextvoice \
  --member="serviceAccount:nextvoice@nextvoice.iam.gserviceaccount.com" \
  --role="roles/dialogflow.admin"

# Verificar
gcloud services list --enabled --project=nextvoice | grep -E "(dialogflow|cloudresourcemanager|iam)"
```

---

## 🚀 Después de Habilitar las APIs

1. **Agregar variable al .env**:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json
   ```

2. **Reiniciar servidor**:
   ```bash
   npm run dev
   ```

3. **Probar creando un agente**:
   ```bash
   curl -X POST http://localhost:5000/api/whatsapp/agents \
     -H "Content-Type: application/json" \
     -d "{\"name\": \"Mi Agente\", \"instructor\": \"Eres un asistente amable.\", \"language\": \"es\"}"
   ```

¡Listo! 🎉

