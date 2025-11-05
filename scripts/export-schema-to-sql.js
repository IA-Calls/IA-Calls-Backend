/**
 * Script para extraer el esquema completo de la base de datos local
 * y generar un archivo SQL que puede ejecutarse directamente en Cloud SQL
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Configuración de base de datos local
let localConfig;

if (process.env.DATABASE_LOCAL_URL) {
  localConfig = {
    connectionString: process.env.DATABASE_LOCAL_URL,
    ssl: false
  };
} else {
  localConfig = {
    host: process.env.DB_HOST_LOCAL || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT_LOCAL || process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME_LOCAL || process.env.DB_NAME || 'ia-calls',
    user: process.env.DB_USER_LOCAL || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD_LOCAL || process.env.DB_PASSWORD || 'moon@1014198153',
    ssl: false
  };
}

const localPool = new Pool(localConfig);

// Obtener lista de tablas ordenadas por dependencias
async function getTablesOrdered(pool) {
  const allTables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  const tables = allTables.rows.map(row => row.table_name);
  
  // Obtener dependencias (foreign keys)
  const dependencies = await pool.query(`
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
  
  tables.forEach(table => {
    dependsOn[table] = [];
  });
  
  dependencies.rows.forEach(dep => {
    if (dependsOn[dep.dependent_table]) {
      dependsOn[dep.dependent_table].push(dep.referenced_table);
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
    
    tables.forEach(table => {
      if (dependsOn[table].includes(current)) {
        inDegree[table]--;
        if (inDegree[table] === 0) {
          queue.push(table);
        }
      }
    });
  }
  
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
      numeric_precision,
      numeric_scale,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  
  return result.rows;
}

// Obtener constraints
async function getConstraints(pool, tableName) {
  const result = await pool.query(`
    SELECT 
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    LEFT JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = $1
    ORDER BY tc.constraint_type, tc.constraint_name
  `, [tableName]);
  
  return result.rows;
}

// Generar SQL CREATE TABLE
async function generateCreateTableSQL(pool, tableName) {
  const columns = await getTableStructure(pool, tableName);
  const constraints = await getConstraints(pool, tableName);
  
  let sql = `-- ============================================\n`;
  sql += `-- TABLA: ${tableName}\n`;
  sql += `-- ============================================\n\n`;
  sql += `CREATE TABLE IF NOT EXISTS "public"."${tableName}" (\n`;
  
  const columnDefs = [];
  const sequences = [];
  
  for (const col of columns) {
    const isSerial = col.column_default && col.column_default.includes('nextval');
    const sequenceName = isSerial ? `${tableName}_${col.column_name}_seq` : null;
    
    let def = `  "${col.column_name}"`;
    
    if (isSerial) {
      def += ' INTEGER';
      sequences.push({ column: col.column_name, sequence: sequenceName });
    } else {
      def += ` ${col.data_type}`;
      
      if (col.character_maximum_length) {
        def += `(${col.character_maximum_length})`;
      } else if (col.numeric_precision) {
        const scale = col.numeric_scale || 0;
        def += `(${col.numeric_precision},${scale})`;
      }
    }
    
    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }
    
    if (col.column_default && !isSerial) {
      let defaultVal = col.column_default;
      // Manejar palabras reservadas
      if (defaultVal.match(/\bUSER\b/i) && !defaultVal.match(/\bCURRENT_USER\b/i)) {
        defaultVal = defaultVal.replace(/^USER$/i, 'CURRENT_USER');
      }
      def += ` DEFAULT ${defaultVal}`;
    } else if (isSerial) {
      def += ` DEFAULT nextval('"${sequenceName}"'::regclass)`;
    }
    
    columnDefs.push(def);
  }
  
  sql += columnDefs.join(',\n');
  
  // Primary keys
  const pkConstraints = constraints.filter(c => c.constraint_type === 'PRIMARY KEY');
  if (pkConstraints.length > 0) {
    const pkColumns = pkConstraints.map(c => `"${c.column_name}"`).join(', ');
    sql += `,\n  PRIMARY KEY (${pkColumns})`;
  }
  
  sql += '\n);\n\n';
  
  // Crear secuencias
  for (const seq of sequences) {
    sql += `-- Secuencia para ${tableName}.${seq.column}\n`;
    sql += `CREATE SEQUENCE IF NOT EXISTS "${seq.sequence}" START 1;\n\n`;
  }
  
  // Foreign keys (se agregan después)
  const fkConstraints = constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
  if (fkConstraints.length > 0) {
    sql += `-- Foreign keys para ${tableName}\n`;
    for (const fk of fkConstraints) {
      const deleteRule = fk.delete_rule && fk.delete_rule !== 'NO ACTION' ? ` ON DELETE ${fk.delete_rule}` : '';
      const updateRule = fk.update_rule && fk.update_rule !== 'NO ACTION' ? ` ON UPDATE ${fk.update_rule}` : '';
      sql += `ALTER TABLE "public"."${tableName}"\n`;
      sql += `  ADD CONSTRAINT "${fk.constraint_name}"\n`;
      sql += `  FOREIGN KEY ("${fk.column_name}")\n`;
      sql += `  REFERENCES "public"."${fk.foreign_table_name}"("${fk.foreign_column_name}")${deleteRule}${updateRule};\n\n`;
    }
  }
  
  return { sql, sequences };
}

async function exportSchema() {
  try {
    console.log('📊 Conectando a base de datos local...');
    await localPool.query('SELECT NOW()');
    console.log('✅ Conectado\n');
    
    console.log('📋 Obteniendo lista de tablas ordenadas por dependencias...');
    const tables = await getTablesOrdered(localPool);
    console.log(`✅ Encontradas ${tables.length} tablas\n`);
    console.log('📊 Orden de creación:');
    tables.forEach((table, idx) => {
      console.log(`   ${idx + 1}. ${table}`);
    });
    console.log('');
    
    let fullSQL = `-- ============================================\n`;
    fullSQL += `-- ESQUEMA COMPLETO DE BASE DE DATOS\n`;
    fullSQL += `-- Generado automáticamente desde base de datos local\n`;
    fullSQL += `-- Fecha: ${new Date().toISOString()}\n`;
    fullSQL += `-- ============================================\n\n`;
    
    // FASE 1: Crear secuencias y tablas (sin foreign keys)
    fullSQL += `-- ============================================\n`;
    fullSQL += `-- FASE 1: CREAR SECUENCIAS Y TABLAS (SIN FOREIGN KEYS)\n`;
    fullSQL += `-- ============================================\n\n`;
    
    for (const table of tables) {
      console.log(`📝 Generando SQL para tabla: ${table}`);
      const { sql, sequences } = await generateCreateTableSQL(localPool, table);
      
      // Solo agregar secuencias y estructura de tabla (sin foreign keys)
      let tableSQL = sql.split('-- Foreign keys')[0]; // Remover foreign keys de la primera parte
      
      // Agregar secuencias primero
      if (sequences.length > 0) {
        let seqSQL = '';
        for (const seq of sequences) {
          seqSQL += `CREATE SEQUENCE IF NOT EXISTS "${seq.sequence}" START 1;\n`;
        }
        fullSQL += seqSQL + '\n';
      }
      
      // Agregar CREATE TABLE (sin foreign keys)
      fullSQL += tableSQL.split('-- Foreign keys')[0];
    }
    
    // FASE 2: Agregar foreign keys
    fullSQL += `\n-- ============================================\n`;
    fullSQL += `-- FASE 2: AGREGAR FOREIGN KEYS\n`;
    fullSQL += `-- ============================================\n\n`;
    
    for (const table of tables) {
      const constraints = await getConstraints(localPool, table);
      const fkConstraints = constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
      
      if (fkConstraints.length > 0) {
        fullSQL += `-- Foreign keys para ${table}\n`;
        for (const fk of fkConstraints) {
          const deleteRule = fk.delete_rule && fk.delete_rule !== 'NO ACTION' ? ` ON DELETE ${fk.delete_rule}` : '';
          const updateRule = fk.update_rule && fk.update_rule !== 'NO ACTION' ? ` ON UPDATE ${fk.update_rule}` : '';
          fullSQL += `ALTER TABLE "public"."${table}"\n`;
          fullSQL += `  ADD CONSTRAINT "${fk.constraint_name}"\n`;
          fullSQL += `  FOREIGN KEY ("${fk.column_name}")\n`;
          fullSQL += `  REFERENCES "public"."${fk.foreign_table_name}"("${fk.foreign_column_name}")${deleteRule}${updateRule};\n\n`;
        }
      }
    }
    
    // Guardar archivo
    const outputPath = path.join(__dirname, 'schema-cloud.sql');
    await fs.writeFile(outputPath, fullSQL, 'utf8');
    
    console.log('\n✅ Esquema exportado exitosamente!');
    console.log(`📁 Archivo guardado en: ${outputPath}`);
    console.log(`\n💡 Para aplicar el esquema en Cloud SQL:`);
    console.log(`   1. Copia el contenido de schema-cloud.sql`);
    console.log(`   2. Ejecútalo en tu instancia de Cloud SQL`);
    console.log(`   3. O usa: psql -h [HOST] -U [USER] -d [DATABASE] -f schema-cloud.sql`);
    
    await localPool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await localPool.end();
    process.exit(1);
  }
}

exportSchema();

