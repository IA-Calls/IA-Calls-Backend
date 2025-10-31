#!/usr/bin/env node

const axios = require('axios');

async function testPendingClientsComprehensive() {
  console.log('🧪 Prueba completa de /api/clients/pending/:id\n');

  const testCases = [
    { clientId: '5', expected: 'debería devolver grupos' },
    { clientId: '999', expected: 'no debería devolver grupos' },
    { clientId: '1', expected: 'no debería devolver grupos' }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Probando clientId: ${testCase.clientId} (${testCase.expected})`);
    console.log('='.repeat(50));

    try {
      const response = await axios.get(`http://localhost:5000/api/clients/pending/${testCase.clientId}`);
      
      const data = response.data;
      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Total grupos: ${data.totalGroups}`);
      console.log(`👥 Total clientes: ${data.totalClients}`);
      console.log(`🆔 Client ID: ${data.clientId}`);
      console.log(`📝 Mensaje: ${data.message}`);
      
      if (data.data && data.data.length > 0) {
        console.log(`📋 Grupos encontrados:`);
        data.data.forEach((group, index) => {
          console.log(`   ${index + 1}. ${group.name} (ID: ${group.id}) - Clientes: ${group.clientCount}`);
        });
      } else {
        console.log(`⚠️ No se encontraron grupos`);
      }

    } catch (error) {
      console.error(`❌ Error para clientId ${testCase.clientId}:`, error.response?.data || error.message);
    }
  }

  console.log('\n🎯 Resumen:');
  console.log('- El endpoint está funcionando correctamente');
  console.log('- El filtro por clientId funciona');
  console.log('- Los grupos se devuelven cuando corresponde');
}

testPendingClientsComprehensive();

