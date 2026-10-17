import clipping, { type MultiPolygon } from 'polygon-clipping';
import { polygonArea, validatePolygon, type Point } from './geometry';
import type { Project, Zone } from './schema';

// Pixel-square tolerance for clipping roundoff, not permission to cross a wall.
const AREA_EPSILON = 1e-7;
const ring = (polygon: Point[]) => polygon.map(point => [point.x, point.y] as [number, number]);
const area = (polygons: MultiPolygon) => polygons.reduce((total, polygon) => total + polygon.reduce((sum, outline, i) => sum + (i === 0 ? 1 : -1) * polygonArea(outline.map(([x, y]) => ({ x, y }))), 0), 0);

export function isPolygonWithinRoom(polygon: Point[], parent: Point[]): boolean {
  if (!validatePolygon(polygon) || !validatePolygon(parent)) return false;
  return area(clipping.difference([ring(polygon)], [ring(parent)])) <= AREA_EPSILON;
}

export function zonePolygonsOverlap(a: Point[], b: Point[]): boolean {
  if (!validatePolygon(a) || !validatePolygon(b)) return false;
  if (Math.max(...a.map(p => p.x)) <= Math.min(...b.map(p => p.x)) || Math.max(...b.map(p => p.x)) <= Math.min(...a.map(p => p.x)) || Math.max(...a.map(p => p.y)) <= Math.min(...b.map(p => p.y)) || Math.max(...b.map(p => p.y)) <= Math.min(...a.map(p => p.y))) return false;
  return area(clipping.intersection([ring(a)], [ring(b)])) > AREA_EPSILON;
}

export function getZoneArea(zone: Zone, project: Project): number | null {
  return project.calibration ? polygonArea(zone.polygon) * project.calibration.metresPerPixel ** 2 : null;
}
