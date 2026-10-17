import { expect, it } from 'vitest';
import { buildApp } from './app';

it('exposes only calculated illumination and rejects foreign browser origins', async () => {
  const app = buildApp({ solarConfig: { latitude: 0, longitude: 0, planUpBearingDeg: 90 } });
  try {
    const result = await app.inject({ url: '/api/environment' });
    expect(result.statusCode).toBe(200); expect(result.headers['cache-control']).toBe('no-store');
    expect(result.json()).toMatchObject({ configured: true });
    expect(result.body).not.toMatch(/latitude|longitude|planUpBearingDeg|address|API_KEY/);
    expect((await app.inject({ url: '/api/environment', headers: { origin: 'https://foreign.example' } })).statusCode).toBe(403);
  } finally { await app.close(); }
});
it('reports automatic lighting unavailable without substituting a location', async () => {
  const app = buildApp({ solarConfig: null });
  try { expect((await app.inject({ url: '/api/environment' })).json()).toEqual({ configured: false }); }
  finally { await app.close(); }
});
