const app = require('./src/app');
const dotenv = require('dotenv');
const { connectDB } = require('./src/config/database');
const { connectMongoDB } = require('./src/config/mongodb');

// Cargar variables de entorno
dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Conectar a PostgreSQL
    const dbConnected = await connectDB();
    
    if (!dbConnected) {
      console.error('❌ No se pudo conectar a PostgreSQL');
      process.exit(1);
    }

    // Conectar a MongoDB
    const mongoConnected = await connectMongoDB();
    
    if (!mongoConnected) {
      console.error('❌ No se pudo conectar a MongoDB');
      console.warn('⚠️ El servidor continuará sin MongoDB. Algunas funcionalidades pueden no estar disponibles.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📊 Bases de datos:`);
      console.log(`   ✅ PostgreSQL: Conectado`);
      console.log(`   ${mongoConnected ? '✅' : '⚠️'} MongoDB: ${mongoConnected ? 'Conectado' : 'No conectado'}`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

startServer();

process.on('unhandledRejection', (err) => {
  console.error('Error no manejado:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
  process.exit(1);
});
