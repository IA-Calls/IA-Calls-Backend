# 📡 Ejemplos de cURL para Fuentes de Información

## 🔑 Configuración Inicial

```bash
TOKEN="TU_TOKEN_JWT_AQUI"
BASE_URL="http://localhost:5050"
```

---

## 📋 Operaciones CRUD

### 1. Crear Fuente de Base de Datos

```bash
curl -X POST ${BASE_URL}/api/data-sources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Base de Datos de Clientes",
    "type": "database",
    "db_host": "localhost",
    "db_port": 3306,
    "db_name": "clientes_db",
    "db_user": "usuario",
    "db_password": "contraseña",
    "db_type": "mysql",
    "agent_id": "uuid-del-agente"
  }'
```

**Para PostgreSQL:**
```bash
curl -X POST ${BASE_URL}/api/data-sources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "BD PostgreSQL",
    "type": "database",
    "db_host": "localhost",
    "db_port": 5432,
    "db_name": "mi_db",
    "db_user": "postgres",
    "db_password": "contraseña",
    "db_type": "postgresql"
  }'
```

**Para SQL Server:**
```bash
curl -X POST ${BASE_URL}/api/data-sources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "BD SQL Server",
    "type": "database",
    "db_host": "servidor.database.windows.net",
    "db_port": 1433,
    "db_name": "mi_db",
    "db_user": "usuario",
    "db_password": "contraseña",
    "db_type": "sqlserver"
  }'
```

---

### 2. Crear Fuente de Google Sheet

```bash
curl -X POST ${BASE_URL}/api/data-sources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Hoja de Productos",
    "type": "google_sheet",
    "google_sheet_url": "https://docs.google.com/spreadsheets/d/ABC123DEF456/edit",
    "agent_id": "uuid-del-agente"
  }'
```

---

### 3. Subir Archivo Excel

```bash
curl -X POST ${BASE_URL}/api/data-sources/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@/ruta/al/archivo/productos.xlsx" \
  -F "name=Productos" \
  -F "agent_id=uuid-del-agente"
```

**Subir PDF:**
```bash
curl -X POST ${BASE_URL}/api/data-sources/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@/ruta/al/archivo/manual.pdf" \
  -F "name=Manual de Usuario" \
  -F "agent_id=uuid-del-agente"
```

---

### 4. Listar Fuentes de Información

```bash
# Todas las fuentes
curl -X GET ${BASE_URL}/api/data-sources \
  -H "Authorization: Bearer ${TOKEN}"

# Filtrar por tipo
curl -X GET "${BASE_URL}/api/data-sources?type=excel" \
  -H "Authorization: Bearer ${TOKEN}"

# Filtrar por estado
curl -X GET "${BASE_URL}/api/data-sources?status=completed" \
  -H "Authorization: Bearer ${TOKEN}"

# Filtrar por agente
curl -X GET "${BASE_URL}/api/data-sources?agent_id=uuid-del-agente" \
  -H "Authorization: Bearer ${TOKEN}"

# Múltiples filtros
curl -X GET "${BASE_URL}/api/data-sources?type=excel&status=completed" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### 5. Obtener Fuente Específica

```bash
SOURCE_ID="uuid-de-la-fuente"

curl -X GET ${BASE_URL}/api/data-sources/${SOURCE_ID} \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### 6. Actualizar Fuente

```bash
SOURCE_ID="uuid-de-la-fuente"

# Actualizar nombre
curl -X PUT ${BASE_URL}/api/data-sources/${SOURCE_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Nuevo Nombre"
  }'

# Seleccionar base de datos
curl -X PUT ${BASE_URL}/api/data-sources/${SOURCE_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "selected_database": "clientes_db"
  }'

# Seleccionar tabla
curl -X PUT ${BASE_URL}/api/data-sources/${SOURCE_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "selected_table": "clientes"
  }'

# Asignar a agente
curl -X PUT ${BASE_URL}/api/data-sources/${SOURCE_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "agent_id": "uuid-del-agente"
  }'
```

---

### 7. Obtener Bases de Datos Disponibles

```bash
SOURCE_ID="uuid-de-la-fuente-database"

curl -X GET ${BASE_URL}/api/data-sources/${SOURCE_ID}/databases \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### 8. Procesar Fuente

```bash
SOURCE_ID="uuid-de-la-fuente"

curl -X POST ${BASE_URL}/api/data-sources/${SOURCE_ID}/process \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### 9. Sincronizar Fuente con Agente

```bash
SOURCE_ID="uuid-de-la-fuente"

curl -X POST ${BASE_URL}/api/data-sources/${SOURCE_ID}/sync \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### 10. Sincronizar Todas las Fuentes de un Agente

```bash
AGENT_ID="uuid-del-agente"

curl -X POST ${BASE_URL}/api/data-sources/sync-agent/${AGENT_ID} \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### 11. Eliminar Fuente

```bash
SOURCE_ID="uuid-de-la-fuente"

curl -X DELETE ${BASE_URL}/api/data-sources/${SOURCE_ID} \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 🔄 Flujo Completo: Base de Datos Externa

```bash
#!/bin/bash

TOKEN="TU_TOKEN"
BASE_URL="http://localhost:5050"

