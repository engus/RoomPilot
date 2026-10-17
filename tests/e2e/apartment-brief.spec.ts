import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/health', route => route.fulfill({ json: { defaultProvider: 'openrouter', providers: [{ id: 'openrouter', configured: true, model: 'vision' }] } }));
  await page.addInitScript(() => localStorage.setItem('roompilot.language', 'ru'));
  await page.goto('/'); await page.getByRole('button', { name: 'Открыть демо', exact: true }).click();
});
async function exportProject(page: Page) {
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Экспорт проекта', exact: true }).click();
  const stream = await (await download).createReadStream(), chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
}
test('collects apartment facts separately from physical spaces and preserves them through recognition and export', async ({ page }) => {
  await expect(page.getByLabel('Жилых комнат (спальни и гостиные)', { exact: true })).toHaveValue('3');
  await expect(page.getByLabel('Примерная площадь, м²', { exact: true })).toHaveValue('58');
  await expect(page.getByLabel('Балкон в указанной площади', { exact: true })).toHaveValue('excluded');
  await expect(page.getByLabel('Санузлов', { exact: true })).toHaveValue('1');
  await expect(page.getByLabel('Тип санузла', { exact: true })).toHaveValue('combined');
  await expect(page.getByRole('heading', { name: 'Помещения', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Кухни, балконы и кладовые', exact: true }).click();
  await page.getByLabel('Кладовых', { exact: true }).fill('0');
  const project = await exportProject(page);
  expect(project.schemaVersion).toBe(4); expect(project.apartmentBrief).toMatchObject({ livingRooms: 3, approximateAreaM2: 58, balconyArea: 'excluded', bathrooms: 1, bathroomLayout: 'combined', storageRooms: 0 });
  expect(project.rooms).toHaveLength(6); expect(project.rooms.some((room: { name: string }) => room.name === 'Санузел')).toBe(true);
  await page.route('**/api/recognize?*', async route => {
    const body = route.request().postDataBuffer()!.toString();
    expect(body).toContain('name="apartmentBrief"'); expect(body).toContain('"livingRooms":3');
    await route.fulfill({ json: { project, warnings: [] } });
  });
  await page.getByRole('button', { name: 'Распознать план', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Черновик готов');
  await expect(page.getByLabel('Жилых комнат (спальни и гостиные)', { exact: true })).toHaveValue('3');
  const again = await exportProject(page); expect(again.apartmentBrief).toEqual(project.apartmentBrief);
  await page.getByRole('button', { name: 'Очистить сведения', exact: true }).click();
  await expect(page.getByLabel('Жилых комнат (спальни и гостиные)', { exact: true })).toHaveValue('');
  expect((await exportProject(page)).apartmentBrief).toBeNull();
  await page.getByLabel('JSON проекта', { exact: true }).setInputFiles({ name: 'saved.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(again)) });
  await expect(page.getByRole('status')).toContainText('Проект импортирован');
  await expect(page.getByLabel('Жилых комнат (спальни и гостиные)', { exact: true })).toHaveValue('3');
  expect((await exportProject(page)).apartmentBrief).toEqual(again.apartmentBrief);
  await page.getByTestId('language-select').selectOption('en');
  await expect(page.getByRole('heading', { name: 'About the apartment', exact: true })).toBeVisible();
});
test('invalidates an in-flight result on an invalid questionnaire edit and blocks stale answer submission', async ({ page }) => {
  const project = await exportProject(page);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/recognize?*', async route => { await gate; await route.fulfill({ json: { project, warnings: [] } }); });
  const request = page.waitForRequest('**/api/recognize?*');
  await page.getByRole('button', { name: 'Распознать план', exact: true }).click(); await request;
  await page.getByLabel('Жилых комнат (спальни и гостиные)', { exact: true }).fill('1.5'); release();
  await expect(page.getByRole('status')).toContainText('изменился');
  await expect(page.getByRole('button', { name: 'Распознать план', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Экспорт проекта', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Жилых комнат (спальни и гостиные)', { exact: true })).toHaveValue('1.5');
  await page.getByLabel('Жилых комнат (спальни и гостиные)', { exact: true }).fill('0');
  await expect(page.getByRole('button', { name: 'Распознать план', exact: true })).toBeEnabled();
  expect((await exportProject(page)).apartmentBrief.livingRooms).toBe(0);
});

test('preserves invalid questionnaire drafts after a failed project import or image upload', async ({ page }) => {
  const livingRooms = page.getByLabel('Жилых комнат (спальни и гостиные)', { exact: true });
  await livingRooms.fill('1.5');
  await page.getByLabel('JSON проекта', { exact: true }).setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.getByRole('button', { name: 'Импорт проекта', exact: true })).toBeEnabled();
  await expect(livingRooms).toHaveValue('1.5');
  await expect(livingRooms).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Файл плана PNG или JPEG', { exact: true }).setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('invalid image') });
  await expect(page.getByRole('button', { name: 'Загрузить план', exact: true })).toBeEnabled();
  await expect(livingRooms).toHaveValue('1.5');
  await expect(livingRooms).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('button', { name: 'Экспорт проекта', exact: true })).toBeDisabled();
  await livingRooms.fill('3');
  await expect(page.getByRole('button', { name: 'Экспорт проекта', exact: true })).toBeEnabled();
});
