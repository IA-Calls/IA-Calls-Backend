/**
 * Script para migrar base de datos local a PostgreSQL en la nube (GCP)
 * 
 * Uso:
 *   node scripts/migrate-to-cloud.js
 * 
 * Requisitos:
 *   - Variables de entorno configuradas en .env:
 *     - DATABASE_LOCAL_URL (URL completa de conexión local) O
 *     - DB_HOST_LOCAL, DB_PORT_LOCAL, DB_NAME_LOCAL, DB_USER_LOCAL, DB_PASSWORD_LOCAL (variables individuales)
 *     - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (producción/cloud)
 *     - NODE_ENV=production (opcional, para validar)
 */

require('dotenv').config();
const { Pool } = require('pg');
const readline = require('readline');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`\n${colors.blue}📋 ${msg}${colors.reset}`)
};

// Configuración de base de datos LOCAL
let localConfig;

if (process.env.DATABASE_LOCAL_URL) {
  // Usar URL de conexión completa si está disponible (preferido)
  localConfig = {
    connectionString: process.env.DATABASE_LOCAL_URL,
    ssl: false
  };
} else {
  // Usar variables individuales como fallback
  localConfig = {
    host: process.env.DB_HOST_LOCAL || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT_LOCAL || process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME_LOCAL || process.env.DB_NAME || 'iacalls_db',
    user: process.env.DB_USER_LOCAL || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD_LOCAL || process.env.DB_PASSWORD,
    ssl: false
  };
}

