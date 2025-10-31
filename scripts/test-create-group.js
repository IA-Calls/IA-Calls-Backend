#!/usr/bin/env node

const axios = require('axios');

async function testCreateGroup() {
  console.log('🧪 Probando creación de grupo...\n');

  try {
    // Primero hacer login para obtener el token
    console.log('1. 🔐 Haciendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@iacalls.com',
      password: 'admin123'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login exitoso, token obtenido');

    // Crear grupo
    console.log('\n2. 📝 Creando grupo...');
    const groupData = {
      name: 'Grupo de Prueba',
      description: 'Grupo creado para probar la funcionalidad',
      prompt: 'Eres un asistente de ventas',
      color: '#3B82F6',
      favorite: false,
      idioma: 'es',
      variables: {},
      clientId: 5, // ID del usuario adminiacalls
      prefix: '+57',
      selectedCountryCode: 'CO',
      firstMessage: 'Hola, este es un mensaje de prueba'
    };

    console.log('📤 Datos del grupo:', JSON.stringify(groupData, null, 2));

    const createResponse = await axios.post('http://localhost:5000/api/groups', groupData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Grupo creado exitosamente!');
    console.log('📊 Respuesta:', JSON.stringify(createResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error creando grupo:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCreateGroup();

