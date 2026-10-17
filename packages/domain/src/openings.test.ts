import { describe, expect, it } from 'vitest';
import { ProjectSchema, placeOpening, resizeOpening, getOpeningSegment, getOpeningWidthM, getWallSections, removeRoom } from './index';

const rectangle = (id: string, x: number, y: number, width = 100, height = 100) => ({
  id, name: id, reportedAreaM2: 12,
  polygon: [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }],
});

const make = () => ProjectSchema.parse({ ...legacy(), schemaVersion: 2, openings: [] });

describe('opening placement and mutation', () => {
  it('places a bounded door near an edge end and mirrors the opposite partition face', () => {
    const project = make();
    const result = placeOpening(project, 'a', 1, .99, 'door');
    expect(result.kind).toBe('door');
    expect(result.heightM).toBe(2.2);
    expect(result.sillHeightM).toBe(0);
    expect(result.spans).toHaveLength(2);
    expect(result.spans[0]).toMatchObject({ roomId: 'a', edgeIndex: 1, end: 1 });
    expect(result.spans[0].start).toBeCloseTo(.84);
    expect(result.spans[1]).toMatchObject({ roomId: 'b', edgeIndex: 3, start: 0 });
    expect(result.spans[1].end).toBeCloseTo(.16);
    expect(getOpeningSegment(project, result.spans[0])).toEqual([{ x: 100, y: 84 }, { x: 100, y: 100 }]);
    expect(getOpeningWidthM(project, result)).toBeCloseTo(.8);
    expect(project.openings).toEqual([]);
  });
  it('bounds window width and vertical defaults to the available edge and ceiling', () => {
    const project = ProjectSchema.parse({ ...make(), rooms: [rectangle('short', 0, 0, 10)], ceilingHeightM: 1.5 });
    const result = placeOpening(project, 'short', 0, .5, 'window');
    expect(result.spans).toEqual([{ roomId: 'short', edgeIndex: 0, start: 0, end: 1 }]);
    expect(result.sillHeightM).toBe(.85);
    expect(result.heightM).toBeCloseTo(.65);
    expect(getOpeningWidthM(project, result)).toBe(.5);
  });
  it('can fill a 1.86 m wall without floating-point fit failures or microscopic lintels', () => {
    const project = { ...make(), ceilingHeightM: 1.86 };
    const result = placeOpening(project, 'a', 0, .5, 'window');
    expect(result.sillHeightM + result.heightM).toBeCloseTo(1.86);
    expect(getWallSections(1.86, [{ start: .1, end: .3, sillHeightM: .85, heightM: 1.01 }])).toEqual([
      { start: 0, end: .1, bottomM: 0, topM: 1.86 },
      { start: .1, end: .3, bottomM: 0, topM: .85 },
      { start: .3, end: 1, bottomM: 0, topM: 1.86 },
    ]);
  });
  it('uses the closest compatible face, ignoring too short, same-facing, distant and angled edges', () => {
    const project = ProjectSchema.parse({ ...make(), rooms: [
      rectangle('a', 0, 0), rectangle('too-short', 101, 45, 100, 10),
      rectangle('closest', 104, 0), rectangle('farther', 108, 0),
    ] });
    expect(placeOpening(project, 'a', 1, .5, 'passage').spans.map(span => span.roomId)).toEqual(['a', 'closest']);
    const distant = ProjectSchema.parse({ ...make(), rooms: [rectangle('a', 0, 0), rectangle('far', 113, 0)] });
    expect(placeOpening(distant, 'a', 1, .5, 'door').spans).toHaveLength(1);
    const sameFacing = ProjectSchema.parse({ ...make(), rooms: [rectangle('a', 0, 0), rectangle('behind', 1, 0, 103)] });
    expect(placeOpening(sameFacing, 'a', 1, .5, 'door').spans).toHaveLength(1);
    const angled = ProjectSchema.parse({ ...make(), rooms: [rectangle('a', 0, 0), {
      ...rectangle('angled', 104, 0), polygon: [{ x: 104, y: 0 }, { x: 210, y: 0 }, { x: 210, y: 100 }, { x: 120, y: 100 }],
    }] });
    expect(placeOpening(angled, 'a', 1, .5, 'door').spans).toHaveLength(1);
  });
  it('requires calibration, known height, valid wall/position and a nonoverlapping insertion', () => {
    const project = make();
    expect(() => placeOpening({ ...project, calibration: null }, 'a', 1, .5, 'door')).toThrow();
    expect(() => placeOpening({ ...project, ceilingHeightM: null, ceilingHeightConfirmed: false }, 'a', 1, .5, 'door')).toThrow();
    expect(() => placeOpening(project, 'missing', 1, .5, 'door')).toThrow();
    expect(() => placeOpening(project, 'a', -1, .5, 'door')).toThrow();
    expect(() => placeOpening(project, 'a', 1, NaN, 'door')).toThrow();
    expect(() => placeOpening(project, 'a', 1, 1.1, 'door')).toThrow();
    const first = placeOpening(project, 'a', 1, .5, 'door');
    expect(() => placeOpening({ ...project, openings: [first] }, 'a', 1, .5, 'window')).toThrow();
    expect(() => placeOpening({ ...project, openings: [{ ...first, spans: [first.spans[1]] }] }, 'a', 1, .5, 'door')).toThrow();
  });
  it('resizes the primary and mirrored spans around the centre without changing other properties', () => {
    const project = make();
    const first = placeOpening(project, 'a', 1, .5, 'window');
    const input = { ...project, openings: [first] };
    const result = resizeOpening(input, first.id, 2);
    expect(result.openings[0]).toMatchObject({ id: first.id, kind: 'window', heightM: 1.5, sillHeightM: .85 });
    expect(result.openings[0].spans[0].start).toBeCloseTo(.3);
    expect(result.openings[0].spans[0].end).toBeCloseTo(.7);
    expect(result.openings[0].spans[1].start).toBeCloseTo(.3);
    expect(result.openings[0].spans[1].end).toBeCloseTo(.7);
    expect(getOpeningWidthM(result, result.openings[0])).toBeCloseTo(2);
    expect(getOpeningWidthM(input, first)).toBeCloseTo(1.2);
    for (const width of [0, -1, NaN, Infinity, 6]) expect(() => resizeOpening(input, first.id, width)).toThrow();
    expect(() => resizeOpening(input, 'missing', 1)).toThrow();
    expect(() => resizeOpening({ ...input, calibration: null }, first.id, 1)).toThrow();
  });
  it('rejects a resize that overlaps an aperture or no longer fits the mirrored partition', () => {
    const project = ProjectSchema.parse({ ...make(), rooms: [rectangle('a', 0, 0), rectangle('b', 104, 40, 100, 20)] });
    const first = placeOpening(project, 'a', 1, .5, 'door');
    expect(first.spans).toHaveLength(2);
    expect(() => resizeOpening({ ...project, openings: [first] }, first.id, 2)).toThrow();
    const second = placeOpening(make(), 'a', 0, .25, 'door');
    const third = placeOpening(make(), 'a', 0, .5, 'door');
    expect(() => resizeOpening({ ...make(), openings: [second, third] }, second.id, 2)).toThrow();
  });
  it('rejects resize instead of moving the second span to a different room wall', () => {
    const project = ProjectSchema.parse({ ...make(), rooms: [
      rectangle('a', 0, 0), rectangle('b', 104, 40, 2, 20), rectangle('c', 108, 0),
    ] });
    const first = placeOpening(project, 'a', 1, .5, 'door');
    expect(first.spans.map(span => span.roomId)).toEqual(['a', 'b']);
    expect(() => resizeOpening({ ...project, openings: [first] }, first.id, 2)).toThrow();
  });
  it('removes every opening referencing a deleted room while preserving unrelated openings', () => {
    const project = make();
    const partition = placeOpening(project, 'a', 1, .5, 'door');
    const exterior = placeOpening(project, 'b', 0, .5, 'window');
    const result = removeRoom({ ...project, openings: [partition, exterior] }, 'a');
    expect(result.rooms.map(room => room.id)).toEqual(['b']);
    expect(result.openings).toEqual([exterior]);
    expect(project.rooms).toHaveLength(2);
  });
});

