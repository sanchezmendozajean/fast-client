import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { ORDER_RESPONSE } from './sample-profile';

/** 1×1 transparent PNG. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const body = await readBody(req);
  const json = (status: number, data: unknown): void => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data, null, 2));
  };
  const p = url.pathname;
  if (p === '/echo') {
    return json(200, {
      method: req.method,
      path: p,
      query: Object.fromEntries(url.searchParams),
      headers: req.headers,
      body: body.toString('utf8'),
    });
  }
  const status = /^\/status\/(\d{3})$/.exec(p);
  if (status) return json(Number(status[1]), { status: Number(status[1]) });
  const delay = /^\/delay\/(\d+)$/.exec(p);
  if (delay) {
    await new Promise((r) => setTimeout(r, Number(delay[1])));
    return json(200, { delayed: Number(delay[1]) });
  }
  if (p === '/orders' && req.method === 'POST') return json(201, ORDER_RESPONSE);
  if (p === '/json') return json(200, { ok: true, items: [1, 2, 3] });
  if (p === '/token') return json(200, { token: `eyJ${'A'.repeat(1200)}.sig` });
  if (p === '/xml') {
    res.writeHead(200, { 'Content-Type': 'application/xml' });
    res.end('<pedido><id>1</id><estado>ok</estado></pedido>');
    return;
  }
  if (p === '/image.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(PNG);
    return;
  }
  if (p === '/big') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('x'.repeat(6 * 1024 * 1024));
    return;
  }
  if (p === '/redirect') {
    res.writeHead(302, { Location: '/json' });
    res.end();
    return;
  }
  return json(200, { path: p, method: req.method });
}

export interface TestServer {
  url: string;
  server: Server | import('node:https').Server;
  close(): Promise<void>;
}

export async function startServer(): Promise<TestServer> {
  const server = createServer((req, res) => void handle(req, res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    server,
    close: () =>
      new Promise((r) => {
        server.closeAllConnections();
        server.close(() => r());
      }),
  };
}

/** HTTPS server with a self-signed certificate (tests/fixtures/selfsigned.*, test-only). */
export async function startHttpsServer(): Promise<TestServer> {
  const server = createHttpsServer(
    { key: readFileSync(join(__dirname, 'selfsigned.key')), cert: readFileSync(join(__dirname, 'selfsigned.crt')) },
    (req, res) => void handle(req, res),
  );
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `https://127.0.0.1:${port}`,
    server,
    close: () =>
      new Promise((r) => {
        server.closeAllConnections();
        server.close(() => r());
      }),
  };
}
