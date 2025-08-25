const express = require('express');
const router = express.Router();
const { elevenlabsService } = require('../agents');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authorize');

// GET /api/agents/phone-numbers - Obtener números de teléfono disponibles (SIN AUTENTICACIÓN)
router.get('/phone-numbers', async (req, res) => {
  try {
    console.log('📞 === SOLICITUD DE NÚMEROS DE TELÉFONO ===');
    console.log('👤 Usuario: Acceso público (sin autenticación)');
    console.log('🕐 Timestamp:', new Date().toISOString());

    const result = await elevenlabsService.getPhoneNumbers();

    if (result.success) {
      console.log(`✅ Números obtenidos exitosamente: ${result.count} números disponibles`);
      
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          phoneNumbers: result.phoneNumbers,
          count: result.count,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error('❌ Error obteniendo números:', result.error);
      
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error inesperado en getPhoneNumbers:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener números de teléfono',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware para autenticación en todas las demás rutas
router.use(authenticate);

// GET /api/agents/test - Probar conexión con ElevenLabs
router.get('/test', async (req, res) => {
  try {
    const testResult = await elevenlabsService.testConnection();
    
    res.json({
      success: testResult.success,
      message: testResult.message,
      data: testResult.data || null,
      error: testResult.error || null
    });

  } catch (error) {
    console.error('Error probando conexión con ElevenLabs:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/agents/list - Listar agentes (solo admins)
router.get('/list', requireAdmin, async (req, res) => {
  try {
    const result = await elevenlabsService.listAgents();
    
    res.json({
      success: result.success,
      data: result.data || null,
      error: result.error || null,
      message: result.success ? 'Agentes obtenidos exitosamente' : 'Error obteniendo agentes'
    });

  } catch (error) {
    console.error('Error listando agentes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/agents/:agentId - Obtener información de un agente específico
router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Verificar que el usuario puede acceder al agente
    // (solo su propio agente o si es admin)
    if (req.user.role !== 'admin' && req.user.agentId !== agentId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este agente'
      });
    }

    const result = await elevenlabsService.getAgent(agentId);
    
    res.json({
      success: result.success,
      data: result.data || null,
      error: result.error || null,
      message: result.success ? 'Agente obtenido exitosamente' : 'Error obteniendo agente'
    });

  } catch (error) {
    console.error('Error obteniendo agente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// PUT /api/agents/:agentId - Actualizar configuración de un agente
router.put('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const updateData = req.body;
    
    // Verificar que el usuario puede modificar el agente
    // (solo su propio agente o si es admin)
    if (req.user.role !== 'admin' && req.user.agentId !== agentId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar este agente'
      });
    }

    const result = await elevenlabsService.updateAgent(agentId, updateData);
    
    res.json({
      success: result.success,
      data: result.data || null,
      error: result.error || null,
      message: result.success ? 'Agente actualizado exitosamente' : 'Error actualizando agente'
    });

  } catch (error) {
    console.error('Error actualizando agente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// DELETE /api/agents/:agentId - Eliminar un agente (solo admins)
router.delete('/:agentId', requireAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;

    const result = await elevenlabsService.deleteAgent(agentId);
    
    res.json({
      success: result.success,
      error: result.error || null,
      message: result.success ? 'Agente eliminado exitosamente' : 'Error eliminando agente'
    });

  } catch (error) {
    console.error('Error eliminando agente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/agents/create - Crear un agente manualmente (solo admins)
router.post('/create', requireAdmin, async (req, res) => {
  try {
    const agentConfig = req.body;

    const result = await elevenlabsService.createAgent(agentConfig);
    
    res.status(result.success ? 201 : 400).json({
      success: result.success,
      data: result.success ? { agent_id: result.agent_id } : null,
      error: result.error || null,
      message: result.message
    });

  } catch (error) {
    console.error('Error creando agente manualmente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
