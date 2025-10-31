# Base de Datos - IA-Calls Backend

## 📋 Estructura de la Base de Datos

Este proyecto utiliza **PostgreSQL** como base de datos principal.

## 📊 Diagrama de Relaciones (ER)

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
┌─────────────┐   ┌──────────────┐
│   groups    │   │   clients    │
└──────┬──────┘   └──────┬───────┘
       │                 │
       │    ┌────────────┴────────────┐
       │    │                         │
       │    ▼                         │
       │  ┌────────────────┐          │
       │  │ client_groups  │          │
       │  └────────────────┘          │
       │                              │
       ├──────────────┬───────────────┤
       │              │               │
       ▼              ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│uploaded_files│ │gcp_documents │ │ batch_calls  │
└──────────────┘ └──────────────┘ └──────┬───────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │call_records  │
                                  └──────────────┘
                                         │
                                         ▼
                                  ┌──────────────────────┐
                                  │whatsapp_conversations│
                                  └──────────────────────┘
```

## 📁 Tablas Principales

### 1. **users** - Usuarios del Sistema
- Gestiona usuarios con roles (admin, user, agent)
- Incluye autenticación con bcrypt
- Relacionado con agentes de ElevenLabs

### 2. **clients** - Clientes
- Información de contacto de clientes
- Estado de procesamiento
- Metadata extensible con JSONB

### 3. **groups** - Grupos de Clientes
- Configuración de campañas
- Tracking de batch calls
- Prompts personalizados para IA

### 4. **client_groups** - Relación Many-to-Many
- Conecta clientes con grupos
- Permite múltiples grupos por cliente

### 5. **batch_calls** - Llamadas en Lote
- Registro de batch calls de ElevenLabs
- Estadísticas de ejecución
- Estado de llamadas

### 6. **call_records** - Registros Individuales
- Cada llamada individual
- Transcripciones y audios
- Duración y estado

### 7. **whatsapp_conversations** - WhatsApp
- Conversaciones post-llamada
- Tracking de mensajes enviados
- Integración con Twilio/Vonage

### 8. **uploaded_files** - Archivos Subidos
- Excel, CSV y otros archivos
- URLs de almacenamiento

### 9. **gcp_documents** - Documentos GCP
- Almacenamiento en Google Cloud
- Metadata de documentos

## 🚀 Instalación

### Paso 1: Crear Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE iacalls_db;

# Conectar a la base de datos
\c iacalls_db
```

### Paso 2: Ejecutar Schema

```bash
# Desde la terminal
psql -U postgres -d iacalls_db -f database/schema.sql

# O desde psql
\i database/schema.sql
```

### Paso 3: Verificar Instalación

```sql
-- Ver todas las tablas
\dt

-- Ver estructura de una tabla
\d users

-- Ver vistas creadas
\dv

-- Contar registros
SELECT 
  schemaname,
  tablename,
  (xpath('/row/cnt/text()', 
    query_to_xml(format('select count(*) as cnt from %I.%I', schemaname, tablename), false, true, '')))[1]::text::int AS row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

## 📊 Vistas Útiles

### group_statistics
Estadísticas de grupos con tasas de éxito:
```sql
SELECT * FROM group_statistics;
```

### client_call_history
Historial completo de llamadas por cliente:
```sql
SELECT * FROM client_call_history WHERE client_id = 1;
```

### batch_call_statistics
Estadísticas de batch calls:
```sql
SELECT * FROM batch_call_statistics;
```

## 🔍 Consultas Útiles

### Ver todos los grupos con sus clientes
```sql
SELECT 
  g.name AS grupo,
  COUNT(cg.client_id) AS total_clientes,
  g.batch_status,
  g.batch_completed_calls || '/' || g.batch_total_recipients AS llamadas
FROM groups g
LEFT JOIN client_groups cg ON g.id = cg.group_id
WHERE g.is_active = TRUE
GROUP BY g.id, g.name, g.batch_status, g.batch_completed_calls, g.batch_total_recipients
ORDER BY g.created_at DESC;
```

### Ver llamadas completadas con transcripciones
```sql
SELECT 
  c.name AS cliente,
  cr.phone_number,
  cr.call_duration_secs,
  cr.transcript_summary,
  cr.status,
  cr.call_ended_at
FROM call_records cr
JOIN clients c ON cr.client_id = c.id
WHERE cr.status = 'completed'
ORDER BY cr.call_ended_at DESC
LIMIT 20;
```

### Ver conversaciones de WhatsApp pendientes
```sql
SELECT 
  phone_number,
  client_name,
  status,
  sent_at,
  received_at
