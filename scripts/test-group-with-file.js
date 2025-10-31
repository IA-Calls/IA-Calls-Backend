#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testCreateGroupWithFile() {
  console.log('🧪 Probando creación de grupo con archivo...\n');

  try {
    // Primero hacer login para obtener el token
    console.log('1. 🔐 Haciendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@iacalls.com',
      password: 'admin123'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login exitoso, token obtenido');

    // Crear un archivo Excel de prueba
    console.log('\n2. 📄 Creando archivo Excel de prueba...');
    const XLSX = require('xlsx');
    
    const testData = [
      {
        'Nombre': 'Juan Pérez',
        'Teléfono': '573001234567',
        'Email': 'juan@ejemplo.com',
        'Dirección': 'Calle 123 #45-67'
      },
      {
        'Nombre': 'María García',
        'Teléfono': '573007654321',
        'Email': 'maria@ejemplo.com',
        'Dirección': 'Carrera 78 #90-12'
      }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(testData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
    
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const base64Data = excelBuffer.toString('base64');
    
    console.log('✅ Archivo Excel creado con 2 clientes de prueba');

    // Crear grupo con archivo
    console.log('\n3. 📝 Creando grupo con archivo...');
    const groupData = {
      name: 'Grupo con Archivo Local',
      description: 'Grupo creado para probar el almacenamiento local de archivos',
      prompt: 'Eres un asistente de ventas especializado',
      color: '#10B981',
      favorite: false,
      idioma: 'es',
      variables: {},
      clientId: 5,
      prefix: '+57',
      selectedCountryCode: 'CO',
      firstMessage: 'Hola, soy tu asistente de ventas',
      base64: base64Data,
      document_name: 'clientes_prueba.xlsx'
    };

    console.log('📤 Enviando datos del grupo...');
    const createResponse = await axios.post('http://localhost:5000/api/groups', groupData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Grupo creado exitosamente!');
    console.log('📊 Respuesta:', JSON.stringify(createResponse.data, null, 2));

    // Verificar que el archivo se guardó localmente
    if (createResponse.data.data.fileProcessing?.processed) {
      console.log('\n4. 📁 Verificando archivo guardado localmente...');
      const uploadsDir = path.join(process.cwd(), 'uploads', 'local-documents');
      const files = fs.readdirSync(uploadsDir);
      console.log(`📂 Archivos en carpeta local: ${files.length}`);
      files.forEach(file => {
        console.log(`   - ${file}`);
      });
    }

  } catch (error) {
    console.error('❌ Error creando grupo con archivo:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCreateGroupWithFile();

