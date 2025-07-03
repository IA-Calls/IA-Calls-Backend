# 🌐 Configuración para PostgreSQL en Google Cloud Platform (GCP)

## 📋 Configuración del archivo .env

Necesitas configurar estas variables de entorno para conectarte a tu base de datos PostgreSQL en GCP:

```env
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Configuración de PostgreSQL en GCP Cloud SQL
DB_HOST=YOUR_GCP_SQL_IP_ADDRESS
DB_PORT=5432
DB_NAME=ia_calls_db
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Secret (generar uno seguro)
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui_cambiar_en_produccion

# URLs
CLIENT_URL=http://localhost:3000
API_URL=http://localhost:3000/api
```

## 🔧 Pasos para obtener las credenciales de GCP

### 1. **Crear instancia de Cloud SQL**
```bash
# En Google Cloud Console:
1. Ve a Cloud SQL
2. Crear instancia
3. Selecciona PostgreSQL
4. Configura nombre, contraseña, región
5. Anota la IP externa
```

### 2. **Configurar red y acceso**
```bash
# Autorizar redes (para desarrollo):
1. Ve a tu instancia Cloud SQL
2. Conexiones → Redes autorizadas
3. Agrega tu IP actual: 0.0.0.0/0 (solo para pruebas)
4. Guarda cambios
```

### 3. **Crear base de datos**
```sql
-- Conectar a Cloud SQL y ejecutar:
CREATE DATABASE ia_calls_db;
```

### 4. **Valores de ejemplo**
```env
# Ejemplo de configuración:
DB_HOST=34.123.456.789  # IP externa de Cloud SQL
DB_PORT=5432
DB_NAME=ia_calls_db
DB_USER=postgres
DB_PASSWORD=tu_password_de_cloudsql
```

## 🚀 Inicialización de la Base de Datos

### Opción 1: Ejecutar script SQL manualmente
```bash
# Conectar a Cloud SQL usando psql:
psql -h YOUR_GCP_SQL_IP -U postgres -d ia_calls_db

# Ejecutar el script:
\i database/init.sql
```

### Opción 2: Usar Cloud SQL Proxy (recomendado para producción)
```bash
# Descargar Cloud SQL Proxy
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64

# Hacer ejecutable
chmod +x cloud_sql_proxy

# Ejecutar proxy
./cloud_sql_proxy -instances=YOUR_PROJECT:REGION:INSTANCE=tcp:5432
```

## 🔐 Configuración de Seguridad

### Para desarrollo:
```env
NODE_ENV=development
# SSL deshabilitado para pruebas locales
```

### Para producción:
```env
NODE_ENV=production
# SSL habilitado automáticamente
```

## 🧪 Probar la Conexión

1. **Configurar .env** con tus credenciales
2. **Ejecutar el servidor:**
```bash
npm run dev
```

3. **Verificar en logs:**
```
📊 Conexión a PostgreSQL (GCP) establecida
📍 Base de datos: ia_calls_db
🌐 Host: 34.123.456.789:5432
🔐 SSL: Deshabilitado/Habilitado
⏰ Tiempo del servidor: ...
🗄️ Versión PostgreSQL: ...
```

## 🛠️ Solución de Problemas

### Error: "Connection timed out"
```bash
# Verificar:
1. IP autorizada en Cloud SQL
2. Firewall de GCP permite puerto 5432
3. IP externa correcta
```

### Error: "password authentication failed"
```bash
# Verificar:
1. Usuario y contraseña correctos
2. Usuario tiene permisos en la base de datos
3. Base de datos existe
```

### Error: "database does not exist"
```bash
# Crear base de datos:
CREATE DATABASE ia_calls_db;
```

### Error: "SSL connection required"
```bash
# En producción, asegurar SSL está habilitado:
NODE_ENV=production
```

## 📊 Información de la Conexión

El sistema mostrará automáticamente:
- ✅ Estado de conexión
- 🌐 IP y puerto de Cloud SQL
- 🔐 Estado de SSL
- ⏰ Tiempo del servidor
- 🗄️ Versión de PostgreSQL
- 📋 Tablas creadas
- 👥 Usuarios de prueba disponibles

## 🎯 Usuarios de Prueba

Después de ejecutar el script SQL:
- **Admin**: `admin@iacalls.com` / `admin123`
- **Usuario**: `test@iacalls.com` / `test123`

## 🔄 Siguientes Pasos

1. ✅ Configurar variables .env
2. ✅ Probar conexión: `npm run dev`
3. ✅ Ejecutar script SQL: `database/init.sql`
4. ✅ Probar endpoints: Ver `API_EXAMPLES.md`
5. 🎯 Implementar tu lógica de negocio

## 💡 Consejos

- **Desarrollo**: Usa IP externa directa
- **Producción**: Usa Cloud SQL Proxy o conexión privada
- **Seguridad**: Nunca expongas credenciales en código
- **Monitoreo**: Revisa logs de Cloud SQL en GCP Console 