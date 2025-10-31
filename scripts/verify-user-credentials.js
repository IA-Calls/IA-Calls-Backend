#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { query } = require('../src/config/database');

async function verifyUserCredentials() {
  console.log('🔍 Verificando credenciales del usuario...\n');

  try {
    // Buscar usuario por email
    const result = await query('SELECT * FROM "public"."users" WHERE email = $1', ['admin@iacalls.com']);
    
    if (result.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    const user = result.rows[0];
    console.log('👤 Usuario encontrado:');
    console.log('   ID:', user.id);
    console.log('   Username:', user.username);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Is Active:', user.is_active);
    console.log('   Password Hash:', user.password);

    // Verificar contraseña
    const passwordToCheck = 'admin123';
    console.log('\n🔐 Verificando contraseña:', passwordToCheck);
    
    const isValid = await bcrypt.compare(passwordToCheck, user.password);
    console.log('✅ Contraseña válida:', isValid);

    if (!isValid) {
      console.log('\n🔧 Generando nuevo hash para admin123...');
      const newHash = await bcrypt.hash(passwordToCheck, 12);
      console.log('Nuevo hash:', newHash);
      
      // Actualizar en la base de datos
      await query('UPDATE "public"."users" SET password = $1 WHERE email = $2', [newHash, 'admin@iacalls.com']);
      console.log('✅ Contraseña actualizada en la base de datos');
      
      // Verificar nuevamente
      const isValidAfterUpdate = await bcrypt.compare(passwordToCheck, newHash);
      console.log('✅ Verificación después de actualizar:', isValidAfterUpdate);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyUserCredentials();

