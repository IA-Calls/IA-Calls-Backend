#!/usr/bin/env node

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api/whatsapp';

class WhatsAppEndpointTester {
  constructor() {
    this.testResults = [];
    this.conversationId = null;
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 ${testName}...`);
    try {
      const result = await testFunction();
      this.testResults.push({ test: testName, status: 'PASS', result });
      console.log(`✅ ${testName}: PASS`);
      return result;
    } catch (error) {
      this.testResults.push({ test: testName, status: 'FAIL', error: error.message });
      console.log(`❌ ${testName}: FAIL - ${error.message}`);
      throw error;
    }
  }

  async testHealthCheck() {
    const response = await axios.get(`${API_BASE_URL}/health`);
    if (!response.data.success) throw new Error('Health check failed');
    return response.data;
  }

  async testDetailedStatus() {
    const response = await axios.get(`${API_BASE_URL}/detailed-status`);
    if (!response.data.success) throw new Error('Detailed status failed');
    
    // Verificar que las credenciales estén configuradas correctamente
    const config = response.data.data.configuration;
    if (!config.hasApiKey || !config.hasApiSecret) {
      throw new Error('API credentials not properly configured');
    }
    
    return response.data;
  }

  async testSendMessage() {
    const messageData = {
      phoneNumber: '573138539155',
      clientName: 'Test User Endpoint',
      conversationSummary: 'Prueba completa del endpoint de WhatsApp. Cliente interesado en servicios de IA para automatizar llamadas telefónicas. Necesita solución para empresa de 50 empleados.'
    };

    console.log('📤 Enviando mensaje con datos:', JSON.stringify(messageData, null, 2));

    const response = await axios.post(`${API_BASE_URL}/send`, messageData, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.data.success) {
      throw new Error(`Send message failed: ${response.data.error}`);
    }

    this.conversationId = response.data.data.conversationId;
    console.log('📱 Mensaje enviado exitosamente:', response.data.data);
    
    return response.data;
  }

  async testGetConversations() {
    const response = await axios.get(`${API_BASE_URL}/conversations`);
    if (!response.data.success) throw new Error('Get conversations failed');
    
    const conversations = response.data.data;
    if (conversations.length === 0) {
      throw new Error('No conversations found');
    }

    console.log(`📋 Encontradas ${conversations.length} conversaciones`);
    return response.data;
  }

  async testGetConversationsByPhone() {
    const response = await axios.get(`${API_BASE_URL}/conversations/573138539155`);
    if (!response.data.success) throw new Error('Get conversations by phone failed');
    
    const conversations = response.data.data;
    console.log(`📞 Conversaciones para 573138539155: ${conversations.length}`);
    return response.data;
  }

  async testGetStats() {
    const response = await axios.get(`${API_BASE_URL}/stats`);
    if (!response.data.success) throw new Error('Get stats failed');
    
    const stats = response.data.data;
    console.log('📊 Estadísticas:', {
      total: stats.total,
      sent: stats.sent,
      failed: stats.failed,
      pending: stats.pending,
      successRate: `${stats.successRate}%`
    });
    
    return response.data;
  }

  async testGetStatus() {
    const response = await axios.get(`${API_BASE_URL}/status`);
    // Este puede fallar en sandbox, así que no lo marcamos como error crítico
    console.log('📡 Estado de Vonage API:', response.data);
    return response.data;
  }

  async runAllTests() {
    console.log('🚀 Iniciando tests completos del endpoint WhatsApp...\n');

    try {
      // Test 1: Health Check
      await this.runTest('Health Check', () => this.testHealthCheck());

      // Test 2: Detailed Status
      await this.runTest('Detailed Status', () => this.testDetailedStatus());

      // Test 3: Send Message
      await this.runTest('Send Message', () => this.testSendMessage());

      // Test 4: Get Conversations
      await this.runTest('Get All Conversations', () => this.testGetConversations());

      // Test 5: Get Conversations by Phone
      await this.runTest('Get Conversations by Phone', () => this.testGetConversationsByPhone());

      // Test 6: Get Stats
      await this.runTest('Get Statistics', () => this.testGetStats());

      // Test 7: Get Status (no crítico)
      try {
        await this.runTest('Get Vonage Status', () => this.testGetStatus());
      } catch (error) {
        console.log('⚠️ Vonage Status: WARNING (normal en sandbox)');
      }

      // Resumen final
      this.printSummary();

    } catch (error) {
      console.error('\n❌ Error crítico durante los tests:', error.message);
      this.printSummary();
      process.exit(1);
    }
  }

  printSummary() {
    console.log('\n📊 RESUMEN DE TESTS:');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.status}`);
    });
    
    console.log('='.repeat(50));
    console.log(`📈 Total: ${this.testResults.length} tests`);
    console.log(`✅ Pasaron: ${passed}`);
    console.log(`❌ Fallaron: ${failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 ¡TODOS LOS TESTS PASARON! El endpoint está funcionando correctamente.');
    } else {
      console.log('\n⚠️ Algunos tests fallaron. Revisa los errores arriba.');
    }

    if (this.conversationId) {
      console.log(`\n💬 Conversación creada con ID: ${this.conversationId}`);
    }
  }
}

// Ejecutar tests
const tester = new WhatsAppEndpointTester();
tester.runAllTests().catch(error => {
  console.error('❌ Error ejecutando tests:', error.message);
  process.exit(1);
});