describe('solid wall sections', () => {
  it('leaves a doorway empty below its lintel', () => {
    expect(getWallSections(2.5, [{ start: .2, end: .4, sillHeightM: 0, heightM: 2.2 }])).toEqual([
      { start: 0, end: .2, bottomM: 0, topM: 2.5 },
      { start: .2, end: .4, bottomM: 2.2, topM: 2.5 },
      { start: .4, end: 1, bottomM: 0, topM: 2.5 },
    ]);
  });
  it('preserves sill and lintel around a window and sorts disjoint apertures', () => {
    expect(getWallSections(2.5, [
      { start: .6, end: .8, sillHeightM: 0, heightM: 2.5 },
      { start: .1, end: .3, sillHeightM: .8, heightM: 1.2 },
    ])).toEqual([
      { start: 0, end: .1, bottomM: 0, topM: 2.5 },
      { start: .1, end: .3, bottomM: 0, topM: .8 },
      { start: .1, end: .3, bottomM: 2, topM: 2.5 },
      { start: .3, end: .6, bottomM: 0, topM: 2.5 },
      { start: .8, end: 1, bottomM: 0, topM: 2.5 },
    ]);
    expect(getWallSections(2.5, [])).toEqual([{ start: 0, end: 1, bottomM: 0, topM: 2.5 }]);
    expect(getWallSections(2.5, [{ start: 0, end: 1, sillHeightM: 0, heightM: 2.5 }])).toEqual([]);
  });
  it('rejects overlapping, out-of-bounds or vertically impossible apertures', () => {
    expect(() => getWallSections(0, [])).toThrow();
    const aperture = { start: .1, end: .3, sillHeightM: 0, heightM: 2 };
    for (const invalid of [{ start: -.1 }, { end: 1.1 }, { start: .3 }, { heightM: 0 }, { heightM: Infinity }, { sillHeightM: -1 }, { sillHeightM: 1 }]) {
      expect(() => getWallSections(2.5, [{ ...aperture, ...invalid }])).toThrow();
    }
    expect(() => getWallSections(2.5, [aperture, { ...aperture, start: .2 }])).toThrow();
  });
});
const legacy = () => ({
  schemaVersion: 1, id: 'project', name: 'Synthetic apartment',
  source: { dataUrl: 'data:image/png;base64,aGVsbG8=', width: 400, height: 400 },
  rooms: [rectangle('a', 0, 0), rectangle('b', 104, 0)],
  calibration: { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], lengthM: 5, metresPerPixel: .05 },
  ceilingHeightM: 2.5, ceilingHeightConfirmed: true,
});
const opening = () => ({
  id: 'door', kind: 'door', heightM: 2.2, sillHeightM: 0,
  spans: [{ roomId: 'a', edgeIndex: 1, start: .4, end: .6 }],
});
const document = () => ({ ...legacy(), schemaVersion: 2, openings: [opening()] });

