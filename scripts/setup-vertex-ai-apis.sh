#!/bin/bash

# Script para habilitar APIs necesarias para Vertex AI Dialogflow CX
# Asegúrate de tener gcloud CLI instalado y autenticado

set -e

echo "🚀 Configurando Google Cloud para Vertex AI Dialogflow CX"
echo ""

# Cargar PROJECT_ID del .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep GOOGLE_CLOUD_PROJECT_ID | xargs)
else
  echo "❌ Archivo .env no encontrado"
  exit 1
fi

if [ -z "$GOOGLE_CLOUD_PROJECT_ID" ]; then
  echo "❌ GOOGLE_CLOUD_PROJECT_ID no está configurado en .env"
  exit 1
fi

PROJECT_ID=$GOOGLE_CLOUD_PROJECT_ID

echo "📋 Proyecto: $PROJECT_ID"
echo ""

# Configurar proyecto activo
echo "1️⃣ Configurando proyecto activo..."
gcloud config set project $PROJECT_ID

# Habilitar APIs necesarias
echo ""
echo "2️⃣ Habilitando Dialogflow API..."
gcloud services enable dialogflow.googleapis.com --project=$PROJECT_ID

echo ""
echo "3️⃣ Habilitando Cloud Resource Manager API..."
gcloud services enable cloudresourcemanager.googleapis.com --project=$PROJECT_ID

echo ""
echo "4️⃣ Habilitando IAM API..."
gcloud services enable iam.googleapis.com --project=$PROJECT_ID

# Verificar service account
if [ ! -z "$GOOGLE_CLOUD_CLIENT_EMAIL" ]; then
  export $(grep -v '^#' .env | grep GOOGLE_CLOUD_CLIENT_EMAIL | xargs)
  SERVICE_ACCOUNT=$GOOGLE_CLOUD_CLIENT_EMAIL
  
  echo ""
  echo "5️⃣ Verificando permisos del Service Account..."
  echo "   Service Account: $SERVICE_ACCOUNT"
  
  # Asignar rol de Dialogflow Admin si no lo tiene
  echo ""
  echo "6️⃣ Asignando rol de Dialogflow Admin..."
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/dialogflow.admin" \
    --condition=None
  
  echo ""
  echo "✅ Configuración completada exitosamente!"
  echo ""
  echo "📋 Resumen:"
  echo "   - Proyecto: $PROJECT_ID"
  echo "   - Service Account: $SERVICE_ACCOUNT"
  echo "   - APIs habilitadas: Dialogflow, Cloud Resource Manager, IAM"
  echo "   - Rol asignado: roles/dialogflow.admin"
  echo ""
  echo "🎉 Ya puedes crear agentes de WhatsApp con Vertex AI!"
  echo ""
  echo "Prueba creando un agente:"
  echo "  curl -X POST http://localhost:5000/api/whatsapp/agents \\"
  echo "    -H \"Content-Type: application/json\" \\"
  echo "    -d '{\"name\": \"Mi Agente\", \"instructor\": \"Eres un asistente amable.\", \"language\": \"es\"}'"
else
  echo "❌ GOOGLE_CLOUD_CLIENT_EMAIL no encontrado en .env"
  exit 1
fi

