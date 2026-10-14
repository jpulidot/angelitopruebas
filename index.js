const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CHATWOOT_URL = process.env.CHATWOOT_URL;
const BOT_ACCESS_TOKEN = process.env.BOT_ACCESS_TOKEN;

app.post('/webhook', async (req, res) => {
  const payload = req.body;

  // Verificar si es un mensaje entrante enviado por el cliente
  if (payload.event === 'message_created' && payload.message_type === 'incoming') {
    const conversationId = payload.conversation.id;
    const incomingText = payload.content;

    console.log(`[+] Mensaje recibido en conversación #${conversationId}: ${incomingText}`);

    // Respuesta simple por defecto
    let replyText = "¡Hola! Soy tu Agent Bot personalizado.";

    if (incomingText.toLowerCase().includes('horarios')) {
      replyText = "Nuestro horario de atención es de Lunes a Viernes de 9:00 AM a 6:00 PM.";
    } else if (incomingText.toLowerCase().includes('ayuda')) {
      replyText = "Escribe 'horarios' para conocer la atención o espera a que un agente humano te responda.";
    }

    // Responder a Chatwoot
    await sendReplyToChatwoot(conversationId, replyText);
  }

  res.status(200).send({ status: 'success' });
});

async function sendReplyToChatwoot(conversationId, message) {
  try {
    await axios.post(
      `${CHATWOOT_URL}/api/v1/widget/conversations/${conversationId}/messages`,
      {
        content: message,
        message_type: 'outgoing'
      },
      {
        headers: {
          'api_access_token': BOT_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`[✓] Respuesta enviada a conversación #${conversationId}`);
  } catch (error) {
    console.error('[-] Error enviando mensaje a Chatwoot:', error.response?.data || error.message);
  }
}

app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});
