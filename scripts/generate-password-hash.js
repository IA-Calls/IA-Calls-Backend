#!/usr/bin/env node

const bcrypt = require('bcryptjs');

async function generatePasswordHash() {
  const password = 'admin123';
  const saltRounds = 12;
  
  console.log('🔐 Generando hash para contraseña:', password);
  
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  console.log('✅ Hash generado:');
  console.log(hashedPassword);
  
  // Verificar que el hash funciona
  const isValid = await bcrypt.compare(password, hashedPassword);
  console.log('✅ Verificación:', isValid ? 'CORRECTO' : 'INCORRECTO');
  
  return hashedPassword;
}

generatePasswordHash();

