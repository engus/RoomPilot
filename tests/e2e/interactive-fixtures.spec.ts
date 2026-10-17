import { expect, test, type Page } from '@playwright/test';

async function exported(page: Page) {
  const event = page.waitForEvent('download'); await page.getByRole('button', { name: 'Экспорт проекта', exact: true }).click();
  const stream = await (await event).createReadStream(), chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
test('toggles independent preview channels, preserves view state and resets on same-ID import', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('roompilot.language', 'ru'));
  let commands = 0; page.on('request', request => { if (request.method() !== 'GET') commands++; });
  await page.goto('/'); await page.getByRole('button', { name: 'Открыть демо', exact: true }).click();
  const before = await exported(page);
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const panel = page.getByTestId('preview-elements'); await panel.locator('summary').click();
  const left = panel.getByRole('button', { name: 'Подвес 1', exact: true }), right = panel.getByRole('button', { name: 'Подвес 2', exact: true });
  await left.click(); await expect(left).toHaveAttribute('aria-pressed', 'false'); await expect(right).toHaveAttribute('aria-pressed', 'true');
  const task = panel.getByRole('button', { name: 'Подсветка столешницы 1', exact: true }), display = panel.getByRole('button', { name: 'Подсветка витрины 1', exact: true });
  await display.click(); await expect(display).toHaveAttribute('aria-pressed', 'false'); await expect(task).toHaveAttribute('aria-pressed', 'true');
  const tv = panel.getByRole('button', { name: 'Экран ТВ 1', exact: true }); await tv.click();
  await page.getByRole('button', { name: 'Свет в предпросмотре', exact: true }).click();
  await expect(tv).toHaveAttribute('aria-pressed', 'true'); await expect(right).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Свет в предпросмотре', exact: true }).click();
  await expect(left).toHaveAttribute('aria-pressed', 'true'); await left.click();
  await page.getByRole('button', { name: '2D', exact: true }).click(); await page.getByRole('button', { name: '3D', exact: true }).click();
  await panel.locator('summary').click(); await expect(left).toHaveAttribute('aria-pressed', 'false');
  await expect(tv).toHaveAttribute('aria-pressed', 'true');
  expect((await exported(page)).equals(before)).toBe(true);
  await page.getByLabel('JSON проекта', { exact: true }).setInputFiles({ name: 'same-document.json', mimeType: 'application/json', buffer: before });
  await page.getByRole('button', { name: '3D', exact: true }).click(); await panel.locator('summary').click();
  await expect(left).toHaveAttribute('aria-pressed', 'true'); await expect(tv).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('language-select').selectOption('en'); await expect(panel.getByRole('button', { name: 'Pendant 1', exact: true })).toBeVisible();
  expect(commands).toBe(0);
});

test('clicks a visible fixture without rebuilding geometry and ignores an orbit drag', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 940 });
  await page.addInitScript(() => {
    localStorage.setItem('roompilot.language', 'ru');
    const state = window as unknown as { geometryUploads: number }; state.geometryUploads = 0;
    const original = WebGL2RenderingContext.prototype.bufferData;
    WebGL2RenderingContext.prototype.bufferData = function (...args: Parameters<typeof original>) { state.geometryUploads++; return original.apply(this, args); };
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Открыть демо', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const canvas = page.getByTestId('scene-3d').locator('canvas'); await expect(canvas).toBeVisible();
  await page.getByLabel('Ракурс', { exact: true }).selectOption('demo-living');
  await canvas.scrollIntoViewIfNeeded(); await canvas.screenshot();
  const box = (await canvas.boundingBox())!, point = { x: box.x + box.width * .54, y: box.y + box.height * .5 };
  await page.mouse.move(point.x, point.y);
  await expect(canvas).toHaveCSS('cursor', 'pointer');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => { (window as unknown as { geometryUploads: number }).geometryUploads = 0; });
  await page.mouse.click(point.x, point.y);
  const ceiling = page.getByTestId('preview-elements').locator('button[aria-label="Потолочный свет 1"]');
  await expect(ceiling).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('preview-last-action')).toBeVisible();
  await expect(page.getByTestId('preview-last-action')).toContainText('Потолочный свет 1 · Выкл.');
  expect(await page.evaluate(() => (window as unknown as { geometryUploads: number }).geometryUploads)).toBe(0);
  const stateBefore = await page.getByTestId('preview-elements').locator('button').evaluateAll(elements => elements.map(element => element.getAttribute('aria-pressed')));
  await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + 100, point.y + 60, { steps: 10 }); await page.mouse.up();
  const stateAfter = await page.getByTestId('preview-elements').locator('button').evaluateAll(elements => elements.map(element => element.getAttribute('aria-pressed')));
  expect(stateAfter).toEqual(stateBefore);
});
