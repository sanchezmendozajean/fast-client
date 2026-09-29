import { expect, test } from '@playwright/test';
import { mockProfile } from '../fixtures/sample-profile';
import {
  closeApp,
  launch,
  profilePathIn,
  readProfileFile,
  tempHome,
  writeProfileFile,
  writeSettings,
} from './helpers';

test('renombrar un request desde el menú contextual de la pestaña', async () => {
  const home = tempHome();
  writeProfileFile(profilePathIn(home), mockProfile('http://127.0.0.1:9'));
  writeSettings(home, { lastProfilePath: profilePathIn(home) });
  const { app, page } = await launch({ home });

  await page.getByRole('treeitem').filter({ hasText: 'Listar productos' }).click();
  const id = await page
    .locator('[role="tab"][data-tab-id]')
    .filter({ hasText: 'Listar productos' })
    .getAttribute('data-tab-id');
  const tab = page.locator(`[role="tab"][data-tab-id="${id}"]`);
  await tab.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Renombrar' }).click();

  const input = tab.getByRole('textbox', { name: 'Nombre' });
  await expect(input).toBeFocused();
  await page.keyboard.type('Productos'); // the name comes preselected
  await page.keyboard.press('Enter');

  await expect(tab).toContainText('Productos');
  await expect(page.getByRole('treeitem').filter({ hasText: /Productos$/ })).toHaveCount(1);
  await closeApp(app);
  const names = readProfileFile(profilePathIn(home)).collections.flatMap((c) =>
    c.requests.map((r) => r.name),
  );
  expect(names).toContain('Productos');
  expect(names).not.toContain('Listar productos');
});
