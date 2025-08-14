// Ejemplo de uso de las funciones de logging
const { logActivity, getUserActivityLogs, cleanOldActivityLogs } = require('../src/utils/helpers');

// Ejemplo 1: Registrar actividad de creación de grupo
const exampleCreateGroup = async (req, res) => {
  try {
    // ... lógica de creación del grupo ...
    
    // Registrar log de actividad exitosa
    await logActivity(req.user.id, 'create_group', 'Grupo "Clientes VIP" creado exitosamente', req, {
      groupId: 123,
      groupName: 'Clientes VIP',
      hasFile: true,
      clientsCreated: 50,
      variables: { tipo: 'premium' }
    });
    
    res.status(201).json({ success: true, message: 'Grupo creado' });
    
  } catch (error) {
    // Registrar log de error
    await logActivity(req.user.id, 'create_group_error', 'Error creando grupo', req, {
      error: error.message,
      groupName: 'Clientes VIP'
    });
    
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// Ejemplo 2: Obtener logs de actividad de un usuario
const exampleGetUserLogs = async (req, res) => {
  try {
    const userId = req.params.id;
    const options = {
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      action: req.query.action // opcional: filtrar por acción
    };
    
    const logs = await getUserActivityLogs(userId, options);
    
    res.json({
      success: true,
      data: logs
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Ejemplo 3: Limpiar logs antiguos (tarea programada)
const exampleCleanLogs = async () => {
  try {
    const deletedCount = await cleanOldActivityLogs(90); // mantener solo 90 días
    console.log(`Se eliminaron ${deletedCount} logs antiguos`);
  } catch (error) {
    console.error('Error limpiando logs:', error.message);
  }
};

// Ejemplo 4: Diferentes tipos de acciones para logging
const actionExamples = {
  // Autenticación
  login: 'login',
  logout: 'logout',
  password_change: 'password_change',
  
  // Grupos
  create_group: 'create_group',
  update_group: 'update_group',
  delete_group: 'delete_group',
  
  // Clientes
  create_client: 'create_client',
  update_client: 'update_client',
  delete_client: 'delete_client',
  import_clients: 'import_clients',
  
  // Archivos
  upload_file: 'upload_file',
  download_file: 'download_file',
  delete_file: 'delete_file',
  
  // Usuarios
  create_user: 'create_user',
  update_user: 'update_user',
  delete_user: 'delete_user',
  
  // Errores
  create_group_error: 'create_group_error',
  upload_file_error: 'upload_file_error'
};

module.exports = {
  exampleCreateGroup,
  exampleGetUserLogs,
  exampleCleanLogs,
  actionExamples
};
