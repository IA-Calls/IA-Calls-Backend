# Test de Llamada - PowerShell Script

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST DE LLAMADA + WHATSAPP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# IMPORTANTE: Las credenciales deben estar en el archivo .env
# Este script NO debe contener credenciales hardcodeadas por seguridad
# Verifica que tu archivo .env contenga:
#   - TWILIO_ACCOUNT_SID
#   - TWILIO_AUTH_TOKEN
#   - TWILIO_WHATSAPP_FROM (o TWILIO_WHATSAPP_NUMBER)
#   - TEST_PHONE_NUMBER (opcional, para pruebas)

Write-Host "⚠️  IMPORTANTE: Las credenciales deben estar en .env" -ForegroundColor Yellow
Write-Host "   Este script ya no contiene credenciales hardcodeadas" -ForegroundColor Yellow
Write-Host ""
Write-Host ""

# Ejecutar test
Write-Host "Ejecutando test..." -ForegroundColor Yellow
Write-Host ""

node scripts/test-llamada-simple.js

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

