const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// URL de conexión a MongoDB
// Prioridad: MONGODB_URI > MONGODB_CLOUD_URI > localhost
const MONGODB_URI = process.env.MONGODB_URI || 
                    process.env.MONGODB_CLOUD_URI || 
                    'mongodb://localhost:27017/nextvoice';

// Opciones de conexión
// NOTA: useNewUrlParser y useUnifiedTopology fueron removidos en Mongoose 9.x
// ya que ahora son el comportamiento por defecto
const mongooseOptions = {
  serverSelectionTimeoutMS: 5000, // Timeout después de 5s en lugar de 30s
  socketTimeoutMS: 45000, // Cerrar sockets después de 45s de inactividad
};

// Variable para rastrear el estado de la conexión
let isConnected = false;

// Manejar eventos de conexión
mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('✅ MongoDB conectado exitosamente');
  console.log(`📍 Base de datos: ${mongoose.connection.name}`);
  console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.error('❌ Error en la conexión de MongoDB:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log('⚠️ MongoDB desconectado');
});

// Manejar cierre de la aplicación
process.on('SIGINT', async () => {
  await closeMongoDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeMongoDB();
  process.exit(0);
});

/**
 * Conectar a MongoDB
 * @returns {Promise<boolean>} - true si la conexión fue exitosa
 */
const connectMongoDB = async () => {
  try {
    // Si ya está conectado, no intentar conectar de nuevo
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB ya está conectado');
      return true;
    }

    console.log('🔄 Conectando a MongoDB...');
    console.log(`🔗 URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`); // Ocultar credenciales si las hay

    await mongoose.connect(MONGODB_URI, mongooseOptions);

    isConnected = true;
    return true;
  } catch (error) {
    isConnected = false;
    console.error('❌ Error conectando a MongoDB:', error.message);
    console.error('🔍 Detalles del error:', {
      name: error.name,
      code: error.code,
      uri: MONGODB_URI.replace(/\/\/.*@/, '//***:***@')
    });
    
    // Si es un error de conexión, dar sugerencias
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n💡 Sugerencias:');
      console.error('   1. Verifica que MongoDB esté corriendo: mongod');
      console.error('   2. Verifica que la URL de conexión sea correcta');
      console.error('   3. Verifica que el puerto 27017 esté disponible');
    }
    
    return false;
  }
};

/**
 * Cerrar la conexión a MongoDB
 * @returns {Promise<boolean>} - true si se cerró correctamente
 */
const closeMongoDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('📊 Conexión MongoDB cerrada');
      isConnected = false;
      return true;
    }
    return true;
  } catch (error) {
    console.error('❌ Error cerrando la conexión MongoDB:', error.message);
    return false;
  }
};

/**
 * Verificar el estado de la conexión
 * @returns {boolean} - true si está conectado
 */
const isMongoDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Obtener información de la conexión
 * @returns {Object} - Información de la conexión
 */
const getMongoDBInfo = () => {
  return {
    isConnected: isMongoDBConnected(),
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    models: Object.keys(mongoose.models)
  };
};

module.exports = {
  mongoose,
  connectMongoDB,
  closeMongoDB,
  isMongoDBConnected,
  getMongoDBInfo,
  MONGODB_URI
};

