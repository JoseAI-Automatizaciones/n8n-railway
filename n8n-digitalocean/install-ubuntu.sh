#!/bin/bash

echo "🚀 Instalando n8n en DigitalOcean Ubuntu..."

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Crear directorio para n8n
mkdir -p ~/n8n
cd ~/n8n

# Copiar archivos (necesitas subirlos primero)
echo "📁 Sube los archivos docker-compose.yml y .env a este directorio"

# Configurar firewall
sudo ufw allow 5678
sudo ufw allow 22
sudo ufw --force enable

echo "✅ Instalación completa!"
echo "📝 Pasos siguientes:"
echo "1. Sube docker-compose.yml y .env a ~/n8n/"
echo "2. Ejecuta: docker-compose up -d"
echo "3. Accede a http://tu-ip:5678"
