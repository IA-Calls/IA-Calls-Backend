# 📊 Configuración de Base de Datos PostgreSQL

## 🔧 Configuración Paso a Paso

### 1. **Instalar PostgreSQL**

#### Windows:
```bash
# Descargar desde: https://www.postgresql.org/download/windows/
# O usar chocolatey:
choco install postgresql

# O usar winget:
winget install PostgreSQL.PostgreSQL
```

#### macOS:
```bash
# Usar Homebrew:
brew install postgresql
brew services start postgresql
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. **Crear Base de Datos**

```bash
# Conectar a PostgreSQL como superusuario
sudo -u postgres psql

# Crear base de datos
CREATE DATABASE ia_calls_db;

# Crear usuario (opcional)
CREATE USER ia_calls_user WITH PASSWORD 'tu_password_aqui';

# Dar permisos
GRANT ALL PRIVILEGES ON DATABASE ia_calls_db TO ia_calls_user;

# Salir
\q
```

### 3. **Configurar Variables de Entorno**

Crear archivo `.env` en la raíz del proyecto:

```env
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ia_calls_db
DB_USER=postgres
DB_PASSWORD=tu_password_aqui

# JWT Secret (generar uno seguro)
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui_cambiar_en_produccion

# URLs
CLIENT_URL=http://localhost:3000
API_URL=http://localhost:3000/api
```

### 4. **Ejecutar Script de Inicialización**

```bash
# Conectar a la base de datos
psql -h localhost -U postgres -d ia_calls_db

# Ejecutar el script SQL
\i database/init.sql

# O desde línea de comandos:
psql -h localhost -U postgres -d ia_calls_db -f database/init.sql
```

### 5. **Verificar Instalación**

```bash
# Conectar a la base de datos
psql -h localhost -U postgres -d ia_calls_db

# Verificar tablas creadas
\dt

# Verificar usuarios de prueba
SELECT id, username, email, role, is_active FROM users;
```

## 🧪 Usuarios de Prueba

El script de inicialización crea dos usuarios de prueba:

### Usuario Admin:
- **Email**: `admin@iacalls.com`
- **Password**: `admin123`
- **Role**: `admin`

### Usuario Prueba:
- **Email**: `test@iacalls.com`
- **Password**: `test123`
- **Role**: `user`

## 📋 Comandos Útiles PostgreSQL

```sql
-- Ver todas las bases de datos
\l

-- Conectar a una base de datos
\c ia_calls_db

-- Ver todas las tablas
\dt

-- Describir una tabla
\d users

-- Ver usuarios de la base de datos
\du

-- Salir de psql
\q
```

## 🔍 Verificar Conexión

Una vez configurado, puedes verificar que todo funciona:

```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm run dev
```

Si todo está configurado correctamente, deberías ver:
```
📊 Conexión a PostgreSQL establecida
📍 Base de datos: ia_calls_db
🌐 Host: localhost:5432
⏰ Tiempo del servidor: [timestamp]
```

## 🛠️ Solución de Problemas

### Error: "password authentication failed"
```bash
# Verificar configuración de PostgreSQL
sudo nano /etc/postgresql/[version]/main/pg_hba.conf

# Cambiar método de autenticación a md5:
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
```

### Error: "database does not exist"
```bash
# Crear la base de datos manualmente
createdb -U postgres ia_calls_db
```

### Error: "connection refused"
```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Iniciar PostgreSQL si no está corriendo
sudo systemctl start postgresql
```

## 🚀 Siguientes Pasos

1. ✅ Configurar PostgreSQL
2. ✅ Crear base de datos
3. ✅ Configurar variables de entorno
4. ✅ Ejecutar script de inicialización
5. ✅ Verificar conexión
6. 🎯 Probar endpoints de autenticación

## 📞 Soporte

Si tienes problemas con la configuración, revisa:
- Credenciales en el archivo `.env`
- Estado del servicio PostgreSQL
- Logs del servidor en la consola 