import { expect, it } from 'vitest';
import { buildSolidWallModel, PreviewComplexityError, type WallPolygon } from './solid-walls';
import { createProject, calibrateProject } from './index';
import type { Project, Room } from './schema';

const room = (id: string, left: number, right: number): Room => ({ id, name: id, reportedAreaM2: null, polygon: [{ x: left, y: 1 }, { x: right, y: 1 }, { x: right, y: 5 }, { x: left, y: 5 }] });
function project(rooms = [room('a', 1, 5), room('b', 5.4, 9)]) {
  const value = createProject({ width: 20, height: 20, dataUrl: 'data:image/png;base64,YQ==' }, { rooms: [], ceilingHeightM: 2.5, warnings: [] });
  return { ...calibrateProject(value, [{ x: 0, y: 0 }, { x: 1, y: 0 }], 1), rooms, ceilingHeightConfirmed: true };
}
function inRing(ring: WallPolygon[number], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
export const hasWall = (polygons: WallPolygon[], x: number, y: number) => polygons.some(p => inRing(p[0], x, y) && !p.slice(1).some(hole => inRing(hole, x, y)));
const atHeight = (model: ReturnType<typeof buildSolidWallModel>, height: number) => model.layers.find(layer => layer.bottomM <= height && layer.topM > height)!.polygons;

it('joins close wall faces without filling rooms or bridging distant empty space', () => {
  const value = project(); const before = JSON.stringify(value); const model = buildSolidWallModel(value);
  expect(hasWall(model.footprint, 5.2, 3)).toBe(true);
  expect(hasWall(model.footprint, 3, 3)).toBe(false);
  expect(hasWall(model.base, 3, 3)).toBe(true);
  expect(hasWall(buildSolidWallModel(project([room('a', 1, 5), room('b', 6, 9)])).footprint, 5.5, 3)).toBe(false);
  expect(JSON.stringify(value)).toBe(before);
});
it('keeps a solid partition when room boundaries touch and seals outside corners', () => {
  const model = buildSolidWallModel(project([room('a', 1, 5), room('b', 5, 9)]));
  expect(hasWall(model.footprint, 4.98, 3)).toBe(true);
  expect(hasWall(model.footprint, 5.02, 3)).toBe(true);
  expect(hasWall(model.footprint, .9, .9)).toBe(true);
});
it('cuts a paired doorway through the full partition and centers its frame between faces', () => {
  const value = project();
  value.openings = [{ id: 'door', kind: 'door', heightM: 2.2, sillHeightM: 0, spans: [{ roomId: 'a', edgeIndex: 1, start: .25, end: .5 }, { roomId: 'b', edgeIndex: 3, start: .5, end: .75 }] }];
  const model = buildSolidWallModel(value);
  for (const x of [4.98, 5.1, 5.2, 5.38, 5.42]) expect(hasWall(atHeight(model, 1), x, 2.5)).toBe(false);
  expect(hasWall(atHeight(model, 2.3), 5.2, 2.5)).toBe(true);
  expect(hasWall(atHeight(model, 1), 5.2, 3.5)).toBe(true);
  expect(model.openings[0].a.x).toBeCloseTo(5.2);
  expect(model.openings[0].depthM).toBeGreaterThanOrEqual(.4);
});
it('preserves exterior window sills and lintels with opaque wall material around the cut', () => {
  const value = project([room('a', 1, 5)]);
  value.openings = [{ id: 'window', kind: 'window', heightM: 1.5, sillHeightM: .5, spans: [{ roomId: 'a', edgeIndex: 0, start: .25, end: .75 }] }];
  const model = buildSolidWallModel(value);
  expect(hasWall(atHeight(model, .25), 3, .9)).toBe(true);
  expect(hasWall(atHeight(model, 1), 3, .9)).toBe(false);
  expect(hasWall(atHeight(model, 2.3), 3, .9)).toBe(true);
  expect(model.openings[0].a.y).toBeLessThan(1);
});
it('keeps separated paired faces local instead of cutting through unrelated rooms', () => {
  const value = project([room('a', 1, 5), room('b', 7, 11), room('c', 6, 6.5)]);
  value.openings = [{ id: 'door', kind: 'door', heightM: 2.2, sillHeightM: 0, spans: [{ roomId: 'a', edgeIndex: 1, start: .25, end: .5 }, { roomId: 'b', edgeIndex: 3, start: .5, end: .75 }] }];
  const model = buildSolidWallModel(value);
  expect(hasWall(atHeight(model, 1), 6, 2.5)).toBe(true);
  expect(model.openings.every(item => item.depthM < .5)).toBe(true);
});
it('cuts through diagonal corner caps instead of leaving an opaque patch in a door', () => {
  const value = project([{ ...room('a', 1, 5), polygon: [{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 5 }, { x: 4, y: 5 }] }]);
  value.openings = [{ id: 'door', kind: 'door', heightM: 2.2, sillHeightM: 0, spans: [{ roomId: 'a', edgeIndex: 0, start: 0, end: .25 }] }];
  const model = buildSolidWallModel(value);
  expect(hasWall(atHeight(model, 1), 1.05, .72)).toBe(false);
  expect(hasWall(atHeight(model, 2.3), 1.05, .72)).toBe(true);
});
it('handles concave diagonal outlines and reversed winding without changing the footprint', () => {
  const value: Project = project([{ ...room('a', 1, 5), polygon: [{ x: 1, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 4 }, { x: 1, y: 4 }] }]);
  const forward = buildSolidWallModel(value), backward = buildSolidWallModel({ ...value, rooms: value.rooms.map(r => ({ ...r, polygon: [...r.polygon].reverse() })) });
  for (const [x, y] of [[2, 2], [4.1, 4.8], [3.9, 4.8], [2, 4.1], [5, 1.8]]) expect(hasWall(forward.footprint, x, y)).toBe(hasWall(backward.footprint, x, y));
  expect(hasWall(forward.footprint, 3.9, 4.8)).toBe(true);
  expect(hasWall(forward.footprint, 3, 5)).toBe(false);
});
it('rejects excessive preview work before allocating hundreds of global wall layers', () => {
  const rooms = Array.from({ length: 21 }, (_, i) => ({ ...room(`r${i}`, 1, 2), polygon: Array.from({ length: 100 }, (_, j) => ({ x: 1 + i % 5 * 3 + Math.cos(j * Math.PI / 50) * .2, y: 1 + Math.floor(i / 5) * 3 + Math.sin(j * Math.PI / 50) * .2 })) }));
  expect(() => buildSolidWallModel(project(rooms))).toThrow(PreviewComplexityError);
});
