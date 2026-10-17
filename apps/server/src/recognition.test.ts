import { afterEach, expect, it, vi } from 'vitest';
import { readConfig, recognizeImage } from './recognition';

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
  await expect(recognizeImage(image, { apiKey: 'test-key', model: 'chosen-model' })).rejects.not.toThrow(/sk-secret|PRIVATE/);
});
it('cancels an oversized provider body before parsing it', async () => {
  const response = new Response('private untrusted body', { headers: { 'content-length': '2000001' } });
  vi.stubGlobal('fetch', async () => response);
  await expect(recognizeImage(image, { apiKey: 'test-key', model: 'chosen-model' })).rejects.toThrow();
  expect((await response.body!.getReader().read()).done).toBe(true);
});

it('reads independent provider credentials without borrowing another provider key', () => {
  const config = readConfig({ OPENAI_API_KEY: 'openai-key', OPENAI_MODEL: 'openai-model', GEMINI_API_KEY: ' google-key ', GEMINI_MODEL: 'gemini-model', OPENROUTER_API_KEY: 'router-key', OPENROUTER_MODEL: 'vision:free', AI_PROVIDER: 'gemini' });
  expect(config).toMatchObject({ defaultProvider: 'gemini', gemini: { apiKey: 'google-key', model: 'gemini-model' }, openrouter: { apiKey: 'router-key', model: 'vision:free' } });
});

it.each(['gemini-3.8-flash', 'gemini-2.5-flash'])('sends Gemini inline image data and extracts only completed non-thinking output (%s)', async model => {
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
    expect(init.headers).toMatchObject({ 'x-goog-api-key': 'google-key' });
    expect(init.headers).not.toHaveProperty('Authorization');
    const sent = JSON.parse(init.body as string);
    expect(sent.contents[0].parts).toContainEqual({ inlineData: { mimeType: 'image/png', data: 'YQ==' } });
    // REST TextResponseFormat uses an enum, unlike inlineData's IANA MIME string.
    expect(sent.generationConfig.responseFormat.text).toMatchObject({ mimeType: 'APPLICATION_JSON', schema: { additionalProperties: false } });
    // Nested array bounds make this room schema fail Gemini grammar compilation.
    // Domain validation still enforces room/vertex limits on the returned draft.
    expect(sent.generationConfig.responseFormat.text.schema.properties.rooms).not.toHaveProperty('maxItems');
    expect(sent.generationConfig.responseFormat.text.schema.properties.rooms.items.properties.polygon).not.toHaveProperty('minItems');
    if (model === 'gemini-3.8-flash') expect(sent.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'LOW' });
    else expect(sent.generationConfig).not.toHaveProperty('thinkingConfig');
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ thought: true, text: 'private reasoning' }, { text: JSON.stringify(recognition) }] } }] });
  });
  expect(await recognizeImage(image, { apiKey: 'wrong-key', model: 'wrong-model', gemini: { apiKey: 'google-key', model } }, undefined, 'gemini')).toEqual(recognition);
});

it('sends OpenRouter a fixed endpoint, its own key, image input and required structured output', async () => {
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer router-key' });
    const sent = JSON.parse(init.body as string);
    expect(sent.model).toBe('vision:free');
    expect(sent.messages[1].content).toContainEqual({ type: 'image_url', image_url: { url: image.dataUrl } });
    expect(sent.response_format).toMatchObject({ type: 'json_schema', json_schema: { strict: true } });
    expect(sent.provider).toMatchObject({ require_parameters: true });
    return Response.json({ choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(recognition) } }] });
  });
  expect(await recognizeImage(image, { openrouter: { apiKey: 'router-key', model: 'vision:free' } }, undefined, 'openrouter')).toEqual(recognition);
});

it('rejects an unconfigured selection without calling any provider', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(recognizeImage(image, { apiKey: 'other-key', model: 'other-model' }, undefined, 'gemini')).rejects.toMatchObject({ statusCode: 503, code: 'provider_unconfigured' });
  expect(fetch).not.toHaveBeenCalled();
});

it.each([
  ['gemini', { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: JSON.stringify(recognition) }] } }] }],
  ['gemini', { promptFeedback: { blockReason: 'SAFETY' } }],
  ['openrouter', { choices: [{ finish_reason: 'length', message: { content: JSON.stringify(recognition) } }] }],
  ['openrouter', { choices: [{ finish_reason: 'stop', message: { refusal: 'Cannot', content: JSON.stringify(recognition) } }] }],
  ['openrouter', { choices: [{ finish_reason: 'stop', message: { content: 'not json' } }] }],
] as const)('rejects unusable %s responses', async (provider, body) => {
  vi.stubGlobal('fetch', async () => Response.json(body));
  await expect(recognizeImage(image, { gemini: { apiKey: 'key', model: 'model' }, openrouter: { apiKey: 'key', model: 'model' } }, undefined, provider)).rejects.toMatchObject({ code: 'invalid_result' });
});

it.each([
  [429, { error: { code: 'credit_balance_exhausted', type: 'insufficient_quota', message: 'sk-secret PRIVATE' } }, 'provider_quota'],
  [429, { error: { code: 429, status: 'RESOURCE_EXHAUSTED' } }, 'provider_rate_limit'],
  [402, { error: { code: 402, message: 'PRIVATE' } }, 'provider_quota'],
  [401, { error: { message: 'sk-secret' } }, 'provider_auth'],
])('classifies provider failures without leaking raw errors (%s)', async (status, body, code) => {
  vi.stubGlobal('fetch', async () => Response.json(body, { status }));
  await expect(recognizeImage(image, { apiKey: 'test-key', model: 'model' })).rejects.toMatchObject({ code });
  await expect(recognizeImage(image, { apiKey: 'test-key', model: 'model' })).rejects.not.toThrow(/PRIVATE|sk-secret/);
});
