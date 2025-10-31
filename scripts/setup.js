#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Configurando IA Calls Backend para desarrollo local...\n');

// Verificar si PostgreSQL está instalado
function checkPostgreSQL() {
  try {
    execSync('psql --version', { stdio: 'pipe' });
    console.log('✅ PostgreSQL detectado');
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL no está instalado o no está en el PATH');
    console.log('📥 Instala PostgreSQL desde: https://www.postgresql.org/download/');
    return false;
  }
}

// Crear base de datos local
function createDatabase() {
  try {
    console.log('📊 Creando base de datos local...');
    
    // Configurar variable de entorno para la contraseña
    const password = 'moon@1014198153';
    process.env.PGPASSWORD = password;
    
    // Intentar crear la base de datos
    try {
      execSync(`createdb -U postgres -h localhost ia-calls`, { stdio: 'pipe' });
      console.log('✅ Base de datos "ia-calls" creada');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Base de datos "ia-calls" ya existe');
      } else {
        throw error;
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error creando base de datos:', error.message);
    console.log('💡 Asegúrate de que:');
    console.log('   - PostgreSQL esté ejecutándose');
    console.log('   - El usuario "postgres" tenga permisos');
    console.log('   - La contraseña sea correcta');
    return false;
  }
}

// Ejecutar migración
function runMigration() {
  try {
    console.log('🔄 Ejecutando migración de base de datos...');
    execSync('node scripts/migrate.js', { stdio: 'inherit' });
    console.log('✅ Migración completada');
    return true;
  } catch (error) {
    console.log('❌ Error en migración:', error.message);
    return false;
  }
}

// Crear archivo .env si no existe
function createEnvFile() {
  const envPath = '.env';
  
  if (fs.existsSync(envPath)) {
    console.log('ℹ️ Archivo .env ya existe');
    return true;
  }
  
  const envContent = `# Configuración de Base de Datos Local
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ia_calls_local
DB_USER=postgres
DB_PASSWORD=moon@1014198153

# Entorno
NODE_ENV=development

# JWT Secret (cambia esto en producción)
JWT_SECRET=mi-jwt-secret-super-seguro-para-desarrollo

# Puerto del servidor
PORT=3000
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Archivo .env creado con configuración local');
    return true;
  } catch (error) {
    console.log('❌ Error creando archivo .env:', error.message);
    return false;
  }
}

// Función principal
async function setup() {
  console.log('🔍 Verificando requisitos...\n');
  
  // Verificar PostgreSQL
  if (!checkPostgreSQL()) {
    console.log('\n❌ Setup cancelado. Instala PostgreSQL primero.');
    process.exit(1);
  }
  
  // Crear archivo .env
  if (!createEnvFile()) {
    console.log('\n❌ Setup cancelado. No se pudo crear .env');
    process.exit(1);
  }
  
  // Crear base de datos
  if (!createDatabase()) {
    console.log('\n❌ Setup cancelado. No se pudo crear la base de datos');
    process.exit(1);
  }
  
  // Ejecutar migración
  if (!runMigration()) {
    console.log('\n❌ Setup cancelado. Error en migración');
    process.exit(1);
  }
  
  console.log('\n🎉 ¡Setup completado exitosamente!');
  console.log('\n📋 Próximos pasos:');
  console.log('   1. Instala dependencias: npm install');
  console.log('   2. Inicia el servidor: npm run dev');
  console.log('   3. Accede a: http://localhost:3000');
  console.log('\n🔑 Usuarios por defecto:');
  console.log('   - admin@ia-calls.com (password: admin123)');
  console.log('   - test@ia-calls.com (password: admin123)');
}

// Ejecutar setup
setup().catch(error => {
  console.error('❌ Error durante el setup:', error.message);
  process.exit(1);
});
