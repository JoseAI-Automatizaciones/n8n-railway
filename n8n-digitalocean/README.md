# n8n en Railway

Configuración para desplegar n8n en Railway con PostgreSQL integrado.

## ¿Por qué Railway?

- ✅ **Fácil despliegue**: Git push y listo
- ✅ **Base de datos incluida**: PostgreSQL automático
- ✅ **Escalado automático**: Se ajusta según demanda
- ✅ **SSL incluido**: HTTPS automático
- ✅ **Costo por uso**: Solo pagas lo que usas

## Pasos para desplegar en Railway

### 1. Preparar el repositorio
```bash
# Si no tienes git inicializado
git init
git add .
git commit -m "Initial commit for Railway"
```

### 2. Crear cuenta en Railway
1. Ve a [Railway](https://railway.app)
2. Regístrate con GitHub
3. Conecta tu repositorio

### 3. Configurar base de datos
1. En Railway dashboard, haz clic en "+ New"
2. Selecciona "Database" → "PostgreSQL"
3. Railway creará automáticamente las variables:
   - `DATABASE_HOST`
   - `DATABASE_PORT`
   - `DATABASE_NAME`
   - `DATABASE_USER`
   - `DATABASE_PASSWORD`

### 4. Desplegar aplicación
1. Haz clic en "+ New" → "GitHub Repo"
2. Selecciona tu repositorio
3. Railway detectará automáticamente el Dockerfile
4. El despliegue comenzará automáticamente

### 5. Configurar variables de entorno
En el dashboard de tu aplicación:
1. Ve a "Variables"
2. Agrega:
   - `N8N_BASIC_AUTH_USER`: tu_usuario
   - `N8N_BASIC_AUTH_PASSWORD`: tu_password_seguro
   - `PORT`: 5678

### 6. Conectar la base de datos
1. En tu aplicación, ve a "Settings"
2. En "Service Connections", conecta con la base de datos PostgreSQL
3. Las variables de base de datos se configurarán automáticamente

### 7. Generar dominio
1. Ve a "Settings" → "Domains"
2. Haz clic en "Generate Domain"
3. Tu aplicación estará disponible en: `https://tu-app.up.railway.app`

## Comandos útiles para desarrollo

### Instalar Railway CLI
```bash
# Con npm
npm install -g @railway/cli

# Con curl (Linux/Mac)
curl -fsSL https://railway.app/install.sh | sh
```

### Comandos CLI
```bash
# Login
railway login

# Ver logs
railway logs

# Ejecutar localmente con variables de Railway
railway run npm start

# Desplegar manualmente
railway up
```

## Solución de problemas "crashed"

### Revisar logs
```bash
railway logs
```

### Errores comunes:
1. **Puerto incorrecto**: Asegúrate de que `PORT=5678`
2. **Variables faltantes**: Verifica que todas las variables estén configuradas
3. **Base de datos no conectada**: Revisa la conexión en Service Connections
4. **Memoria insuficiente**: Railway puede limitar recursos en el plan gratuito

### Reiniciar aplicación
```bash
railway redeploy
```

## Costos de Railway

- **Plan gratuito**: $5 USD en créditos mensuales
- **Plan Pro**: $20 USD/mes + uso
- **Base de datos**: ~$5-10 USD/mes según uso

¡Más fácil que DigitalOcean! 🚀
