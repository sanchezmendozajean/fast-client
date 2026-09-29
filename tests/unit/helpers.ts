import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newCollection, newProfile, newRequest } from '../../src/shared/defaults';
import type { Profile } from '../../src/shared/types';

export function tmp(prefix = 'fc-unit-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Profile with one collection, two requests and an open tab. */
export function sampleProfile(): Profile {
  const p = newProfile('perfil');
  const col = newCollection('API Tienda');
  const a = { ...newRequest('Listar productos'), url: '{{baseUrl}}/products?page=1' };
  const b = { ...newRequest('Crear pedido', true, 'POST'), url: '{{baseUrl}}/orders' };
  col.requests.push(a, b);
  col.variables.push({ id: 'v1', key: 'baseUrl', value: 'https://api.tienda.dev/v1', enabled: true });
  p.collections.push(col);
  p.workspace.openTabs = [a.id];
  p.workspace.activeTabId = a.id;
  return p;
}
