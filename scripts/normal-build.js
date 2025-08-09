const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando build normal...');

// Función para optimizar package.json para producción
function optimizePackageJson() {
  console.log('📦 Optimizando package.json...');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Crear package.json optimizado para producción
  const productionPackage = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    main: packageJson.main,
    scripts: {
      start: packageJson.scripts.start,
      dev: packageJson.scripts.dev
    },
    dependencies: packageJson.dependencies,
    engines: {
      node: '>=14.0.0'
    }
  };
  
  // Crear backup del package.json original
  fs.copyFileSync('package.json', 'package.json.backup');
  console.log('💾 Backup de package.json creado');
  
  // Escribir package.json optimizado
  fs.writeFileSync('package.json', JSON.stringify(productionPackage, null, 2));
  console.log('✅ package.json optimizado para producción');
}

// Función para restaurar package.json original
function restorePackageJson() {
  if (fs.existsSync('package.json.backup')) {
    fs.copyFileSync('package.json.backup', 'package.json');
    fs.unlinkSync('package.json.backup');
    console.log('🔄 package.json original restaurado');
  }
}

// Función para crear archivo de configuración de producción
function createProductionConfig() {
  console.log('⚙️ Creando configuración de producción...');
  
  const configContent = `# Configuración de Producción - IA-Calls Backend
# Generado el: ${new Date().toLocaleString()}

# Variables de entorno para producción
NODE_ENV=production
PORT=3000

# Configuración de base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ia_calls_prod
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Configuración de JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# Configuración de CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Configuración de Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_BUCKET_NAME=your_bucket_name

# Configuración de logs
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Configuración de seguridad
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;
  
  fs.writeFileSync('.env.production', configContent);
  console.log('📄 Archivo .env.production creado');
}

// Función para crear script de inicio optimizado
function createStartScript() {
  console.log('🎯 Creando script de inicio optimizado...');
  
  const startScript = `#!/usr/bin/env node
/**
 * IA-Calls Backend - Script de Inicio Optimizado
 * Generado el: ${new Date().toLocaleString()}
 */

console.log('🚀 IA-Calls Backend iniciando en modo producción...');
console.log('📅 Build generado: ${new Date().toISOString()}');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV || 'production');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.production' });

// Iniciar servidor
require('./server.js');
`;
  
  fs.writeFileSync('start.js', startScript);
  console.log('✅ Script start.js creado');
}

// Función para crear archivo de configuración de PM2
function createPM2Config() {
  console.log('⚡ Creando configuración de PM2...');
  
  const pm2Config = {
    apps: [{
      name: 'ia-calls-backend',
      script: 'start.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    }]
  };
  
  fs.writeFileSync('ecosystem.config.js', `module.exports = ${JSON.stringify(pm2Config, null, 2)};`);
  console.log('✅ Archivo ecosystem.config.js creado');
}

// Función para crear directorio de logs
function createLogsDirectory() {
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs', { recursive: true });
    console.log('📁 Directorio logs creado');
  }
}

// Función para crear archivo de instrucciones de despliegue
function createDeploymentInstructions() {
  console.log('📖 Creando instrucciones de despliegue...');
  
  const instructions = `# 🚀 Instrucciones de Despliegue - IA-Calls Backend

## 📋 Preparación del Build

Este proyecto ha sido optimizado para producción con los siguientes archivos:

- \`package.json\` - Optimizado para producción
- \`start.js\` - Script de inicio optimizado
- \`.env.production\` - Variables de entorno para producción
- \`ecosystem.config.js\` - Configuración de PM2
- \`logs/\` - Directorio para logs

## 🚀 Opciones de Despliegue

### Opción 1: Despliegue Simple
\`\`\`bash
# Instalar dependencias de producción
npm install --production

# Iniciar servidor
npm start
\`\`\`

### Opción 2: Con PM2 (Recomendado)
\`\`\`bash
# Instalar PM2 globalmente
npm install -g pm2

# Instalar dependencias
npm install --production

# Iniciar con PM2
pm2 start ecosystem.config.js --env production

# Ver logs
pm2 logs ia-calls-backend

# Monitorear
pm2 monit
\`\`\`

### Opción 3: Con Docker
\`\`\`bash
# Crear Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY . .
RUN npm install --production
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

## ⚙️ Configuración

1. **Editar variables de entorno:**
   - Modificar \`.env.production\` con tus valores reales

2. **Configurar base de datos:**
   - Asegúrate de que la base de datos esté configurada

3. **Configurar Google Cloud Storage:**
   - Actualizar credenciales en \`.env.production\`

## 📊 Monitoreo

- **Logs:** Revisar archivos en \`logs/\`
- **PM2:** \`pm2 monit\` para monitoreo en tiempo real
- **Health Check:** \`GET /api/health\`

## 🔧 Mantenimiento

- **Reiniciar:** \`pm2 restart ia-calls-backend\`
- **Actualizar:** \`pm2 reload ia-calls-backend\`
- **Detener:** \`pm2 stop ia-calls-backend\`

## 📞 Soporte

Para problemas o consultas, revisar:
- Logs de aplicación
- Logs de PM2
- Configuración de variables de entorno

---
Generado el: ${new Date().toLocaleString()}
`;
  
  fs.writeFileSync('DEPLOYMENT.md', instructions);
  console.log('✅ Archivo DEPLOYMENT.md creado');
}

// Función principal
function main() {
  try {
    console.log('🔧 Iniciando optimización para producción...');
    
    // Crear directorio de logs
    createLogsDirectory();
    
    // Crear configuración de producción
    createProductionConfig();
    
    // Crear script de inicio
    createStartScript();
    
    // Crear configuración de PM2
    createPM2Config();
    
    // Crear instrucciones de despliegue
    createDeploymentInstructions();
    
    // Optimizar package.json
    optimizePackageJson();
    
    console.log('🎉 Build normal completado exitosamente!');
    console.log('📁 Archivos creados:');
    console.log('  - .env.production (configuración de producción)');
    console.log('  - start.js (script de inicio optimizado)');
    console.log('  - ecosystem.config.js (configuración PM2)');
    console.log('  - DEPLOYMENT.md (instrucciones de despliegue)');
    console.log('  - logs/ (directorio para logs)');
    console.log('  - package.json (optimizado para producción)');
    console.log('');
    console.log('🚀 Para ejecutar: npm start');
    console.log('⚡ Para PM2: pm2 start ecosystem.config.js --env production');
    
  } catch (error) {
    console.error('❌ Error durante el build:', error.message);
    
    // Restaurar package.json en caso de error
    restorePackageJson();
    
    process.exit(1);
  }
}

// Manejar señales para restaurar package.json
process.on('SIGINT', () => {
  console.log('\n🔄 Restaurando package.json original...');
  restorePackageJson();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Restaurando package.json original...');
  restorePackageJson();
  process.exit(0);
});

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { main, optimizePackageJson, restorePackageJson };
