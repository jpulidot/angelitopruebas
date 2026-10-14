# Chatwoot Agent Bot (Node.js + Express)

Este proyecto es una plantilla para un Agent Bot de Chatwoot conectado vía Webhooks.

## 🚀 Instalación y uso local

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Configura las variables de entorno:
   - Copia `.env.example` a `.env`
   - Configura `CHATWOOT_URL` y `BOT_ACCESS_TOKEN` con tus credenciales.

3. Inicia el servidor:
   ```bash
   npm start
   ```

4. Para exponer tu servidor a internet y probar con Chatwoot usa Ngrok:
   ```bash
   ngrok http 3000
   ```
