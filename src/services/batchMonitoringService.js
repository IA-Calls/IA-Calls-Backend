/**
 * Servicio de Monitoreo Global de Batch Calls
 * Se ejecuta en segundo plano continuamente
 */

const { elevenlabsService } = require('../agents');

class BatchMonitoringService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.processedCalls = new Map(); // Map<phone_number, true> para evitar duplicados
    this.checkIntervalSeconds = 15;
    
    // Lazy load del conversationService
    this._conversationService = null;
    
    console.log('🔧 BatchMonitoringService inicializado');
  }

  get conversationService() {
    if (!this._conversationService) {
      const ConversationService = require('./conversationService');
      this._conversationService = new ConversationService();
    }
    return this._conversationService;
  }

  /**
   * Iniciar el monitoreo global en segundo plano
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ El servicio de monitoreo ya está corriendo');
      return;
    }

    console.log('🚀 ===== INICIANDO MONITOREO GLOBAL DE BATCH CALLS =====');
    console.log(`📊 Intervalo de verificación: ${this.checkIntervalSeconds} segundos`);
    console.log(`🕐 Hora de inicio: ${new Date().toLocaleString('es-ES')}`);
    console.log('⚡ El monitoreo se ejecutará continuamente en segundo plano');

    this.isRunning = true;

    // Primera verificación inmediata
    this.checkAllBatches();

    // Programar verificaciones periódicas
    this.interval = setInterval(() => {
      this.checkAllBatches();
    }, this.checkIntervalSeconds * 1000);

    console.log('✅ Monitoreo global iniciado exitosamente');
  }

  /**
   * Detener el monitoreo global
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ El servicio de monitoreo no está corriendo');
      return;
    }

    console.log('⏹️ Deteniendo monitoreo global...');
    clearInterval(this.interval);
    this.isRunning = false;
    console.log('✅ Monitoreo global detenido');
  }

  /**
   * Verificar todos los batch calls activos
   */
  async checkAllBatches() {
    try {
      // Obtener lista de todos los batch calls del workspace
      const batchListResult = await elevenlabsService.listBatchCalls();

      if (!batchListResult || !batchListResult.success) {
        return;
      }

      // Asegurarse de que allBatches sea un array
      let allBatches = batchListResult.data;
      
      if (!Array.isArray(allBatches)) {
        if (allBatches && Array.isArray(allBatches.batches)) {
          allBatches = allBatches.batches;
        } else if (allBatches && Array.isArray(allBatches.batch_calls)) {
          allBatches = allBatches.batch_calls;
        } else {
          allBatches = [];
        }
      }

      if (allBatches.length === 0) {
        return;
      }

      // Filtrar batches activos o recientes
      const activeBatches = allBatches.filter(batch => {
        const isActive = batch.status === 'in_progress' || batch.status === 'initiated';
        const isRecentlyCompleted = batch.status === 'completed' && 
          this.isRecent(batch.last_updated_at_unix || batch.created_at_unix);
        return isActive || isRecentlyCompleted;
      });

      // Solo loggear si hay batches activos
      if (activeBatches.length > 0) {
        console.log(`🔄 ${activeBatches.length} batch(es) activo(s) - ${new Date().toLocaleTimeString('es-ES')}`);
      }

      // Verificar cada batch (silencioso)
      for (const batch of activeBatches) {
        await this.checkBatch(batch.id);
      }

    } catch (error) {
      console.error(`❌ Error en verificación global:`, error.message);
      console.error(`Stack trace:`, error.stack);
    }
  }

  /**
   * Verificar un batch específico
   */
  async checkBatch(batchId) {
    try {
      if (!batchId) return;

      const statusResult = await elevenlabsService.getBatchCallStatus(batchId);

      if (!statusResult || !statusResult.success || !statusResult.data) {
        return;
      }

      const batchData = statusResult.data;

      if (!batchData.recipients || !Array.isArray(batchData.recipients)) {
        return;
      }

      // Verificar cada recipient (silencioso)
      for (const recipient of batchData.recipients) {
        await this.checkRecipient(recipient, batchData);
      }

    } catch (error) {
      console.error(`❌ Error batch ${batchId.substring(0, 15)}...`);
    }
  }

  /**
   * Verificar un recipient y enviar WhatsApp si está finalizado
   */
  async checkRecipient(recipient, batchData) {
    try {
      const phoneNumber = recipient.phone_number;
      const status = recipient.status;
      
      // Crear clave única más robusta
      // Usamos conversation_id como clave principal, y si no existe, usamos recipient.id
      const conversationId = recipient.conversation_id || recipient.id;
      const key = conversationId ? `conv_${conversationId}` : `phone_${phoneNumber}_${batchData.id}`;

      // Verificar si ya fue procesado
      if (this.processedCalls.has(key)) {
        // Silencioso - no loggear para no saturar logs
        return; // Ya fue procesado, saltar
      }

      // Verificar si está en estado final
      const isFinalState = status === 'completed' || 
                          status === 'finished' || 
                          status === 'ended';

      if (isFinalState) {
        console.log(`✅ Llamada finalizada → ${phoneNumber}`);

        // Marcar como procesado INMEDIATAMENTE para evitar duplicados
        this.processedCalls.set(key, {
          processedAt: new Date(),
          phoneNumber: phoneNumber,
          status: status,
          conversationId: conversationId,
          batchId: batchData.id,
          key: key
        });

        // Enviar WhatsApp
        await this.sendWhatsAppToRecipient(recipient, batchData);
      }

    } catch (error) {
      console.error(`❌ Error procesando: ${error.message}`);
    }
  }

  /**
   * Iniciar conversación por WhatsApp después de la llamada
   */
  async sendWhatsAppToRecipient(recipient, batchData) {
    try {
      const phoneNumber = recipient.phone_number;
      const clientName = recipient.name || 
                        recipient.variables?.name || 
                        'Cliente';
      
      // DOBLE VERIFICACIÓN: Revisar nuevamente antes de enviar
      const conversationId = recipient.conversation_id || recipient.id;
      const key = conversationId ? `conv_${conversationId}` : `phone_${phoneNumber}_${batchData.id}`;
      
      if (this.processedCalls.has(key)) {
        return;
      }

      // Llamar al servicio de conversaciones (local, no HTTP)
      const result = await this.conversationService.handleCallCompleted(recipient, batchData);

      if (result.success) {
        console.log(`💬 WhatsApp → ${clientName} (${phoneNumber}) ✓`);
      } else {
        console.error(`❌ WhatsApp falló → ${clientName}: ${result.error}`);
        
        // Si falla, remover de procesados para reintentar
        this.processedCalls.delete(key);
      }

      return result;

    } catch (error) {
      console.error(`❌ Error procesando llamada finalizada:`, error.message);
      
      // Si falla, remover de procesados para reintentar
      const conversationId = recipient.conversation_id || recipient.id;
      const key = conversationId ? `conv_${conversationId}` : `phone_${phoneNumber}_${batchData.id}`;
      this.processedCalls.delete(key);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Formatear mensaje de WhatsApp
   */
  formatMessage(clientName, conversationSummary, transcriptSummary = null) {
    let message = `¡Hola ${clientName}! 👋\n\n`;
    
    if (transcriptSummary) {
      message += `${conversationSummary}\n\n`;
    } else {
      message += `Acabamos de tener una conversación telefónica y me gustaría continuar el diálogo contigo por aquí.\n\n`;
    }
    
    message += `Por favor, comparte tus dudas o comentarios para que pueda ayudarte mejor. 😊\n\n`;
    message += `---\n*IA Calls*`;
    
    return message;
  }

  /**
   * Verificar si un timestamp es reciente (último día)
   */
  isRecent(timestampUnix) {
    if (!timestampUnix) return false;
    
    const oneDayAgo = Date.now() / 1000 - (24 * 60 * 60);
    return timestampUnix > oneDayAgo;
  }

  /**
   * Limpiar llamadas procesadas antiguas (más de 7 días)
   */
  cleanupOldProcessedCalls() {
    const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    
    for (const [key, data] of this.processedCalls.entries()) {
      if (data.processedAt < sevenDaysAgo) {
        this.processedCalls.delete(key);
      }
    }
    
    console.log(`🧹 Limpieza completada. Llamadas procesadas en memoria: ${this.processedCalls.size}`);
  }

  /**
   * Obtener estadísticas del servicio
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkIntervalSeconds,
      processedCallsCount: this.processedCalls.size,
      processedCalls: Array.from(this.processedCalls.entries()).map(([key, data]) => ({
        key,
        phoneNumber: data.phoneNumber,
        processedAt: data.processedAt,
        conversationId: data.conversationId
      })),
      lastCheck: new Date().toISOString()
    };
  }
  
  /**
   * Limpiar manualmente un número procesado (para testing)
   */
  clearProcessed(conversationIdOrKey) {
    let removed = false;
    
    // Intentar remover directamente
    if (this.processedCalls.has(conversationIdOrKey)) {
      this.processedCalls.delete(conversationIdOrKey);
      removed = true;
    }
    
    // Intentar buscar por conversation_id
    const keyWithPrefix = `conv_${conversationIdOrKey}`;
    if (this.processedCalls.has(keyWithPrefix)) {
      this.processedCalls.delete(keyWithPrefix);
      removed = true;
    }
    
    if (removed) {
      console.log(`🧹 Limpiado: ${conversationIdOrKey}`);
      console.log(`📊 Total procesados: ${this.processedCalls.size}`);
    } else {
      console.log(`⚠️ No se encontró: ${conversationIdOrKey}`);
    }
    
    return removed;
  }
  
  /**
   * Limpiar todas las llamadas procesadas
   */
  clearAllProcessed() {
    const count = this.processedCalls.size;
    this.processedCalls.clear();
    console.log(`🧹 Limpiados ${count} registros procesados`);
  }
}

// Exportar instancia singleton
module.exports = new BatchMonitoringService();

