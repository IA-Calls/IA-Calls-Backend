@echo off
echo.
echo ======================================
echo TEST DE LLAMADA COMPLETA
echo ======================================
echo.
echo Configurando variables de entorno...
echo.

set TWILIO_ACCOUNT_SID=AC332953b4c00211a282b4c59d45faf749
set TWILIO_AUTH_TOKEN=cfd6638b2384981c48edfe84835219da
set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
set TEST_PHONE_NUMBER=+573138539155

echo Variables configuradas correctamente
echo.
echo Ejecutando test...
echo.

node scripts/test-llamada-completa.js

pause

