#!/usr/bin/env node

const axios = require('axios');

async function testPendingClients() {
  console.log('🧪 Probando GET /api/clients/pending/5...\n');

  try {
    const response = await axios.get('http://localhost:5000/api/clients/pending/5');
    
    console.log('✅ Respuesta exitosa!');
    console.log('📊 Datos:', JSON.stringify(response.data, null, 2));

    const data = response.data;
    console.log('\n📋 Resumen:');
    console.log(`   - Total grupos: ${data.totalGroups}`);
    console.log(`   - Total clientes: ${data.totalClients}`);
    console.log(`   - Client ID: ${data.clientId}`);
    console.log(`   - Fuente: ${data.source}`);
    
    if (data.data && data.data.length > 0) {
      console.log('\n📝 Grupos encontrados:');
      data.data.forEach((group, index) => {
        console.log(`   ${index + 1}. ${group.name} (ID: ${group.id})`);
        console.log(`      - Descripción: ${group.description}`);
        console.log(`      - Clientes: ${group.clientCount}`);
      });
    } else {
      console.log('\n⚠️ No se encontraron grupos');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testPendingClients();

