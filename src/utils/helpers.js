// Funciones de utilidad

// Generar respuesta estándar
const sendResponse = (res, statusCode, data, message = null) => {
  res.status(statusCode).json({
    success: statusCode < 400,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Generar respuesta de error
const sendError = (res, statusCode, message, error = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : null,
    timestamp: new Date().toISOString()
  });
};

// Validar email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitizar input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

// Generar ID único
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Formatear fecha
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Validar datos requeridos
const validateRequired = (data, requiredFields) => {
  const missing = [];
  
  requiredFields.forEach(field => {
    if (!data[field] || data[field] === '') {
      missing.push(field);
    }
  });

  return {
    isValid: missing.length === 0,
    missing
  };
};

module.exports = {
  sendResponse,
  sendError,
  isValidEmail,
  sanitizeInput,
  generateId,
  formatDate,
  validateRequired
}; 