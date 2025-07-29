#!/bin/bash

# Script de inicio para n8n en Railway
echo "Iniciando n8n en Railway..."

# Verificar variables de entorno necesarias
if [ -z "$DATABASE_HOST" ]; then
    echo "❌ ERROR: DATABASE_HOST no está configurado"
    exit 1
fi

if [ -z "$N8N_BASIC_AUTH_USER" ]; then
    echo "❌ ERROR: N8N_BASIC_AUTH_USER no está configurado"
    exit 1
fi

if [ -z "$N8N_BASIC_AUTH_PASSWORD" ]; then
    echo "❌ ERROR: N8N_BASIC_AUTH_PASSWORD no está configurado"
    exit 1
fi

echo "✅ Variables de entorno configuradas correctamente"
echo "🚀 Iniciando n8n..."

# Iniciar n8n
exec n8n
