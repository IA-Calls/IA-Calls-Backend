@echo off
REM Script para Windows - Habilitar APIs necesarias para Vertex AI Dialogflow CX

echo 🚀 Configurando Google Cloud para Vertex AI Dialogflow CX
echo.

REM Verificar si existe .env
if not exist .env (
    echo ❌ Archivo .env no encontrado
    exit /b 1
)

REM Leer PROJECT_ID del .env
for /f "tokens=1,2 delims==" %%a in ('findstr /r "^GOOGLE_CLOUD_PROJECT_ID=" .env') do set PROJECT_ID=%%b
for /f "tokens=1,2 delims==" %%a in ('findstr /r "^GOOGLE_CLOUD_CLIENT_EMAIL=" .env') do set SERVICE_ACCOUNT=%%b

if "%PROJECT_ID%"=="" (
    echo ❌ GOOGLE_CLOUD_PROJECT_ID no está configurado en .env
    exit /b 1
)

echo 📋 Proyecto: %PROJECT_ID%
echo.

REM Configurar proyecto activo
echo 1️⃣ Configurando proyecto activo...
gcloud config set project %PROJECT_ID%

REM Habilitar APIs necesarias
echo.
echo 2️⃣ Habilitando Dialogflow API...
gcloud services enable dialogflow.googleapis.com --project=%PROJECT_ID%

echo.
echo 3️⃣ Habilitando Cloud Resource Manager API...
gcloud services enable cloudresourcemanager.googleapis.com --project=%PROJECT_ID%

echo.
echo 4️⃣ Habilitando IAM API...
gcloud services enable iam.googleapis.com --project=%PROJECT_ID%

REM Verificar service account
if not "%SERVICE_ACCOUNT%"=="" (
    echo.
    echo 5️⃣ Verificando permisos del Service Account...
    echo    Service Account: %SERVICE_ACCOUNT%
    
    echo.
    echo 6️⃣ Asignando rol de Dialogflow Admin...
    gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:%SERVICE_ACCOUNT%" --role="roles/dialogflow.admin" --condition=None
    
    echo.
    echo ✅ Configuración completada exitosamente!
    echo.
    echo 📋 Resumen:
    echo    - Proyecto: %PROJECT_ID%
    echo    - Service Account: %SERVICE_ACCOUNT%
    echo    - APIs habilitadas: Dialogflow, Cloud Resource Manager, IAM
    echo    - Rol asignado: roles/dialogflow.admin
    echo.
    echo 🎉 Ya puedes crear agentes de WhatsApp con Vertex AI!
    echo.
    echo Prueba creando un agente:
    echo   curl -X POST http://localhost:5000/api/whatsapp/agents ^
    echo     -H "Content-Type: application/json" ^
    echo     -d "{\"name\": \"Mi Agente\", \"instructor\": \"Eres un asistente amable.\", \"language\": \"es\"}"
) else (
    echo ❌ GOOGLE_CLOUD_CLIENT_EMAIL no encontrado en .env
    exit /b 1
)

pause

