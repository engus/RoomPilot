import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/health', route => route.fulfill({ json: { defaultProvider: 'openai', providers: [] } }));
  await page.addInitScript(() => localStorage.setItem('roompilot.language', 'ru'));
  await page.goto('/');
});

test('opens the approved apartment demo with ten apertures and three wall-free zones ready for 3D', async ({ page }) => {
  let aiCalls = 0;
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/recognize')) aiCalls++; });
  await page.getByRole('button', { name: 'Открыть демо', exact: true }).click();
  await expect(page.getByTestId('opening-symbol')).toHaveCount(10);
  await expect(page.getByTestId('zone-shape')).toHaveCount(3);
  await page.getByRole('button', { name: 'Выбрать зону Гостиная', exact: true }).click();
  await expect(page.getByLabel('Название зоны', { exact: true })).toHaveValue('Гостиная');
  await page.getByLabel('Название зоны', { exact: true }).fill('Семейная гостиная');
  await page.getByLabel('Название зоны', { exact: true }).blur();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByTestId('scene-3d').locator('canvas')).toBeVisible();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Экспорт проекта', exact: true }).click();
  const stream = await (await download).createReadStream(); const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const bytes = Buffer.concat(chunks), saved = JSON.parse(bytes.toString());
  expect(saved.schemaVersion).toBe(4); expect(saved.rooms).toHaveLength(6); expect(saved.openings).toHaveLength(10);
  expect(saved.zones).toHaveLength(3); expect(saved.zones.some((zone: { name: string }) => zone.name === 'Семейная гостиная')).toBe(true);
  await page.screenshot({ path: 'test-results/roompilot-demo-zones-3d.png', fullPage: true });
  await page.reload();
  await page.locator('input[type=file][accept*="json"]').setInputFiles({ name: 'zones.json', mimeType: 'application/json', buffer: bytes });
  await expect(page.getByTestId('zone-shape')).toHaveCount(3);
  await page.getByRole('button', { name: 'Выбрать зону Семейная гостиная', exact: true }).click();
  await expect(page.getByLabel('Название зоны', { exact: true })).toHaveValue('Семейная гостиная');
  await page.getByRole('button', { name: 'Удалить зону', exact: true }).click();
  await expect(page.getByTestId('zone-shape')).toHaveCount(2);
  expect(aiCalls).toBe(0);
  await page.getByTestId('language-select').selectOption('en');
  await page.getByRole('button', { name: 'Open demo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select zone Living area', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Parents’ bedroom/ }).first()).toBeVisible();
});

test('draws a zone inside a room, rejects sibling overlap and keeps room walls unchanged', async ({ page }) => {
  await page.getByRole('button', { name: 'Открыть демо', exact: true }).click();
  await page.getByRole('button', { name: 'Добавить зону', exact: true }).click();
  const canvas = page.getByTestId('plan-canvas');
  async function point(x: number, y: number) {
    const screen = await canvas.evaluate((element, point) => { const svg = element as SVGSVGElement, p = svg.createSVGPoint(); p.x = point.x; p.y = point.y; const q = p.matrixTransform(svg.getScreenCTM()!); return { x: q.x, y: q.y }; }, { x, y });
    await page.mouse.click(screen.x, screen.y);
  }
  // The initially selected parents' bedroom has no predefined zones.
  for (const [x, y] of [[145, 160], [250, 160], [250, 300], [145, 300]]) await point(x, y);
  await page.getByRole('button', { name: 'Завершить зону', exact: true }).click();
  await expect(page.getByTestId('zone-shape')).toHaveCount(4);
  await expect(page.getByLabel('Название комнаты', { exact: true })).toHaveValue('Спальня взрослых');
  await page.getByRole('button', { name: 'Добавить зону', exact: true }).click();
  for (const [x, y] of [[150, 170], [230, 170], [230, 280], [150, 280]]) await point(x, y);
  await page.getByRole('button', { name: 'Завершить зону', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('внутри');
  await expect(page.getByTestId('zone-shape')).toHaveCount(4);
  await page.getByRole('button', { name: 'Отменить рисование зоны', exact: true }).click();
  await page.getByRole('button', { name: 'Удалить комнату', exact: true }).click();
  await expect(page.getByTestId('zone-shape')).toHaveCount(3);
  await expect(page.getByTestId('opening-symbol')).toHaveCount(7);
});

test('validates zone vertex drags and refuses room edits that would cut away its zones', async ({ page }) => {
  await page.getByRole('button', { name: 'Открыть демо', exact: true }).click();
  await page.getByRole('button', { name: 'Выбрать зону Гостиная', exact: true }).click();
  const canvas = page.getByTestId('plan-canvas');
  const living = page.locator('[data-zone-id="demo-living"]');
  const original = await living.getAttribute('points');
  async function drag(from: [number, number], to: [number, number]) {
    await canvas.scrollIntoViewIfNeeded();
    const screen = await canvas.evaluate((element, points) => {
      const svg = element as SVGSVGElement;
      return points.map(([x, y]) => { const p = svg.createSVGPoint(); p.x = x; p.y = y; const q = p.matrixTransform(svg.getScreenCTM()!); return { x: q.x, y: q.y }; });
    }, [from, to]);
    await page.mouse.move(screen[0].x, screen[0].y); await page.mouse.down(); await page.mouse.move(screen[1].x, screen[1].y, { steps: 5 }); await page.mouse.up();
  }
  await drag([370, 142], [350, 142]);
  await expect(page.getByRole('alert')).toContainText('внутри');
  await expect(living).toHaveAttribute('points', original!);
  await drag([370, 142], [390, 160]);
  await expect(living).not.toHaveAttribute('points', original!);
  await page.getByRole('button', { name: /^05 Кухня-гостиная и коридор/ }).click();
  const mainRoom = page.getByRole('button', { name: 'Выбрать комнату Кухня-гостиная и коридор', exact: true });
  const originalRoom = await mainRoom.getAttribute('points');
  await drag([370, 142], [500, 142]);
  await expect(page.getByRole('alert')).toContainText('оставит зону');
  await expect(mainRoom).toHaveAttribute('points', originalRoom!);
});
