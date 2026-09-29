import { expect, test, type Page } from '@playwright/test';
import { mockProfile } from '../fixtures/sample-profile';
import { startHttpsServer, startServer, type TestServer } from '../fixtures/server';
import { closeApp, launch, profilePathIn, readSettings, tempHome, writeProfileFile, writeSettings } from './helpers';

let http: TestServer;
let https: TestServer;

test.beforeAll(async () => {
  http = await startServer();
  https = await startHttpsServer();
});

test.afterAll(async () => {
  await http.close();
  await https.close();
});

async function setUrl(page: Page, url: string): Promise<void> {
  await page.locator('[data-url-input]').fill(url);
}

async function openRequest(page: Page, name: string): Promise<void> {
  await page.getByRole('treeitem').filter({ hasText: name }).click();
}

function withProfile(): string {
  const home = tempHome();
  writeProfileFile(profilePathIn(home), mockProfile(http.url));
  writeSettings(home, { lastProfilePath: profilePathIn(home) });
  return home;
}

test('8. Send: echo POST JSON, cancelar, timeout, DNS y TLS', async () => {
  const { app, page } = await launch({ home: withProfile() });

  // echo of a POST JSON body with interpolated variables
  await openRequest(page, 'Crear pedido');
  await setUrl(page, '{{baseUrl}}/echo');
  await page.keyboard.press('Control+Enter');
  await expect(page.getByText('200 OK')).toBeVisible();
  await expect(page.locator('.cm-content').last()).toContainText('"method": "POST"');
  await expect(page.locator('.cm-content').last()).toContainText('cli_8f2a41');
  await expect(page.locator('.cm-content').last()).toContainText('application/json');

  // 201 from the mock endpoint
  await setUrl(page, '{{baseUrl}}/orders');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('201 Created')).toBeVisible();

  // cancel a slow request
  await setUrl(page, '{{baseUrl}}/delay/10000');
  await page.keyboard.press('Control+Enter');
  await page.getByRole('button', { name: 'Cancelar' }).first().click();
  await expect(page.getByText('Request cancelado.')).toBeVisible();

  // timeout from the request options
  await page.getByRole('tab', { name: /Opciones/ }).click();
  await page.getByRole('textbox', { name: 'Timeout del request' }).fill('1');
  await page.keyboard.press('Control+Enter');
  await expect(page.getByText('Se agotó el tiempo de espera del servidor.')).toBeVisible({ timeout: 10_000 });

  // DNS error (back to the global timeout first)
  await page.getByRole('textbox', { name: 'Timeout del request' }).fill('');
  await setUrl(page, 'http://no-existe.invalid/');
  await page.keyboard.press('Control+Enter');
  await expect(page.getByText(/No se pudo resolver el nombre del servidor/)).toBeVisible({ timeout: 15_000 });

  // self-signed TLS fails while verification is on
  await setUrl(page, `${https.url}/json`);
  await page.keyboard.press('Control+Enter');
  await expect(page.getByText(/El certificado del servidor no es válido/)).toBeVisible();
  await closeApp(app);
});

test('10. menú Ajustes: zoom, tema y SSL desde Preferencias', async () => {
  const home = withProfile();
  let { app, page } = await launch({ home });

  await page.getByRole('button', { name: 'Ajustes' }).dispatchEvent('mousedown');
  await page.getByRole('menuitem', { name: /Zoom: Ampliar/ }).click();
  await expect(page.getByText('110 %')).toBeVisible();
  await expect.poll(() => readSettings(home).zoomFactor).toBe(1.1);

  await page.getByRole('button', { name: 'Ajustes' }).dispatchEvent('mousedown');
  await page.getByRole('menuitemradio', { name: /Tema claro/ }).click();
  await expect.poll(() => page.evaluate(() => window.document.documentElement.dataset.theme)).toBe('light');

  await page.getByRole('button', { name: 'Ajustes' }).dispatchEvent('mousedown');
  await page.getByRole('menuitem', { name: /Preferencias/ }).click();
  await expect(page.getByRole('textbox', { name: 'Perfil actual' })).toHaveValue(profilePathIn(home));
  await page.getByRole('dialog').getByRole('button', { name: 'Abrir carpeta' }).click();
  await expect
    .poll(() => app.evaluate(() => (globalThis as { __fastClientRevealLog?: string[] }).__fastClientRevealLog ?? []))
    .toEqual([profilePathIn(home)]);
  await page.getByRole('switch', { name: 'Verificar certificados SSL' }).click();
  await expect(page.getByText('Solo para servidores de desarrollo con certificados autofirmados.')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click();
  await expect.poll(() => readSettings(home).http.verifyTls).toBe(false);

  await openRequest(page, 'Listar productos');
  await setUrl(page, `${https.url}/json`);
  await page.keyboard.press('Control+Enter');
  await expect(page.getByText('200 OK')).toBeVisible();
  await expect(page.getByText('TLS sin verificar')).toBeVisible();
  await closeApp(app);

  ({ app, page } = await launch({ home }));
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.webContents.getZoomFactor())).toBeCloseTo(1.1);
  await expect.poll(() => page.evaluate(() => window.document.documentElement.dataset.theme)).toBe('light');
  await closeApp(app);
});

test('11. sin red externa desde la interfaz', async () => {
  const { app, page } = await launch({ home: withProfile() });
  const external: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!/^(file|data|devtools|blob):/.test(u)) external.push(u);
  });
  await page.reload();
  await page.waitForSelector('[data-app-ready]');
  await page.getByRole('button', { name: 'Ajustes' }).dispatchEvent('mousedown');
  await page.keyboard.press('Escape');
  await openRequest(page, 'Crear pedido');
  await page.keyboard.press('Control+Enter');
  await expect(page.getByText('201 Created')).toBeVisible();
  expect(external).toEqual([]);
  const fontsOk = await page.evaluate(async () => {
    const doc = (globalThis as unknown as { document: { fonts: { ready: Promise<unknown>; check(f: string): boolean } } }).document;
    await doc.fonts.ready;
    return doc.fonts.check('16px "Material Symbols Rounded"') && doc.fonts.check('13px Inter');
  });
  expect(fontsOk).toBe(true);
  await closeApp(app);
});

test('la respuesta ajusta las líneas largas por defecto y el botón lo alterna', async () => {
  const { app, page } = await launch({ home: withProfile() });
  await openRequest(page, 'Listar productos');
  await setUrl(page, '{{baseUrl}}/token');
  await page.keyboard.press('Control+Enter');
  await expect(page.getByText('200 OK')).toBeVisible();
  const scroller = page.locator('.cm-scroller').last();
  const overflows = (): Promise<boolean> => scroller.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  await expect.poll(overflows).toBe(false);
  await page.getByRole('button', { name: 'Ajuste de línea' }).click();
  await expect.poll(overflows).toBe(true);
  await page.getByRole('button', { name: 'Ajuste de línea' }).click();
  await expect.poll(overflows).toBe(false);
  await closeApp(app);
});
