import { expect, test } from '@playwright/test';
import { existsSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mockProfile } from '../fixtures/sample-profile';
import {
  closeApp,
  expectFileChanged,
  launch,
  pressNative,
  profilePathIn,
  readProfileFile,
  readSettings,
  sendMenuCommand,
  snapshotFile,
  tempHome,
  writeProfileFile,
  writeSettings,
} from './helpers';

test('1. primer arranque: interfaz sin diálogos y perfil creado', async () => {
  const { app, page, home } = await launch();
  expect(existsSync(profilePathIn(home))).toBe(true);
  expect(existsSync(join(home, 'fastclient.settings.json'))).toBe(true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Crear tu primera colección')).toBeVisible();
  await expect(page.getByText('perfil.fcprofile')).toBeVisible();
  await closeApp(app);
});

test('2. autoguardado solo en los momentos definidos', async () => {
  const { app, page, home } = await launch();
  const file = profilePathIn(home);

  let before = snapshotFile(file);
  await page.getByRole('button', { name: 'Nueva colección' }).first().click();
  await expectFileChanged(file, before);
  expect(readProfileFile(file).collections).toHaveLength(1);

  // rename the new collection (inline input is focused)
  before = snapshotFile(file);
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Pagos');
  await page.keyboard.press('Enter');
  await expectFileChanged(file, before);
  expect(readProfileFile(file).collections[0]?.name).toBe('Pagos');

  before = snapshotFile(file);
  await page.keyboard.press('Control+t');
  await expectFileChanged(file, before);
  expect(readProfileFile(file).collections[0]?.requests).toHaveLength(1);

  // editing a header without Send does not write
  await page.getByRole('tab', { name: /Headers/ }).click();
  before = snapshotFile(file);
  await page.getByRole('table', { name: 'Headers' }).getByPlaceholder('Clave').last().fill('X-Test');
  await page.waitForTimeout(1200);
  expect(snapshotFile(file)).toBe(before);

  // Send writes (the request fails: no URL, but the save still happens)
  await page.locator('[data-url-input]').fill('http://127.0.0.1:9/nada');
  await page.keyboard.press('Control+Enter');
  await expectFileChanged(file, before);
  expect(readProfileFile(file).collections[0]?.requests[0]?.headers[0]?.key).toBe('X-Test');

  // delete writes
  before = snapshotFile(file);
  await page.getByRole('treeitem').filter({ hasText: 'Nuevo request' }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: /Eliminar/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expectFileChanged(file, before);
  expect(readProfileFile(file).collections[0]?.requests).toHaveLength(0);

  // close writes
  await page.getByRole('treeitem').filter({ hasText: 'Pagos' }).click();
  before = snapshotFile(file);
  await closeApp(app);
  expect(snapshotFile(file)).not.toBe(before);
});

test('3. restauración de árbol, pestañas y valores sin respuestas', async () => {
  const home = tempHome();
  const path = profilePathIn(home);
  writeProfileFile(path, mockProfile('http://127.0.0.1:9'));
  writeSettings(home, { lastProfilePath: path });
  let { app, page } = await launch({ home });
  await page.getByRole('tab', { name: /Login/ }).click();
  await page.getByRole('tab', { name: /Headers/ }).click();
  await page.getByRole('table', { name: 'Headers' }).getByPlaceholder('Clave').last().fill('X-Restaurar');
  await closeApp(app);

  ({ app, page } = await launch({ home }));
  await expect(page.getByRole('tab', { name: /Login/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: /Crear pedido/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Listar productos/ })).toBeVisible();
  await page.getByRole('tab', { name: /Headers/ }).click();
  await expect(page.locator('input[value="X-Restaurar"]')).toBeVisible();
  const disk = readProfileFile(path);
  expect(JSON.stringify(disk)).not.toMatch(/bodyBase64|statusText|responses/);
  await closeApp(app);
});

test('4. perfil perdido: toast y flujo Nuevo', async () => {
  const home = tempHome();
  const other = join(home, 'trabajo.fcprofile');
  writeProfileFile(other, mockProfile('http://x'));
  writeSettings(home, { lastProfilePath: other });
  renameSync(other, join(home, 'movido.json'));
  const { app, page } = await launch({ home });
  await expect(page.getByText(/No se encontró el perfil «trabajo.fcprofile»/)).toBeVisible();
  expect(existsSync(profilePathIn(home))).toBe(true);
  await expect(page.getByText('Crear tu primera colección')).toBeVisible();
  await closeApp(app);
});

test('5. Nuevo con conflicto: reubicar, crear de todas formas (+ .bak) y cancelar', async () => {
  const home = tempHome();
  const def = profilePathIn(home);
  writeProfileFile(def, mockProfile('http://x'));
  writeSettings(home, { lastProfilePath: def });
  const moved = join(home, 'archivado.fcprofile');
  const { app, page } = await launch({ home, dialogResponses: [moved] });
  const dialog = page.getByRole('dialog');

  await sendMenuCommand(app, 'file:new');
  await expect(dialog.getByText('Ya existe un perfil por defecto')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('API Tienda')).toBeVisible();

  await sendMenuCommand(app, 'file:new');
  await dialog.getByRole('button', { name: 'Reubicar el existente primero' }).click();
  await expect(page.getByText('Crear tu primera colección')).toBeVisible();
  expect(readProfileFile(moved).collections).toHaveLength(2);
  expect(readProfileFile(def).collections).toHaveLength(0);

  await page.getByRole('button', { name: 'Nueva colección' }).first().click();
  await expect(page.getByRole('textbox', { name: 'Nombre' })).toBeFocused();
  await page.keyboard.press('Enter');
  await sendMenuCommand(app, 'file:new');
  await dialog.getByRole('button', { name: 'Crear nuevo de todas formas' }).click();
  await expect(page.getByText('Crear tu primera colección')).toBeVisible();
  expect(readProfileFile(`${def}.bak`).collections).toHaveLength(1);
  await closeApp(app);
});

test('6. Abrir: válido carga, inválido muestra error y conserva el actual', async () => {
  const home = tempHome();
  const valid = join(home, 'otro.fcprofile');
  writeProfileFile(valid, mockProfile('http://x'));
  const invalid = join(home, 'roto.fcprofile');
  writeFileSync(invalid, '{ "app": "no" }');
  const { app, page } = await launch({ home, dialogResponses: [invalid, valid] });

  await sendMenuCommand(app, 'file:open');
  await expect(page.getByText('El archivo no es un perfil válido de Fast Client')).toBeVisible();
  await expect(page.getByText('perfil.fcprofile')).toBeVisible();

  await sendMenuCommand(app, 'file:open');
  await expect(page.getByText('otro.fcprofile')).toBeVisible();
  await expect(page.getByText('API Tienda')).toBeVisible();
  expect(readSettings(home).lastProfilePath).toBe(valid);
  await closeApp(app);
});

test('7. Reubicar mueve el archivo con los cambios y se reabre en el destino', async () => {
  const home = tempHome();
  const dest = join(home, 'reubicado.fcprofile');
  let { app, page } = await launch({ home, dialogResponses: [dest] });
  await page.getByRole('button', { name: 'Nueva colección' }).first().click();
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Sin guardar aún');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Control+t');
  await page.locator('[data-url-input]').fill('http://cambio-no-guardado');
  await sendMenuCommand(app, 'file:relocate');
  await expect(page.getByText('reubicado.fcprofile', { exact: true })).toBeVisible();
  expect(existsSync(profilePathIn(home))).toBe(false);
  expect(readProfileFile(dest).collections[0]?.requests[0]?.url).toBe('http://cambio-no-guardado');
  await closeApp(app);

  ({ app, page } = await launch({ home }));
  await expect(page.getByText('reubicado.fcprofile', { exact: true })).toBeVisible();
  await closeApp(app);
});

test('9. Ir al archivo muestra el perfil actual en el Explorador', async () => {
  const { app, home } = await launch();
  await pressNative(app, 'e', ['control', 'shift']);
  await expect
    .poll(() => app.evaluate(() => (globalThis as { __fastClientRevealLog?: string[] }).__fastClientRevealLog ?? []))
    .toEqual([profilePathIn(home)]);
  await closeApp(app);
});
