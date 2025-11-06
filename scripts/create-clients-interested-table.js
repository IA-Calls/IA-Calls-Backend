require('dotenv').config();
const { Pool } = require('pg');

// Configuración para GCP Cloud SQL
const cloudConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }, // Requerido para GCP Cloud SQL
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const cloudPool = new Pool(cloudConfig);

// SQL para crear la tabla clients_interested
const createTableSQL = `
-- Crear tabla de clientes interesados
CREATE TABLE IF NOT EXISTS "public"."clients_interested" (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear índice en el campo data para búsquedas más rápidas
CREATE INDEX IF NOT EXISTS idx_clients_interested_data ON "public"."clients_interested" USING GIN (data);

-- Crear índice en created_at para ordenamiento
CREATE INDEX IF NOT EXISTS idx_clients_interested_created_at ON "public"."clients_interested"(created_at);
`;

async function createTable() {
  try {
    console.log('🌐 Conectando a GCP Cloud SQL...');
    console.log(`📍 Host: ${cloudConfig.host}`);
    console.log(`📍 Database: ${cloudConfig.database}`);
    
    // Verificar conexión
    const testResult = await cloudPool.query('SELECT NOW()');
    console.log('✅ Conexión exitosa a GCP Cloud SQL');
    console.log(`🕐 Hora del servidor: ${testResult.rows[0].now}`);
    
    // Crear la tabla
    console.log('\n📋 Creando tabla clients_interested...');
    await cloudPool.query(createTableSQL);
    
    console.log('✅ Tabla clients_interested creada exitosamente');
    console.log('📊 Índices creados:');
    console.log('   - idx_clients_interested_data (GIN index en JSONB)');
    console.log('   - idx_clients_interested_created_at');
    
    // Verificar que la tabla existe
    const verifyResult = await cloudPool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'clients_interested'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura de la tabla:');
    verifyResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error creando tabla:', error.message);
    console.error('❌ Stack:', error.stack);
    process.exit(1);
  } finally {
    await cloudPool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createTable();
}

module.exports = { createTable };

