import { expect, it } from 'vitest';
import { buildSolidWallModel, findRoomOverlaps, getComputedArea, getZoneArea, isReadyFor3D, ProjectSchema } from '@roompilot/domain';
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
  expect(ru.apartmentBrief).toEqual({ livingRooms: 3, approximateAreaM2: 58, balconyArea: 'excluded', bathrooms: 1, bathroomLayout: 'combined', kitchens: 1, balconies: 1, storageRooms: 1 });
  expect(ru.rooms.find(room => room.id === 'right-small')!.name).toBe('Санузел');
  ru.rooms[0].name = 'Edited'; ru.openings[0].spans[0].start = 0;
  expect(buildDemoProject(source, 'ru').rooms[0].name).toBe('Спальня взрослых');
  expect(buildDemoProject(source, 'ru').openings[0].spans[0].start).not.toBe(0);
});

it('fills the demo partition and balcony gaps while preserving open living zones', () => {
  const project = buildDemoProject({ ...DEMO_SIZE, dataUrl: 'data:image/png;base64,YQ==' }, 'en');
  const model = buildSolidWallModel(project), scale = project.calibration!.metresPerPixel;
  function contains(x: number, y: number) {
    const inside = (ring: { x: number; y: number }[]) => {
      let value = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i], b = ring[j];
        if ((a.y > y * scale) !== (b.y > y * scale) && x * scale < (b.x - a.x) * (y * scale - a.y) / (b.y - a.y) + a.x) value = !value;
      }
      return value;
    };
    return model.footprint.some(polygon => inside(polygon[0]) && !polygon.slice(1).some(inside));
  }
  for (const [x, y] of [[365.5, 300], [250, 463.5], [200, 125.5], [229.5, 500], [570.5, 350]]) expect(contains(x, y)).toBe(true);
  for (const [x, y] of [[450, 350], [650, 200], [500, 520], [500, 800]]) expect(contains(x, y)).toBe(false);
});
