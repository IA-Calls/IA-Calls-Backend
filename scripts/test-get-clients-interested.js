require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function testGetClientsInterested() {
  try {
    console.log('🧪 Probando endpoint GET /api/clients/interested\n');
    
    // Probar sin parámetros
    console.log('📤 Test 1: GET sin parámetros');
    const response1 = await axios.get(`${BASE_URL}/api/clients/interested`);
    console.log(`✅ Status: ${response1.status}`);
    console.log(`📊 Total: ${response1.data.pagination?.total || 0}`);
    console.log(`📋 Clientes: ${response1.data.data?.length || 0}`);
    console.log('');

    // Probar con paginación
    console.log('📤 Test 2: GET con paginación (page=1, limit=5)');
    const response2 = await axios.get(`${BASE_URL}/api/clients/interested?page=1&limit=5`);
    console.log(`✅ Status: ${response2.status}`);
    console.log(`📊 Paginación:`, JSON.stringify(response2.data.pagination, null, 2));
    console.log(`📋 Primeros clientes:`);
    if (response2.data.data && response2.data.data.length > 0) {
      response2.data.data.slice(0, 3).forEach((client, idx) => {
        console.log(`   ${idx + 1}. ${client.name} - ${client.phoneNumber} (ID: ${client.id})`);
      });
    }
    console.log('');

    // Probar con búsqueda
    console.log('📤 Test 3: GET con búsqueda (search=Juan)');
    const response3 = await axios.get(`${BASE_URL}/api/clients/interested?search=Juan`);
    console.log(`✅ Status: ${response3.status}`);
    console.log(`📋 Resultados encontrados: ${response3.data.data?.length || 0}`);
    if (response3.data.data && response3.data.data.length > 0) {
      response3.data.data.forEach((client, idx) => {
        console.log(`   ${idx + 1}. ${client.name} - ${client.phoneNumber}`);
      });
    }
    console.log('');

    // Probar obtener por ID (si hay datos)
    if (response1.data.data && response1.data.data.length > 0) {
      const firstId = response1.data.data[0].id;
      console.log(`📤 Test 4: GET por ID (${firstId})`);
      const response4 = await axios.get(`${BASE_URL}/api/clients/interested/${firstId}`);
      console.log(`✅ Status: ${response4.status}`);
      console.log(`📋 Cliente:`, JSON.stringify(response4.data.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error en la prueba:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`   Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Ejecutar prueba
if (require.main === module) {
  testGetClientsInterested();
}

module.exports = { testGetClientsInterested };

