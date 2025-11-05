/**
 * Script para sincronizar las secuencias de PostgreSQL en Cloud SQL
 * después de migrar datos desde una base de datos local
 * 
 * Esto asegura que los nuevos registros no generen IDs duplicados
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

// Configuración de base de datos Cloud SQL (producción)
// Usar la misma lógica que database.js
let cloudConfig;

if (process.env.NODE_ENV === 'production') {
  cloudConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
  
  if (!cloudConfig.host || !cloudConfig.database || !cloudConfig.user || !cloudConfig.password) {
    console.error('❌ ERROR: Faltan variables de entorno para producción:');
    console.error('   - DB_HOST');
    console.error('   - DB_NAME');
    console.error('   - DB_USER');
    console.error('   - DB_PASSWORD');
    console.error('\n💡 Configura NODE_ENV=production y las variables de Cloud SQL');
    process.exit(1);
  }
} else {
  // En desarrollo, también permitir si están configuradas las variables de producción
  if (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD) {
    console.log('⚠️  Ejecutando en modo desarrollo pero usando configuración de producción');
    cloudConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };
  } else {
    console.error('❌ Este script debe ejecutarse con NODE_ENV=production');
    console.error('   O configurar: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD');
    console.error('   Ejecuta: NODE_ENV=production node scripts/sync-sequences.js');
    process.exit(1);
  }
}

const cloudPool = new Pool(cloudConfig);

// Obtener todas las tablas con secuencias
async function getTablesWithSequences() {
  // Primero intentar con pg_get_serial_sequence
  let result = await cloudPool.query(`
    SELECT 
      t.table_name,
      c.column_name,
      c.column_default,
      pg_get_serial_sequence('public.' || t.table_name, c.column_name) as sequence_name
    FROM information_schema.tables t
    JOIN information_schema.columns c 
      ON t.table_name = c.table_name 
      AND t.table_schema = c.table_schema
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_default LIKE 'nextval%'
    ORDER BY t.table_name, c.column_name
  `);
  
  // Si no encuentra secuencias, intentar buscar secuencias directamente
  if (result.rows.length === 0 || result.rows.every(r => !r.sequence_name)) {
    console.log('   ℹ️  Buscando secuencias directamente...');
    const sequencesResult = await cloudPool.query(`
      SELECT 
        sequence_name,
        table_name,
        column_name
      FROM (
        SELECT 
          s.sequence_name,
          t.table_name,
          c.column_name
        FROM information_schema.sequences s
        CROSS JOIN information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE s.sequence_schema = 'public'
          AND t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND c.column_default LIKE '%' || s.sequence_name || '%'
      ) subquery
      ORDER BY table_name, column_name
    `);
    
    if (sequencesResult.rows.length > 0) {
      return sequencesResult.rows;
    }
    
    // Último intento: buscar patrones comunes de secuencias
    const allSequences = await cloudPool.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name
    `);
    
    console.log(`   📋 Encontradas ${allSequences.rows.length} secuencias en total`);
    
    // Mapear secuencias a tablas basándose en el nombre
    const mapped = [];
    for (const seq of allSequences.rows) {
      const seqName = seq.sequence_name;
      // Extraer nombre de tabla del nombre de secuencia (ej: groups_id_seq -> groups)
      const tableMatch = seqName.match(/^(.+?)_id_seq$/);
      if (tableMatch) {
        const tableName = tableMatch[1];
        // Verificar que la tabla existe
        const tableExists = await cloudPool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_name = $1
        `, [tableName]);
        
        if (tableExists.rows.length > 0) {
          mapped.push({
            table_name: tableName,
            column_name: 'id',
            sequence_name: seqName
          });
        }
      }
    }
    
    return mapped;
  }
  
  return result.rows.filter(r => r.sequence_name);
}

// Sincronizar una secuencia con el máximo ID de la tabla
async function syncSequence(tableName, sequenceName) {
  try {
    // Obtener el máximo ID actual en la tabla
    const maxResult = await cloudPool.query(`
      SELECT COALESCE(MAX(id), 0) as max_id 
      FROM "public"."${tableName}"
    `);
    
    const maxId = parseInt(maxResult.rows[0].max_id) || 0;
    
    // Obtener el valor actual de la secuencia
    const currentSeqResult = await cloudPool.query(`
      SELECT last_value, is_called 
      FROM "${sequenceName}"
    `);
    
    const lastValue = parseInt(currentSeqResult.rows[0].last_value);
    const isCalled = currentSeqResult.rows[0].is_called;
    
    // Calcular el nuevo valor (debe ser mayor que max_id)
    const newValue = Math.max(maxId + 1, lastValue);
    
    // Sincronizar la secuencia
    await cloudPool.query(`
      SELECT setval('"${sequenceName}"', ${newValue}, ${!isCalled})
    `);
    
    return {
      tableName,
      sequenceName,
      maxId,
      oldValue: lastValue,
      newValue,
      synced: newValue > lastValue
    };
  } catch (error) {
    console.error(`❌ Error sincronizando ${sequenceName} para ${tableName}:`, error.message);
    return {
      tableName,
      sequenceName,
      error: error.message
    };
  }
}

async function syncAllSequences() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  SINCRONIZACIÓN DE SECUENCIAS EN CLOUD SQL                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('🔌 Conectando a Cloud SQL...');
    await cloudPool.query('SELECT NOW()');
    console.log('✅ Conectado\n');
    
    console.log('📋 Obteniendo tablas con secuencias...');
    const tablesWithSequences = await getTablesWithSequences();
    console.log(`✅ Encontradas ${tablesWithSequences.length} secuencias\n`);
    
    if (tablesWithSequences.length === 0) {
      console.log('ℹ️  No se encontraron secuencias para sincronizar');
      await cloudPool.end();
      return;
    }
    
    console.log('🔄 Sincronizando secuencias...\n');
    
    const results = [];
    for (const row of tablesWithSequences) {
      // Validar que sequence_name no sea null
      if (!row.sequence_name) {
        console.log(`   ⚠️  Saltando ${row.table_name}.${row.column_name} (sin secuencia asociada)\n`);
        continue;
      }
      
      const sequenceName = row.sequence_name.replace('public.', '').replace(/"/g, '');
      console.log(`   Sincronizando ${row.table_name}.${row.column_name} (${sequenceName})...`);
      const result = await syncSequence(row.table_name, sequenceName);
      results.push(result);
      
      if (result.error) {
        console.log(`   ❌ Error: ${result.error}\n`);
      } else if (result.synced) {
        console.log(`   ✅ Sincronizado: ${result.oldValue} → ${result.newValue} (max_id: ${result.maxId})\n`);
      } else {
        console.log(`   ℹ️  Ya está sincronizado (valor actual: ${result.newValue}, max_id: ${result.maxId})\n`);
      }
    }
    
    // Resumen
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  RESUMEN DE SINCRONIZACIÓN                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    const synced = results.filter(r => r.synced && !r.error).length;
    const alreadySynced = results.filter(r => !r.synced && !r.error).length;
    const errors = results.filter(r => r.error).length;
    
    console.log(`✅ Secuencias sincronizadas: ${synced}`);
    console.log(`ℹ️  Secuencias ya sincronizadas: ${alreadySynced}`);
    if (errors > 0) {
      console.log(`❌ Errores: ${errors}`);
    }
    
    console.log('\n✅ Sincronización completada\n');
    
    await cloudPool.end();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    await cloudPool.end();
    process.exit(1);
  }
}

syncAllSequences();

