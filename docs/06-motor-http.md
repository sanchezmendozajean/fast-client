# 06 · Motor HTTP

Los requests se ejecutan **siempre en el proceso main** con `undici`. Así se evitan CORS, se controla TLS y el renderer se mantiene sin acceso a red.

## Flujo de un Send

```
Renderer                                   Main (HttpService)
────────                                   ──────────────────
1. Ctrl+Enter / Send
2. profile:save {reason:'send'}  ─────►  cola de escritura (no bloquea)
3. resolveRequest(req, collection)
   - interpolar {{vars}}
   - aplicar params, auth, body
4. http:send {requestId, resolved} ───►  5. AbortController por requestId
                                           6. undici.request(...) con timeout
                                           7. medir tiempos, leer body (límite)
8. mostrar respuesta  ◄──────────────────  HttpResult
```

## Resolución (renderer, `lib/` — funciones puras con test)

1. **Variables**: `{{nombre}}` se reemplaza con las variables **habilitadas** de la colección, en URL, params, headers, body raw, campos de formulario y auth. Sin recursión. Una variable no definida se deja tal cual y se muestra una advertencia no bloqueante en la respuesta ("Variables sin definir: token").
2. **URL**: si no tiene esquema, anteponer `http://`. Validar con `new URL()`; si falla, error inmediato sin llamar a main.
3. **Params**: la query string se reconstruye desde la tabla (solo filas habilitadas), respetando el orden.
4. **Auth**:
   - Bearer → `Authorization: Bearer <token>`
   - Basic → `Authorization: Basic base64(user:pass)`
   - Un header `Authorization` explícito del usuario tiene prioridad.
5. **Body y Content-Type automático** (solo si el usuario no definió `Content-Type`):
   - json → `application/json`
   - xml → `application/xml`
   - text → `text/plain; charset=utf-8`
   - form-urlencoded → `application/x-www-form-urlencoded` (codificación con `URLSearchParams`)
   - multipart → lo genera undici con el boundary (`FormData`; los archivos los lee **main** desde la ruta)
   - `GET`/`HEAD` con body: se permite, pero se muestra una advertencia.

```ts
interface ResolvedRequest {
  method: HttpMethod;
  url: string;
  headers: [string, string][];                 // conserva orden y duplicados
  body:
    | { kind: 'none' }
    | { kind: 'text'; text: string }
    | { kind: 'multipart'; fields: { key: string; kind: 'text' | 'file'; value: string }[] };
  timeoutMs: number;
  followRedirects: boolean;
  unresolvedVariables: string[];
}
```

## Ejecución (main, `http-service.ts`)

- `undici.request` con un `Agent` compartido; si `settings.http.verifyTls === false`, usar un `Agent` con `connect: { rejectUnauthorized: false }` y mostrar un aviso discreto en la respuesta ("TLS sin verificar").
- Redirecciones: con `followRedirects`, usar el interceptor `redirect` de undici (máx. 10); si no, devolver el 3xx tal cual.
- Timeout: `AbortSignal.timeout(timeoutMs)` combinado con el `AbortController` de cancelación (`AbortSignal.any`).
- `http:cancel` aborta y el resultado vuelve como `{ ok: false, error: { code: 'CANCELLED' } }`.
- Un solo request en curso por `requestId`; enviar de nuevo cancela el anterior.
- Lectura del body por streaming hasta `maxResponseBytesToRender`; si se supera, seguir descargando a memoria hasta un tope duro de 100 MB y marcar `truncatedForView: true`.

```ts
type HttpResult =
  | {
      ok: true;
      status: number;
      statusText: string;
      headers: [string, string][];
      bodyBase64: string;
      contentType: string | null;
      sizeBytes: { headers: number; body: number };
      timingMs: { total: number; ttfb: number };
      finalUrl: string;
      truncatedForView: boolean;
      warnings: string[];
    }
  | {
      ok: false;
      error: {
        code: 'CANCELLED' | 'TIMEOUT' | 'DNS' | 'REFUSED' | 'TLS' | 'RESET' | 'INVALID_URL' | 'UNKNOWN';
        message: string;                         // en español, entendible
        detail?: string;                         // mensaje técnico original
      };
      timingMs: { total: number };
    };
```

Mapeo de errores: `ENOTFOUND`/`EAI_AGAIN` → DNS, `ECONNREFUSED` → REFUSED, `ECONNRESET` → RESET, errores `CERT_*`/`UNABLE_TO_VERIFY_*`/`DEPTH_ZERO_SELF_SIGNED_CERT` → TLS (sugerir desactivar la verificación en Ajustes), `AbortError` por timeout → TIMEOUT.

## Presentación de la respuesta (renderer)

- Decodificar según `charset` del `Content-Type` (por defecto UTF-8) con `TextDecoder`.
- Detección de tipo: JSON (`application/json`, `+json`, o body que parsea), XML/HTML, imagen (`image/*` → `<img src="data:…">`), texto, binario.
- JSON formateado con 2 espacios; si no parsea, mostrar crudo.
- Las respuestas viven en `response-store` (memoria) indexadas por `requestId`. **Nunca** entran en `profile:sync` ni `profile:save`.

## cURL

- **Copiar como cURL** (`lib/curl.ts`): genera un comando con el request **resuelto** (variables sustituidas), con comillas seguras para bash. Opción de copiar en formato de Windows `cmd` como mejora futura.
- **Importar cURL**: parsear `-X`, `-H`, `-d/--data/--data-raw/--data-binary`, `--data-urlencode`, `-F`, `-u`, `--url`, `-G`, `-k` (desactiva TLS para ese request solo a nivel informativo), continuaciones de línea `\` y `^`. Crea/rellena el request de la pestaña activa.
