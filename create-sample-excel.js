const XLSX = require('xlsx');
const fs = require('fs');

// Datos de ejemplo para el archivo Excel
const sampleData = [
  {
    'Nombre': 'Juan Pérez',
    'Teléfono': '+573001234567',
    'Email': 'juan.perez@example.com',
    'Dirección': 'Calle 123 #45-67, Bogotá',
    'Categoría': 'General',
    'Comentario': 'Cliente potencial'
  },
  {
    'Nombre': 'María García',
    'Teléfono': '+573007654321',
    'Email': 'maria.garcia@example.com',
    'Dirección': 'Avenida 89 #12-34, Medellín',
    'Categoría': 'VIP',
    'Comentario': 'Cliente de alto valor'
  },
  {
    'Nombre': 'Carlos López',
    'Teléfono': '+573001112223',
    'Email': 'carlos.lopez@example.com',
    'Dirección': 'Carrera 56 #78-90, Cali',
    'Categoría': 'General',
    'Comentario': 'Nuevo prospecto'
  },
  {
    'Nombre': 'Ana Rodríguez',
    'Teléfono': '+573004445556',
    'Email': 'ana.rodriguez@example.com',
    'Dirección': 'Calle 78 #90-12, Barranquilla',
    'Categoría': 'VIP',
    'Comentario': 'Cliente frecuente'
  },
  {
    'Nombre': 'Luis Martínez',
    'Teléfono': '+573007778889',
    'Email': 'luis.martinez@example.com',
    'Dirección': 'Avenida 34 #56-78, Bucaramanga',
    'Categoría': 'General',
    'Comentario': 'Interesado en servicios premium'
  }
];

// Crear workbook y worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(sampleData);

// Agregar el worksheet al workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

// Escribir el archivo
const filename = 'clientes_ejemplo.xlsx';
XLSX.writeFile(workbook, filename);

console.log(`✅ Archivo Excel creado: ${filename}`);
console.log('📋 Contenido del archivo:');
console.log(JSON.stringify(sampleData, null, 2));
console.log('\n📝 Instrucciones para probar:');
console.log('1. Usa este archivo para probar el endpoint /clients/extract-excel');
console.log('2. El endpoint espera las columnas: Nombre, Teléfono, Email, Dirección, Categoría, Comentario');
console.log('3. Puedes modificar el archivo Excel para agregar más clientes'); 