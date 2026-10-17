import { describe, expect, it } from 'vitest';
import { polygonArea, validatePolygon, createProject, getComputedArea, calibrateProject, isReadyFor3D, ProjectSchema } from './index';

const polygon = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
const source = { dataUrl: 'data:image/png;base64,aGVsbG8=', width: 100, height: 100 };
const make = () => createProject(source, { rooms: [{ name: null, reportedAreaM2: null, polygon: polygon.map(p => ({ x: p.x / 100, y: p.y / 100 })) }], ceilingHeightM: null, warnings: [] });

describe('floor geometry', () => {
  it('calculates a concave polygon without its bounding box', () => {
    expect(polygonArea([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 4 }, { x: 0, y: 4 }])).toBe(12);
  });
  it('rejects a self-crossing outline with nonzero signed area', () => {
    expect(validatePolygon([{ x: 0, y: 0 }, { x: 80, y: 100 }, { x: 100, y: 0 }, { x: 0, y: 70 }])).toBe(false);
  });
  it('rejects a crossing at small normalized coordinates too', () => {
    expect(validatePolygon([{ x: 0, y: 0 }, { x: .008, y: .01 }, { x: .01, y: 0 }, { x: 0, y: .007 }])).toBe(false);
  });
  it('rejects degenerate and duplicate vertices', () => {
    expect(validatePolygon([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }])).toBe(false);
    expect(validatePolygon([...polygon, polygon[0]])).toBe(false);
  });
  it('keeps area unknown until calibrated and generates missing room names', () => {
    const p = make();
    expect(p.rooms[0].name).toBe('Комната 1');
    expect(getComputedArea(p.rooms[0], p)).toBeNull();
    expect(p.ceilingHeightM).toBeNull();
  });
  it('calculates calibrated area without replacing the reported area', () => {
    const p = make(); p.rooms[0].reportedAreaM2 = 23;
    const scaled = calibrateProject(p, [{ x: 0, y: 0 }, { x: 100, y: 0 }], 5);
    expect(getComputedArea(scaled.rooms[0], scaled)).toBeCloseTo(25);
    expect(scaled.rooms[0].reportedAreaM2).toBe(23);
    expect(isReadyFor3D(scaled)).toBe(false);
    scaled.ceilingHeightM = 2.7;
    expect(isReadyFor3D(scaled)).toBe(false);
    scaled.ceilingHeightConfirmed = true;
    expect(isReadyFor3D(scaled)).toBe(true);
  });
  it('rejects zero distance and non-positive physical scale', () => {
    expect(() => calibrateProject(make(), [{ x: 0, y: 0 }, { x: 0, y: 0 }], 4)).toThrow();
    expect(() => calibrateProject(make(), [polygon[0], polygon[1]], -1)).toThrow();
  });
  it('rejects forged calibration and unsupported document versions', () => {
    const p = calibrateProject(make(), [polygon[0], polygon[1]], 5);
    p.calibration!.metresPerPixel = 10;
    expect(ProjectSchema.safeParse(p).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...make(), schemaVersion: 3 }).success).toBe(false);
  });
  it('checks calibration accuracy relative to a very small physical length', () => {
    const p = calibrateProject(make(), [polygon[0], polygon[1]], .000001);
    p.calibration!.metresPerPixel = 1e-20;
    expect(ProjectSchema.safeParse(p).success).toBe(false);
  });
  it('rejects out-of-image points, invalid source, and invalid heights', () => {
    const p = make(); p.rooms[0].polygon[0].x = -2;
    expect(ProjectSchema.safeParse(p).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...make(), source: { ...source, dataUrl: 'javascript:alert(1)' } }).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...make(), ceilingHeightM: 0.4 }).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...make(), ceilingHeightConfirmed: true }).success).toBe(false);
  });
});