// Configuración de base de datos PRODUCCIÓN (Cloud)
const cloudConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Validar configuraciones
function validateConfigs() {
  log.step('Validando configuraciones...');
  
  const missing = [];
  
  // Validar configuración local
  if (!localConfig.connectionString) {
    if (!localConfig.host) missing.push('DATABASE_LOCAL_URL o DB_HOST_LOCAL (local)');
    if (!localConfig.database) missing.push('DB_NAME_LOCAL (local)');
    if (!localConfig.user) missing.push('DB_USER_LOCAL (local)');
    if (!localConfig.password) missing.push('DB_PASSWORD_LOCAL (local)');
  }
  
  // Validar configuración cloud
  if (!cloudConfig.host) missing.push('DB_HOST (producción)');
  if (!cloudConfig.database) missing.push('DB_NAME (producción)');
  if (!cloudConfig.user) missing.push('DB_USER (producción)');
  if (!cloudConfig.password) missing.push('DB_PASSWORD (producción)');
  
  if (missing.length > 0) {
    log.error(`Faltan variables de entorno: ${missing.join(', ')}`);
    log.info('Asegúrate de tener configuradas las variables en .env');
    return false;
  }
  
  log.success('Configuraciones validadas');
  
  // Mostrar info de local
  if (localConfig.connectionString) {
    const urlMatch = localConfig.connectionString.match(/:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (urlMatch) {
      log.info(`Local: ${urlMatch[3]}:${urlMatch[4]}/${urlMatch[5]}`);
    } else {
      log.info(`Local: ${localConfig.connectionString.substring(0, 50)}...`);
    }
  } else {
    log.info(`Local: ${localConfig.host}:${localConfig.port}/${localConfig.database}`);
  }
  
  // Mostrar info de cloud
  log.info(`Cloud: ${cloudConfig.host}:${cloudConfig.port}/${cloudConfig.database}`);
  
  return true;
}

// Conectar a bases de datos
async function connectDatabases() {
  log.step('Conectando a bases de datos...');
  
  const localPool = new Pool(localConfig);
  const cloudPool = new Pool(cloudConfig);
  
  try {
    // Probar conexión local
    log.info('Probando conexión local...');
    const localClient = await localPool.connect();
    const localTest = await localClient.query('SELECT NOW() as time, version() as version');
    localClient.release();
    log.success(`Conexión local establecida: ${localTest.rows[0].time}`);
    
    // Probar conexión cloud
    log.info('Probando conexión cloud...');
    const cloudClient = await cloudPool.connect();
    const cloudTest = await cloudClient.query('SELECT NOW() as time, version() as version');
    cloudClient.release();
    log.success(`Conexión cloud establecida: ${cloudTest.rows[0].time}`);
    
    return { localPool, cloudPool };
  } catch (error) {
    log.error(`Error conectando: ${error.message}`);
    await localPool.end();
    await cloudPool.end();
    throw error;
  }
}

// Obtener lista de tablas ordenadas por dependencias (sin FKs primero)
async function getTablesOrdered(localPool) {
  // Obtener todas las tablas
  const allTables = await localPool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  const tables = allTables.rows.map(row => row.table_name);
  
  // Obtener dependencias (foreign keys)
  const dependencies = await localPool.query(`
    SELECT
      tc.table_name AS dependent_table,
      ccu.table_name AS referenced_table
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name != ccu.table_name
  `);
  
  // Construir grafo de dependencias
  const dependsOn = {};
  const hasDependencies = {};
  
  tables.forEach(table => {
    dependsOn[table] = [];
    hasDependencies[table] = false;
  });
  
  dependencies.rows.forEach(dep => {
    if (dependsOn[dep.dependent_table]) {
      dependsOn[dep.dependent_table].push(dep.referenced_table);
      hasDependencies[dep.dependent_table] = true;
    }
  });
  
  // Ordenar topológicamente (Kahn's algorithm)
  const ordered = [];
  const inDegree = {};
  
  tables.forEach(table => {
    inDegree[table] = dependsOn[table].length;
  });
  
  const queue = tables.filter(table => inDegree[table] === 0);
  
  while (queue.length > 0) {
    const current = queue.shift();
    ordered.push(current);
    
    // Reducir el grado de las tablas que dependen de esta
    tables.forEach(table => {
      if (dependsOn[table].includes(current)) {
        inDegree[table]--;
        if (inDegree[table] === 0) {
          queue.push(table);
        }
      }
    });
  }
  
  // Si quedan tablas, agregarlas al final (pueden tener dependencias circulares)
  tables.forEach(table => {
    if (!ordered.includes(table)) {
      ordered.push(table);
    }
  });
  
  return ordered;
}

// Obtener estructura de tabla
async function getTableStructure(pool, tableName) {
  const result = await pool.query(`
    SELECT 
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  
  return result.rows;
}

// Obtener CREATE TABLE completo desde PostgreSQL
async function getCreateTableSQL(localPool, tableName) {
  try {
    // Usar pg_dump approach - obtener la definición completa
    const result = await localPool.query(`
      SELECT 
        pg_get_tabledef('public', $1) as table_def
    `, [tableName]);
    
    if (result.rows.length > 0 && result.rows[0].table_def) {
      return result.rows[0].table_def;
    }
    
    // Fallback: construir CREATE TABLE desde information_schema
    return await buildCreateTableSQL(localPool, tableName);
  } catch (error) {
    // Si pg_get_tabledef no está disponible, construir manualmente
    return await buildCreateTableSQL(localPool, tableName);
  }
}

// Obtener información de secuencias (para SERIAL)
async function getSequencesForTable(pool, tableName) {
  const result = await pool.query(`
    SELECT 
      column_name,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_default LIKE 'nextval%'
  `, [tableName]);
  
  return result.rows.map(row => {
    // Extraer nombre de secuencia del default: nextval('sequence_name'::regclass)
    const match = row.column_default.match(/nextval\('([^']+)'/);
    return {
      column: row.column_name,
      sequence: match ? match[1] : `${tableName}_${row.column_name}_seq`
    };
  });
}

// Construir CREATE TABLE SQL desde information_schema (SIN foreign keys)
async function buildCreateTableSQL(pool, tableName, includeForeignKeys = false) {
  // Obtener columnas
  const columns = await getTableStructure(pool, tableName);
  
  // Obtener constraints (primary keys, foreign keys, unique, etc.)
  const constraints = await pool.query(`
    SELECT 
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = $1
    ORDER BY tc.constraint_type, tc.constraint_name
  `, [tableName]);
  
  // Construir SQL
  let sql = `CREATE TABLE IF NOT EXISTS "public"."${tableName}" (\n`;
  
  // Agregar columnas
  const columnDefs = [];
  const sequences = [];
  
  for (const col of columns) {
    // Detectar si es SERIAL (tiene default con nextval)
    const isSerial = col.column_default && col.column_default.includes('nextval');
    const sequenceName = isSerial ? `${tableName}_${col.column_name}_seq` : null;
    
    // Escapar nombres de columnas que sean palabras reservadas
    const columnName = col.column_name;
    const escapedColumnName = `"${columnName}"`;
    
    let def = `  ${escapedColumnName}`;
    
    // Para SERIAL, usar INTEGER con DEFAULT nextval
    if (isSerial) {
      def += ' INTEGER';
      sequences.push({ column: col.column_name, sequence: sequenceName });
    } else {
      def += ` ${col.data_type}`;
      
      if (col.character_maximum_length) {
        def += `(${col.character_maximum_length})`;
      }
      
      // Manejar tipos especiales (numeric, decimal, etc.)
      if (col.data_type === 'numeric' || col.data_type === 'decimal') {
        const numericInfo = await pool.query(`
          SELECT numeric_precision, numeric_scale
          FROM information_schema.columns
          WHERE table_schema = 'public' 
            AND table_name = $1 
            AND column_name = $2
        `, [tableName, col.column_name]);
        
        if (numericInfo.rows.length > 0 && numericInfo.rows[0].numeric_precision) {
          const precision = numericInfo.rows[0].numeric_precision;
          const scale = numericInfo.rows[0].numeric_scale || 0;
          def = `  "${col.column_name}" ${col.data_type}(${precision},${scale})`;
        }
      }
    }
    
    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }
    
    if (col.column_default && !isSerial) {
      // Escapar palabras reservadas en DEFAULT (como USER, CURRENT_USER, etc.)
      let defaultVal = col.column_default;
      // Escapar funciones/valores que contengan palabras reservadas
      if (defaultVal.match(/\bUSER\b/i)) {
        // Si es CURRENT_USER o similar, mantenerlo pero con comillas si es necesario
        defaultVal = defaultVal.replace(/\bCURRENT_USER\b/gi, 'CURRENT_USER');
        defaultVal = defaultVal.replace(/\bSESSION_USER\b/gi, 'SESSION_USER');
        defaultVal = defaultVal.replace(/\bSYSTEM_USER\b/gi, 'SYSTEM_USER');
        // Si es solo USER, puede ser un nombre de función o columna
        if (defaultVal.match(/^USER$/i)) {
          defaultVal = 'CURRENT_USER'; // Convertir USER a CURRENT_USER
        }
      }
      def += ` DEFAULT ${defaultVal}`;
    } else if (isSerial) {
      def += ` DEFAULT nextval('"${sequenceName}"'::regclass)`;
    }
    
    columnDefs.push(def);
  }
  
  sql += columnDefs.join(',\n');
  
  // Agregar constraints (pero NO foreign keys si includeForeignKeys=false)
  const pkConstraints = constraints.rows.filter(c => c.constraint_type === 'PRIMARY KEY');
  if (pkConstraints.length > 0) {
    const pkColumns = pkConstraints.map(c => `"${c.column_name}"`).join(', ');
    sql += `,\n  PRIMARY KEY (${pkColumns})`;
  }
  
  if (includeForeignKeys) {
    const fkConstraints = constraints.rows.filter(c => c.constraint_type === 'FOREIGN KEY');
    fkConstraints.forEach(fk => {
      sql += `,\n  CONSTRAINT "${fk.constraint_name}" FOREIGN KEY ("${fk.column_name}") REFERENCES "public"."${fk.foreign_table_name}"("${fk.foreign_column_name}")`;
    });
  }
  
  sql += '\n);';
  
  return { sql, sequences };
}

// Obtener foreign keys para agregar después
async function getForeignKeys(localPool, tableName) {
  const result = await localPool.query(`
    SELECT 
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = $1
  `, [tableName]);
  
  return result.rows;
}

// Crear secuencia en cloud
async function createSequenceInCloud(cloudPool, sequenceName, startValue = 1) {
  try {
    const createSeqSQL = `CREATE SEQUENCE IF NOT EXISTS "${sequenceName}" START ${startValue};`;
    await cloudPool.query(createSeqSQL);
    return true;
  } catch (error) {
    if (error.code === '42P07') {
      // Secuencia ya existe
      return true;
    }
    log.error(`Error creando secuencia ${sequenceName}: ${error.message}`);
    throw error;
  }
}

// Crear tabla en cloud (solo estructura, sin datos y sin foreign keys)
async function createTableInCloud(cloudPool, tableName, createTableSQL, sequences = []) {
  try {
    log.info(`Creando estructura de tabla ${tableName} en cloud...`);
    
    // Crear secuencias primero
    for (const seq of sequences) {
      await createSequenceInCloud(cloudPool, seq.sequence);
    }
    
    // Crear tabla
    await cloudPool.query(createTableSQL);
    log.success(`Tabla ${tableName} creada en cloud`);
    return true;
  } catch (error) {
    // Si la tabla ya existe, no es un error crítico
    if (error.message.includes('already exists') || error.code === '42P07') {
      log.warn(`Tabla ${tableName} ya existe en cloud`);
      return true;
    }
    log.error(`Error creando tabla ${tableName}: ${error.message}`);
    throw error;
  }
}

// Agregar foreign keys después de crear todas las tablas
async function addForeignKeys(cloudPool, tableName, foreignKeys) {
  if (foreignKeys.length === 0) return;
  
  try {
    for (const fk of foreignKeys) {
      const deleteRule = fk.delete_rule ? ` ON DELETE ${fk.delete_rule}` : '';
      const updateRule = fk.update_rule && fk.update_rule !== 'NO ACTION' ? ` ON UPDATE ${fk.update_rule}` : '';
      
      const alterSQL = `
        ALTER TABLE "public"."${tableName}"
        ADD CONSTRAINT "${fk.constraint_name}" 
        FOREIGN KEY ("${fk.column_name}") 
        REFERENCES "public"."${fk.foreign_table_name}"("${fk.foreign_column_name}")${deleteRule}${updateRule}
      `;
      
      try {
        await cloudPool.query(alterSQL);
        log.info(`  Foreign key ${fk.constraint_name} agregada a ${tableName}`);
      } catch (fkError) {
        if (fkError.code === '42710' || fkError.message.includes('already exists')) {
          log.warn(`  Foreign key ${fk.constraint_name} ya existe en ${tableName}`);
        } else {
          log.error(`  Error agregando FK ${fk.constraint_name}: ${fkError.message}`);
        }
      }
    }
  } catch (error) {
    log.error(`Error agregando foreign keys a ${tableName}: ${error.message}`);
    throw error;
  }
}

// Obtener datos de tabla (con paginación)
async function getTableData(pool, tableName, offset = 0, limit = 1000) {
  const result = await pool.query(`
    SELECT * FROM "public"."${tableName}"
    ORDER BY id
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
  
  return result.rows;
}

// Contar registros en tabla
async function countTableRecords(pool, tableName) {
  const result = await pool.query(`SELECT COUNT(*) as count FROM "public"."${tableName}"`);
  return parseInt(result.rows[0].count);
}

// Migrar una tabla
async function migrateTable(localPool, cloudPool, tableName, skipExisting = false) {
  log.step(`Migrando tabla: ${tableName}`);
  
  try {
    // Obtener estructura de la tabla local
    const structure = await getTableStructure(localPool, tableName);
    if (structure.length === 0) {
      log.warn(`Tabla ${tableName} no existe en local. Saltando...`);
      return { skipped: true, count: 0, tableCreated: false };
    }
    
    // Verificar que la tabla existe en cloud (ya debería estar creada en FASE 1)
    const cloudTablesResult = await cloudPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    const cloudTables = cloudTablesResult.rows.map(row => row.table_name);
    const existsInCloud = cloudTables.includes(tableName);
    
    if (!existsInCloud) {
      log.error(`Tabla ${tableName} no existe en cloud. Debe crearse en FASE 1 primero.`);
      return { skipped: true, count: 0, tableCreated: false };
    }
    
    // Verificar si hay datos existentes en cloud
    const cloudCount = existsInCloud ? await countTableRecords(cloudPool, tableName) : 0;
    if (cloudCount > 0) {
      if (skipExisting) {
        log.warn(`Tabla ${tableName} ya tiene ${cloudCount} registros. Saltando migración de datos...`);
        return { skipped: true, count: cloudCount, tableCreated: true };
      } else {
        log.warn(`Tabla ${tableName} ya tiene ${cloudCount} registros.`);
        const answer = await askQuestion(`¿Sobrescribir datos existentes? (s/N): `);
        if (answer.toLowerCase() !== 's') {
          log.warn(`Saltando migración de datos para ${tableName}`);
          return { skipped: true, count: cloudCount, tableCreated: true };
        }
      }
    }
    
    // Contar registros en local
    const localCount = await countTableRecords(localPool, tableName);
    log.info(`Registros en local: ${localCount}`);
    
    if (localCount === 0) {
      log.warn(`Tabla ${tableName} está vacía. Solo se creó la estructura.`);
      return { skipped: true, count: 0, tableCreated: true };
    }
    
    // Migrar datos en lotes
    let offset = 0;
    const batchSize = 1000;
    let totalMigrated = 0;
    
    while (offset < localCount) {
      const batch = await getTableData(localPool, tableName, offset, batchSize);
      
      if (batch.length === 0) break;
      
      // Crear query de inserción
      const columns = Object.keys(batch[0]);
      const placeholders = batch.map((_, idx) => 
        `(${columns.map((_, colIdx) => `$${idx * columns.length + colIdx + 1}`).join(', ')})`
      ).join(', ');
      
      const values = batch.flatMap(row => columns.map(col => row[col]));
      const query = `
        INSERT INTO "public"."${tableName}" (${columns.map(c => `"${c}"`).join(', ')})
        VALUES ${placeholders}
        ON CONFLICT DO NOTHING
      `;
      
      try {
        await cloudPool.query(query, values);
        totalMigrated += batch.length;
        log.info(`  Migrados ${totalMigrated}/${localCount} registros...`);
      } catch (error) {
        log.error(`Error insertando lote: ${error.message}`);
        // Intentar insertar uno por uno
        for (const row of batch) {
          try {
            const singleQuery = `
              INSERT INTO "public"."${tableName}" (${columns.map(c => `"${c}"`).join(', ')})
              VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
              ON CONFLICT DO NOTHING
            `;
            await cloudPool.query(singleQuery, columns.map(col => row[col]));
            totalMigrated++;
          } catch (singleError) {
            log.error(`Error insertando registro: ${singleError.message}`);
            log.error(`Datos: ${JSON.stringify(row).substring(0, 100)}...`);
          }
        }
      }
      
      offset += batchSize;
    }
    
    log.success(`Tabla ${tableName} migrada: ${totalMigrated} registros`);
    return { skipped: false, count: totalMigrated, tableCreated: true };
    
  } catch (error) {
    log.error(`Error migrando tabla ${tableName}: ${error.message}`);
    throw error;
  }
}

// Función para hacer pregunta interactiva
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Función principal
async function migrate() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRACIÓN DE BASE DE DATOS LOCAL → CLOUD (GCP)            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  try {
    // Validar configuraciones
    if (!validateConfigs()) {
      process.exit(1);
    }
    
    // Conectar a bases de datos
    const { localPool, cloudPool } = await connectDatabases();
    
    // Obtener lista de tablas ordenadas por dependencias
    log.step('Obteniendo lista de tablas ordenadas por dependencias...');
    const localTables = await getTablesOrdered(localPool);
    log.success(`Encontradas ${localTables.length} tablas en local (ordenadas por dependencias)`);
    
    // Mostrar tabla de tablas
    console.log('\n📊 Tablas encontradas:');
    localTables.forEach((table, idx) => {
      console.log(`   ${idx + 1}. ${table}`);
    });
    
    // Preguntar si continuar
    console.log('\n');
    const proceed = await askQuestion('¿Continuar con la migración? (s/N): ');
    if (proceed.toLowerCase() !== 's') {
      log.warn('Migración cancelada por el usuario');
      await localPool.end();
      await cloudPool.end();
      process.exit(0);
    }
    
    // Preguntar si saltar tablas existentes
    const skipExisting = await askQuestion('¿Saltar tablas que ya tienen datos? (s/N): ');
    const skip = skipExisting.toLowerCase() === 's';
    
    // FASE 1: Crear todas las tablas (sin foreign keys)
    log.step('FASE 1: Creando estructuras de tablas (sin foreign keys)...');
    const tableResults = {};
    let totalTablesCreated = 0;
    
    for (const table of localTables) {
      try {
        const structure = await getTableStructure(localPool, table);
        if (structure.length === 0) {
          log.warn(`Tabla ${table} no existe en local. Saltando...`);
          continue;
        }
        
        const cloudTablesResult = await cloudPool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        `);
        const cloudTables = cloudTablesResult.rows.map(row => row.table_name);
        const existsInCloud = cloudTables.includes(table);
        
        if (!existsInCloud) {
          try {
            const { sql: createTableSQL, sequences } = await buildCreateTableSQL(localPool, table, false);
            await createTableInCloud(cloudPool, table, createTableSQL, sequences);
            totalTablesCreated++;
            tableResults[table] = { tableCreated: true };
          } catch (createError) {
            log.error(`Error creando tabla ${table}: ${createError.message}`);
            tableResults[table] = { tableCreated: false, error: createError.message };
          }
        } else {
          log.info(`Tabla ${table} ya existe en cloud`);
          tableResults[table] = { tableCreated: true };
          totalTablesCreated++;
        }
      } catch (error) {
        log.error(`Error procesando tabla ${table}: ${error.message}`);
        tableResults[table] = { tableCreated: false, error: error.message };
      }
    }
    
    // FASE 2: Agregar foreign keys después de crear todas las tablas
    log.step('FASE 2: Agregando foreign keys...');
    for (const table of localTables) {
      if (tableResults[table]?.tableCreated) {
        try {
          const foreignKeys = await getForeignKeys(localPool, table);
          if (foreignKeys.length > 0) {
            await addForeignKeys(cloudPool, table, foreignKeys);
          }
        } catch (error) {
          log.error(`Error agregando foreign keys a ${table}: ${error.message}`);
        }
      }
    }
    
    // FASE 3: Migrar datos
    log.step('FASE 3: Migrando datos...');
    const results = {};
    let totalMigrated = 0;
    let totalSkipped = 0;
    
    for (const table of localTables) {
      try {
        if (!tableResults[table]?.tableCreated) {
          log.warn(`Saltando migración de datos para ${table} (tabla no creada)`);
          results[table] = { skipped: true, count: 0, tableCreated: false };
          totalSkipped++;
          continue;
        }
        
        const result = await migrateTable(localPool, cloudPool, table, skip);
        results[table] = { ...result, tableCreated: true };
        
        if (result.skipped) {
          totalSkipped++;
        } else {
          totalMigrated += result.count;
        }
      } catch (error) {
        log.error(`Error migrando datos de tabla ${table}: ${error.message}`);
        results[table] = { error: error.message, tableCreated: tableResults[table]?.tableCreated || false };
      }
    }
    
    // Resumen
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  RESUMEN DE MIGRACIÓN                                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');
    
    Object.entries(results).forEach(([table, result]) => {
      if (result.error) {
        log.error(`${table}: ERROR - ${result.error}`);
      } else if (result.skipped) {
        const tableStatus = result.tableCreated ? '✅ Estructura creada' : '⚠️ Sin estructura';
        log.warn(`${table}: ${tableStatus}, datos saltados (${result.count} registros existentes)`);
      } else {
        log.success(`${table}: ✅ Estructura creada, ${result.count} registros migrados`);
      }
    });
    
    console.log('\n');
    log.success(`Migración completada:`);
    log.info(`  - Tablas con estructura creada: ${totalTablesCreated}/${localTables.length}`);
    log.info(`  - Tablas con datos migrados: ${localTables.length - totalSkipped}`);
    log.info(`  - Tablas saltadas (solo estructura): ${totalSkipped}`);
    log.info(`  - Total registros migrados: ${totalMigrated}`);
    console.log('\n');
    
    // Cerrar conexiones
    await localPool.end();
    await cloudPool.end();
    
    log.success('¡Migración completada exitosamente!');
    process.exit(0);
    
  } catch (error) {
    log.error(`Error fatal: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar migración
if (require.main === module) {
  migrate();
}

module.exports = { migrate };

