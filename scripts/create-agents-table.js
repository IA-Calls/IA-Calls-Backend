/**
 * Script para crear la tabla agents en PostgreSQL
 * Esta tabla almacena la relación entre agentes de ElevenLabs y usuarios
 * Permite multiusuario: cada usuario solo ve sus propios agentes
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

async function createAgentsTable() {
  const client = await pool.connect();
  
  try {
    console.log('📋 Creando tabla agents...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'database', 'create_agents_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el SQL
    await client.query(sql);
    
    console.log('✅ Tabla agents creada exitosamente');
    console.log('');
    console.log('📊 La tabla agents incluye:');
    console.log('   - agent_id: ID del agente en ElevenLabs');
    console.log('   - user_id: ID del usuario propietario');
    console.log('   - name: Nombre del agente');
    console.log('   - metadata: Configuración adicional');
    console.log('');
    console.log('🔒 Características de seguridad:');
    console.log('   - Cada usuario solo puede ver sus propios agentes');
    console.log('   - Validación de ownership en todas las operaciones CRUD');
    console.log('   - Constraint UNIQUE(agent_id, user_id) previene duplicados');
    
  } catch (error) {
    console.error('❌ Error creando tabla agents:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('');
      console.log('⚠️ La tabla agents ya existe. Si quieres recrearla, elimínala primero.');
    }
    
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createAgentsTable();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

