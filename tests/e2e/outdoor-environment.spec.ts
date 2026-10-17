import { test, expect, type Page } from '@playwright/test';

async function exportProject(page: Page) {
  const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'Экспорт проекта', exact: true }).click();
  const stream = await (await downloaded).createReadStream(), chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
test('changes actual outdoor rendering independently of UI appearance and preserves the project', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('roompilot.language', 'ru'); if (localStorage.getItem('roompilot.outdoorMode') === null) localStorage.setItem('roompilot.outdoorMode', 'invalid'); });
  let environmentReads = 0;
  await page.route('**/api/environment', route => { environmentReads++; return route.fulfill({ json: { configured: false } }); });
  let actions = 0;
  page.on('request', request => { if (request.method() !== 'GET') actions++; });
  await page.goto('/'); await page.getByRole('button', { name: 'Открыть демо', exact: true }).click();
  const before = await exportProject(page);
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const controls = page.getByRole('group', { name: 'На улице', exact: true });
  await expect(controls.getByRole('button', { name: 'День', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const canvas = page.getByTestId('scene-3d').locator('canvas'); await expect(canvas).toBeVisible();
  const day = await canvas.screenshot();
  const initialReads = environmentReads;
  await controls.getByRole('button', { name: 'Ночь', exact: true }).click();
  await expect(controls.getByRole('button', { name: 'Ночь', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const night = await canvas.screenshot(); expect(night.equals(day)).toBe(false);
  await page.getByTestId('theme-select').selectOption('light');
  await expect(controls.getByRole('button', { name: 'Ночь', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /02 Детская спальня/ }).click();
  await expect(page.getByLabel('Название комнаты', { exact: true })).toHaveValue('Детская спальня');
  expect(environmentReads).toBe(initialReads);
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(controls.getByRole('button', { name: 'Ночь', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect((await exportProject(page)).equals(before)).toBe(true);
  await page.reload();
  await page.getByLabel('JSON проекта', { exact: true }).setInputFiles({ name: 'saved.json', mimeType: 'application/json', buffer: before });
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(controls.getByRole('button', { name: 'Ночь', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('language-select').selectOption('en');
  await expect(page.getByRole('group', { name: 'Outdoors', exact: true }).getByRole('button', { name: 'Night', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(actions).toBe(0);
});

test('updates automatic sun lighting and makes failed automatic data explicit', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-03-20T12:00:00Z') });
  await page.addInitScript(() => { localStorage.setItem('roompilot.language', 'ru'); localStorage.setItem('roompilot.outdoorMode', 'auto'); });
  let phase: 'day' | 'night' | 'invalid' = 'day';
  await page.route('**/api/environment', route => route.fulfill({ json: phase === 'invalid' ? { configured: true, sunDirection: [NaN, 5, 0] } : {
    configured: true, phase, solarElevationDeg: phase === 'day' ? 45 : -30, sunDirection: [0, .6, -.8], updatedAt: '2026-03-20T12:00:00Z',
  } }));
  await page.goto('/'); await page.getByRole('button', { name: 'Открыть демо', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const controls = page.getByRole('group', { name: 'На улице', exact: true });
  await expect(controls).toContainText('Сейчас · День');
  phase = 'night'; await page.clock.fastForward(60_000);
  await expect(controls).toContainText('Сейчас · Ночь');
  phase = 'invalid'; await page.clock.fastForward(60_000);
  await expect(controls).toContainText('Авто недоступно · показан день');
  await controls.getByRole('button', { name: 'Ночь', exact: true }).click();
  await expect(controls.getByRole('button', { name: 'Ночь', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('keeps manual lighting usable when browser preference storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('roompilot.language', 'en');
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) { if (key === 'roompilot.outdoorMode') throw new Error('Blocked'); return original.call(this, key); };
    Storage.prototype.setItem = function () { throw new Error('Blocked'); };
  });
  await page.route('**/api/environment', route => route.fulfill({ json: { configured: false } }));
  await page.goto('/'); await page.getByRole('button', { name: 'Open demo', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const controls = page.getByRole('group', { name: 'Outdoors', exact: true });
  await controls.getByRole('button', { name: 'Night', exact: true }).click();
  await expect(controls.getByRole('button', { name: 'Night', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
