# ☁️ Migración a Servicios en la Nube

## 📋 Resumen

Cuando `NODE_ENV=production`, el sistema se conecta automáticamente a todos los servicios en la nube:

- ✅ **PostgreSQL en GCP Cloud SQL** (base de datos)
- ✅ **Google Cloud Storage** (almacenamiento de archivos)
- ✅ **SSL habilitado** para conexiones seguras

---

## 🔧 Configuración

### Variables de Entorno Requeridas para Producción

Agrega estas variables a tu archivo `.env` cuando quieras usar producción:

```env
# Entorno
NODE_ENV=production

# Base de datos Cloud (GCP Cloud SQL)
DB_HOST=tu-instancia-cloud-sql.a.run.app
DB_PORT=5432
DB_NAME=iacalls_db
DB_USER=postgres
DB_PASSWORD=tu_password_seguro
# O usar DATABASE_URL completa:
# DATABASE_URL=postgresql://user:password@host:port/database

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=tu-project-id
GOOGLE_CLOUD_BUCKET_NAME=ia_calls_documents
GOOGLE_CLOUD_CLIENT_EMAIL=tu-service-account@project.iam.gserviceaccount.com
GOOGLE_CLOUD_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
# ... otras variables de GCP

# Twilio (ya configurado)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=...

# ElevenLabs (ya configurado)
ELEVENLABS_API_KEY=...
```

---

## 🚀 Migrar Base de Datos Local → Cloud

### Paso 1: Preparar Variables de Entorno

Agrega las variables de producción a tu `.env`:

```env
# Variables para LOCAL (origen)
DB_HOST_LOCAL=localhost
DB_PORT_LOCAL=5432
DB_NAME_LOCAL=iacalls_db
DB_USER_LOCAL=postgres
DB_PASSWORD_LOCAL=tu_password_local

# Variables para CLOUD (destino)
DB_HOST=tu-instancia-cloud-sql.a.run.app
DB_PORT=5432
DB_NAME=iacalls_db
DB_USER=postgres
DB_PASSWORD=tu_password_cloud
```

**Nota**: Si `DB_HOST_LOCAL` no está configurado, el script usará las variables `DB_*` por defecto para local.

### Paso 2: Ejecutar Script de Migración

```bash
npm run migrate:cloud
```

O directamente:

```bash
node scripts/migrate-to-cloud.js
```

### Paso 3: Seguir el Asistente

El script te guiará paso a paso:

1. **Validará las configuraciones** de ambas bases de datos
2. **Probará las conexiones** a local y cloud
3. **Mostrará la lista de tablas** a migrar
4. **Preguntará si continuar**
5. **Migrará cada tabla** con datos en lotes de 1000 registros
6. **Mostrará un resumen** al finalizar

### Ejemplo de Ejecución

```
╔════════════════════════════════════════════════════════════╗
║  MIGRACIÓN DE BASE DE DATOS LOCAL → CLOUD (GCP)            ║
╚════════════════════════════════════════════════════════════╝

📋 Validando configuraciones...
✅ Configuraciones validadas
ℹ️  Local: localhost:5432/iacalls_db
ℹ️  Cloud: tu-instancia:5432/iacalls_db

📋 Conectando a bases de datos...
✅ Conexión local establecida
✅ Conexión cloud establecida

📋 Obteniendo lista de tablas...
✅ Encontradas 10 tablas en local

📊 Tablas encontradas:
   1. users
   2. clients
   3. groups
   ...

¿Continuar con la migración? (s/N): s
¿Saltar tablas que ya tienen datos? (s/N): n

📋 Migrando tabla: users
ℹ️  Registros en local: 5
✅ Tabla users migrada: 5 registros

...
```

---

## 🔍 Verificar Migración

### Verificar desde la aplicación:

1. **Cambiar a producción:**
   ```env
   NODE_ENV=production
   ```

2. **Iniciar el servidor:**
   ```bash
   npm start
   ```

