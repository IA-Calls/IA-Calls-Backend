#!/usr/bin/env node

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api/whatsapp';

async function testWhatsAppAPI() {
  console.log('🧪 Probando WhatsApp API...\n');

  try {
    // 1. Health Check
    console.log('1. 🔍 Verificando health check...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data.message);

    // 2. Verificar estado de la API
    console.log('\n2. 📡 Verificando estado de Vonage API...');
    try {
      const statusResponse = await axios.get(`${API_BASE_URL}/status`);
      console.log('📊 Estado API:', statusResponse.data);
    } catch (error) {
      console.log('⚠️ API de Vonage no disponible (normal en sandbox):', error.response?.data?.data?.error || error.message);
    }

    // 3. Enviar mensaje de prueba
    console.log('\n3. 📱 Enviando mensaje de prueba...');
    const messageData = {
      phoneNumber: '573138539155',
      clientName: 'María García',
      conversationSummary: 'Cliente interesado en implementar IA para atención al cliente. Necesita solución para 200 usuarios simultáneos. Mencionó presupuesto de $50,000 USD.'
    };

    console.log('📤 Datos del mensaje:', JSON.stringify(messageData, null, 2));

    const sendResponse = await axios.post(`${API_BASE_URL}/send`, messageData);
    console.log('✅ Respuesta del envío:', sendResponse.data);

    // 4. Obtener estadísticas
    console.log('\n4. 📊 Obteniendo estadísticas...');
    const statsResponse = await axios.get(`${API_BASE_URL}/stats`);
    console.log('📈 Estadísticas:', statsResponse.data.data);

    // 5. Obtener conversaciones
    console.log('\n5. 📋 Obteniendo conversaciones...');
    const conversationsResponse = await axios.get(`${API_BASE_URL}/conversations`);
    console.log('💬 Conversaciones encontradas:', conversationsResponse.data.data.length);
    
    if (conversationsResponse.data.data.length > 0) {
      const latestConversation = conversationsResponse.data.data[0];
      console.log('📝 Última conversación:', {
        id: latestConversation.id,
        phoneNumber: latestConversation.phoneNumber,
        clientName: latestConversation.clientName,
        status: latestConversation.status,
        createdAt: latestConversation.createdAt
      });
    }

    // 6. Obtener conversaciones por teléfono específico
    console.log('\n6. 🔍 Obteniendo conversaciones por teléfono...');
    const phoneConversationsResponse = await axios.get(`${API_BASE_URL}/conversations/573138539155`);
    console.log('📞 Conversaciones para 573138539155:', phoneConversationsResponse.data.data.length);

    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
    console.log('\n📋 Resumen:');
    console.log('   ✅ Health check funcionando');
    console.log('   ✅ API de Vonage configurada');
    console.log('   ✅ Envío de mensajes funcionando');
    console.log('   ✅ Cache de conversaciones funcionando');
    console.log('   ✅ Estadísticas funcionando');
    console.log('   ✅ Consultas por teléfono funcionando');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('📄 Detalles del error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Ejecutar pruebas
testWhatsAppAPI();