# 1. Crear fuente de BD
echo "1. Creando fuente de BD..."
CREATE_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/data-sources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "BD Clientes",
    "type": "database",
    "db_host": "localhost",
    "db_port": 3306,
    "db_name": "clientes",
    "db_user": "usuario",
    "db_password": "contraseña",
    "db_type": "mysql"
  }')

SOURCE_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id')
echo "✅ Fuente creada: ${SOURCE_ID}"

# 2. Obtener bases de datos disponibles
echo "2. Obteniendo bases de datos..."
curl -X GET ${BASE_URL}/api/data-sources/${SOURCE_ID}/databases \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

# 3. Seleccionar base de datos
echo "3. Seleccionando base de datos..."
curl -X PUT ${BASE_URL}/api/data-sources/${SOURCE_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"selected_database": "clientes_db"}' | jq '.'

# 4. Procesar para obtener tablas
echo "4. Procesando para obtener tablas..."
curl -X POST ${BASE_URL}/api/data-sources/${SOURCE_ID}/process \
  -H "Authorization: Bearer ${TOKEN}"

sleep 5 # Esperar procesamiento

# 5. Seleccionar tabla
echo "5. Seleccionando tabla..."
curl -X PUT ${BASE_URL}/api/data-sources/${SOURCE_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"selected_table": "clientes"}' | jq '.'

# 6. Procesar datos de la tabla
echo "6. Procesando datos de la tabla..."
curl -X POST ${BASE_URL}/api/data-sources/${SOURCE_ID}/process \
  -H "Authorization: Bearer ${TOKEN}"

sleep 10 # Esperar procesamiento

# 7. Asignar a agente y sincronizar
echo "7. Asignando a agente..."
AGENT_ID="uuid-del-agente"
curl -X PUT ${BASE_URL}/api/data-sources/${SOURCE_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"agent_id\": \"${AGENT_ID}\"}" | jq '.'

echo "8. Sincronizando con agente..."
curl -X POST ${BASE_URL}/api/data-sources/${SOURCE_ID}/sync \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo "✅ Proceso completo"
```

---

## 🔄 Flujo Completo: Archivo Excel

```bash
#!/bin/bash

TOKEN="TU_TOKEN"
BASE_URL="http://localhost:5050"
AGENT_ID="uuid-del-agente"

# 1. Subir archivo
echo "1. Subiendo archivo..."
UPLOAD_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/data-sources/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@productos.xlsx" \
  -F "name=Productos" \
  -F "agent_id=${AGENT_ID}")

SOURCE_ID=$(echo $UPLOAD_RESPONSE | jq -r '.data.id')
echo "✅ Archivo subido: ${SOURCE_ID}"

# 2. Esperar procesamiento (el sistema lo hace automáticamente)
echo "2. Esperando procesamiento..."
sleep 15

# 3. Verificar estado
echo "3. Verificando estado..."
curl -X GET ${BASE_URL}/api/data-sources/${SOURCE_ID} \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data.status'

# 4. Sincronizar con agente
echo "4. Sincronizando con agente..."
curl -X POST ${BASE_URL}/api/data-sources/${SOURCE_ID}/sync \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo "✅ Proceso completo"
```

---

## 📊 Verificar Estado de Procesamiento

```bash
SOURCE_ID="uuid-de-la-fuente"

# Verificar estado
STATUS=$(curl -s -X GET ${BASE_URL}/api/data-sources/${SOURCE_ID} \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.data.status')

echo "Estado: ${STATUS}"

# Estados posibles:
# - pending: Creada pero no procesada
# - processing: En proceso
# - completed: Procesada exitosamente
# - failed: Error en el procesamiento
# - synced: Sincronizada con el agente
```

---

## 🧪 Script de Prueba Completo

```bash
#!/bin/bash

BASE_URL="http://localhost:5050"
USERNAME="tu_usuario"
PASSWORD="tu_contraseña"

echo "🔐 === 1. Autenticación ==="
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"${USERNAME}\",
    \"password\": \"${PASSWORD}\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "✅ Token obtenido"

echo ""
echo "📋 === 2. Listar Agentes ==="
AGENTS=$(curl -s -X GET ${BASE_URL}/api/agents \
  -H "Authorization: Bearer ${TOKEN}")

AGENT_ID=$(echo $AGENTS | jq -r '.data.agents[0].agent_id')
echo "✅ Usando agente: ${AGENT_ID}"

echo ""
echo "📤 === 3. Subir Archivo Excel ==="
UPLOAD_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/data-sources/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@test.xlsx" \
  -F "name=Archivo de Prueba" \
  -F "agent_id=${AGENT_ID}")

SOURCE_ID=$(echo $UPLOAD_RESPONSE | jq -r '.data.id')
echo "✅ Archivo subido: ${SOURCE_ID}"

echo ""
echo "⏳ === 4. Esperando Procesamiento (15 segundos) ==="
sleep 15

echo ""
echo "🔍 === 5. Verificar Estado ==="
curl -s -X GET ${BASE_URL}/api/data-sources/${SOURCE_ID} \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data | {id, name, status, processed_at}'

echo ""
echo "🔄 === 6. Sincronizar con Agente ==="
curl -s -X POST ${BASE_URL}/api/data-sources/${SOURCE_ID}/sync \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo ""
echo "✅ Prueba completada"
```