3. **Verificar logs:**
   ```
   🌐 Modo PRODUCCIÓN: Conectando a servicios en la nube...
   📊 Conexión a PostgreSQL (CLOUD/GCP) establecida
   📍 Base de datos: iacalls_db
   🌐 Host: tu-instancia:5432
   🔐 SSL: Habilitado
   🏠 Entorno: 🌐 PRODUCCIÓN (Cloud)
   ```

### Verificar desde la base de datos:

```sql
-- Conectar a la base de datos cloud
-- Verificar registros migrados
SELECT 
  'users' as tabla, COUNT(*) as registros FROM users
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'groups', COUNT(*) FROM groups
UNION ALL
SELECT 'batch_calls', COUNT(*) FROM batch_calls;
```

---

## ⚙️ Comportamiento por Entorno

### Desarrollo (`NODE_ENV != production`)

- ✅ Base de datos: PostgreSQL local (`localhost`)
- ✅ SSL: Deshabilitado
- ✅ Archivos: Se guardan localmente en `uploads/`
- ✅ Pool de conexiones: 5 conexiones máximo

### Producción (`NODE_ENV=production`)

- ✅ Base de datos: PostgreSQL en GCP Cloud SQL
- ✅ SSL: Habilitado (requerido para Cloud SQL)
- ✅ Archivos: Se suben a Google Cloud Storage
- ✅ Pool de conexiones: 20 conexiones máximo
- ✅ Validación: Verifica que todas las variables estén configuradas

---

## 🛠️ Solución de Problemas

### Error: "Configuración incompleta para producción"

**Causa**: Faltan variables de entorno requeridas.

**Solución**: Verifica que tengas configuradas:
- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

### Error: "Connection refused" o "Timeout"

**Causa**: La instancia de Cloud SQL no está accesible o las credenciales son incorrectas.

**Solución**:
1. Verifica que la instancia de Cloud SQL esté activa
2. Verifica que las IPs permitidas incluyan tu IP (o usa Cloud SQL Proxy)
3. Verifica las credenciales en GCP Console

### Error: "SSL required"

**Causa**: Cloud SQL requiere SSL.

**Solución**: El código ya configura SSL automáticamente en producción. Verifica que `NODE_ENV=production`.

### Error: "Table already has data"

**Causa**: La tabla en cloud ya tiene registros.

**Solución**: 
- El script pregunta si quieres sobrescribir
- O ejecuta con `skipExisting=true` para saltar tablas con datos

---

## 📝 Notas Importantes

1. **Backup antes de migrar**: Siempre haz backup de ambas bases de datos antes de migrar
2. **Migración incremental**: Puedes ejecutar el script múltiples veces (usará `ON CONFLICT DO NOTHING`)
3. **Datos grandes**: El script migra en lotes de 1000 registros para evitar memory overflow
4. **Orden de migración**: El script migra las tablas en orden alfabético
5. **Foreign keys**: Asegúrate de que las tablas relacionadas se migren en orden correcto

---

## 🔗 Referencias

- [GCP Cloud SQL Documentation](https://cloud.google.com/sql/docs/postgres)
- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [PostgreSQL Migration Guide](https://www.postgresql.org/docs/current/migration.html)

---

## 📋 Checklist de Migración

Antes de migrar a producción:

- [ ] Variables de entorno configuradas en `.env`
- [ ] Instancia de Cloud SQL creada y accesible
- [ ] Bucket de Google Cloud Storage creado
- [ ] Credenciales de GCP configuradas
- [ ] Backup de base de datos local realizado
- [ ] Script de migración probado en ambiente de prueba
- [ ] NODE_ENV=production configurado
- [ ] Verificación de conexión exitosa

---

## 🎯 Próximos Pasos Después de Migrar

1. **Verificar datos**: Revisa que todos los datos se migraron correctamente
2. **Probar aplicación**: Ejecuta la aplicación en modo producción y verifica funcionalidad
3. **Monitorear**: Revisa logs y métricas de Cloud SQL
4. **Optimizar**: Ajusta configuración de pool de conexiones si es necesario

