const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

// Detectar si estamos en entorno local o producción
const isProduction = process.env.NODE_ENV === 'production';

// Configuración para PostgreSQL
let dbConfig;

if (isProduction) {
  // ⚠️ PRODUCCIÓN: Usar variables individuales de Cloud SQL (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT)
  console.log('🌐 Modo PRODUCCIÓN: Conectando a servicios en la nube (GCP Cloud SQL)...');
  
  dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }, // Requerido para GCP Cloud SQL
    max: 20, // Pool más grande en producción
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
  
  // Validar que todas las variables estén configuradas
  if (!dbConfig.host || !dbConfig.database || !dbConfig.user || !dbConfig.password) {
    console.error('❌ ERROR: Faltan variables de entorno para producción:');
    console.error('   - DB_HOST');
    console.error('   - DB_NAME');
    console.error('   - DB_USER');
    console.error('   - DB_PASSWORD');
    console.error('\n💡 Si estás en desarrollo local, quita NODE_ENV=production o usa NODE_ENV=development');
    throw new Error('Configuración incompleta para producción');
  }
} else {
  // DESARROLLO: Usar DATABASE_LOCAL_URL
  if (!process.env.DATABASE_LOCAL_URL) {
    console.error('❌ ERROR: DATABASE_LOCAL_URL no está configurado para desarrollo');
    console.error('   Configura DATABASE_LOCAL_URL en tu archivo .env');
    throw new Error('DATABASE_LOCAL_URL no configurado');
  }
  
  console.log('💻 Modo DESARROLLO: Conectando a base de datos local...');
  dbConfig = {
    connectionString: process.env.DATABASE_LOCAL_URL,
    ssl: false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
}

const isLocal = !isProduction;

// Crear pool de conexiones
const pool = new Pool(dbConfig);

// Manejo de errores del pool
pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de conexiones:', err);
});

// Función para conectar a la base de datos
const connectDB = async () => {
  try {
    // Probar conexión obteniendo un cliente del pool
    const client = await pool.connect();
    
    console.log(`📊 Conexión a PostgreSQL ${isLocal ? '(LOCAL)' : '(CLOUD/GCP)'} establecida`);
    console.log(`📍 Base de datos: ${dbConfig.database || dbConfig.connectionString?.split('/').pop() || 'N/A'}`);
    console.log(`🌐 Host: ${dbConfig.host || dbConfig.connectionString?.match(/@([^:]+)/)?.[1] || 'N/A'}:${dbConfig.port || 'N/A'}`);
    console.log(`🔐 SSL: ${dbConfig.ssl ? 'Habilitado' : 'Deshabilitado'}`);
    console.log(`🏠 Entorno: ${isProduction ? '🌐 PRODUCCIÓN (GCP Cloud SQL)' : '💻 DESARROLLO (Local)'}`);
    
    // Probar la conexión con una query simple
    const result = await client.query('SELECT NOW() as server_time, version() as version');
    console.log('⏰ Tiempo del servidor:', result.rows[0].server_time);
    console.log('🗄️ Versión PostgreSQL:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    
    // Liberar el cliente de vuelta al pool
    client.release();
    
    return true;
  } catch (error) {
    console.error(`❌ Error conectando a PostgreSQL ${isLocal ? '(LOCAL)' : '(GCP)'}:`, error.message);
    console.error('🔍 Detalles del error:', {
      code: error,
      host: dbConfig.host,
      database: dbConfig.database,
      user: dbConfig.user
    });
    return false;
  }
};

// Función para cerrar el pool de conexiones
const closeDB = async () => {
  try {
    await pool.end();
    console.log('📊 Pool de conexiones PostgreSQL cerrado');
    return true;
  } catch (error) {
    console.error('❌ Error cerrando el pool:', error.message);
    return false;
  }
};

// Función para ejecutar queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('❌ Error en query:', {
      error: error.message,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`
    });
    throw error;
  }
};

// Función para obtener un cliente del pool (para transacciones)
const getClient = async () => {
  try {
    return await pool.connect();
  } catch (error) {
    console.error('❌ Error obteniendo cliente del pool:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  dbConfig,
  connectDB,
  closeDB,
  query,
  getClient
}; 