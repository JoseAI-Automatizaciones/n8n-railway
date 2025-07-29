FROM n8nio/n8n:latest

# Configurar variables de entorno por defecto
ENV N8N_PORT=5678
ENV N8N_HOST=0.0.0.0
ENV NODE_ENV=production

# Copiar script de inicio
COPY start.sh /start.sh

# Crear directorio de datos y dar permisos
USER root
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node/.n8n
RUN chmod +x /start.sh
USER node

# Exponer puerto
EXPOSE 5678

# Comando de inicio
CMD ["/start.sh"]
