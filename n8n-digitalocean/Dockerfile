FROM n8nio/n8n:latest

# Configurar variables de entorno por defecto
ENV N8N_PORT=5678
ENV N8N_HOST=0.0.0.0
ENV NODE_ENV=production
ENV EXECUTIONS_DATA_PRUNE=true
ENV EXECUTIONS_DATA_MAX_AGE=168

# Crear directorio de datos
USER root
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node/.n8n
USER node

# Establecer directorio de trabajo
WORKDIR /home/node/.n8n

# Exponer puerto
EXPOSE 5678

# Comando de inicio - usar n8n directamente
CMD ["n8n"]
