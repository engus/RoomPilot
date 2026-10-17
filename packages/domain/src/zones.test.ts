import { expect, it } from 'vitest';
import { createProject, ProjectSchema, removeRoom } from './index';
import { getZoneArea, isPolygonWithinRoom } from './zones';

const rectangle = (left: number, top: number, right: number, bottom: number) => [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
const make = () => createProject({ width: 100, height: 100, dataUrl: 'data:image/png;base64,YQ==' }, { rooms: [{ name: 'Studio', reportedAreaM2: 30, polygon: rectangle(0, 0, 1, 1) }], ceilingHeightM: null, warnings: [] });
const zone = (roomId: string, id = 'zone-1', polygon = rectangle(0, 0, 50, 100)) => ({ id, roomId, name: 'Kitchen', polygon });

it('migrates v1 and v2 to v5 without inventing zones or losing openings', () => {
  const project = make(); const { zones: _zones, apartmentBrief: _brief, sceneObjects: _objects, ...withoutZones } = project;
  const v2 = { ...withoutZones, schemaVersion: 2 };
  expect(ProjectSchema.parse(v2)).toEqual({ ...project, schemaVersion: 5, zones: [] });
  const { openings: _openings, ...v1 } = v2;
  expect(ProjectSchema.parse({ ...v1, schemaVersion: 1 })).toEqual({ ...project, schemaVersion: 5, zones: [] });
});
it('round-trips zones independently of room geometry and keeps their area unknown without scale', () => {
  const project = make(); const item = zone(project.rooms[0].id);
  const saved = ProjectSchema.parse({ ...project, zones: [item] });
  expect(ProjectSchema.parse(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  expect(saved.rooms).toEqual(project.rooms); expect(getZoneArea(item, saved)).toBeNull();
  expect(getZoneArea(item, { ...saved, calibration: { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], lengthM: 10, metresPerPixel: .1 } })).toBeCloseTo(50);
});
it('allows shared zone boundaries but rejects overlapping interiors, escaped or orphan zones', () => {
  const project = make(); const roomId = project.rooms[0].id;
  expect(ProjectSchema.safeParse({ ...project, zones: [zone(roomId), zone(roomId, 'zone-2', rectangle(50, 0, 100, 100))] }).success).toBe(true);
  for (const zones of [
    [zone(roomId), zone(roomId, 'zone-2', rectangle(49, 0, 100, 100))],
    [zone(roomId, 'zone-1', rectangle(0, 0, 101, 100))],
    [zone('missing')], [zone(roomId), zone(roomId)],
  ]) expect(ProjectSchema.safeParse({ ...project, zones }).success).toBe(false);
});
it('rejects zone edges crossing a concave room recess even when every vertex is inside', () => {
  const parent = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 60, y: 100 }, { x: 60, y: 40 }, { x: 40, y: 40 }, { x: 40, y: 100 }, { x: 0, y: 100 }];
  expect(isPolygonWithinRoom(rectangle(20, 20, 80, 80), parent)).toBe(false);
  expect(isPolygonWithinRoom(rectangle(0, 0, 100, 40), parent)).toBe(true);
});
it('removes a deleted room’s zones and rejects edits that leave its existing zones outside', () => {
  const project = make(); const saved = ProjectSchema.parse({ ...project, zones: [zone(project.rooms[0].id)] });
  expect(removeRoom(saved, saved.rooms[0].id).zones).toEqual([]);
  expect(ProjectSchema.safeParse({ ...saved, rooms: [{ ...saved.rooms[0], polygon: rectangle(10, 10, 100, 100) }] }).success).toBe(false);
});
it('handles reversed winding, nested/coincident siblings and malformed outlines safely', () => {
  const project = make(); const roomId = project.rooms[0].id;
  expect(isPolygonWithinRoom(rectangle(0, 0, 50, 100).reverse(), project.rooms[0].polygon)).toBe(true);
  for (const polygon of [rectangle(0, 0, 50, 100), rectangle(10, 10, 20, 20), [{ x: 0, y: 0 }, { x: 80, y: 80 }, { x: 80, y: 0 }, { x: 0, y: 50 }]]) {
    expect(ProjectSchema.safeParse({ ...project, zones: [zone(roomId), zone(roomId, 'another', polygon)] }).success).toBe(false);
  }
});
