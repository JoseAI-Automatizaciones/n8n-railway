FROM n8nio/n8n:latest

# Set working directory
WORKDIR /data

# Expose port
EXPOSE 5678

# Set default command
CMD ["n8n", "start"]
