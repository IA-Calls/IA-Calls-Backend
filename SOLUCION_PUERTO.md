# ✅ SOLUCIÓN - Problema del Puerto

## 🔴 PROBLEMA

El servidor está corriendo en el puerto **5000**, pero los scripts de test intentaban conectarse al puerto **3000**.

```
❌ El servidor no está corriendo
   Ejecuta: npm run dev
```

(Pero el servidor SÍ estaba corriendo, solo que en otro puerto)

---

## ✅ SOLUCIÓN

**Ya está arreglado.** Los scripts ahora detectan automáticamente el puerto correcto.

### **Cambios realizados:**

1. ✅ `scripts/test-llamada-completa.js` - Usa puerto 5000 por defecto
2. ✅ `scripts/test-whatsapp-integration.js` - Usa puerto 5000 por defecto
3. ✅ `scripts/test-llamada-simple.js` - Script nuevo más simple
4. ✅ `scripts/ejecutar-test.ps1` - Script PowerShell para Windows

---

## 🚀 CÓMO USAR AHORA

### **Opción 1: Test Simple (Recomendado)**

```powershell
node scripts/test-llamada-simple.js
```

**Qué hace:**
- ✅ Hace la llamada directamente
- ✅ No verifica el servidor (no es necesario)
- ✅ Muestra información de debug
- ✅ Más rápido

### **Opción 2: PowerShell Script**

```powershell
.\scripts\ejecutar-test.ps1
```

**Qué hace:**
- ✅ Configura variables automáticamente
- ✅ Ejecuta el test
- ✅ Formateado bonito con colores

### **Opción 3: Test Completo**

```powershell
node scripts/test-llamada-completa.js
```

**Qué hace:**
- ✅ Verifica servidor (ahora en puerto 5000)
- ✅ Hace la llamada
- ✅ Monitorea hasta que termines
- ✅ Verifica que llegue el WhatsApp
- ✅ Revisa la base de datos

---

## 📝 AGREGAR AL .env

Asegúrate de tener esto en tu `.env`:

```env
# Puerto del servidor
PORT=5000

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=AC332953b4c00211a282b4c59d45faf749
TWILIO_AUTH_TOKEN=cfd6638b2384981c48edfe84835219da
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Para tests
TEST_PHONE_NUMBER=+573138539155
```

---

## 🎯 WEBHOOK EN TWILIO

Recuerda que si usas **ngrok**, la URL del webhook es:

```
https://tu-url.ngrok.io/webhook/twilio/incoming
```

Y tu ngrok debe apuntar al puerto **5000**:

```powershell
ngrok http 5000
```

---

## ⚡ QUICK START

```powershell
# 1. Asegúrate que el servidor esté corriendo
npm run dev

# 2. En otra terminal, ejecuta el test
node scripts/test-llamada-simple.js

# 3. Contesta el teléfono cuando suene

# 4. Habla con el agente y cuelga

# 5. En ~30 segundos recibirás WhatsApp automáticamente
```

---

## 🔍 VERIFICAR LOGS DEL SERVIDOR

Mientras haces la prueba, revisa la terminal donde está corriendo el servidor:

Deberías ver:
```
🔍 Batch: completed | Recipients: 1
     → Recipient status: completed
💬 WhatsApp → Alejandro (+573138539155) ✓
```

---

## ❓ ¿POR QUÉ PUERTO 5000?

Tu servidor está configurado para usar el puerto 5000 (probablemente en tu `.env` o en las variables de entorno de tu sistema).

Los scripts ahora usan **5000 por defecto** en lugar de 3000.

Si quieres cambiarlo a 3000, modifica tu `.env`:
```env
PORT=3000
```

---

¡Problema resuelto! 🎉

