# 🔥 Migración a Firestore

## 📋 Resumen

El sistema ha sido migrado de MongoDB a Firestore (Firebase). Todas las conversaciones de WhatsApp ahora se almacenan en Firestore usando las credenciales de Google Cloud Service Account que ya están configuradas en el backend.

---

## ✅ Cambios Realizados

### 1. Configuración de Firestore

**Archivo:** `src/config/firestore.js`

- ✅ Configuración de Firebase Admin SDK
- ✅ Uso de credenciales de Google Cloud desde variables de entorno
- ✅ Conexión automática al iniciar el backend
- ✅ Manejo de errores y reconexión

### 2. Modelo de Conversaciones

**Archivo:** `src/models/ConversationWhatsApp.js`

- ✅ Migrado de Mongoose (MongoDB) a Firestore
- ✅ Mantiene la misma API para compatibilidad
- ✅ Colección: `conversations_whatsapp`
- ✅ Documento ID: `phoneNumber` (número de teléfono)

### 3. Servidor

**Archivo:** `server.js`

- ✅ Reemplazado `connectMongoDB()` por `connectFirestore()`
- ✅ Logs actualizados para mostrar estado de Firestore

### 4. Dependencias

**Archivo:** `package.json`

- ✅ Agregado `firebase-admin: ^12.0.0`

---

## 🔧 Configuración

### Variables de Entorno Requeridas

Las siguientes variables de entorno ya están configuradas (de Google Cloud):

```env
GOOGLE_CLOUD_PROJECT_ID=tu-proyecto
GOOGLE_CLOUD_PRIVATE_KEY_ID=...
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_CLOUD_CLIENT_EMAIL=...@...iam.gserviceaccount.com
GOOGLE_CLOUD_CLIENT_ID=...
GOOGLE_CLOUD_AUTH_URI=https://accounts.google.com/o/oauth2/auth
GOOGLE_CLOUD_TOKEN_URI=https://oauth2.googleapis.com/token
GOOGLE_CLOUD_AUTH_PROVIDER_X509_CERT_URL=...
GOOGLE_CLOUD_CLIENT_X509_CERT_URL=...
GOOGLE_CLOUD_UNIVERSE_DOMAIN=googleapis.com
```

**No necesitas configurar nada adicional.** El sistema usa las mismas credenciales que ya tienes para Google Cloud.

---

## 📊 Estructura en Firestore

### Colección: `conversations_whatsapp`

Cada documento tiene como ID el número de teléfono y contiene:

```javascript
{
  phoneNumber: "573001234567",
  clientName: "Juan Pérez",
  conversationSummary: "Resumen de la conversación",
  messages: [
    {
      type: "sent" | "received",
      content: "Mensaje de texto",
      messageId: "wamid.xxx",
      timestamp: Timestamp,
      metadata: {}
    }
  ],
  status: "active" | "pending" | "sent" | "delivered" | "read" | "failed" | "closed",
  vonageMessageId: "xxx",
  whatsappMessageId: "wamid.xxx",
  errorMessage: null,
  sentAt: Timestamp,
  receivedAt: Timestamp,
  lastMessageAt: Timestamp,
  metadata: {},
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 🔄 API Compatible

El modelo mantiene la misma API que tenía con MongoDB:

```javascript
const ConversationWhatsApp = require('./models/ConversationWhatsApp');

// Crear o actualizar
const conversation = await ConversationWhatsApp.createOrUpdate(phoneNumber, data);

// Buscar por teléfono
const conversations = await ConversationWhatsApp.findByPhoneNumber(phoneNumber);

// Buscar por estado
const active = await ConversationWhatsApp.findByStatus('active');

// Contar
const count = await ConversationWhatsApp.countByStatus('active');

// Agregar mensaje
await conversation.addMessage('received', 'Hola', 'messageId');

// Actualizar estado
await conversation.updateStatus('delivered', { whatsappMessageId: 'xxx' });
```

---

## 🚀 Instalación

### Paso 1: Instalar Dependencias

```bash
npm install
```

Esto instalará `firebase-admin` automáticamente.

### Paso 2: Verificar Variables de Entorno

Asegúrate de que todas las variables de Google Cloud estén configuradas en tu `.env`.

### Paso 3: Reiniciar el Backend

```bash
npm start
# o
npm run dev
```

Verás en los logs:

```
🔄 Conectando a Firestore...
✅ Firestore inicializado exitosamente
📍 Proyecto: tu-proyecto
✅ Firestore conectado exitosamente
📍 Base de datos: Firestore (tu-proyecto)
```

---

## 📝 Migración de Datos (Opcional)

Si tienes datos existentes en MongoDB y quieres migrarlos a Firestore:

1. **Exportar de MongoDB:**
   ```bash
   mongoexport --db nextvoice --collection conversations_whatsapp --out conversations.json
   ```

2. **Importar a Firestore:**
   ```javascript
   // Script de migración (crear si es necesario)
   const admin = require('firebase-admin');
   const fs = require('fs');
   
   // Inicializar Firestore (usar tu configuración)
   // ... código de inicialización ...
   
   const conversations = JSON.parse(fs.readFileSync('conversations.json', 'utf8'));
   const db = admin.firestore();
   
   for (const conv of conversations) {
     await db.collection('conversations_whatsapp')
       .doc(conv.phoneNumber)
       .set(conv);
   }
   ```

---

## 🔍 Verificación

### Verificar Conexión

El backend mostrará en los logs al iniciar:

```
✅ Firestore conectado exitosamente
📍 Base de datos: Firestore (tu-proyecto)
```

### Verificar en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database**
4. Deberías ver la colección `conversations_whatsapp`

---

## 🐛 Troubleshooting

### Error: "Firestore no está conectado"

**Solución:** Verifica que las variables de entorno de Google Cloud estén configuradas correctamente.

### Error: "Permission denied"

**Solución:** Asegúrate de que el Service Account tenga permisos de Firestore:
- `Cloud Datastore User`
- `Firebase Admin SDK Administrator Service Agent`

### Error: "Project not found"

**Solución:** Verifica que `GOOGLE_CLOUD_PROJECT_ID` sea correcto.

---

## 📚 Referencias

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Node.js Firestore SDK](https://googleapis.dev/nodejs/firestore/latest/)

---

## ✅ Checklist de Migración

- [x] Configuración de Firestore creada
- [x] Modelo migrado a Firestore
- [x] Servidor actualizado
- [x] Dependencias agregadas
- [ ] Instalar dependencias: `npm install`
- [ ] Verificar variables de entorno
- [ ] Reiniciar backend
- [ ] Verificar conexión en logs
- [ ] (Opcional) Migrar datos existentes

---

## 🎉 ¡Listo!

El sistema ahora usa Firestore en lugar de MongoDB. Todas las conversaciones de WhatsApp se almacenan en Firestore usando las credenciales de Google Cloud que ya tienes configuradas.

