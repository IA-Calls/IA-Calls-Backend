# 🏥 Sistema de Verificación de Base de Datos

## 📋 Resumen

Sistema automático que verifica y crea todas las tablas necesarias al iniciar el backend. Garantiza que la base de datos esté lista antes de que el servidor comience a recibir peticiones.

---

## 🎯 Funcionalidad

### ¿Qué hace?

1. **Verifica la conexión** a PostgreSQL
2. **Revisa todas las tablas** configuradas en el sistema
3. **Crea las tablas faltantes** automáticamente desde sus archivos SQL
4. **Reporta el estado** de cada tabla (existe, creada, o error)

### ¿Cuándo se ejecuta?

Se ejecuta automáticamente **cada vez que se inicia el backend**, justo después de conectar a PostgreSQL y antes de iniciar el servidor HTTP.

---

## 📁 Archivos del Sistema

### 1. `src/utils/databaseTables.js`

**Configuración centralizada de todas las tablas**

Este archivo contiene la lista de todas las tablas que deben existir en la base de datos. Cuando agregues una nueva tabla, debes agregarla aquí.

**Estructura:**
```javascript
const DATABASE_TABLES = [
  {
    name: 'nombre_tabla',
    sqlFile: path.join(__dirname, '../../database/create_nombre_tabla_table.sql'),
    description: 'Descripción de la tabla'
  },
  // ... más tablas
];
```

### 2. `src/utils/databaseHealthCheck.js`

**Lógica de verificación y creación**

Este archivo contiene:
- `verifyDatabaseConnection()`: Verifica conexión a PostgreSQL
- `tableExists(tableName)`: Verifica si una tabla existe
- `createTableFromSQL(tableName, sqlFile)`: Crea una tabla desde un archivo SQL
- `verifyAndCreateAllTables()`: Verifica y crea todas las tablas
- `databaseHealthCheck()`: Health check completo

### 3. `server.js`

**Integración en el inicio del servidor**

El health check se ejecuta automáticamente al iniciar el backend.

---

## 🔧 Agregar una Nueva Tabla

### Paso 1: Crear el Archivo SQL

Crea el archivo SQL en `database/create_[nombre_tabla]_table.sql`:

```sql
-- database/create_mi_nueva_tabla_table.sql
CREATE TABLE IF NOT EXISTS mi_nueva_tabla (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- ... columnas
);
```

### Paso 2: Agregar a la Configuración

Edita `src/utils/databaseTables.js` y agrega la nueva tabla:

```javascript
const DATABASE_TABLES = [
  // ... tablas existentes
  {
    name: 'mi_nueva_tabla',
    sqlFile: path.join(__dirname, '../../database/create_mi_nueva_tabla_table.sql'),
    description: 'Descripción de mi nueva tabla'
  }
];
```

### Paso 3: Listo ✅

La próxima vez que inicies el backend, la tabla será verificada y creada automáticamente si no existe.

---

## 📊 Salida del Health Check

Cuando inicias el backend, verás algo como esto:

```
🔍 Verificando tablas de la base de datos...

✅ Tabla "whatsapp_agents" existe
✅ Tabla "agents" existe
⚠️ Tabla "conversations" no existe. Creando...
✅ Tabla "conversations" creada exitosamente
✅ Tabla "data_sources" existe
✅ Tabla "knowledge_items" existe

📊 Resumen de verificación:
   - Tablas verificadas: 5
   - Tablas existentes: 4
   - Tablas creadas: 1
   - Errores: 0

✅ Verificación de base de datos completada exitosamente
```

---

## 🛠️ Funciones Disponibles

### `getAllTables()`

Obtiene todas las tablas configuradas.

```javascript
const { getAllTables } = require('./src/utils/databaseTables');
const tables = getAllTables();
```

### `getTableByName(tableName)`

Obtiene una tabla específica por nombre.

```javascript
const { getTableByName } = require('./src/utils/databaseTables');
const table = getTableByName('whatsapp_agents');
```

### `addTable(tableConfig)`

Agrega una nueva tabla programáticamente.

```javascript
const { addTable } = require('./src/utils/databaseTables');
addTable({
  name: 'mi_tabla',
  sqlFile: path.join(__dirname, '../../database/create_mi_tabla_table.sql'),
  description: 'Mi tabla'
});
```

### `databaseHealthCheck()`

Ejecuta el health check completo manualmente.

```javascript
const { databaseHealthCheck } = require('./src/utils/databaseHealthCheck');
const result = await databaseHealthCheck();
```

---

## ⚙️ Configuración

### Variables de Entorno

El sistema usa las mismas variables de entorno que la conexión a PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ia-calls
DB_USER=postgres
DB_PASSWORD=tu_contraseña

# O usar URL de conexión
DATABASE_LOCAL_URL=postgresql://user:password@localhost:5432/dbname
```

---

## 🐛 Troubleshooting

### Error: "Archivo SQL no encontrado"

**Causa:** El archivo SQL especificado en `databaseTables.js` no existe.

**Solución:** Verifica que el archivo SQL exista en la ruta especificada.

### Error: "No se pudo conectar a la base de datos"

**Causa:** PostgreSQL no está disponible o las credenciales son incorrectas.

**Solución:** Verifica la conexión a PostgreSQL y las variables de entorno.

### Error: "Error creando tabla"

**Causa:** El SQL tiene errores o la tabla ya existe con estructura diferente.

**Solución:** Revisa el archivo SQL y verifica que no haya conflictos.

### Tabla no se crea automáticamente

**Causa:** La tabla no está agregada en `databaseTables.js`.

**Solución:** Agrega la tabla a la configuración siguiendo los pasos de "Agregar una Nueva Tabla".

---

## 📝 Notas Importantes

1. **Orden de creación**: Las tablas se crean en el orden especificado en `databaseTables.js`. Si hay dependencias (foreign keys), asegúrate de que las tablas referenciadas se creen primero.

2. **Idempotencia**: Los archivos SQL deben usar `CREATE TABLE IF NOT EXISTS` para evitar errores si la tabla ya existe.

3. **Extensibilidad**: El sistema está diseñado para ser fácilmente extensible. Solo agrega la nueva tabla a la configuración.

4. **Producción vs Desarrollo**: El sistema funciona igual en ambos entornos. Verifica que las credenciales de producción sean correctas.

---

## ✅ Checklist para Nueva Tabla

- [ ] Crear archivo SQL en `database/create_[nombre]_table.sql`
- [ ] Agregar entrada en `src/utils/databaseTables.js`
- [ ] Verificar que el SQL use `CREATE TABLE IF NOT EXISTS`
- [ ] Probar que la tabla se crea correctamente
- [ ] Verificar dependencias (foreign keys) si las hay

---

## 🔄 Flujo Completo

```
1. Backend inicia
   ↓
2. Conecta a PostgreSQL
   ↓
3. Ejecuta databaseHealthCheck()
   ↓
4. Para cada tabla en DATABASE_TABLES:
   - Verifica si existe
   - Si no existe, crea desde SQL
   ↓
5. Reporta resultados
   ↓
6. Inicia servidor HTTP
```

---

## 📚 Referencias

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Library](https://node-postgres.com/)

