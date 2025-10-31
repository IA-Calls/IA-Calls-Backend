# Test de Llamada - PowerShell Script

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST DE LLAMADA + WHATSAPP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configurar variables de entorno
$env:TWILIO_ACCOUNT_SID = "AC332953b4c00211a282b4c59d45faf749"
$env:TWILIO_AUTH_TOKEN = "cfd6638b2384981c48edfe84835219da"
$env:TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886"
$env:TEST_PHONE_NUMBER = "+573138539155"
$env:PORT = "5000"

Write-Host "Variables configuradas correctamente" -ForegroundColor Green
Write-Host ""

# Ejecutar test
Write-Host "Ejecutando test..." -ForegroundColor Yellow
Write-Host ""

node scripts/test-llamada-simple.js

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

