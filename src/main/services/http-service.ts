import { STATUS_CODES } from 'node:http';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Agent, FormData, request, type Dispatcher } from 'undici';
import type { HttpErrorCode, HttpResult, HttpSettings, ResolvedRequest } from '../../shared/types';

export const HARD_BODY_LIMIT = 100 * 1024 * 1024;
const MAX_REDIRECTS = 10;

class CancelledError extends Error {}

const secureAgent = new Agent();
const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

export function errorCodeOf(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur; i++) {
    const code = (cur as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}

/** Map a low-level error to a friendly Spanish message (doc 06). */
export function mapHttpError(err: unknown, timedOut: boolean): { code: HttpErrorCode; message: string } {
  if (timedOut) return { code: 'TIMEOUT', message: 'Se agotó el tiempo de espera del servidor.' };
  if (err instanceof CancelledError) return { code: 'CANCELLED', message: 'Request cancelado.' };
  const code = errorCodeOf(err) ?? '';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN')
    return { code: 'DNS', message: 'No se pudo resolver el nombre del servidor (DNS).' };
  if (code === 'ECONNREFUSED') return { code: 'REFUSED', message: 'El servidor rechazó la conexión.' };
  if (code === 'ECONNRESET' || code === 'UND_ERR_SOCKET')
    return { code: 'RESET', message: 'La conexión se cerró inesperadamente.' };
  if (
    code.startsWith('CERT_') ||
    code.startsWith('UNABLE_TO_VERIFY') ||
    code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
    code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    code.startsWith('ERR_TLS') ||
    code === 'ERR_SSL_WRONG_VERSION_NUMBER'
  ) {
    return {
      code: 'TLS',
      message:
        'El certificado del servidor no es válido. Si es un servidor de desarrollo, desactiva la verificación SSL en Ajustes › Preferencias.',
    };
  }
  if (code === 'UND_ERR_CONNECT_TIMEOUT' || code === 'UND_ERR_HEADERS_TIMEOUT')
    return { code: 'TIMEOUT', message: 'Se agotó el tiempo de espera del servidor.' };
  if (code === 'ERR_INVALID_URL') return { code: 'INVALID_URL', message: 'La URL no es válida.' };
  return { code: 'UNKNOWN', message: 'No se pudo completar el request.' };
}

function headersToPairs(h: Record<string, string | string[] | undefined>): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(h)) {
    if (v === undefined) continue;
    for (const item of Array.isArray(v) ? v : [v]) out.push([k, item]);
  }
  return out;
}

async function buildBody(req: ResolvedRequest): Promise<string | FormData | undefined> {
  switch (req.body.kind) {
    case 'none':
      return undefined;
    case 'text':
      return req.body.text;
    case 'multipart': {
      const fd = new FormData();
      for (const f of req.body.fields) {
        if (f.kind === 'file') {
          const buf = await readFile(f.value);
          fd.append(f.key, new Blob([buf]), basename(f.value));
        } else {
          fd.append(f.key, f.value);
        }
      }
      return fd;
    }
  }
}

function redirectMethod(status: number, method: string): string {
  if (status === 303 && method !== 'HEAD') return 'GET';
  if ((status === 301 || status === 302) && method === 'POST') return 'GET';
  return method;
}

export class HttpService {
  private readonly inFlight = new Map<string, AbortController>();

  constructor(private readonly getSettings: () => HttpSettings) {}

  cancel(requestId: string): void {
    this.inFlight.get(requestId)?.abort(new CancelledError('cancelled'));
  }

  async send(requestId: string, req: ResolvedRequest): Promise<HttpResult> {
    this.cancel(requestId); // one request per id: sending again cancels the previous one
    const controller = new AbortController();
    this.inFlight.set(requestId, controller);
    const timeoutSignal = AbortSignal.timeout(req.timeoutMs);
    const signal = AbortSignal.any([controller.signal, timeoutSignal]);
    const settings = this.getSettings();
    const dispatcher: Dispatcher = settings.verifyTls ? secureAgent : insecureAgent;
    const started = performance.now();
    const warnings: string[] = [];
    if (!settings.verifyTls && req.url.toLowerCase().startsWith('https:')) warnings.push('TLS sin verificar');

    try {
      let url = req.url;
      let method: string = req.method;
      let body = await buildBody(req);
      let headers = req.headers;
      for (let hop = 0; ; hop++) {
        const res = await request(url, {
          method: method as Dispatcher.HttpMethod,
          headers: headers.flat(), // undici wants a flat [k1, v1, k2, v2…] array (keeps order and duplicates)
          body,
          dispatcher,
          signal,
        });
        const location = res.headers.location;
        if (req.followRedirects && res.statusCode >= 300 && res.statusCode < 400 && typeof location === 'string') {
          if (hop >= MAX_REDIRECTS) throw Object.assign(new Error('Demasiadas redirecciones'), { code: 'MAX_REDIRECTS' });
          await res.body.dump();
          const nextMethod = redirectMethod(res.statusCode, method);
          if (nextMethod !== method) {
            body = undefined;
            headers = headers.filter(([k]) => !/^content-(type|length)$/i.test(k));
          }
          method = nextMethod;
          url = new URL(location, url).toString();
          continue;
        }
        const ttfb = performance.now() - started;
        const limit = settings.maxResponseBytesToRender;
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of res.body) {
          const buf = chunk as Buffer;
          size += buf.length;
          if (size > HARD_BODY_LIMIT) {
            warnings.push('La respuesta supera 100 MB y se recortó');
            res.body.destroy();
            break;
          }
          chunks.push(buf);
        }
        const bodyBuf = Buffer.concat(chunks);
        const pairs = headersToPairs(res.headers);
        const statusText = STATUS_CODES[res.statusCode] ?? '';
        const headerBytes =
          `HTTP/1.1 ${res.statusCode} ${statusText}\r\n`.length +
          pairs.reduce((n, [k, v]) => n + k.length + v.length + 4, 0) +
          2;
        const ct = res.headers['content-type'];
        return {
          ok: true,
          status: res.statusCode,
          statusText,
          headers: pairs,
          bodyBase64: bodyBuf.toString('base64'),
          contentType: typeof ct === 'string' ? ct : null,
          sizeBytes: { headers: headerBytes, body: bodyBuf.length },
          timingMs: { total: Math.round(performance.now() - started), ttfb: Math.round(ttfb) },
          finalUrl: url,
          truncatedForView: bodyBuf.length > limit,
          warnings,
        };
      }
    } catch (err) {
      const reason: unknown = controller.signal.aborted ? controller.signal.reason : err;
      const timedOut = timeoutSignal.aborted && !controller.signal.aborted;
      const mapped = errorCodeOf(err) === 'MAX_REDIRECTS'
        ? { code: 'UNKNOWN' as const, message: 'Demasiadas redirecciones (máx. 10).' }
        : mapHttpError(reason, timedOut);
      return {
        ok: false,
        error: { ...mapped, detail: err instanceof Error ? err.message : String(err) },
        timingMs: { total: Math.round(performance.now() - started) },
      };
    } finally {
      if (this.inFlight.get(requestId) === controller) this.inFlight.delete(requestId);
    }
  }
}
