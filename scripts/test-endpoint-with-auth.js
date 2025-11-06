/**
 * Script para probar el endpoint con autenticación
 * Primero hace login, luego usa el token para acceder al endpoint
 */

const http = require('http');
const querystring = require('querystring');

const clientId = process.argv[2] || '5';

// Función para hacer login y obtener token
function login() {
  return new Promise((resolve, reject) => {
    const loginData = querystring.stringify({
      email: 'admin@iacalls.com',
      password: 'admin123'
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success && json.data && json.data.token) {
            resolve(json.data.token);
          } else {
            reject(new Error('No se pudo obtener token: ' + JSON.stringify(json)));
          }
        } catch (error) {
          reject(new Error('Error parseando respuesta de login: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
}

// Función para probar endpoint con token
function testEndpoint(token, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    };

    console.log(`\n🔍 Probando: GET ${path}\n`);

    const req = http.request(options, (res) => {
      console.log(`📊 Status Code: ${res.statusCode}`);
      
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ path, statusCode: res.statusCode, data: json });
        } catch (error) {
          resolve({ path, statusCode: res.statusCode, data: data.toString() });
        }
      });
    });

    req.on('error', (error) => {
      reject({ path, error: error.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject({ path, error: 'Timeout' });
    });

    req.end();
  });
}

async function test() {
  try {
    console.log('🔐 Obteniendo token de autenticación...');
    const token = await login();
    console.log('✅ Token obtenido:', token.substring(0, 50) + '...\n');

    // Probar ambas rutas
    const paths = [
      `/api/clients/pending/${clientId}`,
      `/clients/pending/${clientId}`
    ];

    for (const path of paths) {
      try {
        const result = await testEndpoint(token, path);
        console.log(`\n✅ ${path}:`);
        console.log(`   Status: ${result.statusCode}`);
        
        if (typeof result.data === 'object' && result.data.success !== undefined) {
          console.log(`   Success: ${result.data.success}`);
          console.log(`   Total Groups: ${result.data.totalGroups || 0}`);
          console.log(`   Total Clients: ${result.data.totalClients || 0}`);
          console.log(`   Total All Clients: ${result.data.totalAllClients || 0}`);
          
          if (result.data.data && result.data.data.length > 0) {
            console.log(`\n   📋 Grupos encontrados (${result.data.data.length}):`);
            result.data.data.forEach((group, index) => {
              console.log(`      ${index + 1}. "${group.name}" (ID: ${group.id})`);
              console.log(`         - Clientes pendientes: ${group.clientCount || 0}`);
              console.log(`         - Total clientes: ${group.totalClientCount || 0}`);
              if (group.clients && group.clients.length > 0) {
                console.log(`         - Primeros clientes: ${group.clients.slice(0, 3).map(c => c.name || c.id).join(', ')}`);
              }
            });
          } else {
            console.log(`\n   ⚠️  No se encontraron grupos en la respuesta`);
          }
          
          console.log(`\n   📄 Respuesta completa:`);
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.log(`   📄 Respuesta: ${result.data.substring(0, 500)}...`);
        }
      } catch (error) {
        console.log(`\n❌ ${path}:`);
        console.log(`   Error: ${error.error || error.message}`);
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.error) {
      console.error('   Detalles:', error.error);
    }
  }
}

test();

