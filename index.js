const http = require('node:http');
const crypto = require('node:crypto');

function createServer(env = process.env, send = fetch) {
  const required = ['CHATWOOT_URL', 'CHATWOOT_ACCOUNT_ID', 'BOT_ACCESS_TOKEN', 'CHATWOOT_WEBHOOK_SECRET', 'CHATWOOT_TEST_INBOX_ID'];
  for (const key of required) if (!env[key]) throw new Error('Missing configuration: ' + key);
  const base = new URL(env.CHATWOOT_URL);
  if (base.protocol !== 'https:') throw new Error('CHATWOOT_URL must use HTTPS');
  for (const key of ['CHATWOOT_ACCOUNT_ID', 'CHATWOOT_TEST_INBOX_ID'])
    if (!/^[1-9]\d*$/.test(env[key])) throw new Error('Invalid configuration: ' + key);
  const seen = new Map();
  return http.createServer(async (req, res) => {
    const respond = (status, value) => {
      res.writeHead(status, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(value));
    };
    if (req.method === 'GET' && req.url === '/health') return respond(200, {status: 'ok', mode: 'connection-test', version: '1.1.0'});
    if (req.method !== 'POST' || req.url !== '/webhook') return respond(404, {error: 'not_found'});
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 262144) return respond(413, {error: 'payload_too_large'});
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks);
      const timestamp = req.headers['x-chatwoot-timestamp'];
      const signature = req.headers['x-chatwoot-signature'];
      if (typeof timestamp !== 'string' || !/^\d+$/.test(timestamp) ||
          Math.abs(Date.now()/1000 - Number(timestamp)) > 300 ||
          typeof signature !== 'string' || !/^sha256=[a-f0-9]{64}$/.test(signature))
        return respond(401, {error: 'invalid_signature'});
      const expected = 'sha256=' + crypto.createHmac('sha256', env.CHATWOOT_WEBHOOK_SECRET)
        .update(timestamp + '.').update(raw).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return respond(401, {error: 'invalid_signature'});
      let p;
      try { p = JSON.parse(raw.toString('utf8')); } catch { return respond(400, {error: 'invalid_json'}); }
      if (!p || typeof p !== 'object') return respond(400, {error: 'invalid_payload'});
      const c = p.conversation;
      const account = p.account?.id ?? c?.account_id;
      const inbox = p.inbox?.id ?? c?.inbox_id;
      if (p.event !== 'message_created' || !['incoming', 0].includes(p.message_type) ||
          p.private !== false || c?.status !== 'pending' ||
          String(account) !== env.CHATWOOT_ACCOUNT_ID ||
          String(inbox) !== env.CHATWOOT_TEST_INBOX_ID)
        return respond(200, {status: 'ignored'});
      if (!Number.isSafeInteger(p.id) || p.id <= 0 || !Number.isSafeInteger(c.id) || c.id <= 0)
        return respond(400, {error: 'invalid_ids'});
      for (const [key, time] of seen) if (time < Date.now() - 600000) seen.delete(key);
      const key = account + ':' + p.id;
      if (seen.has(key)) return respond(200, {status: 'duplicate'});
      if (seen.size >= 10000) return respond(503, {error: 'busy'});
      seen.set(key, Date.now());
      try {
        const result = await send(new URL('/api/v1/accounts/' + env.CHATWOOT_ACCOUNT_ID + '/conversations/' + c.id + '/messages', base), {
          method: 'POST',
          headers: {'Content-Type': 'application/json', api_access_token: env.BOT_ACCESS_TOKEN},
          body: JSON.stringify({content: '✅ Prueba de conexión correcta. Soy el nuevo asistente de Indiefy. Todavía estoy en modo de prueba y no respondo consultas de soporte.', message_type: 'outgoing', private: false}),
          signal: AbortSignal.timeout(8000)
        });
        if (!result.ok) throw new Error('upstream');
        console.log(JSON.stringify({event: 'test_reply_sent', conversation_id: c.id, message_id: p.id}));
        return respond(200, {status: 'replied'});
      } catch {
        // Retain marker after uncertain delivery: avoid duplicate messages on retries.
        console.error(JSON.stringify({event: 'chatwoot_delivery_unconfirmed', conversation_id: c.id}));
        return respond(502, {error: 'chatwoot_delivery_unconfirmed'});
      }
    } catch { return respond(500, {error: 'internal_error'}); }
  });
}
if (require.main === module) {
  const server = createServer();
  server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Indiefy webhook test listening'));
}
module.exports = {createServer};
