import { expect, it } from 'vitest';
import { createProject, isReadyFor3D, ProjectSchema, removeRoom } from './index';

const base = () => ({ ...createProject({ dataUrl: 'data:image/png;base64,YQ==', width: 100, height: 100 }, { rooms: [{ name: 'Room', reportedAreaM2: null, polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] }], ceilingHeightM: 2.5, warnings: [] }), calibration: { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], lengthM: 10, metresPerPixel: .1 } });
const object = (roomId: string) => ({ id: 'table', roomId, kind: 'table', position: { x: 50, y: 50 }, elevationM: 0, rotationRad: 0, sizeM: [1.3, .76, .8] });

it('migrates v4 without inventing furnishings and round-trips v5 instances', () => {
  const { sceneObjects: ignored, ...legacy } = base() as ReturnType<typeof base> & { sceneObjects?: unknown };
  const migrated = ProjectSchema.parse({ ...legacy, schemaVersion: 4 });
  expect(migrated.schemaVersion).toBe(5); expect(migrated.sceneObjects).toEqual([]);
  const p = base();
  const furnished = ProjectSchema.parse({ ...p, schemaVersion: 5, sceneObjects: [object(p.rooms[0].id)] });
  expect(ProjectSchema.parse(JSON.parse(JSON.stringify(furnished)))).toEqual(furnished);
});

it('rejects dangling, duplicate, oversized and outside-room objects', () => {
  const p = base(), item = object(p.rooms[0].id);
  const parse = (sceneObjects: unknown[], extra = {}) => ProjectSchema.safeParse({ ...p, schemaVersion: 5, sceneObjects, ...extra }).success;
  expect(parse([item])).toBe(true);
  expect(parse([{ ...item, roomId: 'missing' }])).toBe(false);
  expect(parse([item, item])).toBe(false);
  expect(parse([{ ...item, position: { x: 1, y: 1 }, rotationRad: .7 }])).toBe(false);
  expect(parse([{ ...item, elevationM: 2.3 }])).toBe(false);
  expect(parse([{ ...item, sizeM: [-1, 1, 1] }])).toBe(false);
  const nearWall = { ...item, position: { x: 12, y: 50 }, sizeM: [3, .5, 1] };
  expect(parse([nearWall])).toBe(false);
  expect(parse([{ ...nearWall, rotationRad: Math.PI / 2 }])).toBe(true);
  expect(parse(Array.from({ length: 201 }, (_, i) => ({ ...item, id: `item-${i}` })))).toBe(false);
  expect(parse([{ ...item, position: { x: 101, y: 50 } }], { calibration: null })).toBe(false);
});

it('keeps furnishings exportable while missing metadata disables 3D, and validates again when restored', () => {
  const p = base(), item = object(p.rooms[0].id);
  const furnished = ProjectSchema.parse({ ...p, sceneObjects: [item] });
  for (const extra of [{ calibration: null }, { ceilingHeightM: null, ceilingHeightConfirmed: false }]) {
    const draft = ProjectSchema.parse({ ...furnished, ...extra });
    expect(draft.sceneObjects).toEqual([item]); expect(isReadyFor3D(draft)).toBe(false);
    expect(ProjectSchema.parse(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
  }
  expect(ProjectSchema.safeParse({ ...furnished, calibration: { ...p.calibration, lengthM: .1, metresPerPixel: .001 } }).success).toBe(false);
});

it('removes furniture with its parent room', () => {
  const p = base();
  const furnished = ProjectSchema.parse({ ...p, schemaVersion: 5, sceneObjects: [object(p.rooms[0].id)] });
  expect(removeRoom(furnished, p.rooms[0].id).sceneObjects).toEqual([]);
});
