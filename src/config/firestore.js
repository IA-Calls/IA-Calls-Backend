const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// Variable para rastrear el estado de la conexión
let isConnected = false;
let db = null;

/**
 * Inicializar Firebase Admin con las credenciales de Google Cloud
 */
function initializeFirestore() {
  try {
    // Si ya está inicializado, no hacerlo de nuevo
    if (admin.apps.length > 0) {
      console.log('✅ Firebase Admin ya está inicializado');
      db = admin.firestore();
      isConnected = true;
      return true;
    }

    // Construir las credenciales desde las variables de entorno
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
      private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
      auth_uri: process.env.GOOGLE_CLOUD_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.GOOGLE_CLOUD_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.GOOGLE_CLOUD_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL,
      universe_domain: process.env.GOOGLE_CLOUD_UNIVERSE_DOMAIN || 'googleapis.com'
    };

    // Validar que tengamos las credenciales necesarias
    if (!credentials.project_id || !credentials.private_key || !credentials.client_email) {
      console.error('❌ Credenciales de Google Cloud incompletas para Firestore');
      console.error('   Se requieren: GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_PRIVATE_KEY, GOOGLE_CLOUD_CLIENT_EMAIL');
      return false;
    }

    // Inicializar Firebase Admin con configuración de base de datos
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.project_id,
      databaseURL: `https://${credentials.project_id}.firebaseio.com`
    });

    // Obtener instancia de Firestore
    db = admin.firestore();

    // Configurar settings de Firestore con preferencias de región
    db.settings({
      ignoreUndefinedProperties: true,
      // No especificar host permite que use el default de Google
      timestampsInSnapshots: true
    });

    isConnected = true;
    console.log('✅ Firestore inicializado exitosamente');
    console.log(`📍 Proyecto: ${credentials.project_id}`);
    console.log(`📍 Base de datos: (default)`);
    
    return true;
  } catch (error) {
    isConnected = false;
    console.error('❌ Error inicializando Firestore:', error.message);
    return false;
  }
}

/**
 * Conectar a Firestore
 * @returns {Promise<boolean>} - true si la conexión fue exitosa
 */
const connectFirestore = async () => {
  try {
    if (isConnected && db) {
      console.log('✅ Firestore ya está conectado');
      return true;
    }

    console.log('🔄 Conectando a Firestore...');
    
    const initialized = initializeFirestore();
    
    if (!initialized) {
      return false;
    }

    // Verificar conexión haciendo una operación simple
    try {
      // Intentar crear un documento temporal para verificar la conexión
      const testRef = db.collection('_health_check').doc('test');
      await testRef.set({
        timestamp: new Date(),
        status: 'connected'
      }, { merge: true });
      
      console.log('✅ Firestore conectado exitosamente');
      console.log(`📍 Base de datos: Firestore (${process.env.GOOGLE_CLOUD_PROJECT_ID})`);
      console.log('📝 Test de escritura exitoso');
      
      // Limpiar el documento de test
      try {
        await testRef.delete();
      } catch (deleteError) {
        // No importa si falla la eliminación
      }
      
      return true;
    } catch (testError) {
      console.warn('⚠️ Test de Firestore falló:', testError.message);
      console.warn('⚠️ Firestore puede no estar habilitado en tu proyecto Google Cloud');
      console.warn('⚠️ Para habilitarlo:');
      console.warn('   1. Ve a https://console.cloud.google.com/firestore');
      console.warn('   2. Selecciona tu proyecto:', process.env.GOOGLE_CLOUD_PROJECT_ID);
      console.warn('   3. Haz clic en "Crear base de datos"');
      console.warn('   4. Selecciona modo "Native" o "Datastore"');
      console.warn('   5. Elige una región (ej: us-central1)');
      console.warn('');
      console.warn('💾 Usando almacenamiento en memoria como fallback');
      
      // Marcar como no conectado pero no fallar
      isConnected = false;
      db = null;
      return false;
    }
  } catch (error) {
    isConnected = false;
    console.error('❌ Error conectando a Firestore:', error.message);
    return false;
  }
};

/**
 * Cerrar la conexión a Firestore
 * @returns {Promise<boolean>} - true si se cerró correctamente
 */
const closeFirestore = async () => {
  try {
    if (admin.apps.length > 0) {
      await admin.app().delete();
      console.log('📊 Conexión Firestore cerrada');
      isConnected = false;
      db = null;
      return true;
    }
    return true;
  } catch (error) {
    console.error('❌ Error cerrando la conexión Firestore:', error.message);
    return false;
  }
};

/**
 * Verificar el estado de la conexión
 * @returns {boolean} - true si está conectado
 */
const isFirestoreConnected = () => {
  return isConnected && db !== null;
};

/**
 * Obtener la instancia de Firestore
 * @returns {FirebaseFirestore.Firestore|null} - Instancia de Firestore o null
 */
const getFirestore = () => {
  if (!isConnected || !db) {
    console.warn('⚠️ Firestore no está conectado. Llama a connectFirestore() primero.');
    return null;
  }
  return db;
};

/**
 * Obtener información de la conexión
 * @returns {Object} - Información de la conexión
 */
const getFirestoreInfo = () => {
  return {
    isConnected: isFirestoreConnected(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    hasDb: db !== null
  };
};

// Manejar cierre de la aplicación
process.on('SIGINT', async () => {
  await closeFirestore();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeFirestore();
  process.exit(0);
});

module.exports = {
  admin,
  db: getFirestore,
  getFirestore,
  connectFirestore,
  closeFirestore,
  isFirestoreConnected,
  getFirestoreInfo,
  initializeFirestore
};




