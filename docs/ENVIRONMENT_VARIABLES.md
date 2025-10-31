# Variables de Entorno - IA-Calls

## 🔧 Backend Principal (.env)

```bash
# ============================================
# SERVIDOR
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# BASE DE DATOS
# ============================================
DATABASE_URL=postgresql://user:password@localhost:5432/iacalls_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iacalls_db
DB_USER=postgres
DB_PASSWORD=your_password

# ============================================
# ELEVENLABS API
# ============================================
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# ============================================
# MICROSERVICIO DE WHATSAPP
# ============================================
WHATSAPP_MICROSERVICE_URL=http://localhost:3001
MICROSERVICE_TOKEN=change-this-to-a-secure-random-token

# ============================================
# JWT
# ============================================
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# ============================================
# GOOGLE CLOUD PLATFORM (Opcional)
# ============================================
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket_name
GOOGLE_APPLICATION_CREDENTIALS=./CLAVE_GCP.json
```

---

## 🔧 Microservicio WhatsApp (.env)

Crear archivo `.env` en la carpeta del microservicio:

```bash
# ============================================
# SERVIDOR
# ============================================
PORT=3001
NODE_ENV=development

# ============================================
# BASE DE DATOS (Compartida con backend principal)
# ============================================
DATABASE_URL=postgresql://user:password@localhost:5432/iacalls_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iacalls_db
DB_USER=postgres
DB_PASSWORD=your_password

# ============================================
# TWILIO WHATSAPP
# ============================================
TWILIO_ACCOUNT_SID=AC332953b4c00211a282b4c59d45faf749
TWILIO_AUTH_TOKEN=cfd6638b2384981c48edfe84835219da
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# ============================================
# ELEVENLABS API
# ============================================
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# ============================================
# REDIS (Para cola de mensajes)
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ============================================
# SEGURIDAD
# ============================================
MICROSERVICE_TOKEN=change-this-to-a-secure-random-token

# ============================================
# BACKEND PRINCIPAL
# ============================================
BACKEND_URL=http://localhost:3000
```

---

## 📝 Notas Importantes

### 1. MICROSERVICE_TOKEN
- **DEBE SER EL MISMO** en ambos servicios
- Usar un token seguro generado aleatoriamente
- Ejemplo de generación:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 2. DATABASE_URL
- Ambos servicios comparten la **misma base de datos**
- Asegúrate de que el microservicio tenga acceso

### 3. TWILIO_WHATSAPP_FROM
- Debe tener el prefijo `whatsapp:`
- Ejemplo: `whatsapp:+14155238886`

### 4. Webhook de Twilio
Configurar en Twilio Console:
```
https://tu-servidor.com:3001/webhook/twilio/incoming
```

---

## ✅ Verificación

### Backend Principal
```bash
# Debe mostrar:
🔗 Microservicio WhatsApp: http://localhost:3001
```

### Microservicio
```bash
# Debe mostrar:
✅ TwilioWhatsAppService inicializado
📱 Número de envío: whatsapp:+14155238886
```

