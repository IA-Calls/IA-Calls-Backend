const app = require('./src/app');
const dotenv = require('dotenv');
const { connectDB } = require('./src/config/database');
const { connectFirestore } = require('./src/config/firestore');
const { databaseHealthCheck } = require('./src/utils/databaseHealthCheck');

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

    // Verificar y crear tablas si no existen
    console.log('');
    const healthCheck = await databaseHealthCheck();
    
    if (!healthCheck.success) {
      console.error('❌ Error en la verificación de la base de datos');
      console.error('⚠️ El servidor continuará, pero algunas funcionalidades pueden no estar disponibles.');
    }

    // Conectar a Firestore
    const firestoreConnected = await connectFirestore();
    
    if (!firestoreConnected) {
      console.error('❌ No se pudo conectar a Firestore');
      console.warn('⚠️ El servidor continuará sin Firestore. Algunas funcionalidades pueden no estar disponibles.');
    }

    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 Servidor corriendo en puerto', PORT);
      console.log(`📍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📊 Bases de datos:`);
      console.log(`   ✅ PostgreSQL: Conectado`);
      console.log(`   ${firestoreConnected ? '✅' : '⚠️'} Firestore: ${firestoreConnected ? 'Conectado' : 'No conectado'}`);
      console.log('');
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
