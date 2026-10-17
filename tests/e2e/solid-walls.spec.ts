import { test, expect } from '@playwright/test';

test('reuses wall geometry when selecting rooms and switching appearance', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('roompilot.language', 'ru');
    const state = window as unknown as { geometryUploads: number }; state.geometryUploads = 0;
    const original = WebGL2RenderingContext.prototype.bufferData;
    WebGL2RenderingContext.prototype.bufferData = function (...args: Parameters<typeof original>) { state.geometryUploads++; return original.apply(this, args); };
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Открыть демо', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByTestId('scene-3d').locator('canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { geometryUploads: number }).geometryUploads)).toBeGreaterThan(0);
  await page.evaluate(() => { (window as unknown as { geometryUploads: number }).geometryUploads = 0; });
  await page.getByRole('button', { name: /02 Детская спальня/ }).click();
  await page.getByTestId('theme-select').selectOption('light');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await page.evaluate(() => (window as unknown as { geometryUploads: number }).geometryUploads)).toBe(0);
});

test('keeps a complex plan editable in 2D when the solid preview budget is exceeded', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('roompilot.language', 'ru'));
  await page.goto('/'); await page.getByRole('button', { name: 'Открыть демо', exact: true }).click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Экспорт проекта', exact: true }).click();
  const stream = await (await download).createReadStream(), chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const project = JSON.parse(Buffer.concat(chunks).toString());
  project.rooms = Array.from({ length: 21 }, (_, i) => ({ id: `room-${i}`, name: `Room ${i}`, reportedAreaM2: null,
    polygon: Array.from({ length: 100 }, (_, j) => ({ x: 25 + i % 7 * 36 + Math.cos(j * Math.PI / 50) * 10, y: 25 + Math.floor(i / 7) * 36 + Math.sin(j * Math.PI / 50) * 10 })) }));
  project.openings = []; project.zones = [];
  await page.getByLabel('JSON проекта', { exact: true }).setInputFiles({ name: 'complex.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await expect(page.getByRole('status')).toContainText('Проект импортирован');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'План слишком сложный для 3D-предпросмотра', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect(page.getByLabel('Название комнаты', { exact: true })).toHaveValue('Room 0');
  await expect(page.getByRole('button', { name: 'Экспорт проекта', exact: true })).toBeEnabled();
});
