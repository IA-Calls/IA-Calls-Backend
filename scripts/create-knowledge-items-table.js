/**
 * Script para crear la tabla knowledge_items en PostgreSQL
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

async function createKnowledgeItemsTable() {
  const client = await pool.connect();
  
  try {
    console.log('📋 Creando tabla knowledge_items...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'database', 'create_knowledge_items_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el SQL
    await client.query(sql);
    
    console.log('✅ Tabla knowledge_items creada exitosamente');
    console.log('');
    console.log('📊 La tabla knowledge_items incluye soporte para:');
    console.log('   - Enlaces (URLs) con metadata extraída');
    console.log('   - Documentos (PDF, Word, Excel, Imágenes)');
    console.log('   - Parámetros de uso (triggers, prioridad, contexto)');
    console.log('   - Integración con agentes de WhatsApp');
    console.log('');
    console.log('🔒 Características de seguridad:');
    console.log('   - Cada usuario solo puede ver sus propios elementos');
    console.log('   - Validación de ownership en todas las operaciones');
    console.log('   - Índice GIN para búsqueda rápida por palabras clave');
    
  } catch (error) {
    console.error('❌ Error creando tabla knowledge_items:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('');
      console.log('⚠️ La tabla knowledge_items ya existe. Si quieres recrearla, elimínala primero.');
    }
    
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createKnowledgeItemsTable();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

