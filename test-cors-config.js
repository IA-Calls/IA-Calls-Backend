#!/usr/bin/env node

/**
 * 🧪 Script de Prueba para Configuración CORS
 * 
 * Este script verifica que la configuración CORS esté funcionando correctamente
 * y que las URLs permitidas estén configuradas.
 */

const cors = require('cors');

console.log('🧪 Probando configuración CORS...\n');

// Simular la configuración CORS del servidor
const corsOptions = {
  origin: function (origin, callback) {
    // Lista de orígenes permitidos desde variables de entorno
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'https://ia-calls.vercel.app',
      // Agregar más URLs aquí si es necesario
      ...(process.env.ADDITIONAL_CORS_ORIGINS ? process.env.ADDITIONAL_CORS_ORIGINS.split(',') : [])
    ];
    
    console.log('📋 Orígenes permitidos configurados:');
    allowedOrigins.forEach((origin, index) => {
      console.log(`   ${index + 1}. ${origin}`);
    });
    console.log('');
    
    // Permitir requests sin origin (como aplicaciones móviles o Postman)
    if (!origin) {
      console.log('✅ Origin vacío (permitido para apps móviles/Postman)');
      return callback(null, true);
    }
    
    // Verificar si el origin está en la lista de permitidos
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ Origin permitido: ${origin}`);
      return callback(null, true);
    }
    
    // Log para debugging
    console.log(`🚫 CORS bloqueado para origin: ${origin}`);
    console.log(`✅ Orígenes permitidos: ${allowedOrigins.join(', ')}`);
    return callback(new Error('No permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

// Probar diferentes orígenes
const testOrigins = [
  'http://localhost:3000',
  'https://ia-calls.vercel.app',
  'https://dominio-no-permitido.com',
  'https://staging.ia-calls.com',
  null, // Para simular requests sin origin
  'https://admin.ia-calls.com'
];

console.log('🧪 Probando diferentes orígenes...\n');

testOrigins.forEach((origin, index) => {
  console.log(`🔍 Prueba ${index + 1}: ${origin || 'Sin origin'}`);
  
  try {
    corsOptions.origin(origin, (error, allowed) => {
      if (error) {
        console.log(`   ❌ Bloqueado: ${error.message}`);
      } else {
        console.log(`   ✅ Permitido`);
      }
    });
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`);
  }
  
  console.log('');
});

// Probar configuración con variables de entorno
console.log('🔧 Probando configuración con variables de entorno...\n');

// Simular variables de entorno
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADDITIONAL_CORS_ORIGINS = 'https://staging.ia-calls.com,https://admin.ia-calls.com';

const corsOptionsWithEnv = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'https://ia-calls.vercel.app',
      ...(process.env.ADDITIONAL_CORS_ORIGINS ? process.env.ADDITIONAL_CORS_ORIGINS.split(',') : [])
    ];
    
    console.log('📋 Orígenes permitidos con variables de entorno:');
    allowedOrigins.forEach((origin, index) => {
      console.log(`   ${index + 1}. ${origin}`);
    });
    console.log('');
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('No permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

// Probar con variables de entorno
console.log('🧪 Probando con variables de entorno...\n');

const testOriginsWithEnv = [
  'http://localhost:3000',
  'https://ia-calls.vercel.app',
  'https://staging.ia-calls.com',
  'https://admin.ia-calls.com',
  'https://dominio-no-permitido.com'
];

testOriginsWithEnv.forEach((origin, index) => {
  console.log(`🔍 Prueba ${index + 1}: ${origin}`);
  
  try {
    corsOptionsWithEnv.origin(origin, (error, allowed) => {
      if (error) {
        console.log(`   ❌ Bloqueado: ${error.message}`);
      } else {
        console.log(`   ✅ Permitido`);
      }
    });
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`);
  }
  
  console.log('');
});

console.log('🎉 Pruebas de configuración CORS completadas!');
console.log('');
console.log('📝 Resumen de configuración:');
console.log('   ✅ http://localhost:3000 (desarrollo local)');
console.log('   ✅ https://ia-calls.vercel.app (tu app Vercel)');
console.log('   ✅ URLs adicionales desde ADDITIONAL_CORS_ORIGINS');
console.log('   ✅ Requests sin origin (apps móviles/Postman)');
console.log('');
console.log('🚀 Para aplicar los cambios:');
console.log('   1. Reinicia tu servidor');
console.log('   2. Verifica que no hay errores de CORS desde Vercel');
console.log('   3. Revisa los logs del servidor para debugging');
