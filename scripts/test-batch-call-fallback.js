#!/usr/bin/env node

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testBatchCallWithFallback() {
  console.log('🧪 Probando batch call con fallback...\n');

  try {
    // 1. Login para obtener token
    console.log('1. 🔐 Haciendo login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@iacalls.com',
      password: 'admin123'
    });

    const token = loginResponse.data.data.token;
    const userId = loginResponse.data.data.user.id;
    console.log('✅ Login exitoso, token obtenido');

    // 2. Obtener grupos para encontrar uno con clientes
    console.log('\n2. 📋 Obteniendo grupos...');
    const groupsResponse = await axios.get(`${API_BASE_URL}/groups`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const groups = groupsResponse.data.data;
    console.log(`✅ Encontrados ${groups.length} grupos`);

    if (groups.length === 0) {
      console.log('❌ No hay grupos disponibles para probar batch call');
      return;
    }

    // Usar el primer grupo
    const testGroup = groups[0];
    console.log(`📝 Usando grupo: "${testGroup.name}" (ID: ${testGroup.id})`);

    // 3. Obtener clientes pendientes del grupo
    console.log('\n3. 👥 Obteniendo clientes pendientes...');
    const clientsResponse = await axios.get(`${API_BASE_URL}/clients/pending/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const groupsWithClients = clientsResponse.data.data;
    console.log(`✅ Encontrados ${groupsWithClients.length} grupos con clientes`);

    if (groupsWithClients.length === 0) {
      console.log('❌ No hay grupos con clientes pendientes');
      return;
    }

    // Buscar el grupo específico
    const groupWithClients = groupsWithClients.find(g => g.id === testGroup.id);
    if (!groupWithClients || groupWithClients.clients.length === 0) {
      console.log('❌ El grupo no tiene clientes pendientes');
      return;
    }

    console.log(`📞 Grupo "${groupWithClients.name}" tiene ${groupWithClients.clients.length} clientes pendientes`);

    // 4. Iniciar batch call
    console.log('\n4. 📞 Iniciando batch call...');
    const batchCallData = {
      groupId: testGroup.id,
      callName: `Prueba Batch Call - ${new Date().toLocaleDateString()}`,
      userId: userId
    };

    console.log('📤 Datos del batch call:', batchCallData);

    const batchCallResponse = await axios.post(`${API_BASE_URL}/groups/${testGroup.id}/call`, batchCallData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Batch call iniciado!');
    console.log('📊 Respuesta:', JSON.stringify(batchCallResponse.data, null, 2));

    // 5. Verificar el estado del batch call
    if (batchCallResponse.data.success && batchCallResponse.data.data.batchId) {
      console.log('\n5. 🔍 Verificando estado del batch call...');
      
      // Esperar un poco antes de verificar el estado
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(`${API_BASE_URL}/groups/${testGroup.id}/batch-status/${batchCallResponse.data.data.batchId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('📊 Estado del batch call:', JSON.stringify(statusResponse.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error en la prueba:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testBatchCallWithFallback();

