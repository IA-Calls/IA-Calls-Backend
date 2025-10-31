const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

// Detectar si estamos en entorno local o producción
const isLocal = process.env.NODE_ENV !== 'production' && !process.env.DB_HOST;

// Configuración para PostgreSQL
let dbConfig;

if (process.env.DATABASE_LOCAL_URL) {
  // Usar URL de conexión directa si está disponible
  dbConfig = {
    connectionString: process.env.DATABASE_LOCAL_URL,
    ssl: false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
} else {
  // Configuración tradicional por variables individuales
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ia-calls',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'moon@1014198153',
    
    // SSL solo en producción (GCP Cloud SQL)
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    
    // Pool de conexiones optimizado
    max: isLocal ? 5 : 10, // Menos conexiones en local
    idleTimeoutMillis: 30000, // 30 segundos
    connectionTimeoutMillis: isLocal ? 5000 : 10000, // Menos timeout en local
    
    // Configuración adicional
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
}

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
    
    console.log(`📊 Conexión a PostgreSQL ${isLocal ? '(LOCAL)' : '(GCP)'} establecida`);
    console.log(`📍 Base de datos: ${dbConfig.database}`);
    console.log(`🌐 Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`🔐 SSL: ${dbConfig.ssl ? 'Habilitado' : 'Deshabilitado'}`);
    console.log(`🏠 Entorno: ${isLocal ? 'Desarrollo Local' : 'Producción'}`);
    
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