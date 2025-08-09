#!/usr/bin/env node
/**
 * IA-Calls Backend - Script de Inicio Optimizado
 * Generado el: 9/8/2025, 6:12:46 p. m.
 */

console.log('🚀 IA-Calls Backend iniciando en modo producción...');
console.log('📅 Build generado: 2025-08-09T23:12:46.893Z');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV || 'production');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.production' });

// Iniciar servidor
require('./server.js');
