# Indiefy support bot: connection test

This branch is a smoke test, not an AI support bot.

## Hostinger

Deploy branch `bot-webhook-test` as a Node.js application using Node 22 or 24, repository root, and `npm start`. Set the environment variables from `.env.example` in Hostinger. Do not commit real tokens. The process reads PORT supplied by hosting, defaulting to 3000.

Create a separate Website inbox in Chatwoot for testing and set its numeric ID as CHATWOOT_TEST_INBOX_ID. Assign the new Agent Bot to that test inbox only. Configure its webhook as https://soporte.jpulido.com.mx/webhook. Use the new bot token and webhook secret.

GET /health should return status ok, mode connection-test, version 1.1.0. Send a visitor message through the test Website widget: expect a fixed Spanish connection confirmation. AI and human handoff are not implemented yet. Existing Juventino and live inboxes should remain connected until testing is complete.

## Validation

Run npm test. The test uses a mocked Chatwoot API, validates HMAC signatures and tests routing, outgoing/private messages, open conversations and repeated deliveries.

The server requires signed webhooks with a timestamp within five minutes, only processes message_created incoming public messages on the configured account/inbox with pending status, and does not log text or tokens. Replies use the account-scoped messages API. There is an 8-second API timeout. Dedupe is in memory for ten minutes, so this branch is intended for a single-instance connection test only. Unconfirmed deliveries are retained to avoid duplicate sends and logged by conversation ID; inspect Chatwoot before retesting with a new message. Production requires durable queue/idempotency and live conversation status checks before sending.
