# Configuración de Base de Datos - IA Calls Backend

## Configuración Local (Desarrollo)

### Requisitos Previos

1. **PostgreSQL instalado** en tu sistema local
   - Windows: Descarga desde [postgresql.org](https://www.postgresql.org/download/windows/)
   - macOS: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql postgresql-contrib`

2. **Credenciales por defecto**:
   - Usuario: `postgres`
   - Contraseña: `moon@1014198153`
   - Puerto: `5432`
   - Host: `localhost`

### Setup Automático

Ejecuta el script de configuración automática:

```bash
npm run setup
```

Este script:
- ✅ Verifica que PostgreSQL esté instalado
- ✅ Crea la base de datos `ia_calls_local`
- ✅ Ejecuta las migraciones para crear las tablas
- ✅ Crea usuarios por defecto
- ✅ Genera archivo `.env` con configuración local

### Setup Manual

Si prefieres configurar manualmente:

1. **Crear base de datos**:
   ```bash
   createdb -U postgres ia_calls_local
   ```

2. **Ejecutar migración**:
   ```bash
   npm run migrate
   ```

3. **Crear archivo `.env`**:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ia_calls_local
   DB_USER=postgres
   DB_PASSWORD=moon@1014198153
   NODE_ENV=development
   JWT_SECRET=mi-jwt-secret-super-seguro
   PORT=3000
   ```

## Configuración de Producción (GCP Cloud SQL)

Para producción, configura las variables de entorno:

```env
DB_HOST=tu-ip-cloud-sql
DB_PORT=5432
DB_NAME=tu-base-de-datos
DB_USER=tu-usuario
DB_PASSWORD=tu-contraseña-segura
NODE_ENV=production
JWT_SECRET=tu-jwt-secret-muy-seguro
PORT=3000
```

## Estructura de la Base de Datos

### Tablas Principales

- **`users`** - Usuarios del sistema
- **`clients`** - Clientes/contactos
- **`groups`** - Grupos de clientes
- **`client_groups`** - Relación muchos a muchos entre clientes y grupos
- **`batch_calls`** - Registros de llamadas en lote
- **`call_records`** - Registros individuales de llamadas
- **`uploaded_files`** - Archivos subidos
- **`gcp_documents`** - Documentos en Google Cloud Storage

### Usuarios por Defecto

Después de la migración, se crean estos usuarios:

- **Admin**: `admin@ia-calls.com` / `admin123`
- **Test**: `test@ia-calls.com` / `admin123`

⚠️ **Importante**: Cambia estas contraseñas en producción.

## Comandos Útiles

```bash
# Setup completo
npm run setup

# Solo migración
npm run migrate

# Desarrollo
npm run dev

# Producción
npm start
```

## Solución de Problemas

### Error de Conexión

1. **Verifica que PostgreSQL esté ejecutándose**:
   ```bash
   # Windows
   net start postgresql
   
   # macOS/Linux
   brew services start postgresql
   # o
   sudo systemctl start postgresql
   ```

2. **Verifica credenciales**:
   ```bash
   psql -U postgres -h localhost
   ```

3. **Verifica que la base de datos existe**:
   ```bash
   psql -U postgres -l
   ```

### Error de Permisos

Si tienes problemas de permisos:

```bash
# Crear usuario postgres si no existe
createuser -s postgres

# Dar permisos a la base de datos
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ia_calls_local TO postgres;"
```

### Resetear Base de Datos

Para empezar desde cero:

```bash
# Eliminar base de datos
dropdb -U postgres ia_calls_local

# Recrear
npm run setup
```

## Variables de Entorno

| Variable | Local | Producción | Descripción |
|----------|-------|------------|-------------|
| `DB_HOST` | `localhost` | IP Cloud SQL | Host de la base de datos |
| `DB_PORT` | `5432` | `5432` | Puerto de PostgreSQL |
| `DB_NAME` | `ia_calls_local` | Tu BD | Nombre de la base de datos |
| `DB_USER` | `postgres` | Tu usuario | Usuario de la base de datos |
| `DB_PASSWORD` | `postgres` | Tu contraseña | Contraseña de la base de datos |
| `NODE_ENV` | `development` | `production` | Entorno de ejecución |
| `JWT_SECRET` | Cualquiera | Muy seguro | Secreto para JWT |
| `PORT` | `3000` | `3000` | Puerto del servidor |

## Notas Importantes

- 🔒 **Seguridad**: Nunca uses las credenciales por defecto en producción
- 🔄 **Migraciones**: Siempre ejecuta migraciones después de cambios en el esquema
- 📊 **Backup**: Haz respaldos regulares de tu base de datos
- 🚀 **Performance**: En local usa menos conexiones del pool para mejor rendimiento
