import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { buildApp } from './app';
import type { RecognitionProvider } from './recognition';

const origin = 'http://127.0.0.1:5173';
const draft = { rooms: [{ name: null, reportedAreaM2: null, polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] }], ceilingHeightM: null, warnings: ['Проверьте контуры'] };
const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => { vi.unstubAllGlobals(); await Promise.all(apps.splice(0).map(app => app.close())); });
function app(options: Parameters<typeof buildApp>[0] = {}) { const result = buildApp(options); apps.push(result); return result; }
function upload(bytes: Buffer, mime = 'image/png', extraHeaders: Record<string, string> = {}) {
  return { method: 'POST' as const, url: '/api/recognize', headers: { origin, 'content-type': 'multipart/form-data; boundary=plan-boundary', ...extraHeaders }, payload: Buffer.concat([Buffer.from(`--plan-boundary\r\nContent-Disposition: form-data; name="file"; filename="plan.png"\r\nContent-Type: ${mime}\r\n\r\n`), bytes, Buffer.from('\r\n--plan-boundary--\r\n')]) };
}
const png = () => sharp({ create: { width: 20, height: 10, channels: 3, background: 'white' } }).png().toBuffer();

async function openingsFixture() {
  const server = app({ provider: async () => ({ ...draft, ceilingHeightM: 2.5 }) });
  const project = (await server.inject(upload(await png()))).json().project;
  return { ...project, calibration: { points: [{ x: 0, y: 0 }, { x: 20, y: 0 }], lengthM: 4, metresPerPixel: .2 }, ceilingHeightConfirmed: true };
}
const candidate = { kind: 'window', heightM: 1.5, sillHeightM: .85, segment: [{ x: .2, y: 0 }, { x: .6, y: 0 }] };
function routerResponse(openings: unknown[]) { return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ openings, warnings: [] }) } }] }); }
const routerConfig = { openrouter: { apiKey: 'key', model: 'vision' } };

it('appends recognized openings without replacing metadata or manual openings, including repeated detection', async () => {
  const project = await openingsFixture();
  project.zones = [{ id: 'kitchen-zone', roomId: project.rooms[0].id, name: 'Kitchen', polygon: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] }];
  project.openings = [{ id: 'manual', kind: 'door', heightM: 2.2, sillHeightM: 0, spans: [{ roomId: project.rooms[0].id, edgeIndex: 1, start: .1, end: .7 }] }];
  vi.stubGlobal('fetch', async () => routerResponse([candidate, { invalid: true }]));
  const server = app({ config: routerConfig });
  const response = await server.inject({ method: 'POST', url: '/api/recognize-openings', headers: { origin }, payload: { project } });
  expect(response.statusCode).toBe(200);
  const result = response.json(); expect(result.project.openings).toHaveLength(2);
  expect(result.project.openings[0]).toEqual(project.openings[0]);
  expect({ ...result.project, openings: [] }).toEqual({ ...project, openings: [] });
  expect(result.warnings.join(' ')).toMatch(/skipped 1/i);
  const again = await server.inject({ method: 'POST', url: '/api/recognize-openings', headers: { origin }, payload: { project: result.project } });
  expect(again.json().project).toEqual(result.project);
});
it('rejects invalid image data, mismatched dimensions, absent rooms and untrusted origins before provider use', async () => {
  const project = await openingsFixture(); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const server = app({ config: routerConfig });
  for (const changed of [
    { ...project, source: { ...project.source, dataUrl: 'data:image/png;base64,YQ==' } },
    { ...project, source: { ...project.source, width: 21 } },
    { ...project, rooms: [] },
  ]) expect((await server.inject({ method: 'POST', url: '/api/recognize-openings', headers: { origin }, payload: { project: changed } })).statusCode).toBe(400);
  expect((await server.inject({ method: 'POST', url: '/api/recognize-openings', payload: { project } })).statusCode).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
});
it('times out openings-only calls and shares the busy slot with full recognition', async () => {
  const project = await openingsFixture(); let started!: () => void;
  const gate = new Promise<void>(resolve => { started = resolve; });
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => { started(); return new Promise((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new Error('cancelled')))); });
  const server = app({ config: { ...routerConfig, requestTimeoutMs: 50 } });
  const pending = server.inject({ method: 'POST', url: '/api/recognize-openings', headers: { origin }, payload: { project } });
  await gate;
  expect((await server.inject({ ...upload(await png()), url: '/api/recognize?provider=openrouter' })).statusCode).toBe(429);
  expect((await pending).statusCode).toBe(504);
});
it('returns full OpenRouter recognition with accepted openings and warnings for malformed candidates', async () => {
  const server = app({ providers: { openrouter: async () => ({ ...draft, ceilingHeightM: 2.5, openings: [candidate, { bad: true }] }) } });
  const response = await server.inject({ ...upload(await png()), url: '/api/recognize?provider=openrouter' });
  expect(response.statusCode).toBe(200); expect(response.json().project.openings).toHaveLength(1);
  expect(response.json().warnings.join(' ')).toMatch(/skipped 1/i);
});

