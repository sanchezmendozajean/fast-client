import { expect, test, type Page } from '@playwright/test';
import { mockProfile } from '../fixtures/sample-profile';
import {
  closeApp,
  expectFileChanged,
  launch,
  pressNative,
  profilePathIn,
  readProfileFile,
  readSettings,
  snapshotFile,
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

const activeTab = (page: Page) => page.locator('[role="tab"][aria-selected="true"][data-tab-id]');

test('URL ↔ Params: sincronía en ambos sentidos sin perder foco ni cursor', async () => {
  const { app, page } = await launch({ home: withProfile() });
  await page.getByRole('treeitem').filter({ hasText: 'Listar productos' }).click();
  const url = page.locator('[data-url-input]');

  // typing in the middle of the URL keeps focus and caret
  await url.click();
  await url.press('End');
  await page.keyboard.type('&size=20');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('5'); // caret was before "20"
  await expect(url).toHaveValue('{{baseUrl}}/products?page=1&size=520');
  await expect(url).toBeFocused();

  await page.getByRole('tab', { name: /Params/ }).click();
  const table = page.getByRole('table', { name: 'Params' });
  await expect(table.locator('input[value="size"]')).toBeVisible();
  await expect(table.locator('input[value="520"]')).toBeVisible();

  // editing a param value rewrites the URL and keeps focus in the cell
  const cell = table.locator('input[value="520"]');
  await cell.click();
  await cell.press('End');
  await page.keyboard.press('Backspace');
  await expect(url).toHaveValue('{{baseUrl}}/products?page=1&size=52');
  await expect(table.locator('input[value="52"]')).toBeFocused();

  // disabling a param removes it from the URL
  await table.getByRole('checkbox', { name: 'Habilitar' }).first().click();
  await expect(url).toHaveValue('{{baseUrl}}/products?size=52');
  await closeApp(app);
});

test('atajos de teclado (doc 05)', async () => {
  const home = withProfile();
  const file = profilePathIn(home);
  const { app, page } = await launch({ home });

  // Ctrl+1…9 / Ctrl+Tab / Ctrl+Shift+Tab
  await page.keyboard.press('Control+1');
  await expect(activeTab(page)).toContainText('Listar productos');
  await page.keyboard.press('Control+Tab');
  await expect(activeTab(page)).toContainText('Crear pedido');
  await page.keyboard.press('Control+Shift+Tab');
  await expect(activeTab(page)).toContainText('Listar productos');
  await page.keyboard.press('Control+9');
  await expect(activeTab(page)).toContainText('Login');

  // Ctrl+W closes the active tab (the request is not deleted)
  await page.keyboard.press('Control+w');
  await expect(page.locator('[data-tab-id]')).toHaveCount(2);
  await expect(page.getByRole('treeitem').filter({ hasText: 'Autenticación' })).toBeVisible();

  // Ctrl+T creates a request with focus in the URL; Ctrl+L refocuses it
  await page.keyboard.press('Control+t');
  await expect(activeTab(page)).toContainText('Nuevo request');
  await expect(page.locator('[data-url-input]')).toBeFocused();
  await page.getByRole('tab', { name: /Params/ }).click();
  await page.keyboard.press('Control+l');
  await expect(page.locator('[data-url-input]')).toBeFocused();

  // Ctrl+K focuses search; Ctrl+B hides/shows the sidebar
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('textbox', { name: 'Buscar' })).toBeFocused();
  await page.keyboard.type('stock');
  await expect(page.getByRole('treeitem')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+b');
  await expect(page.getByRole('tree')).toHaveCount(0);
  await page.keyboard.press('Control+b');
  await expect(page.getByRole('tree')).toBeVisible();

  // F2 renames the selection, Supr deletes it (with confirmation)
  await page.getByRole('treeitem').filter({ hasText: 'Actualizar stock' }).click();
  let before = snapshotFile(file);
  await page.keyboard.press('F2');
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Stock v2');
  await page.keyboard.press('Enter');
  await expectFileChanged(file, before);
  before = snapshotFile(file);
  await page.getByRole('treeitem').filter({ hasText: 'Stock v2' }).click();
  await page.keyboard.press('Delete');
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expectFileChanged(file, before);
  expect(JSON.stringify(readProfileFile(file))).not.toContain('Stock v2');

  // Ctrl+Shift+F formats JSON in the body editor
  await page.getByRole('treeitem').filter({ hasText: 'Crear pedido' }).click();
  await page.getByRole('tab', { name: /Body/ }).click();
  await page.getByRole('radio', { name: 'JSON' }).click();
  const editor = page.locator('.cm-content').first();
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('{"a":1,"b":[1,2]}');
  await page.keyboard.press('Control+Shift+f');
  await expect(editor).toContainText('"a": 1,');

  // native accelerators: Ctrl+S saves, Ctrl+= / Ctrl+- / Ctrl+0 zoom
  before = snapshotFile(file);
  await pressNative(app, 's');
  await expectFileChanged(file, before);
  await pressNative(app, '=');
  await expect.poll(() => readSettings(home).zoomFactor).toBe(1.1);
  await pressNative(app, '-');
  await pressNative(app, '-');
  await expect.poll(() => readSettings(home).zoomFactor).toBe(0.9);
  await pressNative(app, '0');
  await expect.poll(() => readSettings(home).zoomFactor).toBe(1);

  // Ctrl+, opens Preferences; Esc closes it
  await pressNative(app, ',');
  await expect(page.getByRole('dialog', { name: 'Preferencias' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Ctrl+Q quits through the safe close flow
  const exited = new Promise<void>((r) => app.process().once('exit', () => r()));
  await pressNative(app, 'q');
  await exited;
});
