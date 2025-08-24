# Instrucciones de Migración - Campo agent_id

## 🎯 Objetivo
Agregar el campo `agent_id` a la tabla `users` para almacenar los IDs de los agentes conversacionales de ElevenLabs.

## 📋 Requisitos Previos
1. Base de datos PostgreSQL configurada y funcionando
2. Variables de entorno configuradas (DB_HOST, DB_USER, DB_PASSWORD, etc.)
3. Conexión a la base de datos establecida

## 🚀 Ejecutar la Migración

### Opción 1: Usando npm script (Recomendado)
```bash
npm run migrate:agent-id
```

### Opción 2: Ejecutar directamente
```bash
node scripts/migration.js
```

### Opción 3: Ejecutar SQL manualmente
```bash
psql -d your_database -f scripts/add_agent_id_field.sql
```

## 📊 Lo que hace la migración

1. **Verifica** si la tabla `users` existe
2. **Comprueba** si la columna `agent_id` ya existe (evita duplicados)
3. **Agrega** la columna `agent_id VARCHAR(255)` si no existe
4. **Crea** un índice `idx_users_agent_id` para optimizar consultas
5. **Agrega** comentario de documentación a la columna
6. **Muestra** la estructura final de la tabla

## ✅ Salida Esperada

```
🚀 Iniciando migración para agregar campo agent_id...

1. Verificando estructura de la tabla users...
✅ Tabla users encontrada
📋 Columnas actuales:
   - id (integer)
   - username (character varying)
   - email (character varying)
   - password (character varying)
   - first_name (character varying)
   - last_name (character varying)
   - role (character varying)
   - is_active (boolean)
   - time (timestamp with time zone)
   - created_at (timestamp with time zone)
   - updated_at (timestamp with time zone)

2. Agregando columna agent_id...
✅ Columna agent_id agregada exitosamente

3. Agregando comentario a la columna...
✅ Comentario agregado exitosamente

4. Creando índice para agent_id...
✅ Índice creado exitosamente

5. Verificando migración...
✅ Migración completada exitosamente
📋 Nueva columna: agent_id (VARCHAR(255)) 🆕

📊 Estructura final de la tabla users:
   - id (integer)
   - username (character varying)
   - email (character varying)
   - password (character varying)
   - first_name (character varying)
   - last_name (character varying)
   - role (character varying)
   - is_active (boolean)
   - time (timestamp with time zone)
   - created_at (timestamp with time zone)
   - updated_at (timestamp with time zone)
   - agent_id (character varying) 🆕

📊 Índices de la tabla users:
   - users_pkey
   - users_email_key
   - users_username_key
   - idx_users_agent_id

🎉 Migración completada exitosamente
📋 Resumen de cambios:
   ✅ Columna agent_id agregada a la tabla users
   ✅ Índice idx_users_agent_id creado
   ✅ Comentario de documentación agregado

💡 Ahora puedes usar el campo agent_id para almacenar IDs de agentes de ElevenLabs
```

## ⚠️ Casos Especiales

### Si la columna ya existe:
```
⚠️ La columna agent_id ya existe en la tabla users
✅ No es necesario ejecutar la migración
```

### Si hay errores:
```
❌ Error durante la migración: [mensaje de error]
🔍 Detalles del error: [detalles técnicos]
```

## 🔧 Verificar la Migración

Después de ejecutar la migración, puedes verificar que se aplicó correctamente:

```sql
-- Verificar que la columna existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'agent_id';

-- Verificar que el índice existe
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' AND indexname = 'idx_users_agent_id';
```

## 🔄 Rollback (Si es necesario)

Si necesitas revertir la migración:

```sql
-- Eliminar índice
DROP INDEX IF EXISTS idx_users_agent_id;

-- Eliminar columna
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS agent_id;
```

## 📝 Notas Importantes

- La migración es **idempotente**: se puede ejecutar múltiples veces sin problemas
- La columna `agent_id` permite valores `NULL` (usuarios sin agente)
- El índice mejora el rendimiento de consultas por `agent_id`
- La migración no afecta datos existentes

## 🆘 Solución de Problemas

### Error de conexión a la base de datos:
- Verificar variables de entorno
- Comprobar que PostgreSQL esté ejecutándose
- Verificar permisos de usuario

### Error de permisos:
- Asegurar que el usuario de BD tenga permisos `ALTER TABLE`
- Verificar permisos para crear índices

### Tabla users no existe:
- Ejecutar primero las migraciones base del sistema
- Verificar que estás conectado a la base de datos correcta