describe('opening document versions and validation', () => {
  it('migrates a strict v1 document without changing any prior data', () => {
    expect(ProjectSchema.parse(legacy())).toEqual({ ...legacy(), schemaVersion: 3, openings: [], zones: [] });
  });
  it('round-trips v2 openings and rejects unknown fields and versions', () => {
    expect(ProjectSchema.parse(JSON.parse(JSON.stringify(document())))).toEqual({ ...document(), schemaVersion: 3, zones: [] });
    for (const input of [{ ...legacy(), openings: [] }, { ...document(), surprise: true }, { ...document(), schemaVersion: 4 }]) {
      expect(ProjectSchema.safeParse(input).success).toBe(false);
    }
  });
  it.each([
    { id: '' }, { kind: 'vent' }, { heightM: 0 }, { heightM: Infinity }, { heightM: 2.6 },
    { sillHeightM: .1 }, { spans: [] }, { spans: [{ roomId: 'missing', edgeIndex: 0, start: .1, end: .3 }] },
    { spans: [{ roomId: 'a', edgeIndex: 4, start: .1, end: .3 }] },
    { spans: [{ roomId: 'a', edgeIndex: .5, start: .1, end: .3 }] },
    { spans: [{ roomId: 'a', edgeIndex: 0, start: .3, end: .3 }] },
    { spans: [{ roomId: 'a', edgeIndex: 0, start: -.1, end: .3 }] },
    { spans: [{ roomId: 'a', edgeIndex: 0, start: .1, end: 1.1 }] },
  ])('rejects invalid opening values: %j', change => {
    expect(ProjectSchema.safeParse({ ...document(), openings: [{ ...opening(), ...change }] }).success).toBe(false);
  });
  it('preserves openings when ceiling metadata is cleared and checks sill in a known vertical fit', () => {
    expect(ProjectSchema.parse({ ...document(), ceilingHeightM: null, ceilingHeightConfirmed: false }).openings).toEqual([opening()]);
    expect(ProjectSchema.safeParse({ ...document(), openings: [{ ...opening(), kind: 'window', sillHeightM: 1, heightM: 1.6 }] }).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...document(), openings: [{ ...opening(), kind: 'window', sillHeightM: 1, heightM: 1.5 }] }).success).toBe(true);
  });
  it('rejects duplicate IDs, repeated room faces, and overlapping apertures on either span', () => {
    const mirrored = { ...opening(), spans: [...opening().spans, { roomId: 'b', edgeIndex: 3, start: .4, end: .6 }] };
    expect(ProjectSchema.safeParse({ ...document(), openings: [opening(), { ...opening(), spans: [{ roomId: 'b', edgeIndex: 0, start: .1, end: .3 }] }] }).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...document(), openings: [{ ...opening(), spans: [...opening().spans, ...opening().spans] }] }).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...document(), openings: [mirrored, { ...opening(), id: 'second', spans: [{ roomId: 'b', edgeIndex: 3, start: .5, end: .7 }] }] }).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...document(), openings: [opening(), { ...opening(), id: 'adjacent', spans: [{ roomId: 'a', edgeIndex: 1, start: .6, end: .8 }] }] }).success).toBe(true);
  });
});
