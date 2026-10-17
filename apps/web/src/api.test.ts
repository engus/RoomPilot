import { afterEach, expect, it, vi } from 'vitest';
import { recognize } from './api';

afterEach(() => vi.unstubAllGlobals());
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
