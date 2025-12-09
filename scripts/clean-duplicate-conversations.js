#!/usr/bin/env node

/**
 * Script para limpiar conversaciones duplicadas en PostgreSQL
 * Mantiene solo el registro más reciente por user_phone
 */

require('dotenv').config();
const { query } = require('../src/config/database');

async function cleanDuplicates() {
  try {
    console.log('🔍 Buscando conversaciones duplicadas...');

    // Encontrar duplicados
    const duplicatesResult = await query(`
      SELECT user_phone, COUNT(*) as count
      FROM conversations
      GROUP BY user_phone
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    if (duplicatesResult.rows.length === 0) {
      console.log('✅ No se encontraron conversaciones duplicadas');
      return;
    }

    console.log(`📊 Se encontraron ${duplicatesResult.rows.length} números con duplicados:`);
    duplicatesResult.rows.forEach(row => {
      console.log(`   - ${row.user_phone}: ${row.count} registros`);
    });

    // Para cada número duplicado, mantener solo el más reciente
    let totalDeleted = 0;
    
    for (const row of duplicatesResult.rows) {
      const phoneNumber = row.user_phone;
      
      // Obtener todos los registros para este número
      const allRecords = await query(
        'SELECT id, updated_at FROM conversations WHERE user_phone = $1 ORDER BY updated_at DESC',
        [phoneNumber]
      );

      if (allRecords.rows.length > 1) {
        // Mantener el primero (más reciente) y eliminar los demás
        const toKeep = allRecords.rows[0].id;
        const toDelete = allRecords.rows.slice(1).map(r => r.id);

        for (const idToDelete of toDelete) {
          await query('DELETE FROM conversations WHERE id = $1', [idToDelete]);
          totalDeleted++;
        }

        console.log(`✅ Limpiado ${phoneNumber}: mantenido 1 registro, eliminados ${toDelete.length}`);
      }
    }

    console.log(`\n✅ Limpieza completada: ${totalDeleted} registros duplicados eliminados`);

  } catch (error) {
    console.error('❌ Error limpiando duplicados:', error.message);
    process.exit(1);
  }
}

// Ejecutar
cleanDuplicates()
  .then(() => {
    console.log('\n🎉 Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

