# 03 · Modelo de datos

## Archivo de perfil (`*.fcprofile`)

- Formato: JSON UTF-8, indentado con 2 espacios (legible y diffeable en Git).
- Extensión: `.fcprofile`. Nombre por defecto: `perfil.fcprofile`.
- Validación con zod al leer. Si `formatVersion` es menor al actual, se migra en memoria y se reescribe en el siguiente guardado.
- **Prohibido** guardar respuestas, estados de carga, errores de red o cualquier dato derivado del servidor.

### Tipos (`src/shared/types.ts`)

```ts
export type Id = string;                       // crypto.randomUUID()

export type HttpMethod =
  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface KeyValue {
  id: Id;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export type BodyMode = 'none' | 'json' | 'text' | 'xml' | 'form-urlencoded' | 'multipart';

export interface MultipartField extends KeyValue {
  kind: 'text' | 'file';                        // file: value = ruta absoluta
}

export interface RequestBody {
  mode: BodyMode;
  raw: string;                                  // json | text | xml
  formUrlEncoded: KeyValue[];
  multipart: MultipartField[];
}

export type Auth =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string };

export interface RequestDef {
  id: Id;
  name: string;
  method: HttpMethod;
  url: string;                                  // incluye query string, puede tener {{vars}}
  params: KeyValue[];                           // espejo editable de la query string
  headers: KeyValue[];
  body: RequestBody;
  auth: Auth;
  settings: { timeoutMs: number | null; followRedirects: boolean };  // null = usar global
  createdAt: string;                            // ISO 8601
  updatedAt: string;
}

export interface Collection {
  id: Id;
  name: string;
  expanded: boolean;                            // estado del árbol
  variables: KeyValue[];                        // {{baseUrl}}, {{token}}...
  requests: RequestDef[];                       // el orden del array es el orden visual
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceState {
  openTabs: Id[];                               // ids de request, en orden
  activeTabId: Id | null;
  sidebarWidth: number;                         // px
  splitRatio: number;                           // 0..1 request/respuesta
  splitOrientation: 'vertical' | 'horizontal';     // vertical = lado a lado (divisor vertical, por defecto); horizontal = apilados
}

export interface Profile {
  formatVersion: 1;
  app: 'fast-client';
  name: string;                                 // nombre visible (por defecto = nombre del archivo)
  createdAt: string;
  updatedAt: string;
  collections: Collection[];
  workspace: WorkspaceState;
}
```

### Ejemplo

```json
{
  "formatVersion": 1,
  "app": "fast-client",
  "name": "perfil",
  "createdAt": "2026-09-25T15:00:00.000Z",
  "updatedAt": "2026-09-25T15:42:10.000Z",
  "collections": [
    {
      "id": "c1f7…",
      "name": "API Planillas",
      "expanded": true,
      "variables": [
        { "id": "v1", "key": "baseUrl", "value": "https://dev.api.local", "enabled": true }
      ],
      "requests": [
        {
          "id": "r9a2…",
          "name": "Listar empleados",
          "method": "GET",
          "url": "{{baseUrl}}/employees?page=1",
          "params": [{ "id": "p1", "key": "page", "value": "1", "enabled": true }],
          "headers": [{ "id": "h1", "key": "Accept", "value": "application/json", "enabled": true }],
          "body": { "mode": "none", "raw": "", "formUrlEncoded": [], "multipart": [] },
          "auth": { "type": "bearer", "token": "{{token}}" },
          "settings": { "timeoutMs": null, "followRedirects": true },
          "createdAt": "2026-09-25T15:10:00.000Z",
          "updatedAt": "2026-09-25T15:40:00.000Z"
        }
      ],
      "createdAt": "2026-09-25T15:05:00.000Z",
      "updatedAt": "2026-09-25T15:40:00.000Z"
    }
  ],
  "workspace": {
    "openTabs": ["r9a2…"],
    "activeTabId": "r9a2…",
    "sidebarWidth": 280,
    "splitRatio": 0.5,
    "splitOrientation": "vertical"
  }
}
```

### Reglas de integridad

- Todo request pertenece a exactamente una colección.
- `workspace.openTabs` solo contiene ids existentes; al cargar se filtran los huérfanos.
- `activeTabId` es `null` o está en `openTabs`.
- Nombres: se hace `trim()`; vacío → se restaura el nombre anterior. Los duplicados están permitidos.
- Perfil vacío válido: `collections: []`, `openTabs: []`.

## ¿Por qué JSON y no SQLite?

Decisión tomada. No cambiar sin consultar al usuario.

| Criterio | JSON (`.fcprofile`) | SQLite |
|---|---|---|
| Tamaño esperado | Decenas de KB a pocos MB: se carga entero en milisegundos | Pensado para volúmenes mucho mayores |
| Patrón de uso | Se carga completo al abrir y se guarda completo en momentos puntuales | Brilla con escrituras pequeñas y frecuentes o con consultas |
| Reubicar / copiar / enviar | Un solo archivo: mover y listo | Con WAL genera `-wal` y `-shm`; hay que cerrar la conexión o hacer checkpoint antes de mover |
| Legible y versionable en Git | Sí, se puede abrir y comparar | No, es binario |
| Empaquetado Electron | Sin dependencias nativas | `better-sqlite3` es un módulo nativo: requiere recompilarlo para Electron y complica el build |
| Seguridad ante cortes | Escritura atómica (temporal + `rename`) | Transacciones nativas |

SQLite tendría sentido si en el futuro se guardara un **historial de respuestas**, miles de requests o autosave por tecla. En ese caso se usaría como almacén **aparte** (p. ej. `historial.db`) y el perfil seguiría siendo JSON.

## Archivo de configuración (`fastclient.settings.json`)

Vive en la **carpeta de configuración** (`app.getPath('userData')`, es decir `%APPDATA%\Fast Client`), separada de los perfiles (ver doc 04 §1).

```ts
export interface AppSettings {
  settingsVersion: 1;
  lastProfilePath: string | null;               // ruta absoluta del último perfil usado
  recentProfiles: string[];                     // máx. 8, para un submenú "Recientes"
  theme: 'dark' | 'light' | 'system';          // Ajustes › Tema…
  zoomFactor: number;                           // 1 = 100 %; pasos: .5 .67 .75 .8 .9 1 1.1 1.25 1.5 1.75 2
  http: {                                       // Ajustes › Preferencias › Red
    defaultTimeoutMs: number;                   // 30000
    verifyTls: boolean;                         // true; false permite certificados autofirmados
    followRedirectsDefault: boolean;            // true; valor inicial de settings.followRedirects en requests nuevos
    maxResponseBytesToRender: number;           // 5 MB; por encima se ofrece guardar a archivo
  };
  window: { width: number; height: number; x?: number; y?: number; maximized: boolean };
  checkForUpdates: boolean;                     // buscar actualizaciones al iniciar (por defecto true)
}
```

Settings se escribe inmediatamente cada vez que cambia `lastProfilePath`, el tema, el zoom o se pulsa Guardar en Preferencias, y al cerrar. Todas las opciones de `http` y `theme`/`zoomFactor` se editan desde el menú **Ajustes** (doc 05).

## Nota de seguridad

El perfil guarda en texto plano tokens, contraseñas de Basic Auth y variables. Mostrar esto en la documentación de usuario y **no** subir perfiles con secretos a repositorios. (Posible v2: cifrar campos sensibles con `safeStorage` de Electron.)
