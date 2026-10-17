import { expect, it } from 'vitest';
import { calculateSolarEnvironment, readSolarConfig } from './solar-environment';

it('requires bounded complete local coordinates and a plan bearing, including explicit zero values', () => {
  expect(readSolarConfig({})).toBeNull();
  expect(readSolarConfig({ SUN_LATITUDE: '', SUN_LONGITUDE: '0', PLAN_UP_BEARING_DEG: '0' })).toBeNull();
  expect(readSolarConfig({ SUN_LATITUDE: '91', SUN_LONGITUDE: '0', PLAN_UP_BEARING_DEG: '0' })).toBeNull();
  expect(readSolarConfig({ SUN_LATITUDE: '0', SUN_LONGITUDE: '0', PLAN_UP_BEARING_DEG: '360' })).toBeNull();
  expect(readSolarConfig({ SUN_LATITUDE: '0', SUN_LONGITUDE: '0', PLAN_UP_BEARING_DEG: '90' })).toEqual({ latitude: 0, longitude: 0, planUpBearingDeg: 90 });
});
it('uses the real UTC instant to distinguish equatorial noon and midnight without exposing coordinates', () => {
  const config = { latitude: 0, longitude: 0, planUpBearingDeg: 90 };
  const noon = calculateSolarEnvironment(config, new Date('2026-03-20T12:00:00Z'));
  const night = calculateSolarEnvironment(config, new Date('2026-03-20T00:00:00Z'));
  expect(noon.phase).toBe('day'); expect(noon.solarElevationDeg).toBeGreaterThan(85);
  expect(night.phase).toBe('night'); expect(night.solarElevationDeg).toBeLessThan(-85);
  expect(Object.keys(noon).sort()).toEqual(['configured', 'phase', 'solarElevationDeg', 'sunDirection', 'updatedAt'].sort());
  expect(Math.hypot(...noon.sunDirection)).toBeCloseTo(1, 8);
});
it('maps easterly morning sunlight to the top of an east-facing plan', () => {
  const morning = calculateSolarEnvironment({ latitude: 0, longitude: 0, planUpBearingDeg: 90 }, new Date('2026-03-20T07:00:00Z'));
  const northUp = calculateSolarEnvironment({ latitude: 0, longitude: 0, planUpBearingDeg: 0 }, new Date('2026-03-20T07:00:00Z'));
  expect(morning.sunDirection[2]).toBeLessThan(-.8);
  expect(Math.abs(morning.sunDirection[0])).toBeLessThan(.05);
  expect(northUp.sunDirection[0]).toBeGreaterThan(.8);
});
