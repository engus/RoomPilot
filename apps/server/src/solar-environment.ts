import { getPosition } from 'suncalc';
import { SolarEnvironmentSchema, type SolarEnvironment } from '@roompilot/domain';

export interface SolarConfig { latitude: number; longitude: number; planUpBearingDeg: number }
export function readSolarConfig(env: Record<string, string | undefined> = process.env): SolarConfig | null {
  const values = [env.SUN_LATITUDE, env.SUN_LONGITUDE, env.PLAN_UP_BEARING_DEG];
  if (values.some(value => !value?.trim())) return null;
  const [latitude, longitude, planUpBearingDeg] = values.map(Number);
  if (![latitude, longitude, planUpBearingDeg].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || planUpBearingDeg < 0 || planUpBearingDeg >= 360) return null;
  return { latitude, longitude, planUpBearingDeg };
}
export function calculateSolarEnvironment(config: SolarConfig, now = new Date()): SolarEnvironment {
  // SunCalc 2 uses degrees, clockwise from north. Plan y increases downward.
  const position = getPosition(now, config.latitude, config.longitude);
  const altitude = position.altitude * Math.PI / 180;
  const relativeAzimuth = (position.azimuth - config.planUpBearingDeg) * Math.PI / 180;
  return SolarEnvironmentSchema.parse({
    configured: true, phase: position.altitude > 0 ? 'day' : position.altitude > -6 ? 'twilight' : 'night',
    solarElevationDeg: position.altitude, updatedAt: now.toISOString(),
    sunDirection: [Math.cos(altitude) * Math.sin(relativeAzimuth), Math.sin(altitude), -Math.cos(altitude) * Math.cos(relativeAzimuth)],
  });
}
