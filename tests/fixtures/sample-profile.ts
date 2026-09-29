import type { Collection, Profile, RequestDef } from '../../src/shared/types';

const ts = '2026-09-25T10:00:00.000Z';

function req(id: string, name: string, method: RequestDef['method'], url: string, patch: Partial<RequestDef> = {}): RequestDef {
  return {
    id,
    name,
    method,
    url,
    params: [],
    headers: [],
    body: { mode: 'none', raw: '', formUrlEncoded: [], multipart: [] },
    auth: { type: 'none' },
    settings: { timeoutMs: null, followRedirects: true },
    createdAt: ts,
    updatedAt: ts,
    ...patch,
  };
}

export const ORDER_BODY = `{
  "clienteId": "cli_8f2a41",
  "moneda": "EUR",
  "items": [
    { "productoId": "prd_1042", "cantidad": 2 },
    { "productoId": "prd_2210", "cantidad": 1 }
  ],
  "envio": {
    "metodo": "estandar",
    "direccion": "Calle Mayor 14, 28013 Madrid"
  },
  "notas": null
}`;

export const ORDER_RESPONSE = {
  id: 'ped_5c19e7',
  estado: 'pendiente',
  clienteId: 'cli_8f2a41',
  moneda: 'EUR',
  items: [
    { productoId: 'prd_1042', nombre: 'Auriculares inalámbricos', cantidad: 2, precioUnitario: 59.9, subtotal: 119.8 },
    { productoId: 'prd_2210', nombre: 'Funda de silicona', cantidad: 1, precioUnitario: 14.5, subtotal: 14.5 },
  ],
  envio: { metodo: 'estandar', coste: 4.95, entregaEstimada: '2026-09-29' },
  total: 139.25,
  pagado: false,
  creadoEn: '2026-09-25T10:42:18Z',
  _links: { self: '/orders/ped_5c19e7' },
};

/** The data shown in the approved mock-up (docs/diseno/project/Workspace.dc.html). */
export function mockProfile(baseUrl: string): Profile {
  const tienda: Collection = {
    id: 'col-tienda',
    name: 'API Tienda',
    expanded: true,
    variables: [{ id: 'v-base', key: 'baseUrl', value: baseUrl, enabled: true }],
    requests: [
      req('r-listar', 'Listar productos', 'GET', '{{baseUrl}}/products?page=1'),
      req('r-crear', 'Crear pedido', 'POST', '{{baseUrl}}/orders', {
        headers: [
          { id: 'h1', key: 'Accept', value: 'application/json', enabled: true },
          { id: 'h2', key: 'X-Request-ID', value: 'demo-001', enabled: true },
          { id: 'h3', key: 'Accept-Language', value: 'es-ES', enabled: true },
        ],
        body: { mode: 'json', raw: ORDER_BODY, formUrlEncoded: [], multipart: [] },
      }),
      req('r-stock', 'Actualizar stock', 'PUT', '{{baseUrl}}/stock/prd_1042'),
      req('r-carrito', 'Eliminar carrito', 'DELETE', '{{baseUrl}}/cart/cli_8f2a41'),
    ],
    createdAt: ts,
    updatedAt: ts,
  };
  const auth: Collection = {
    id: 'col-auth',
    name: 'Autenticación',
    expanded: false,
    variables: [{ id: 'v-base2', key: 'baseUrl', value: baseUrl, enabled: true }],
    requests: [
      req('r-login', 'Login', 'POST', '{{baseUrl}}/auth/login', {
        body: { mode: 'json', raw: '{ "usuario": "ana", "clave": "secreto" }', formUrlEncoded: [], multipart: [] },
      }),
      req('r-refresh', 'Refrescar token', 'POST', '{{baseUrl}}/auth/refresh', { auth: { type: 'bearer', token: '{{token}}' } }),
    ],
    createdAt: ts,
    updatedAt: ts,
  };
  return {
    formatVersion: 1,
    app: 'fast-client',
    name: 'perfil',
    createdAt: ts,
    updatedAt: ts,
    collections: [tienda, auth],
    workspace: {
      openTabs: ['r-listar', 'r-crear', 'r-login'],
      activeTabId: 'r-crear',
      sidebarWidth: 280,
      splitRatio: 0.5,
      splitOrientation: 'vertical',
    },
  };
}
