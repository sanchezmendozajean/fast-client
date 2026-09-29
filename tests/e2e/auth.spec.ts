import { expect, test } from '@playwright/test';
import { mockProfile } from '../fixtures/sample-profile';
import { closeApp, launch, profilePathIn, tempHome, writeProfileFile, writeSettings } from './helpers';

test('el token Bearer crece con el contenido y se puede vaciar', async () => {
  const home = tempHome();
  writeProfileFile(profilePathIn(home), mockProfile('http://127.0.0.1:9'));
  writeSettings(home, { lastProfilePath: profilePathIn(home) });
  const { app, page } = await launch({ home });

  await page.getByRole('treeitem').filter({ hasText: 'Listar productos' }).click();
  await page.getByRole('tab', { name: 'Auth' }).click();
  await page.getByRole('radio', { name: 'Bearer' }).click();

  const token = page.getByRole('textbox', { name: 'Token' });
  const oneLine = (await token.boundingBox())!.height;
  await token.click();
  // A token copied with line breaks (e.g. from a terminal) is pasted as a single line.
  await app.evaluate(({ clipboard }, text) => clipboard.writeText(text), `eyJ${'a'.repeat(400)}\r\n  .sig\n`);
  await page.keyboard.press('Control+V');
  await expect(token).toHaveValue(`eyJ${'a'.repeat(400)}.sig`);
  expect((await token.boundingBox())!.height).toBeGreaterThan(oneLine * 2);
  await page.getByRole('button', { name: 'Mostrar' }).click();

  await page.getByRole('button', { name: 'Vaciar' }).click();
  await expect(token).toHaveValue('');
  await expect(token).toBeFocused();
  expect((await token.boundingBox())!.height).toBe(oneLine);
  await expect(page.getByRole('button', { name: 'Vaciar' })).toHaveCount(0);
  await closeApp(app);
});

test('los headers automáticos ocultan la credencial y explican su origen', async () => {
  const home = tempHome();
  writeProfileFile(profilePathIn(home), mockProfile('http://127.0.0.1:9'));
  writeSettings(home, { lastProfilePath: profilePathIn(home) });
  const { app, page } = await launch({ home });

  await page.getByRole('treeitem').filter({ hasText: 'Crear pedido' }).click();
  await page.getByRole('tab', { name: 'Auth' }).click();
  await page.getByRole('radio', { name: 'Bearer' }).click();
  await page.getByRole('textbox', { name: 'Token' }).fill('secreto-123');
  await page.getByRole('tab', { name: /Headers/ }).click();

  const row = (key: string) => page.getByRole('row').filter({ hasText: key });
  await expect(row('Authorization')).toContainText('Bearer ••••••••');
  await expect(row('Authorization')).not.toContainText('secreto-123');
  await expect(row('Authorization')).toHaveAttribute('data-tooltip', 'Valor asignado en "Auth"');
  await expect(row('Content-Type')).toHaveAttribute('data-tooltip', 'Identificado según el contenido del "body"');
  await expect(row('User-Agent')).not.toHaveAttribute('data-tooltip');
  await closeApp(app);
});
