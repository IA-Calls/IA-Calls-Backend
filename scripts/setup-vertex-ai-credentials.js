/**
 * Script para generar el archivo de credenciales de Google Cloud
 * desde las variables de entorno
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function generateCredentialsFile() {
  try {
    console.log('🔐 Generando archivo de credenciales de Google Cloud...');

    // Verificar que las variables necesarias existen
    const requiredVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_CLOUD_PRIVATE_KEY_ID',
      'GOOGLE_CLOUD_PRIVATE_KEY',
      'GOOGLE_CLOUD_CLIENT_EMAIL',
      'GOOGLE_CLOUD_CLIENT_ID'
    ];

    const missing = requiredVars.filter(v => !process.env[v]);
    
    if (missing.length > 0) {
      console.error('❌ Faltan variables de entorno:', missing.join(', '));
      process.exit(1);
    }

    // Construir objeto de credenciales
    // Manejar private_key que puede venir con \n como texto literal
    let privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY || '';
    
    // Si la private_key tiene \n como texto literal, convertirlos a saltos de línea reales
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // Remover comillas dobles al inicio y final si existen
    privateKey = privateKey.replace(/^["']|["']$/g, '');

    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
      private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
      auth_uri: process.env.GOOGLE_CLOUD_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.GOOGLE_CLOUD_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.GOOGLE_CLOUD_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL,
      universe_domain: process.env.GOOGLE_CLOUD_UNIVERSE_DOMAIN || 'googleapis.com'
    };
    
    // Validar que la private_key tiene el formato correcto
    if (!credentials.private_key.includes('BEGIN PRIVATE KEY')) {
      console.warn('⚠️ Advertencia: La private_key no parece tener el formato correcto');
      console.log('Primeros caracteres:', credentials.private_key.substring(0, 50));
    }

    // Guardar archivo
    const credentialsPath = path.join(__dirname, '..', 'vertex-ai-key.json');
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));

    console.log('✅ Archivo de credenciales creado exitosamente');
    console.log('📁 Ubicación:', credentialsPath);
    console.log('📋 Proyecto:', credentials.project_id);
    console.log('📧 Service Account:', credentials.client_email);

    // Agregar al .gitignore si no está
    const gitignorePath = path.join(__dirname, '..', '.gitignore');
    let gitignoreContent = '';
    
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    if (!gitignoreContent.includes('vertex-ai-key.json')) {
      fs.appendFileSync(gitignorePath, '\n# Google Cloud Credentials\nvertex-ai-key.json\n');
      console.log('✅ Agregado vertex-ai-key.json al .gitignore');
    }

    console.log('\n📋 Siguiente paso: Habilitar APIs de Google Cloud');
    console.log('Ejecuta: npm run setup:vertex-ai-apis');

  } catch (error) {
    console.error('❌ Error generando credenciales:', error.message);
    process.exit(1);
  }
}

generateCredentialsFile();

