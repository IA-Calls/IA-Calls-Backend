#!/usr/bin/env node

const axios = require('axios');

async function testWhatsAppSend() {
  console.log('🧪 Probando envío de mensaje WhatsApp con logs detallados...\n');

  try {
    const messageData = {
      phoneNumber: '573138539155',
      clientName: 'Test User',
      conversationSummary: 'Prueba de logs detallados para verificar el payload enviado a Vonage'
    };

    console.log('📤 Enviando mensaje con datos:', JSON.stringify(messageData, null, 2));

    const response = await axios.post('http://localhost:5000/api/whatsapp/send', messageData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Respuesta recibida:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testWhatsAppSend();