FROM whatsapp_conversations
WHERE status = 'sent'
ORDER BY sent_at DESC;
```

### Estadísticas generales del sistema
```sql
SELECT 
  (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS usuarios_activos,
  (SELECT COUNT(*) FROM clients WHERE is_active = TRUE) AS clientes_totales,
  (SELECT COUNT(*) FROM groups WHERE is_active = TRUE) AS grupos_activos,
  (SELECT COUNT(*) FROM batch_calls WHERE status = 'completed') AS batch_calls_completados,
  (SELECT COUNT(*) FROM call_records WHERE status = 'completed') AS llamadas_completadas,
  (SELECT COUNT(*) FROM whatsapp_conversations WHERE status = 'sent') AS mensajes_whatsapp_enviados;
```

### Top 10 clientes más llamados
```sql
SELECT 
  c.name,
  c.phone,
  COUNT(cr.id) AS total_llamadas,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) AS llamadas_exitosas
FROM clients c
JOIN call_records cr ON c.id = cr.client_id
GROUP BY c.id, c.name, c.phone
ORDER BY total_llamadas DESC
LIMIT 10;
```

### Duración promedio de llamadas por grupo
```sql
SELECT 
  g.name AS grupo,
  COUNT(cr.id) AS total_llamadas,
  ROUND(AVG(cr.call_duration_secs)) AS duracion_promedio_segundos,
  ROUND(AVG(cr.call_duration_secs) / 60, 2) AS duracion_promedio_minutos
FROM groups g
JOIN batch_calls bc ON g.id = bc.group_id
JOIN call_records cr ON bc.id = cr.batch_call_id
WHERE cr.call_duration_secs IS NOT NULL
GROUP BY g.id, g.name
ORDER BY total_llamadas DESC;
```

## 🔧 Mantenimiento

### Backup de Base de Datos
```bash
# Backup completo
pg_dump -U postgres iacalls_db > backup_$(date +%Y%m%d).sql

# Backup solo estructura
pg_dump -U postgres -s iacalls_db > schema_backup.sql

# Backup solo datos
pg_dump -U postgres -a iacalls_db > data_backup.sql
```

### Restaurar Base de Datos
```bash
# Restaurar desde backup
psql -U postgres iacalls_db < backup_20251029.sql
```

### Limpiar datos antiguos
```sql
-- Eliminar conversaciones de WhatsApp de hace más de 30 días
DELETE FROM whatsapp_conversations 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Eliminar registros de llamadas fallidas antiguas
DELETE FROM call_records 
WHERE status = 'failed' 
  AND created_at < NOW() - INTERVAL '60 days';
```

### Optimizar Base de Datos
```sql
-- Analizar todas las tablas
ANALYZE;

-- Vacuum completo
VACUUM FULL;

-- Reindexar
REINDEX DATABASE iacalls_db;
```

## 📈 Monitoreo

### Ver tamaño de tablas
```sql
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Ver índices
```sql
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Ver conexiones activas
```sql
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  query
FROM pg_stat_activity
WHERE datname = 'iacalls_db';
```

## 🔐 Seguridad

### Usuario por Defecto
- **Username**: `admin`
- **Email**: `admin@iacalls.com`
- **Password**: `admin123`
- **Role**: `admin`

⚠️ **IMPORTANTE**: Cambia la contraseña del admin en producción:

```sql
UPDATE users 
SET password = '$2a$12$NuevaContraseñaHasheada' 
WHERE username = 'admin';
```

## 📝 Notas

- Todos los campos `metadata` son tipo JSONB para flexibilidad
- Los soft deletes usan el campo `is_active`
- Triggers automáticos actualizan `updated_at`
- Índices optimizados para búsquedas frecuentes

## 🔗 Relaciones Clave

```
users (1) ──→ (N) groups         [created_by]
users (1) ──→ (N) clients        [uploaded_by vía files]
groups (1) ──→ (N) batch_calls   [group_id]
batch_calls (1) ──→ (N) call_records [batch_call_id]
clients (N) ←──→ (N) groups      [client_groups]
```

## 🎯 Próximos Pasos

Para implementar el microservicio de WhatsApp, considera agregar:

```sql
-- Tabla para conversaciones continuas
CREATE TABLE conversation_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES whatsapp_conversations(id),
  direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  elevenlabs_response JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Tabla para tracking de estado de conversaciones
CREATE TABLE conversation_state (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(50) UNIQUE NOT NULL,
  elevenlabs_conversation_id VARCHAR(255),
  agent_id VARCHAR(255),
  context JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_interaction_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

