import { expect, it } from 'vitest';
import { findRoomOverlaps, getComputedArea, getZoneArea, isReadyFor3D, ProjectSchema } from '@roompilot/domain';
import { buildDemoProject } from './demo-project';
import { DEMO_SIZE } from './demo-layout';

it('builds a localized complete apartment with wall-free zones, original calibration and all openings', () => {
  const source = { ...DEMO_SIZE, dataUrl: 'data:image/png;base64,YQ==' };
  const ru = buildDemoProject(source, 'ru'), en = buildDemoProject(source, 'en');
  expect(ProjectSchema.safeParse(ru).success).toBe(true); expect(isReadyFor3D(ru)).toBe(true);
  expect(ru.rooms).toHaveLength(6); expect(ru.openings.filter(o => o.kind === 'door')).toHaveLength(6);
  expect(ru.openings.filter(o => o.kind === 'window')).toHaveLength(4); expect(ru.zones).toHaveLength(3);
  expect(ru.rooms.map(room => room.name)).toContain('Детская спальня');
  expect(en.rooms.map(room => room.name)).toContain('Parents’ bedroom');
  expect(ru.zones.map(zone => zone.name)).toEqual(['Гостиная', 'Кухня', 'Коридор']);
  expect(findRoomOverlaps(ru.rooms)).toEqual([]);
  const main = ru.rooms.find(room => room.id === 'main')!;
  expect(ru.zones.reduce((sum, zone) => sum + getZoneArea(zone, ru)!, 0)).toBeCloseTo(getComputedArea(main, ru)!, 5);
  expect(ru.calibration!.lengthM).toBe(5.88); expect(ru.ceilingHeightM).toBe(2.5);
  ru.rooms[0].name = 'Edited'; ru.openings[0].spans[0].start = 0;
  expect(buildDemoProject(source, 'ru').rooms[0].name).toBe('Спальня взрослых');
  expect(buildDemoProject(source, 'ru').openings[0].spans[0].start).not.toBe(0);
});
