/**
 * Script para verificar a qué base de datos está conectado el backend
 */

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
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }, // Requerido para GCP Cloud SQL
    max: 20,
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
    process.exit(1);
  }
} else {
  // DESARROLLO: Usar DATABASE_LOCAL_URL
  if (!process.env.DATABASE_LOCAL_URL) {
    console.error('❌ ERROR: DATABASE_LOCAL_URL no está configurado para desarrollo');
    console.error('   Configura DATABASE_LOCAL_URL en tu archivo .env');
    process.exit(1);
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

const pool = new Pool(dbConfig);

async function checkConnection() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  VERIFICACIÓN DE CONEXIÓN A BASE DE DATOS                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // Mostrar variables de entorno
    console.log('📋 Variables de entorno:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '***configurado***' : 'undefined'}`);
    console.log(`   DATABASE_LOCAL_URL: ${process.env.DATABASE_LOCAL_URL ? '***configurado***' : 'undefined'}`);
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'undefined'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'undefined'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'undefined'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT || 'undefined'}`);
    console.log('');
    
    // Detección
    console.log('🔍 Detección:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`   isProduction: ${isProduction}`);
    console.log(`   isLocal: ${isLocal}`);
    console.log('');
    
    // Configuración real
    console.log('⚙️  Configuración de conexión:');
    if (dbConfig.connectionString) {
      const url = new URL(dbConfig.connectionString);
      console.log(`   Tipo: Connection String (URL)`);
      console.log(`   Host: ${url.hostname}`);
      console.log(`   Puerto: ${url.port || '5432'}`);
      console.log(`   Base de datos: ${url.pathname.replace('/', '')}`);
      console.log(`   Usuario: ${url.username}`);
    } else {
      console.log(`   Tipo: Configuración individual`);
      console.log(`   Host: ${dbConfig.host || 'N/A'}`);
      console.log(`   Puerto: ${dbConfig.port || 'N/A'}`);
      console.log(`   Base de datos: ${dbConfig.database || 'N/A'}`);
      console.log(`   Usuario: ${dbConfig.user || 'N/A'}`);
    }
    console.log(`   SSL: ${dbConfig.ssl ? 'Habilitado' : 'Deshabilitado'}`);
    console.log('');
    
    // Probar conexión
    console.log('🔌 Probando conexión...');
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        NOW() as server_time,
        version() as version,
        current_database() as database_name,
        current_user as current_user,
        inet_server_addr() as server_address,
        inet_server_port() as server_port
    `);
    
    const row = result.rows[0];
    
    console.log('✅ Conexión exitosa!\n');
    console.log('📊 Información del servidor:');
    console.log(`   ⏰ Tiempo del servidor: ${row.server_time}`);
    console.log(`   🗄️  Versión PostgreSQL: ${row.version.split(' ')[0]} ${row.version.split(' ')[1]}`);
    console.log(`   📍 Base de datos conectada: ${row.database_name}`);
    console.log(`   👤 Usuario conectado: ${row.current_user}`);
    console.log(`   🌐 IP del servidor: ${row.server_address || 'localhost/Unix socket'}`);
    console.log(`   🔌 Puerto del servidor: ${row.server_port || 'N/A'}`);
    console.log('');
    
    // Verificar si es Cloud SQL o local
    const isCloud = row.server_address && (
      row.server_address.includes('cloudsql') || 
      row.server_address.includes('.sql') ||
      row.server_address.includes('google') ||
      !row.server_address.match(/^(127\.0\.0\.1|localhost|::1)$/)
    );
    
    if (isCloud) {
      console.log('☁️  ════════════════════════════════════════════════════════════');
      console.log('☁️   CONECTADO A: GCP CLOUD SQL (NUBE)');
      console.log('☁️  ════════════════════════════════════════════════════════════\n');
    } else {
      console.log('💻 ════════════════════════════════════════════════════════════');
      console.log('💻   CONECTADO A: BASE DE DATOS LOCAL');
      console.log('💻 ════════════════════════════════════════════════════════════\n');
    }
    
    // Verificar tabla groups
    console.log('🔍 Verificando tabla groups...');
    const groupsResult = await client.query(`
      SELECT COUNT(*) as count FROM "public"."groups"
    `);
    const groupsCount = parseInt(groupsResult.rows[0].count);
    console.log(`   Total grupos en la base de datos: ${groupsCount}`);
    
    if (groupsCount > 0) {
      const recentGroups = await client.query(`
        SELECT id, name, created_at 
        FROM "public"."groups" 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      console.log(`   Últimos 5 grupos:`);
      recentGroups.rows.forEach(group => {
        console.log(`      - ID: ${group.id}, Nombre: ${group.name}, Creado: ${group.created_at}`);
      });
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Verificación completada\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

checkConnection();

