import { expect, test, type Locator, type Page } from '@playwright/test';
import { chmodSync } from 'node:fs';
import { mockProfile } from '../fixtures/sample-profile';
import {
  closeApp,
  launch,
  pressNative,
  profilePathIn,
  readProfileFile,
  tempHome,
  writeProfileFile,
  writeSettings,
} from './helpers';

function withProfile(): string {
  const home = tempHome();
  writeProfileFile(profilePathIn(home), mockProfile('http://127.0.0.1:9'));
  writeSettings(home, { lastProfilePath: profilePathIn(home) });
  return home;
}

const row = (page: Page, text: string): Locator => page.getByRole('treeitem').filter({ hasText: text });

async function drag(page: Page, from: Locator, to: Locator): Promise<void> {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + 40, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 40, a.y + a.height / 2 + 8, { steps: 4 });
  await page.mouse.move(b.x + 40, b.y + b.height / 2, { steps: 12 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}

test('arrastrar un request a otra colección y conservar el orden tras reiniciar', async () => {
  const home = withProfile();
  let { app, page } = await launch({ home });
  await drag(page, row(page, 'Eliminar carrito'), row(page, 'Autenticación'));
  await expect(row(page, 'Autenticación')).toHaveAttribute('aria-expanded', 'true');
  await expect(row(page, 'Autenticación')).toContainText('3');
  await closeApp(app); // closing is a save moment
  const disk = readProfileFile(profilePathIn(home));
  expect(disk.collections[0]?.requests.map((r) => r.name)).toEqual(['Listar productos', 'Crear pedido', 'Actualizar stock']);
  expect(disk.collections[1]?.requests.map((r) => r.name)).toContain('Eliminar carrito');

  ({ app, page } = await launch({ home }));
  await expect(row(page, 'API Tienda')).toContainText('3');
  await closeApp(app);
});

test('el árbol se opera con teclado', async () => {
  const { app, page } = await launch({ home: withProfile() });
  await row(page, 'API Tienda').click(); // toggles (collapses) and selects
  await expect(row(page, 'API Tienda')).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowRight');
  await expect(row(page, 'API Tienda')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowRight'); // into the first child
  await expect(row(page, 'Listar productos')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(row(page, 'Actualizar stock')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[role="tab"][aria-selected="true"][data-tab-id]')).toContainText('Actualizar stock');
  await page.keyboard.press('ArrowLeft'); // back to the parent collection
  await expect(row(page, 'API Tienda')).toBeFocused();
  await page.keyboard.press('End');
  await expect(row(page, 'Autenticación')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(row(page, 'Autenticación')).toHaveAttribute('aria-expanded', 'true');
  // context menu from the keyboard, then "Mover a…" is reachable
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ContextMenu');
  await expect(page.getByRole('menuitem', { name: /Mover a/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await closeApp(app);
});

test('perfil de solo lectura: toast con Reintentar y Reubicar…', async () => {
  const home = withProfile();
  const file = profilePathIn(home);
  const { app, page } = await launch({ home });
  chmodSync(file, 0o444);
  try {
    await pressNative(app, 's');
    const toast = page.getByRole('alert').filter({ hasText: 'No se pudo guardar el perfil' });
    await expect(toast).toBeVisible({ timeout: 10_000 });
    await expect(toast.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await expect(toast.getByRole('button', { name: 'Reubicar…' })).toBeVisible();
    chmodSync(file, 0o666);
    await toast.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('img', { name: 'Cambios sin guardar' })).toHaveCount(0);
  } finally {
    chmodSync(file, 0o666);
  }
  await closeApp(app);
});
