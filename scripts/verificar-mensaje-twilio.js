/**
 * Verificar Mensaje de Twilio
 * Consulta el estado del último mensaje enviado
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('\n📱 ===== VERIFICAR MENSAJES DE TWILIO =====\n');

async function verificarMensajes() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      console.error('❌ Faltan credenciales de Twilio en .env');
      process.exit(1);
    }
    
    console.log('🔍 Consultando últimos mensajes de Twilio...\n');
    
    const client = require('twilio')(accountSid, authToken);
    
    // Obtener últimos 10 mensajes
    const messages = await client.messages.list({ limit: 10 });
    
    if (messages.length === 0) {
      console.log('⚠️  No hay mensajes registrados en Twilio\n');
      process.exit(0);
    }
    
    console.log(`📊 Últimos ${messages.length} mensajes:\n`);
    
    messages.forEach((msg, index) => {
      const fecha = msg.dateCreated ? new Date(msg.dateCreated).toLocaleString() : 'N/A';
      const direccion = msg.direction === 'outbound-api' ? '📤 Enviado' : '📥 Recibido';
      
      console.log(`${index + 1}. ${direccion}`);
      console.log(`   SID: ${msg.sid}`);
      console.log(`   De: ${msg.from}`);
      console.log(`   Para: ${msg.to}`);
      console.log(`   Estado: ${msg.status}`);
      console.log(`   Fecha: ${fecha}`);
      
      if (msg.body) {
        const preview = msg.body.length > 80 
          ? msg.body.substring(0, 80) + '...' 
          : msg.body;
        console.log(`   Mensaje: "${preview}"`);
      }
      
      if (msg.errorCode) {
        console.log(`   ❌ Error Code: ${msg.errorCode}`);
        console.log(`   ❌ Error Message: ${msg.errorMessage}`);
      }
      
      console.log('');
    });
    
    // Buscar el mensaje específico que enviamos
    const mensajeEnviado = messages.find(m => 
      m.sid === 'SM2863ebc38905ff69f0fa096eb351a5e1'
    );
    
    if (mensajeEnviado) {
      console.log('🎯 MENSAJE QUE ENVIAMOS HACE RATO:\n');
      console.log(`   Estado: ${mensajeEnviado.status}`);
      console.log(`   Precio: ${mensajeEnviado.price} ${mensajeEnviado.priceUnit}`);
      
      if (mensajeEnviado.status === 'delivered') {
        console.log('   ✅ MENSAJE ENTREGADO EXITOSAMENTE');
      } else if (mensajeEnviado.status === 'sent') {
        console.log('   ⏳ MENSAJE ENVIADO (esperando entrega)');
      } else if (mensajeEnviado.status === 'failed') {
        console.log('   ❌ MENSAJE FALLÓ');
        console.log(`   Error: ${mensajeEnviado.errorCode} - ${mensajeEnviado.errorMessage}`);
      } else {
        console.log(`   ⚠️  Estado: ${mensajeEnviado.status}`);
      }
      console.log('');
    }
    
    // Verificar si el número está autorizado
    console.log('🔍 VERIFICACIONES:\n');
    
    const mensajesAlNumero = messages.filter(m => 
      m.to === 'whatsapp:+573138539155' || 
      m.from === 'whatsapp:+573138539155'
    );
    
    if (mensajesAlNumero.length > 0) {
      console.log(`✅ Hay ${mensajesAlNumero.length} mensaje(s) para/desde +573138539155`);
      console.log('   Estados:');
      
      const estados = {};
      mensajesAlNumero.forEach(m => {
        estados[m.status] = (estados[m.status] || 0) + 1;
      });
      
      Object.entries(estados).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`);
      });
      
      const hayFallidos = mensajesAlNumero.some(m => m.status === 'failed');
      
      if (hayFallidos) {
        console.log('\n   ⚠️  HAY MENSAJES FALLIDOS:');
        mensajesAlNumero
          .filter(m => m.status === 'failed')
          .forEach(m => {
            console.log(`   - Error ${m.errorCode}: ${m.errorMessage}`);
          });
      }
      
    } else {
      console.log('⚠️  No hay mensajes para el número +573138539155');
      console.log('   Puede que el número no esté autorizado en Twilio Sandbox');
    }
    
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error consultando Twilio:', error.message);
    
    if (error.code === 20003) {
      console.error('\n⚠️  Credenciales de Twilio inválidas');
      console.error('   Verifica TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en .env\n');
    }
    
    console.error(error.stack);
    process.exit(1);
  }
}

verificarMensajes();

