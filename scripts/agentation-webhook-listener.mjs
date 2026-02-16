#!/usr/bin/env node

import { createServer } from 'node:http';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const port = Number(process.env.PORT || 8787);
const outputPath = process.env.OUTPUT_FILE
  ? resolve(process.cwd(), process.env.OUTPUT_FILE)
  : resolve(process.cwd(), 'tmp/agentation-webhooks.ndjson');

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

  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk.toString();
  });

  req.on('end', () => {
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
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Agentation webhook listener running on http://localhost:${port}`);
  console.log(`Writing events to ${outputPath}`);
});
