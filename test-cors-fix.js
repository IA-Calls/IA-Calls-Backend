#!/usr/bin/env node

/**
 * Test Script para Verificar la Solución de CORS y Error 502
 * Este script prueba la configuración de CORS y ayuda a identificar problemas
 */

const https = require('https');
const http = require('http');

// Configuración
const BACKEND_URL = 'https://gb334706-5000.use2.devtunnels.ms';
const FRONTEND_URL = 'https://ia-calls.vercel.app';

console.log('🚀 Test de CORS y Configuración del Backend');
console.log('=============================================\n');

// Función para hacer requests HTTP/HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Origin': FRONTEND_URL,
        'User-Agent': 'CORS-Test-Script/1.0',
        ...options.headers
      }
    };

    console.log(`📡 Haciendo ${requestOptions.method} request a: ${url}`);
    console.log(`🔗 Origin: ${FRONTEND_URL}`);
    console.log(`📋 Headers:`, requestOptions.headers);

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`📋 Response Headers:`);
        Object.keys(res.headers).forEach(key => {
          if (key.toLowerCase().startsWith('access-control-')) {
            console.log(`   ${key}: ${res.headers[key]}`);
          }
        });
        
        if (res.statusCode >= 400) {
          console.log(`❌ Error Response: ${data}`);
        } else {
          console.log(`✅ Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Request Error: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      console.log(`⏰ Request Timeout`);
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(10000); // 10 segundos timeout
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test 1: OPTIONS request (CORS Preflight)
async function testOptionsRequest() {
  console.log('\n🔍 Test 1: OPTIONS Request (CORS Preflight)');
  console.log('--------------------------------------------');
  
  try {
    const result = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    if (result.statusCode === 200) {
      console.log('✅ OPTIONS request exitoso - CORS preflight funcionando');
    } else {
      console.log(`⚠️ OPTIONS request falló con status: ${result.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ Error en OPTIONS request: ${error.message}`);
  }
}

// Test 2: GET request simple
async function testGetRequest() {
  console.log('\n🔍 Test 2: GET Request Simple');
  console.log('--------------------------------');
  
  try {
    const result = await makeRequest(`${BACKEND_URL}/api/status`);
    
    if (result.statusCode === 200) {
      console.log('✅ GET request exitoso');
    } else {
      console.log(`⚠️ GET request falló con status: ${result.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ Error en GET request: ${error.message}`);
  }
}

// Test 3: POST request con CORS
async function testPostRequest() {
  console.log('\n🔍 Test 3: POST Request con CORS');
  console.log('----------------------------------');
  
  try {
    const result = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    });
    
    if (result.statusCode === 200 || result.statusCode === 400 || result.statusCode === 401) {
      console.log('✅ POST request exitoso (CORS funcionando)');
    } else {
      console.log(`⚠️ POST request falló con status: ${result.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ Error en POST request: ${error.message}`);
  }
}

// Test 4: Verificar headers de CORS
async function testCorsHeaders() {
  console.log('\n🔍 Test 4: Verificación de Headers CORS');
  console.log('----------------------------------------');
  
  try {
    const result = await makeRequest(`${BACKEND_URL}/api/status`);
    
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
      'access-control-allow-credentials'
    ];
    
    const missingHeaders = corsHeaders.filter(header => 
      !Object.keys(result.headers).some(key => key.toLowerCase() === header)
    );
    
    if (missingHeaders.length === 0) {
      console.log('✅ Todos los headers CORS están presentes');
    } else {
      console.log(`⚠️ Headers CORS faltantes: ${missingHeaders.join(', ')}`);
    }
    
    // Verificar si el origin está permitido
    const allowOrigin = result.headers['access-control-allow-origin'];
    if (allowOrigin === FRONTEND_URL || allowOrigin === '*') {
      console.log('✅ Origin permitido correctamente');
    } else {
      console.log(`⚠️ Origin no permitido. Esperado: ${FRONTEND_URL}, Recibido: ${allowOrigin}`);
    }
    
  } catch (error) {
    console.log(`❌ Error verificando headers CORS: ${error.message}`);
  }
}

// Función principal
async function runTests() {
  try {
    await testOptionsRequest();
    await testGetRequest();
    await testPostRequest();
    await testCorsHeaders();
    
    console.log('\n🎯 Resumen de Tests Completados');
    console.log('================================');
    console.log('✅ Si todos los tests pasan, CORS está configurado correctamente');
    console.log('⚠️ Si hay errores 502, el problema está en el proxy/gateway');
    console.log('🔧 Revisa los logs del servidor para más detalles');
    
  } catch (error) {
    console.log(`\n❌ Error ejecutando tests: ${error.message}`);
  }
}

// Ejecutar tests
runTests();
