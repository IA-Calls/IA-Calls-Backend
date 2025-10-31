#!/usr/bin/env node

const axios = require('axios');

async function getPhoneNumbers() {
  console.log('📞 Obteniendo números de teléfono de ElevenLabs...\n');

  try {
    const response = await axios.get('https://api.elevenlabs.io/v1/convai/phone-numbers', {
      headers: {
        'xi-api-key': 'sk_a2cf36ee584aecca3930bfc2c4cb66f03e4d3979bbef359a',
        'Content-Type': 'application/json',
        'User-Agent': 'IA-Calls-Backend/1.0.0'
      }
    });

    console.log('✅ Números obtenidos exitosamente!');
    console.log('📊 Total:', response.data.length);
    console.log('\n📋 Números disponibles:\n');
    
    response.data.forEach((phone, index) => {
      console.log(`${index + 1}. ID: ${phone.phone_number_id || phone.id}`);
      console.log(`   Número: ${phone.phone_number || 'N/A'}`);
      console.log(`   Región: ${phone.region || 'N/A'}`);
      console.log(`   País: ${phone.country || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error obteniendo números:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    console.error('Detalles:', JSON.stringify(error.response?.data, null, 2));
  }
}

getPhoneNumbers();

