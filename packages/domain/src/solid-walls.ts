import clipping, { type MultiPolygon, type Polygon, type Ring } from 'polygon-clipping';
import { getOpeningSegment } from './openings';
import type { Point } from './geometry';
import type { Opening, Project } from './schema';

// Display conventions only: do not write these widths back into the document.
export const WALL_OUTSET_M = .24;
export const WALL_CAP_REACH_M = Math.SQRT2 * WALL_OUTSET_M;
const WALL_INSET_M = .04;
export class PreviewComplexityError extends Error {
  constructor() { super('The floor plan exceeds the solid preview geometry budget.'); }
}
export type WallPolygon = Point[][];
export interface SolidOpening {
  opening: Opening; a: Point; b: Point; depthM: number; cut: Polygon;
}
export interface SolidWallModel {
  footprint: WallPolygon[]; base: WallPolygon[];
  layers: { bottomM: number; topM: number; polygons: WallPolygon[] }[];
  openings: SolidOpening[];
}
const toPoints = (value: MultiPolygon): WallPolygon[] => value.map(polygon => polygon.map(ring => ring.map(([x, y]) => ({ x, y }))));
const union = (polygons: Polygon[]): MultiPolygon => polygons.length ? clipping.union(polygons[0], ...polygons.slice(1)) : [];

function strip(a: Point, b: Point, padding: number): Polygon {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const dx = (b.x - a.x) / length, dy = (b.y - a.y) / length;
  // Capped rectangles overlap at vertices, sealing concave and diagonal joins.
  return [[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => [
    (s < 0 ? a.x : b.x) + s * dx * padding - t * dy * padding,
    (s < 0 ? a.y : b.y) + s * dy * padding + t * dx * padding,
  ] as [number, number])];
}

function placeSolidOpenings(project: Project, opening: Opening, scale: number): SolidOpening[] {
  const segments = opening.spans.map(span => getOpeningSegment(project, span).map(point => ({ x: point.x * scale, y: point.y * scale })));
  const [a, b] = segments[0];
  const length = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / length, uy = (b.y - a.y) / length;
  const polygon = project.rooms.find(room => room.id === opening.spans[0].roomId)!.polygon;
  const winding = Math.sign(polygon.reduce((area, p, i) => { const q = polygon[(i + 1) % polygon.length]; return area + p.x * q.y - q.x * p.y; }, 0));
  const nx = uy * winding, ny = -ux * winding;
  const points = segments.flat();
  const along = points.map(p => (p.x - a.x) * ux + (p.y - a.y) * uy);
  const across = points.map(p => (p.x - a.x) * nx + (p.y - a.y) * ny);
  const minT = Math.min(...across), maxT = Math.max(...across);
  const paired = opening.spans.length === 2;
  if (paired) {
    const [c, d] = segments[1], otherLength = Math.hypot(d.x - c.x, d.y - c.y);
    const cross = Math.abs(ux * (d.y - c.y) - uy * (d.x - c.x)) / otherLength;
    // Saved paired spans may diverge after edits; never cut an arbitrary bridge.
    if (cross > .05 || minT < -.04 || maxT > WALL_OUTSET_M * 2 || Math.min(...along) < -.04 || Math.max(...along) > length + .04 || Math.abs(otherLength - length) > .04) {
      return opening.spans.flatMap(span => placeSolidOpenings(project, { ...opening, spans: [span] }, scale));
    }
  }
  const center = paired ? (minT + maxT) / 2 : (WALL_OUTSET_M - WALL_INSET_M) / 2;
  const reach = WALL_CAP_REACH_M + .01;
  const cut: Ring = [[Math.min(...along), minT - reach], [Math.max(...along), minT - reach],
    [Math.max(...along), maxT + reach], [Math.min(...along), maxT + reach]]
    .map(([s, t]) => [a.x + ux * s + nx * t, a.y + uy * s + ny * t]);
  return [{ opening, a: { x: a.x + nx * center, y: a.y + ny * center }, b: { x: b.x + nx * center, y: b.y + ny * center },
    depthM: paired ? Math.max(WALL_INSET_M * 2, maxT - minT + WALL_INSET_M * 2) : WALL_OUTSET_M + WALL_INSET_M, cut: [cut] }];
}

/** Builds disposable metre-space preview solids from an already validated project. */
export function buildSolidWallModel(project: Project): SolidWallModel {
  if (!project.calibration || !project.ceilingHeightM || !project.rooms.length) return { footprint: [], base: [], layers: [], openings: [] };
  const edgeCount = project.rooms.reduce((count, room) => count + room.polygon.length, 0);
  if (edgeCount > 2000 || edgeCount * (1 + 2 * project.openings.length) > 40_000) throw new PreviewComplexityError();
  const scale = project.calibration.metresPerPixel, height = project.ceilingHeightM;
  const rings = project.rooms.map(room => room.polygon.map(p => ({ x: p.x * scale, y: p.y * scale })));
  const floors = union(rings.map(ring => [ring.map(p => [p.x, p.y] as [number, number])]));
  const edges = rings.flatMap(ring => ring.map((a, i) => [a, ring[(i + 1) % ring.length]] as const));
  const outer = union(edges.map(([a, b]) => strip(a, b, WALL_OUTSET_M)));
  // The small inner lip keeps a partition even when two source boundaries touch.
  const cores = clipping.difference(floors, union(edges.map(([a, b]) => strip(a, b, WALL_INSET_M))));
  const footprint = cores.length ? clipping.difference(outer, cores) : outer;
  const openings = project.openings.flatMap(opening => placeSolidOpenings(project, opening, scale));
  const levels = [...new Set([0, height, ...openings.flatMap(({ opening }) => [opening.sillHeightM, opening.sillHeightM + opening.heightM])])]
    .filter(level => level >= 0 && level <= height).sort((a, b) => a - b);
  if (footprint.reduce((count, polygon) => count + polygon.reduce((sum, ring) => sum + ring.length, 0), 0) * (levels.length - 1) > 100_000) throw new PreviewComplexityError();
  const layers = levels.slice(0, -1).map((bottomM, i) => {
    const topM = levels[i + 1], middle = (bottomM + topM) / 2;
    const cuts = openings.filter(({ opening }) => middle > opening.sillHeightM && middle < opening.sillHeightM + opening.heightM).map(item => item.cut);
    return { bottomM, topM, polygons: toPoints(cuts.length ? clipping.difference(footprint, ...cuts) : footprint) };
  });
  return { footprint: toPoints(footprint), base: toPoints(clipping.union(floors, footprint)), layers, openings };
}
