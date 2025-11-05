@echo off
echo.
echo ======================================
echo TEST DE LLAMADA COMPLETA
echo ======================================
echo.
echo IMPORTANTE: Las credenciales deben estar en el archivo .env
echo Este script NO debe contener credenciales hardcodeadas por seguridad
echo Verifica que tu archivo .env contenga:
echo   - TWILIO_ACCOUNT_SID
echo   - TWILIO_AUTH_TOKEN
echo   - TWILIO_WHATSAPP_FROM (o TWILIO_WHATSAPP_NUMBER)
echo   - TEST_PHONE_NUMBER (opcional, para pruebas)
echo.
echo.
echo Ejecutando test...
echo.

node scripts/test-llamada-completa.js

pause

