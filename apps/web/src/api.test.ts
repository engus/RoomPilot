import { afterEach, expect, it, vi } from 'vitest';
import { recognize, recognizeOpenings } from './api';
import { createProject } from '@roompilot/domain';

it('sends a project only to the dedicated OpenRouter openings endpoint and localizes failures', async () => {
  const project = createProject({ width: 10, height: 10, dataUrl: 'data:image/png;base64,YQ==' }, { rooms: [], ceilingHeightM: null, warnings: [] });
  vi.stubGlobal('fetch', async (url: string, options: RequestInit) => {
    expect(url).toBe('/api/recognize-openings');
    expect(JSON.parse(options.body as string)).toEqual({ project });
    return Response.json({ code: 'provider_rate_limit' }, { status: 429 });
  });
  await expect(recognizeOpenings(project)).rejects.toMatchObject({ key: 'providerRateLimit' });
});

afterEach(() => vi.unstubAllGlobals());
it('bounds a stalled recognition request and returns a localized timeout', async () => {
  vi.useFakeTimers();
  try {
    let signal: AbortSignal | null | undefined;
    vi.stubGlobal('fetch', (_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      signal = options.signal;
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const result = recognizeOpenings(createProject({ width: 10, height: 10, dataUrl: 'data:image/png;base64,YQ==' }, { rooms: [], ceilingHeightM: null, warnings: [] }));
    expect(signal).toBeInstanceOf(AbortSignal);
    const outcome = expect(result).rejects.toMatchObject({ key: 'recognitionTimeout' });
    await vi.advanceTimersByTimeAsync(130_001);
    await outcome;
  } finally { vi.useRealTimers(); }
});
it('routes the image to the selected provider and maps only allowlisted error codes', async () => {
  vi.stubGlobal('fetch', async (url: string, options: RequestInit) => {
    expect(url).toBe('/api/recognize?provider=gemini');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    return Response.json({ code: 'provider_quota', error: 'PRIVATE UPSTREAM' }, { status: 429 });
  });
  await expect(recognize(new File(['image'], 'plan.png', { type: 'image/png' }), 'gemini')).rejects.toMatchObject({ key: 'providerQuota' });
});
it('does not show arbitrary server messages as translation keys', async () => {
  vi.stubGlobal('fetch', async () => Response.json({ code: 'PRIVATE', error: 'SECRET' }, { status: 502 }));
  await expect(recognize(new File(['image'], 'plan.png'), 'openrouter')).rejects.toMatchObject({ key: 'recognitionFailed' });
});

it('maps invalid room geometry to its specific localized error without exposing the provider draft', async () => {
  vi.stubGlobal('fetch', async () => Response.json({ code: 'invalid_geometry', error: 'PRIVATE ROOM' }, { status: 502 }));
  await expect(recognize(new File(['image'], 'plan.png'), 'gemini')).rejects.toMatchObject({ key: 'recognitionGeometry' });
});
