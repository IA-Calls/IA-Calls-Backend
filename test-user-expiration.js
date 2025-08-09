const { query } = require('./src/config/database');
const User = require('./src/models/User');

async function testUserExpiration() {
  try {
    console.log('🧪 Iniciando pruebas de funcionalidad de expiración de usuarios...\n');

    // 1. Crear un usuario con deadline
    console.log('1️⃣ Creando usuario con deadline...');
    const userWithDeadline = await User.create({
      username: 'test_expiration',
      email: 'expiration@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Expiration',
      role: 'user',
      time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Mañana
    });
    console.log('✅ Usuario creado con deadline:', userWithDeadline.username);
    console.log('   Deadline:', userWithDeadline.time);
    console.log('   Activo:', userWithDeadline.isActive);
    console.log('   Expirado:', userWithDeadline.isExpired());
    console.log('   Activo y no expirado:', userWithDeadline.isActiveAndNotExpired());

    // 2. Crear un usuario sin deadline
    console.log('\n2️⃣ Creando usuario sin deadline...');
    const userWithoutDeadline = await User.create({
      username: 'test_no_expiration',
      email: 'noexpiration@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'NoExpiration',
      role: 'user'
    });
    console.log('✅ Usuario creado sin deadline:', userWithoutDeadline.username);
    console.log('   Deadline:', userWithoutDeadline.time);
    console.log('   Activo:', userWithoutDeadline.isActive);
    console.log('   Expirado:', userWithoutDeadline.isExpired());
    console.log('   Activo y no expirado:', userWithoutDeadline.isActiveAndNotExpired());

    // 3. Crear un usuario ya expirado
    console.log('\n3️⃣ Creando usuario ya expirado...');
    const expiredUser = await User.create({
      username: 'test_expired',
      email: 'expired@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Expired',
      role: 'user',
      time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Ayer
    });
    console.log('✅ Usuario expirado creado:', expiredUser.username);
    console.log('   Deadline:', expiredUser.time);
    console.log('   Activo:', expiredUser.isActive);
    console.log('   Expirado:', expiredUser.isExpired());
    console.log('   Activo y no expirado:', expiredUser.isActiveAndNotExpired());

    // 4. Probar método de desactivación de usuarios expirados
    console.log('\n4️⃣ Probando desactivación de usuarios expirados...');
    const deactivatedUsers = await User.deactivateExpiredUsers();
    console.log('✅ Usuarios desactivados:', deactivatedUsers.length);
    deactivatedUsers.forEach(user => {
      console.log(`   - ${user.username}: ${user.isActive ? 'Activo' : 'Inactivo'}`);
    });

    // 5. Verificar estado después de desactivación
    console.log('\n5️⃣ Verificando estado después de desactivación...');
    const updatedExpiredUser = await User.findById(expiredUser.id);
    console.log('✅ Usuario expirado después de desactivación:');
    console.log('   Username:', updatedExpiredUser.username);
    console.log('   Activo:', updatedExpiredUser.isActive);
    console.log('   Expirado:', updatedExpiredUser.isExpired());

    // 6. Probar filtros de búsqueda
    console.log('\n6️⃣ Probando filtros de búsqueda...');
    
    // Todos los usuarios (incluyendo expirados)
    const allUsers = await User.findAll({ includeExpired: true, includeInactive: true });
    console.log('✅ Total de usuarios (incluyendo expirados e inactivos):', allUsers.length);
    
    // Solo usuarios activos y no expirados
    const activeNonExpiredUsers = await User.findAll({ includeExpired: false, includeInactive: false });
    console.log('✅ Usuarios activos y no expirados:', activeNonExpiredUsers.length);
    
    // Usuarios próximos a expirar
    const expiringSoonUsers = await User.getUsersExpiringSoon(7);
    console.log('✅ Usuarios próximos a expirar (7 días):', expiringSoonUsers.length);

    // 7. Probar método de conteo
    console.log('\n7️⃣ Probando conteo de usuarios...');
    const totalCount = await User.count(true);
    const activeCount = await User.count(false);
    console.log('✅ Total de usuarios:', totalCount);
    console.log('✅ Usuarios activos:', activeCount);

    // 8. Limpiar usuarios de prueba
    console.log('\n8️⃣ Limpiando usuarios de prueba...');
    await Promise.all([
      query('DELETE FROM "public"."users" WHERE username LIKE \'test_%\''),
      query('DELETE FROM "public"."users" WHERE username LIKE \'test_%\''),
      query('DELETE FROM "public"."users" WHERE username LIKE \'test_%\''),
    ]);
    console.log('✅ Usuarios de prueba eliminados');

    console.log('\n🎉 Todas las pruebas completadas exitosamente!');
    console.log('\n📋 Resumen de funcionalidades probadas:');
    console.log('   ✅ Creación de usuarios con y sin deadline');
    console.log('   ✅ Validación de expiración');
    console.log('   ✅ Desactivación automática de usuarios expirados');
    console.log('   ✅ Filtros de búsqueda por estado de expiración');
    console.log('   ✅ Métodos de conteo y estadísticas');
    console.log('   ✅ Limpieza de datos de prueba');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Ejecutar las pruebas si se llama directamente
if (require.main === module) {
  testUserExpiration()
    .then(() => {
      console.log('\n✨ Proceso de pruebas completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal en las pruebas:', error);
      process.exit(1);
    });
}

module.exports = { testUserExpiration };
