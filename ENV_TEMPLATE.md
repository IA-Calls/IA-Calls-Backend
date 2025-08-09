# 🔧 Template de Variables de Entorno para GCP

## 📋 Instrucciones

1. **Crea un archivo `.env`** en la raíz del proyecto
2. **Copia el contenido** de abajo y ajusta los valores
3. **Configura tus credenciales** de GCP Cloud SQL

## 📄 Contenido del archivo .env

```env
# ================================
# CONFIGURACIÓN DEL SERVIDOR
# ================================
PORT=3000
NODE_ENV=development

# ================================
# CONFIGURACIÓN DE POSTGRESQL EN GCP
# ================================
# IP externa de tu instancia Cloud SQL
DB_HOST=YOUR_GCP_SQL_IP_ADDRESS

# Puerto de PostgreSQL (por defecto 5432)
DB_PORT=5432

# Nombre de la base de datos
DB_NAME=ia_calls_db

# Usuario de PostgreSQL
DB_USER=postgres

# Contraseña de tu usuario PostgreSQL
DB_PASSWORD=your_password

# ================================
# CONFIGURACIÓN JWT
# ================================
# Generar un JWT_SECRET seguro (mínimo 32 caracteres)
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui_cambiar_en_produccion

# ================================
# CONFIGURACIÓN DE URLS
# ================================
CLIENT_URL=http://localhost:3000
API_URL=http://localhost:3000/api

# ================================
# CONFIGURACIÓN CORS
# ================================
# URL de tu aplicación Vercel (para resolver errores CORS)
VERCEL_URL=https://ia-calls.vercel.app

# URLs adicionales separadas por comas (opcional)
# ADDITIONAL_CORS_ORIGINS=https://otro-dominio.com,https://app.miempresa.com
```

## 🌟 Ejemplo de Configuración Completa

```env
PORT=3000
NODE_ENV=development
DB_HOST=34.123.456.789
DB_PORT=5432
DB_NAME=ia_calls_db
DB_USER=postgres
DB_PASSWORD=mi_password_seguro
JWT_SECRET=super_secret_jwt_key_change_in_production_minimum_32_chars
CLIENT_URL=http://localhost:3000
API_URL=http://localhost:3000/api
VERCEL_URL=https://ia-calls.vercel.app
ADDITIONAL_CORS_ORIGINS=https://staging.ia-calls.com,https://admin.ia-calls.com
```

## 🔐 Generar JWT_SECRET Seguro

```bash
# Opción 1: Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opción 2: Usando openssl
openssl rand -hex 32

# Opción 3: Online
# Visita: https://jwt.io/
```

## 🚀 Pasos para Probar

1. **Crear archivo .env**:
```bash
touch .env
```

2. **Copiar template y configurar**

3. **Probar conexión**:
```bash
npm run dev
```

4. **Verificar logs**:
```
📊 Conexión a PostgreSQL (GCP) establecida
📍 Base de datos: ia_calls_db
🌐 Host: 34.123.456.789:5432
```

## ⚠️ Importante

- **Nunca** subas el archivo `.env` a git
- **Cambia** el JWT_SECRET en producción
- **Usa** conexiones SSL en producción
- **Autoriza** tu IP en Cloud SQL 