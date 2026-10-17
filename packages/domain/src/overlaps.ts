import clipping, { type Ring } from 'polygon-clipping';
import { polygonArea, type Point } from './geometry';

// Inputs are validated simple room polygons. Shared boundaries have no interior
// area and are allowed. This is a review check, never an automatic geometry edit.
export function findRoomOverlaps(rooms: readonly { id: string; polygon: Point[] }[]): [string, string][] {
  const outlines = rooms.map(room => ({
    id: room.id, ring: room.polygon.map(point => [point.x, point.y] as [number, number]),
    area: polygonArea(room.polygon),
    left: Math.min(...room.polygon.map(point => point.x)), right: Math.max(...room.polygon.map(point => point.x)),
    top: Math.min(...room.polygon.map(point => point.y)), bottom: Math.max(...room.polygon.map(point => point.y)),
  }));
  const pairs: [string, string][] = [];
  const ringArea = (ring: Ring) => polygonArea(ring.map(([x, y]) => ({ x, y })));
  for (let i = 0; i < outlines.length; i++) {
    for (let j = i + 1; j < outlines.length; j++) {
      const a = outlines[i], b = outlines[j];
      if (a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top) continue;
      const intersection = clipping.intersection([a.ring], [b.ring]);
      const area = intersection.reduce((total, polygon) => total + ringArea(polygon[0]) - polygon.slice(1).reduce((holes, ring) => holes + ringArea(ring), 0), 0);
      // Ignore roundoff-sized slivers relative to the smaller room, independent of scale.
      if (area > Math.min(a.area, b.area) * 1e-8) pairs.push([a.id, b.id]);
    }
  }
  return pairs;
}
