import { expect, it } from 'vitest';
import { ApartmentBriefSchema, createApartmentBrief } from './apartment-brief';
import { createProject, ProjectSchema } from './index';

const make = () => createProject({ width: 100, height: 100, dataUrl: 'data:image/png;base64,YQ==' }, { rooms: [], ceilingHeightM: null, warnings: [] });
it('keeps unknown values distinct from zero counts and validates bounded structured answers', () => {
  const blank = createApartmentBrief();
  expect(blank.livingRooms).toBeNull(); expect(blank.balconyArea).toBe('unknown');
  expect(ApartmentBriefSchema.parse({ ...blank, livingRooms: 0, balconies: 0 }).livingRooms).toBe(0);
  for (const invalid of [{ livingRooms: 1.5 }, { bathrooms: -1 }, { balconies: 101 }, { approximateAreaM2: 0 }, { approximateAreaM2: Infinity }, { bathroomLayout: 'instructions' }, { unexpected: true }]) {
    expect(ApartmentBriefSchema.safeParse({ ...blank, ...invalid }).success).toBe(false);
  }
});
it('creates v5 projects without inventing apartment facts, and migrates v3 without changing geometry', () => {
  const current = ProjectSchema.parse({ ...make(),
    rooms: [{ id: 'room', name: 'Room', reportedAreaM2: 15, polygon: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] }],
    zones: [{ id: 'zone', roomId: 'room', name: 'Living', polygon: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 100 }, { x: 0, y: 100 }] }],
    openings: [{ id: 'door', kind: 'door', heightM: 2.2, sillHeightM: 0, spans: [{ roomId: 'room', edgeIndex: 1, start: .2, end: .5 }] }],
  }); expect(current.schemaVersion).toBe(5); expect(current.apartmentBrief).toBeNull();
  const { apartmentBrief: _brief, sceneObjects: _objects, ...old } = current;
  expect(ProjectSchema.parse({ ...old, schemaVersion: 3 })).toEqual(current);
});
it('preserves the brief through JSON exports without deriving calibration from rough area', () => {
  const project = ProjectSchema.parse({ ...make(), apartmentBrief: { ...createApartmentBrief(), livingRooms: 3, approximateAreaM2: 58, balconyArea: 'excluded', bathrooms: 1, bathroomLayout: 'combined' } });
  expect(ProjectSchema.parse(JSON.parse(JSON.stringify(project)))).toEqual(project);
  expect(project.calibration).toBeNull(); expect(project.rooms).toEqual([]);
});
