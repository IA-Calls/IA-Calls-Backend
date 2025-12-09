# 🚀 Comandos de Configuración - Vertex AI para WhatsApp

## 📋 Requisito Previo

Asegúrate de tener instalado **Google Cloud SDK (gcloud CLI)**:

### Windows
```powershell
# Descargar e instalar desde:
https://cloud.google.com/sdk/docs/install

# O con Chocolatey:
choco install gcloudsdk
```

### Verificar Instalación
```bash
gcloud --version
```

## 🔧 Pasos de Configuración

### Paso 1: Autenticarse con Google Cloud

```bash
# Autenticarse con tu cuenta de Google
gcloud auth login

# Configurar cuenta de servicio para la aplicación
gcloud auth application-default login
```

### Paso 2: Generar Archivo de Credenciales

```bash
# Crear el archivo vertex-ai-key.json desde las variables del .env
npm run setup:vertex-credentials
```

**Salida esperada:**
```
🔐 Generando archivo de credenciales de Google Cloud...
✅ Archivo de credenciales creado exitosamente
📁 Ubicación: C:\Users\...\IA-Calls-Backend\vertex-ai-key.json
📋 Proyecto: nextvoice
📧 Service Account: nextvoice@nextvoice.iam.gserviceaccount.com
✅ Agregado vertex-ai-key.json al .gitignore

📋 Siguiente paso: Habilitar APIs de Google Cloud
Ejecuta: npm run setup:vertex-apis
```

### Paso 3: Habilitar APIs y Configurar Permisos

```bash
# Habilitar APIs necesarias y configurar permisos
npm run setup:vertex-apis
```

**Salida esperada:**
```
🚀 Configurando Google Cloud para Vertex AI Dialogflow CX

📋 Proyecto: nextvoice

1️⃣ Configurando proyecto activo...
Updated property [core/project].

2️⃣ Habilitando Dialogflow API...
Operation "operations/..." finished successfully.

3️⃣ Habilitando Cloud Resource Manager API...
Operation "operations/..." finished successfully.

4️⃣ Habilitando IAM API...
Operation "operations/..." finished successfully.

5️⃣ Verificando permisos del Service Account...
   Service Account: nextvoice@nextvoice.iam.gserviceaccount.com

6️⃣ Asignando rol de Dialogflow Admin...
Updated IAM policy for project [nextvoice].

✅ Configuración completada exitosamente!

📋 Resumen:
   - Proyecto: nextvoice
   - Service Account: nextvoice@nextvoice.iam.gserviceaccount.com
   - APIs habilitadas: Dialogflow, Cloud Resource Manager, IAM
   - Rol asignado: roles/dialogflow.admin

🎉 Ya puedes crear agentes de WhatsApp con Vertex AI!
```

### Paso 4: Verificar Configuración

```bash
# Listar APIs habilitadas
gcloud services list --enabled --project=nextvoice

# Verificar permisos del Service Account
gcloud projects get-iam-policy nextvoice \
  --flatten="bindings[].members" \
  --filter="bindings.members:nextvoice@nextvoice.iam.gserviceaccount.com"
```

### Paso 5: Reiniciar Servidor

```bash
# Detener el servidor actual (Ctrl+C)
# Reiniciar para cargar las nuevas credenciales
npm run dev
```

## 🧪 Probar la Configuración

### Test 1: Crear un Agente

```bash
curl -X POST http://localhost:5000/api/whatsapp/agents \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Agente de Prueba\", \"instructor\": \"Eres un asistente virtual amable que ayuda con preguntas frecuentes.\", \"language\": \"es\"}"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Agente creado exitosamente en Vertex AI",
  "data": {
    "id": "uuid-generado",
    "name": "Agente de Prueba",
    "agent_id": "vertex-ai-agent-id",
    "language": "es",
    "platform": "vertex-ai",
    "created_at": "2025-12-04T..."
  }
}
```

### Test 2: Listar Agentes

```bash
curl http://localhost:5000/api/whatsapp/agents
```

### Test 3: Asignar Agente a Conversación

```bash
curl -X PUT http://localhost:5000/api/whatsapp/conversations/573138539155/agent \
  -H "Content-Type: application/json" \
  -d "{\"agent_id\": \"uuid-del-agente\"}"
```

### Test 4: Enviar Mensaje de WhatsApp

Envía un mensaje desde WhatsApp al número configurado. Deberías ver en los logs:

```
📱 Mensaje entrante recibido: { from: '573138539155', ... }
✅ Mensaje guardado para 573138539155
🤖 Procesando mensaje para 573138539155 con agente Agente de Prueba
📤 Enviando mensaje a Vertex AI: "Hola"
📥 Respuesta recibida del agente: "¡Hola! ¿En qué puedo ayudarte?"
🎯 Confianza: 98.50%
✅ Mensaje enviado a WhatsApp
```

## 🛠️ Solución de Problemas

### Error: "gcloud: command not found"

```bash
# Instalar Google Cloud SDK
# Windows: https://cloud.google.com/sdk/docs/install
# O descargar: https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe
```

### Error: "ERROR: (gcloud.auth.login) Failed to open browser"

```bash
# Usar autenticación sin navegador
gcloud auth login --no-launch-browser
```

### Error: "PERMISSION_DENIED: The caller does not have permission"

```bash
# Verificar que el service account tenga el rol correcto
gcloud projects add-iam-policy-binding nextvoice \
  --member="serviceAccount:nextvoice@nextvoice.iam.gserviceaccount.com" \
  --role="roles/dialogflow.admin"
```

### Error: "API [dialogflow.googleapis.com] not enabled"

```bash
# Habilitar manualmente la API
gcloud services enable dialogflow.googleapis.com --project=nextvoice
```

### Error: "vertex-ai-key.json not found"

```bash
# Regenerar el archivo
npm run setup:vertex-credentials
```

## 📋 Variables de Entorno Requeridas

Verifica que tu `.env` tenga estas variables:

```env
# Google Cloud - Ya las tienes ✅
GOOGLE_CLOUD_PROJECT_ID=nextvoice
GOOGLE_CLOUD_PRIVATE_KEY_ID=8dfbd1dede467e93f6eb08e4406259373cc08dfe
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_CLOUD_CLIENT_EMAIL=nextvoice@nextvoice.iam.gserviceaccount.com
GOOGLE_CLOUD_CLIENT_ID=114277105820543889772
DIALOGFLOW_LOCATION=us-central1

# Estas también se necesitan
GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json
```

## ✅ Checklist

- [ ] Instalar Google Cloud SDK
- [ ] Autenticarse con `gcloud auth login`
- [ ] Ejecutar `npm run setup:vertex-credentials`
- [ ] Ejecutar `npm run setup:vertex-apis`
- [ ] Reiniciar servidor con `npm run dev`
- [ ] Crear agente de prueba
- [ ] Asignar agente a conversación
- [ ] Probar enviando mensaje de WhatsApp

## 🎉 Resultado Final

Una vez completado, tendrás:

1. ✅ Archivo `vertex-ai-key.json` generado
2. ✅ APIs de Dialogflow habilitadas
3. ✅ Service Account con permisos correctos
4. ✅ Agentes de WhatsApp funcionando con Vertex AI
5. ✅ Respuestas automáticas inteligentes

¡Todo listo para usar IA conversacional en WhatsApp! 🚀

