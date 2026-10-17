import { test, expect, type Page } from '@playwright/test';

async function importFixture(page: Page, mime = 'image/png') {
  const dataUrl = await page.evaluate(type => {
    const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 400;
    return canvas.toDataURL(type);
  }, mime);
  const project = {
    schemaVersion: 1, id: 'request-fixture', name: 'Apartment', source: { dataUrl, width: 600, height: 400 },
    rooms: [{ id: 'room-1', name: 'Kitchen', polygon: [{ x: 10, y: 10 }, { x: 300, y: 10 }, { x: 300, y: 200 }, { x: 10, y: 200 }], reportedAreaM2: null }],
    calibration: null, ceilingHeightM: null, ceilingHeightConfirmed: false,
  };
  await page.locator('input[type=file][accept*="json"]').setInputFiles({ name: 'sample.roompilot.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await expect(page.getByTestId('plan-canvas')).toBeVisible();
  return project;
}

test.beforeEach(async ({ page }) => {
  // Configuration is deterministic; every recognition test intercepts the external operation.
  await page.route('**/api/health', route => route.fulfill({ json: { status: 'ok', defaultProvider: 'openai', recognitionConfigured: true, providers: [{ id: 'openai', configured: true, model: 'test-model' }, { id: 'gemini', configured: false, model: null }, { id: 'openrouter', configured: false, model: null }] } }));
  await page.addInitScript(() => {
    if (!localStorage.getItem('roompilot.language')) localStorage.setItem('roompilot.language', 'ru');
    if (!localStorage.getItem('roompilot.theme')) localStorage.setItem('roompilot.theme', 'light');
  });
});

test('starts honestly without recognized rooms and exposes a labelled demo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Открыть демо', exact: true })).toBeVisible();
  await expect(page.getByTestId('scene-3d')).toHaveCount(0);
  await page.getByRole('button', { name: 'Открыть демо', exact: true }).click();
  await expect(page.getByTestId('plan-canvas')).toBeVisible();
  await expect(page.getByText(/демо/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Экспорт проекта', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'test-results/roompilot-editor.png', fullPage: true });
});

test('imports a real project, confirms missing metadata and exports changes', async ({ page }) => {
  page.on('pageerror', error => console.log('Browser page error:', error.message));
  page.on('console', message => { if (message.type() === 'error') console.log('Browser console:', message.text()); });
  page.on('response', response => { if (response.status() >= 400) console.log('HTTP failure:', response.status(), response.url()); });
  await page.goto('/');
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 400;
    return canvas.toDataURL('image/png');
  });
  const project = {
    schemaVersion: 1, id: 'test-project', name: 'Тестовая квартира', source: { dataUrl, width: 600, height: 400 },
    rooms: [{ id: 'room-1', name: 'Кухня', polygon: [{ x: 10, y: 10 }, { x: 300, y: 10 }, { x: 300, y: 200 }, { x: 10, y: 200 }], reportedAreaM2: 15 }],
    calibration: { points: [{ x: 10, y: 10 }, { x: 300, y: 10 }], lengthM: 5, metresPerPixel: 5 / 290 },
    ceilingHeightM: null, ceilingHeightConfirmed: false,
  };
  await page.locator('input[type=file][accept*="json"]').setInputFiles({ name: 'sample.roompilot.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await expect(page.getByTestId('plan-canvas')).toBeVisible();
  await expect(page.getByTestId('scene-3d')).toHaveCount(0);
  await page.getByLabel('Высота потолка, м', { exact: true }).fill('2.7');
  await page.getByRole('button', { name: 'Подтвердить высоту', exact: true }).click();
  await page.getByLabel('Название комнаты', { exact: true }).fill('Кухня-студия');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByTestId('scene-3d')).toBeVisible();
  await expect(page.getByTestId('scene-3d').locator('canvas')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспорт проекта', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const saved = Buffer.concat(chunks);
  expect(JSON.parse(saved.toString())).toMatchObject({ ceilingHeightM: 2.7, ceilingHeightConfirmed: true, rooms: [{ name: 'Кухня-студия' }] });
  await page.screenshot({ path: 'test-results/roompilot-3d.png', fullPage: true });
  await page.goto('/');
  await page.locator('input[type=file][accept*="json"]').setInputFiles({ name: 'saved.roompilot.json', mimeType: 'application/json', buffer: saved });
  await expect(page.getByLabel('Название комнаты', { exact: true })).toHaveValue('Кухня-студия');
  await expect(page.getByLabel('Высота потолка, м', { exact: true })).toHaveValue('2.7');
  await expect(page.getByRole('button', { name: '3D', exact: true })).toBeEnabled();
});

test('rejects malformed imports without replacing the current view', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file][accept*="json"]').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":99}') });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('scene-3d')).toHaveCount(0);
});

