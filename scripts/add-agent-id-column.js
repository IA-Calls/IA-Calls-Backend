/**
 * Script para agregar la columna agent_id a la tabla groups
 * Ejecutar: node scripts/add-agent-id-column.js
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

async function addAgentIdColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Agregando columna agent_id a la tabla groups...');
    console.log(`📍 Conectando a: ${dbConfig.host || 'via DATABASE_LOCAL_URL'}:${dbConfig.port || 'N/A'}/${dbConfig.database || 'N/A'}`);
    
    // Verificar si la columna ya existe
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'groups' 
      AND column_name = 'agent_id'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ La columna agent_id ya existe en la tabla groups');
      return;
    }
    
    // Agregar la columna
    await client.query(`
      ALTER TABLE "public"."groups" 
      ADD COLUMN agent_id VARCHAR(255)
    `);
    
    console.log('✅ Columna agent_id agregada exitosamente');
    
    // Crear índice
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_groups_agent_id ON "public"."groups"(agent_id)
    `);
    
    console.log('✅ Índice idx_groups_agent_id creado exitosamente');
    
    // Agregar comentario
    try {
      await client.query(`
        COMMENT ON COLUMN "public"."groups"."agent_id" IS 'ID del agente de ElevenLabs asignado al grupo'
      `);
      console.log('✅ Comentario agregado a la columna');
    } catch (commentError) {
      console.log('⚠️ No se pudo agregar el comentario (no crítico):', commentError.message);
    }
    
    console.log('\n🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar migración
addAgentIdColumn().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});