describe('recognition API', () => {
  it('reports missing credentials and refuses recognition without demo substitution', async () => {
    const server = app({ config: {} });
    expect((await server.inject('/api/health')).json()).toMatchObject({ status: 'ok', recognitionConfigured: false });
    expect((await server.inject(upload(await png()))).statusCode).toBe(503);
  });
  it('only reports configuration when key and model are both explicitly supplied', async () => {
    const server = app({ config: { apiKey: 'private', model: 'configured-model' } });
    const health = await server.inject('/api/health');
    expect(health.json()).toMatchObject({ status: 'ok', recognitionConfigured: true });
    expect(health.body).not.toContain('private');
  });
  it('returns normalized pixels and an unscaled, unconfirmed draft from a real image', async () => {
    const provider: RecognitionProvider = async image => {
      expect(image.width).toBe(1800); expect(image.height).toBe(900);
      expect((await sharp(Buffer.from(image.dataUrl.split(',')[1]!, 'base64')).metadata()).format).toBe('png');
      return draft;
    };
    const server = app({ provider });
    const large = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: 'white' } }).jpeg().toBuffer();
    const response = await server.inject(upload(large, 'image/jpeg'));
    expect(response.statusCode).toBe(200);
    const { project, warnings } = response.json();
    expect(project.rooms[0]).toMatchObject({ name: 'Комната 1', reportedAreaM2: null, polygon: [{ x: 0, y: 0 }, { x: 1800, y: 0 }, { x: 1800, y: 900 }, { x: 0, y: 900 }] });
    expect(project.calibration).toBeNull(); expect(project.ceilingHeightM).toBeNull(); expect(project.ceilingHeightConfirmed).toBe(false);
    expect(warnings).toEqual(['Проверьте контуры']);
  });
  it('reports each provider configuration without exposing keys', async () => {
    const server = app({ config: { defaultProvider: 'gemini', apiKey: 'private-openai', model: 'openai-model', gemini: { apiKey: 'private-google', model: 'gemini-model' }, openrouter: { apiKey: 'private-router' } } });
    const response = await server.inject('/api/health');
    expect(response.json()).toMatchObject({ defaultProvider: 'gemini', providers: [{ id: 'openai', configured: true, model: 'openai-model' }, { id: 'gemini', configured: true, model: 'gemini-model' }, { id: 'openrouter', configured: false, model: null }] });
    expect(response.body).not.toMatch(/private-|apiKey/);
  });
  it('routes to the requested provider without falling back and validates the resulting draft', async () => {
    const server = app({ providers: { openai: async () => { throw new Error('wrong provider'); }, gemini: async () => ({ ...draft, rooms: [{ ...draft.rooms[0], name: 'Google room' }] }) } });
    const response = await server.inject({ ...upload(await png()), url: '/api/recognize?provider=gemini' });
    expect(response.statusCode).toBe(200);
    expect(response.json().project.rooms[0].name).toBe('Google room');
  });
  it('uses the server default provider only when no selection was supplied', async () => {
    const server = app({ config: { defaultProvider: 'openrouter' }, providers: { openrouter: async () => draft } });
    expect((await server.inject(upload(await png()))).statusCode).toBe(200);
  });
  it('rejects unknown and unconfigured providers before processing an image', async () => {
    const server = app({ provider: async () => { throw new Error('no fallback'); } });
    const unknown = await server.inject({ ...upload(Buffer.from('invalid')), url: '/api/recognize?provider=https://attacker.invalid' });
    expect(unknown.statusCode).toBe(400); expect(unknown.json().code).toBe('invalid_provider');
    const missing = await server.inject({ ...upload(Buffer.from('invalid')), url: '/api/recognize?provider=gemini' });
    expect(missing.statusCode).toBe(503); expect(missing.json().code).toBe('provider_unconfigured');
  });
  it.each(['https://attacker.invalid', 'null', ''])('rejects an untrusted or absent origin (%s) before spending provider credit', async untrusted => {
    const server = app({ provider: async () => { throw new Error('must never call provider'); } });
    expect((await server.inject(upload(await png(), 'image/png', { origin: untrusted }))).statusCode).toBe(403);
  });
  it('rejects MIME spoofing and images outside PNG/JPEG', async () => {
    const server = app({ provider: async () => draft });
    expect((await server.inject(upload(Buffer.from('not an image')))).statusCode).toBe(400);
    expect((await server.inject(upload(await png(), 'image/jpeg'))).statusCode).toBe(415);
    const webp = await sharp(await png()).webp().toBuffer();
    expect((await server.inject(upload(webp, 'image/webp'))).statusCode).toBe(415);
  });
  it('rejects files over 10 MiB without calling the provider', async () => {
    const server = app({ provider: async () => { throw new Error('must never call provider'); } });
    expect((await server.inject(upload(Buffer.alloc(10 * 1024 * 1024 + 1)))).statusCode).toBe(413);
  });
  it('rejects decoded images above 20 million pixels', async () => {
    const server = app({ provider: async () => draft });
    const image = await sharp({ create: { width: 5000, height: 4001, channels: 3, background: 'white' } }).png().toBuffer();
    expect((await server.inject(upload(image))).statusCode).toBe(413);
  });
  it('rejects missing multipart files', async () => {
    const server = app({ provider: async () => draft });
    expect((await server.inject({ method: 'POST', url: '/api/recognize', headers: { origin }, payload: {} })).statusCode).toBe(400);
  });
  it('rejects malformed provider polygons instead of returning confirmed geometry', async () => {
    const server = app({ provider: async () => ({ ...draft, rooms: [{ ...draft.rooms[0], polygon: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 1 }] }] }) });
    expect((await server.inject(upload(await png()))).statusCode).toBe(502);
  });
  it('returns a sanitized error when the provider throws credentials or payload', async () => {
    const server = app({ provider: async () => { throw new Error('sk-secret data:image/png;base64,PRIVATE'); } });
    const response = await server.inject(upload(await png()));
    expect(response.statusCode).toBe(502); expect(response.body).not.toMatch(/sk-secret|PRIVATE|data:image/);
  });
  it('times out providers that ignore cancellation and aborts their signal', async () => {
    let signal: AbortSignal | undefined;
    const server = app({ provider: async (_image, cancellation) => { signal = cancellation; return new Promise(() => {}); }, config: { requestTimeoutMs: 20 } });
    const response = await server.inject(upload(await png()));
    expect(response.statusCode).toBe(504); expect(response.json().code).toBe('recognition_timeout'); expect(signal?.aborted).toBe(true);
  });
  it('rejects overlapping recognition requests and releases the slot after completion', async () => {
    let complete!: (value: unknown) => void; let started!: () => void;
    const running = new Promise<void>(resolve => { started = resolve; });
    const server = app({ provider: async () => { started(); return new Promise(resolve => { complete = resolve; }); } });
    const first = server.inject(upload(await png()));
    await running;
    expect((await server.inject(upload(await png()))).statusCode).toBe(429);
    complete(draft); expect((await first).statusCode).toBe(200);
  });
});