test('persists language and appearance preferences across a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('language-select')).toBeVisible();
  await page.getByTestId('language-select').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByTestId('theme-select').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByTestId('language-select')).toHaveValue('en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByTestId('theme-select').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByTestId('theme-select').selectOption('system');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('draws and calibrates an uploaded plan without sending it to AI', async ({ page }) => {
  let recognitionRequests = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/recognize') recognitionRequests++; });
  await page.goto('/');
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 400;
    const context = canvas.getContext('2d')!; context.fillStyle = 'white'; context.fillRect(0, 0, 600, 400);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file][accept*="image/png"]').setInputFiles({ name: 'floor-plan.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  const canvas = page.getByTestId('plan-canvas');
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: 'Добавить комнату', exact: true }).click();
  async function clickPoint(x: number, y: number) {
    const screen = await canvas.evaluate((element, point) => {
      const svg = element as SVGSVGElement, position = svg.createSVGPoint();
      position.x = point.x; position.y = point.y;
      const transformed = position.matrixTransform(svg.getScreenCTM()!);
      return { x: transformed.x, y: transformed.y };
    }, { x, y });
    await page.mouse.click(screen.x, screen.y);
  }
  for (const [x, y] of [[50, 50], [450, 50], [450, 300], [50, 300]]) await clickPoint(x, y);
  await page.getByRole('button', { name: 'Завершить комнату', exact: true }).click();
  await page.getByLabel('Название комнаты', { exact: true }).fill('Кабинет');
  await page.getByLabel('Площадь с плана, м²', { exact: true }).fill('12.3');
  await expect(page.getByRole('button', { name: '3D', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Задать масштаб', exact: true }).click();
  await clickPoint(50, 50); await clickPoint(450, 50);
  await page.getByLabel('Известная длина, м', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Подтвердить масштаб', exact: true }).click();
  await expect(page.getByText('10 м²', { exact: true })).toBeVisible();
  expect(recognitionRequests).toBe(0);
});

test('preserves the JPEG content type when recognizing an imported project', async ({ page }) => {
  await page.goto('/');
  const project = await importFixture(page, 'image/jpeg');
  await page.route('**/api/recognize*', route => route.fulfill({ json: { project, warnings: [] } }));
  const requestPromise = page.waitForRequest('**/api/recognize*');
  await page.getByRole('button', { name: 'Распознать план', exact: true }).click();
  const request = await requestPromise;
  expect(request.postDataBuffer()!.toString('latin1').slice(0, 200)).toMatch(/Content-Type: image\/jpeg/i);
});

test('preserves room edits made while recognition is in flight', async ({ page }) => {
  await page.goto('/');
  const project = await importFixture(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/recognize*', async route => { await gate; await route.fulfill({ json: { project: { ...project, id: 'recognized-project', rooms: project.rooms.map(room => ({ ...room, id: 'recognized-room' })) }, warnings: [] } }); });
  const requestPromise = page.waitForRequest('**/api/recognize*');
  await page.getByRole('button', { name: 'Распознать план', exact: true }).click();
  await requestPromise;
  await page.getByLabel('Название комнаты', { exact: true }).fill('Кабинет');
  const responsePromise = page.waitForResponse('**/api/recognize*');
  release(); await responsePromise;
  await expect(page.getByRole('button', { name: 'Распознать план', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Название комнаты', { exact: true })).toHaveValue('Кабинет');
});

test('selects the recognition destination without changing the plan and shows safe quota errors', async ({ page }) => {
  await page.route('**/api/health', route => route.fulfill({ json: { status: 'ok', defaultProvider: 'openai', recognitionConfigured: true, providers: [
    { id: 'openai', model: 'openai-model', configured: true }, { id: 'gemini', model: 'gemini-model', configured: true }, { id: 'openrouter', model: 'vision:free', configured: true },
  ] } }));
  await page.goto('/');
  const project = await importFixture(page);
  await page.getByLabel('Название комнаты', { exact: true }).fill('Моя кухня');
  const selector = page.getByLabel('AI-провайдер', { exact: true });
  await selector.selectOption('gemini');
  await expect(page.getByLabel('Название комнаты', { exact: true })).toHaveValue('Моя кухня');
  await expect(page.getByText('gemini-model', { exact: true })).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const destinations: string[] = [];
  await page.route('**/api/recognize*', async route => {
    const provider = new URL(route.request().url()).searchParams.get('provider')!;
    destinations.push(provider);
    if (provider === 'gemini') { await gate; await route.fulfill({ json: { project, warnings: [] } }); }
    else await route.fulfill({ status: 429, json: { error: 'PRIVATE UPSTREAM TEXT', code: 'provider_quota' } });
  });
  const request = page.waitForRequest('**/api/recognize*');
  await page.getByRole('button', { name: 'Распознать план', exact: true }).click();
  await request;
  await expect(selector).toBeDisabled();
  release();
  await expect(selector).toBeEnabled();
  await selector.selectOption('openrouter');
  await page.getByRole('button', { name: 'Распознать план', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('баланс');
  await expect(page.getByRole('alert')).not.toContainText('PRIVATE');
  expect(destinations).toEqual(['gemini', 'openrouter']);
  await expect(page.getByTestId('plan-canvas')).toBeVisible();
  await page.getByTestId('language-select').selectOption('en');
  await expect(page.getByLabel('AI provider', { exact: true })).toHaveValue('openrouter');
  await page.screenshot({ path: 'test-results/roompilot-providers.png', fullPage: true });
});

test('explains invalid AI room outlines and preserves the source and edits for export', async ({ page }) => {
  await page.goto('/');
  const project = await importFixture(page);
  await page.getByLabel('Название комнаты', { exact: true }).fill('Моя кухня');
  await page.route('**/api/recognize*', route => route.fulfill({ status: 502, json: { code: 'invalid_geometry', error: 'PRIVATE PROVIDER DRAFT' } }));
  await page.getByRole('button', { name: 'Распознать план', exact: true }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('некорректные контуры');
  await expect(alert).toContainText('экспортируйте');
  await expect(alert).not.toContainText('PRIVATE');
  await expect(page.getByRole('button', { name: 'Распознать план', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Название комнаты', { exact: true })).toHaveValue('Моя кухня');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспорт проекта', exact: true }).click();
  const stream = await (await downloadPromise).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const saved = JSON.parse(Buffer.concat(chunks).toString());
  expect(saved.source).toEqual(project.source);
  expect(saved.rooms).toEqual([{ ...project.rooms[0], name: 'Моя кухня' }]);
});
