const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔄 Ejecutando migración: agregar columna metadata...');

    // Leer archivo SQL de migración
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../database/migrations/add_metadata_to_conversations.sql'),
      'utf8'
    );

    // Ejecutar migración
    await pool.query(migrationSQL);
    
    console.log('✅ Migración completada exitosamente');
    console.log('📋 Columna metadata agregada a la tabla conversations');

    // Verificar que la columna existe
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'conversations'
      AND column_name = 'metadata'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verificación exitosa:');
      console.log(result.rows[0]);
    } else {
      console.log('⚠️ No se pudo verificar la columna');
    }

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

