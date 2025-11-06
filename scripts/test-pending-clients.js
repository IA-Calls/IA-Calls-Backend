/**
 * Script para probar el endpoint de clientes pendientes
 */

const http = require('http');

const clientId = process.argv[2] || '5';

// Probar ambas rutas posibles
const paths = [
  `/api/clients/pending/${clientId}`,
  `/clients/pending/${clientId}`
];

async function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Si necesitas autenticación, agrega el token aquí
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
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

    req.setTimeout(5000, () => {
      req.destroy();
      reject({ path, error: 'Timeout' });
    });

    req.end();
  });
}

async function testAll() {
  for (const path of paths) {
    try {
      const result = await testEndpoint(path);
      console.log(`\n✅ ${path}:`);
      console.log(`   Status: ${result.statusCode}`);
      if (typeof result.data === 'object') {
        console.log(`   Success: ${result.data.success}`);
        console.log(`   Total Groups: ${result.data.totalGroups || 0}`);
        console.log(`   Total Clients: ${result.data.totalClients || 0}`);
        if (result.data.data && result.data.data.length > 0) {
          console.log(`   Grupos:`);
          result.data.data.forEach((group, index) => {
            console.log(`      ${index + 1}. ${group.name} (ID: ${group.id}) - ${group.clientCount || 0} pendientes`);
          });
        }
        console.log(`\n   Respuesta completa:`);
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log(`   Respuesta: ${result.data.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`\n❌ ${path}:`);
      console.log(`   Error: ${error.error || error.message}`);
    }
  }
}

testAll();
