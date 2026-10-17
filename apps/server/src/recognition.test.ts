import { afterEach, expect, it, vi } from 'vitest';
import { recognizeImage } from './recognition';

afterEach(() => vi.unstubAllGlobals());
const image = { dataUrl: 'data:image/png;base64,YQ==', width: 10, height: 10 };
const recognition = { rooms: [], ceilingHeightM: null, warnings: ['Не найдены комнаты'] };
it('sends explicit model, an embedded image and strict Responses structured output without provider storage', async () => {
  let sent: Record<string, any> = {};
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    sent = JSON.parse(init.body as string);
    return Response.json({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(recognition), annotations: [] }] }] });
  });
  expect(await recognizeImage(image, { apiKey: 'test-key', model: 'chosen-model' })).toEqual(recognition);
  expect(sent.model).toBe('chosen-model'); expect(sent.store).toBe(false);
  expect(sent.input[0].content).toContainEqual({ type: 'input_image', image_url: image.dataUrl, detail: 'high' });
  expect(sent.text.format).toMatchObject({ type: 'json_schema', strict: true, schema: { additionalProperties: false } });
});
it.each([
  { status: 'incomplete', output: [] },
  { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'Cannot' }] }] },
  { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{bad}' }] }] },
])('rejects incomplete, refused and non-JSON provider responses', async response => {
  vi.stubGlobal('fetch', async () => Response.json(response));
  await expect(recognizeImage(image, { apiKey: 'test-key', model: 'chosen-model' })).rejects.toThrow();
});
it('does not expose raw provider HTTP errors', async () => {
  vi.stubGlobal('fetch', async () => new Response('sk-secret PRIVATE', { status: 401 }));
  await expect(recognizeImage(image, { apiKey: 'test-key', model: 'chosen-model' })).rejects.toThrow('Провайдер');
});
it('cancels an oversized provider body before parsing it', async () => {
  const response = new Response('private untrusted body', { headers: { 'content-length': '2000001' } });
  vi.stubGlobal('fetch', async () => response);
  await expect(recognizeImage(image, { apiKey: 'test-key', model: 'chosen-model' })).rejects.toThrow();
  expect((await response.body!.getReader().read()).done).toBe(true);
});
