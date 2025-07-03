// Controlador de estado
const getStatus = (req, res) => {
  try {
    res.json({
      status: 'success',
      message: 'API funcionando correctamente',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener estado',
      error: error.message
    });
  }
};

// Controlador de salud
const getHealth = (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      },
      cpu: process.cpuUsage()
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      message: 'Error en health check',
      error: error.message
    });
  }
};

module.exports = {
  getStatus,
  getHealth
}; 