# 📍 ¿Dónde se Implementan los Agentes?

## 🔍 Situación Actual

Cuando creas un agente usando el endpoint `POST /api/whatsapp/agents`, el sistema hace lo siguiente:

### 1. **Creación en Vertex AI Agent Engine** (Intento)
El código intenta crear el agente en Vertex AI usando la API REST:
```
POST https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/agents
```

**Si tiene éxito**, el agente aparecerá en:
- ✅ **Google Cloud Console** → **Vertex AI** → **Motor del agente**
- ✅ La tabla mostrará el agente con su nombre, descripción, fecha de creación, etc.

### 2. **Fallback Local** (Si falla)
Si la creación en Vertex AI falla (por ejemplo, API no habilitada o permisos), el sistema crea un agente **local**:
- ✅ Se guarda en **PostgreSQL** (tabla `whatsapp_agents`)
- ❌ **NO aparece** en el "Motor del agente" de Vertex AI
- ✅ Funciona igual para enviar mensajes (usa Gemini directamente)

---

## 🎯 Cómo Verificar Dónde Está Tu Agente

### Opción 1: Verificar en la Consola de Google Cloud

1. Ve a: **https://console.cloud.google.com/vertex-ai/agent-engine?project=nextvoice**
2. Busca tu agente por nombre
3. Si aparece → ✅ Está en Vertex AI Agent Engine
4. Si NO aparece → ⚠️ Está solo en PostgreSQL (local)

### Opción 2: Verificar en los Logs

Cuando creas un agente, revisa los logs del servidor:

**Si aparece esto:**
```
✅ Agente creado en Vertex AI: {agent-id}
   Resource Name: projects/nextvoice/locations/us-east1/agents/{agent-id}
```
→ ✅ El agente está en Vertex AI

**Si aparece esto:**
```
⚠️ Creando agente local como fallback...
```
→ ⚠️ El agente está solo en PostgreSQL (local)

---

## 🔧 Cómo Hacer que los Agentes Aparezcan en Vertex AI

### Paso 1: Habilitar la API de Vertex AI

1. Ve a: **https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=nextvoice**
2. Haz clic en **"ENABLE"** (Habilitar)
3. Espera 1-2 minutos

### Paso 2: Verificar Permisos del Service Account

El Service Account `nextvoice@nextvoice.iam.gserviceaccount.com` necesita estos roles:
- `roles/aiplatform.user` (mínimo)
- `roles/aiplatform.admin` (recomendado para crear agentes)

### Paso 3: Verificar la Región

El código usa la región de `DIALOGFLOW_LOCATION` (actualmente `us-east1`).

**Importante:** Gemini puede no estar disponible en todas las regiones. Prueba con:
- `us-central1` (recomendado)
- `us-east1`
- `europe-west1`

---

## 📊 Diferencia Entre Agentes Locales y en la Nube

| Característica | Agente Local (PostgreSQL) | Agente en Vertex AI |
|----------------|---------------------------|---------------------|
| Aparece en consola | ❌ No | ✅ Sí |
| Funciona para chat | ✅ Sí | ✅ Sí |
| Gestión desde consola | ❌ No | ✅ Sí |
| Historial en Vertex AI | ❌ No | ✅ Sí |
| Métricas y telemetría | ❌ No | ✅ Sí |

---

## 🚀 Próximos Pasos

1. **Habilita la API de Vertex AI** (si no lo has hecho)
2. **Verifica los permisos** del Service Account
3. **Crea un nuevo agente** usando el endpoint
4. **Revisa los logs** para ver si se creó en Vertex AI
5. **Verifica en la consola** si aparece en "Motor del agente"

---

## 💡 Nota Importante

**Los agentes funcionan igual** para enviar mensajes, independientemente de si están en Vertex AI o solo en PostgreSQL. La diferencia es:

- **Agentes en Vertex AI**: Aparecen en la consola, tienen métricas, telemetría, etc.
- **Agentes locales**: Solo están en tu BD, pero funcionan igual para chat

Si solo necesitas que funcionen para WhatsApp, **no es necesario** que aparezcan en Vertex AI. Pero si quieres gestionarlos desde la consola, necesitas habilitar la API.



