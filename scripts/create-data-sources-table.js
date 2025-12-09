/**
 * Script para crear la tabla data_sources en PostgreSQL
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de base de datos
let dbConfig;

if (process.env.DATABASE_LOCAL_URL) {
  dbConfig = {
    connectionString: process.env.DATABASE_LOCAL_URL,
    ssl: false
  };
} else {
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ia-calls',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: false
  };
}

const pool = new Pool(dbConfig);

async function createDataSourcesTable() {
  const client = await pool.connect();
  
  try {
    console.log('📋 Creando tabla data_sources...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'database', 'create_data_sources_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el SQL
    await client.query(sql);
    
    console.log('✅ Tabla data_sources creada exitosamente');
    console.log('');
    console.log('📊 La tabla data_sources incluye soporte para:');
    console.log('   - Bases de datos externas (MySQL, PostgreSQL, SQL Server)');
    console.log('   - Archivos Excel (.xlsx, .xls)');
    console.log('   - Google Sheets públicos');
    console.log('   - Archivos PDF');
    console.log('');
    console.log('🔒 Características de seguridad:');
    console.log('   - Cada usuario solo puede ver sus propias fuentes');
    console.log('   - Contraseñas de BD encriptadas');
    console.log('   - Validación de ownership en todas las operaciones');
    
  } catch (error) {
    console.error('❌ Error creando tabla data_sources:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('');
      console.log('⚠️ La tabla data_sources ya existe. Si quieres recrearla, elimínala primero.');
    }
    
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createDataSourcesTable();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

