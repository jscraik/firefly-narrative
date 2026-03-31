#!/usr/bin/env node

import { createServer } from 'node:http';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
const webhookSecret = process.env.WEBHOOK_SECRET;
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES || 1024 * 1024);
const outputPath = process.env.OUTPUT_FILE
  ? resolve(process.cwd(), process.env.OUTPUT_FILE)
  : resolve(process.cwd(), 'tmp/agentation-webhooks.ndjson');

if (!webhookSecret) {
  console.error('Missing WEBHOOK_SECRET. Refusing to start unauthenticated webhook listener.');
  process.exit(1);
}

mkdirSync(dirname(outputPath), { recursive: true });

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
};

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed. Use POST.' });
    return;
  }

  const requestSecret = req.headers['x-webhook-secret'];
  if (requestSecret !== webhookSecret) {
    sendJson(res, 401, { ok: false, error: 'Unauthorized.' });
    return;
  }

  let raw = '';
  let requestSize = 0;
  let bodyTooLarge = false;

  req.on('data', (chunk) => {
    if (bodyTooLarge) return;
    requestSize += chunk.length;
    if (requestSize > maxBodyBytes) {
      bodyTooLarge = true;
      sendJson(res, 413, {
        ok: false,
        error: `Payload too large. Max size is ${maxBodyBytes} bytes.`
      });
      req.destroy();
      return;
    }
    raw += chunk.toString();
  });

  req.on('end', () => {
    if (bodyTooLarge) return;

    try {
      const parsed = raw ? JSON.parse(raw) : {};
      const row = {
        receivedAt: new Date().toISOString(),
        event: parsed.event ?? 'unknown',
        url: parsed.url ?? null,
        payload: parsed
      };

      appendFileSync(outputPath, `${JSON.stringify(row)}\n`, 'utf8');

      const annotationId =
        parsed.annotation?.id ??
        parsed.annotations?.[0]?.id ??
        null;

      console.log(
        `[agentation-webhook] ${row.receivedAt} event=${row.event} annotationId=${annotationId ?? 'n/a'}`
      );

      sendJson(res, 200, { ok: true });
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: Webhook processing failures are intentionally surfaced.
      console.warn('[agentation-webhook-listener] Request processing failed:', err);
      sendJson(res, 400, {
        ok: false,
        error: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  });
});

server.listen(port, host, () => {
  console.log(`Agentation webhook listener running on http://${host}:${port}`);
  console.log(`Writing events to ${outputPath}`);
  console.log(`Max payload size ${maxBodyBytes} bytes`);
});
