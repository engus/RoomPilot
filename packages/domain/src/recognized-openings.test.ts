import { expect, it } from 'vitest';
import { applyRecognizedOpenings, applyDetectedOpenings, OpeningRecognitionSchema } from './recognized-openings';
import { createProject, ProjectSchema } from './index';

const make = () => createProject({ dataUrl: 'data:image/png;base64,YQ==', width: 1000, height: 1000 }, {
  rooms: [
    { name: 'Left', reportedAreaM2: null, polygon: [{ x: .1, y: .1 }, { x: .4, y: .1 }, { x: .4, y: .5 }, { x: .1, y: .5 }] },
    { name: 'Right', reportedAreaM2: null, polygon: [{ x: .41, y: .1 }, { x: .8, y: .1 }, { x: .8, y: .5 }, { x: .41, y: .5 }] },
  ], ceilingHeightM: 2.5, warnings: [],
});
const door = { kind: 'door' as const, heightM: 2.2, sillHeightM: 0, spans: [
  { roomIndex: 0, edgeIndex: 1, start: .3, end: .5 },
  { roomIndex: 1, edgeIndex: 3, start: .5, end: .7 },
] };
it('maps both faces of an AI door to stable room IDs without scale or metadata changes', () => {
  const project = make(); const result = applyRecognizedOpenings(project, [door]);
  expect(result.project.openings).toHaveLength(1);
  expect(result.project.openings[0]).toMatchObject({ kind: 'door', heightM: 2.2, spans: [{ roomId: project.rooms[0].id, edgeIndex: 1 }, { roomId: project.rooms[1].id, edgeIndex: 3 }] });
  expect({ ...result.project, openings: [] }).toEqual(project);
  expect(ProjectSchema.safeParse(result.project).success).toBe(true);
});
it('discloses and caps nullable preview dimensions to a known low ceiling', () => {
  const project = { ...make(), ceilingHeightM: 1.5 };
  const result = applyRecognizedOpenings(project, [{ kind: 'window', heightM: null, sillHeightM: null, spans: [{ roomIndex: 0, edgeIndex: 0, start: .2, end: .6 }] }]);
  expect(result.project.openings[0]).toMatchObject({ sillHeightM: .85, heightM: .65 });
  expect(result.warnings.join(' ')).toMatch(/preview dimensions/i);
});
it('adjusts only an unknown sill to fit an explicitly read window height', () => {
  const result = applyRecognizedOpenings(make(), [{ kind: 'window', heightM: 2.2, sillHeightM: null, spans: [{ roomIndex: 0, edgeIndex: 0, start: .2, end: .6 }] }]);
  expect(result.project.openings).toHaveLength(1);
  expect(result.project.openings[0].heightM).toBe(2.2);
  expect(result.project.openings[0].sillHeightM).toBeCloseTo(.3);
  expect(result.warnings.join(' ')).toMatch(/preview dimensions/i);
});
it('rejects explicitly read dimensions that exceed the ceiling instead of shrinking them', () => {
  const result = applyRecognizedOpenings(make(), [{ kind: 'window', heightM: 2.2, sillHeightM: .85, spans: [{ roomIndex: 0, edgeIndex: 0, start: .2, end: .6 }] }]);
  expect(result.project.openings).toHaveLength(0);
});
it('skips bad indices, overlaps, impossible heights and unrelated wall pairs while retaining valid doors', () => {
  const project = make();
  const result = applyRecognizedOpenings(project, [door, door,
    { ...door, spans: [{ ...door.spans[0], roomIndex: 99 }] },
    { ...door, heightM: 9 },
    { ...door, spans: [door.spans[0], { roomIndex: 1, edgeIndex: 1, start: .3, end: .5 }] },
  ]);
  expect(result.project.openings).toHaveLength(1);
  expect(result.warnings.join(' ')).toMatch(/skipped 4/i);
});
it('preserves manual openings and suppresses repeated recognition conflicts', () => {
  const first = applyRecognizedOpenings(make(), [door]).project;
  expect(applyRecognizedOpenings(first, [door]).project).toEqual(first);
});
it('rejects paired spans whose positions do not describe the same aperture', () => {
  expect(applyRecognizedOpenings(make(), [{ ...door, spans: [door.spans[0], { ...door.spans[1], start: .1, end: .3 }] }]).project.openings).toHaveLength(0);
});
it('reports empty detection explicitly and bounds untrusted draft size and span coordinates', () => {
  const project = make(); expect(applyRecognizedOpenings(project, []).warnings.join(' ')).toMatch(/no.*openings/i);
  expect(OpeningRecognitionSchema.safeParse({ openings: Array(201).fill(door), warnings: [] }).success).toBe(false);
  expect(applyRecognizedOpenings(project, [{ ...door, spans: [{ ...door.spans[0], start: -.1 }] }]).project.openings).toHaveLength(0);
});
it('attaches image-coordinate apertures to both wall faces without asking the model for edge arithmetic', () => {
  const project = make();
  const result = applyDetectedOpenings(project, [{ kind: 'door', heightM: 2.2, sillHeightM: 0, segment: [{ x: .405, y: .22 }, { x: .405, y: .3 }] }]);
  expect(result.project.openings).toHaveLength(1);
  expect(result.project.openings[0].spans).toEqual([
    { roomId: project.rooms[0].id, edgeIndex: 1, start: .3, end: .5 },
    { roomId: project.rooms[1].id, edgeIndex: 3, start: .5, end: .7 },
  ]);
});
it('rejects detected segments far from walls, diagonal swing arcs and malformed coordinates', () => {
  const project = make();
  const result = applyDetectedOpenings(project, [
    { kind: 'door', heightM: null, sillHeightM: 0, segment: [{ x: .2, y: .2 }, { x: .3, y: .3 }] },
    { kind: 'window', heightM: null, sillHeightM: null, segment: [{ x: .2, y: .3 }, { x: .3, y: .3 }] },
    { kind: 'window', heightM: null, sillHeightM: null, segment: [{ x: -1, y: 0 }, { x: 0, y: 0 }] },
  ]);
  expect(result.project).toEqual(project); expect(result.warnings.join(' ')).toMatch(/skipped 3/i);
});
