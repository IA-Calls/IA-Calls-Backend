#!/usr/bin/env node

const dotenv = require('dotenv');
dotenv.config();

const { query } = require('../src/config/database');

async function updateGroups() {
  try {
    console.log('🔄 Actualizando grupos con phone_number_id correcto...');
    
    const result = await query('UPDATE groups SET phone_number_id = $1', ['phnum_1401k8gyww19evptjqeqnm8hs3x5']);
    
    console.log(`✅ ${result.rowCount} grupos actualizados`);
    
    // Verificar que se actualizaron correctamente
    const groups = await query('SELECT id, name, phone_number_id FROM groups');
    console.log('\n📋 Grupos actualizados:');
    groups.rows.forEach(group => {
      console.log(`   - ID ${group.id}: "${group.name}" - Phone: ${group.phone_number_id || 'No configurado'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error actualizando grupos:', error);
    process.exit(1);
  }
}

updateGroups();
