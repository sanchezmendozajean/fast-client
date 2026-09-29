import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockProfile } from '../fixtures/sample-profile';
import { closeApp, launch, profilePathIn, readProfileFile, tempHome, writeProfileFile, writeSettings } from './helpers';

async function dragBy(page: Page, handle: Locator, dx: number): Promise<void> {
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 8 });
  await page.mouse.up();
}

test('soltar un divisor guarda el tamaño de los paneles en el perfil', async () => {
  const home = tempHome();
  const file = profilePathIn(home);
  writeProfileFile(file, mockProfile('http://127.0.0.1:9'));
  writeSettings(home, { lastProfilePath: file });
  const { app, page } = await launch({ home });
  const workspace = () => readProfileFile(file).workspace;
  const before = workspace();

  await dragBy(page, page.getByRole('separator', { name: 'Arrastra para redimensionar' }).first(), 60);
  await expect.poll(() => workspace().sidebarWidth).toBe(before.sidebarWidth + 60);

  await page.getByRole('treeitem').filter({ hasText: 'Listar productos' }).click();
  await dragBy(page, page.locator('[role="separator"][aria-orientation="vertical"]').last(), -120);
  await expect.poll(() => workspace().splitRatio).toBeLessThan(before.splitRatio);

  // Double-click restores the default and is saved too.
  await page.locator('[role="separator"][aria-orientation="vertical"]').last().dblclick();
  await expect.poll(() => workspace().splitRatio).toBe(0.5);
  await closeApp(app);
});
