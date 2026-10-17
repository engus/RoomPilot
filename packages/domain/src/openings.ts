import { type Point } from './geometry';
import { OpeningSchema, OpeningSpanSchema, ProjectSchema, type Opening, type OpeningKind, type OpeningSpan, type Project, type Room } from './schema';

export type WallSection = { start: number; end: number; bottomM: number; topM: number };
export type WallAperture = { start: number; end: number; sillHeightM: number; heightM: number };

const EPS = 1e-8;
const MAX_PARALLEL_CROSS = .05;
const interpolate = (a: Point, b: Point, fraction: number): Point => ({ x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction });

function edge(project: Project, roomId: string, edgeIndex: number): [Point, Point] {
  const room = project.rooms.find(room => room.id === roomId);
  if (!room || !Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= room.polygon.length) throw new Error('Не найдена стена проёма');
  return [room.polygon[edgeIndex], room.polygon[(edgeIndex + 1) % room.polygon.length]];
}

export function getOpeningSegment(project: Project, span: OpeningSpan): [Point, Point] {
  OpeningSpanSchema.parse(span);
  const [a, b] = edge(project, span.roomId, span.edgeIndex);
  return [interpolate(a, b, span.start), interpolate(a, b, span.end)];
}

function scale(project: Project): number {
  if (!project.calibration) throw new Error('Для проёмов требуется масштаб');
  return project.calibration.metresPerPixel;
}

export function getOpeningWidthM(project: Project, opening: Opening): number {
  const [a, b] = getOpeningSegment(project, opening.spans[0]);
  return Math.hypot(b.x - a.x, b.y - a.y) * scale(project);
}

function makeSpan(project: Project, roomId: string, edgeIndex: number, position: number, widthM: number): OpeningSpan {
  if (!Number.isFinite(position) || position < 0 || position > 1 || !Number.isFinite(widthM) || widthM <= 0) throw new Error('Некорректные размеры проёма');
  const [a, b] = edge(project, roomId, edgeIndex);
  const fraction = widthM / (Math.hypot(b.x - a.x, b.y - a.y) * scale(project));
  if (!Number.isFinite(fraction) || fraction > 1 + EPS) throw new Error('Проём шире стены');
  const width = Math.min(1, fraction);
  const start = Math.max(0, Math.min(1 - width, position - width / 2));
  return { roomId, edgeIndex, start, end: Math.min(1, start + width) };
}

function winding(room: Room): number {
  return Math.sign(room.polygon.reduce((sum, p, index) => {
    const q = room.polygon[(index + 1) % room.polygon.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0));
}

function mirroredSpan(project: Project, primary: OpeningSpan, target?: Pick<OpeningSpan, 'roomId' | 'edgeIndex'>): OpeningSpan | null {
  const [a, b] = edge(project, primary.roomId, primary.edgeIndex);
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const direction = { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
  const sourceWinding = winding(project.rooms.find(room => room.id === primary.roomId)!);
  const endpoints = getOpeningSegment(project, primary);
  const pixelsToMetres = scale(project);
  let nearest: { span: OpeningSpan; distanceM: number } | null = null;
  for (const room of project.rooms) {
    if (room.id === primary.roomId) continue;
    if (target && room.id !== target.roomId) continue;
    const targetWinding = winding(room);
    for (let index = 0; index < room.polygon.length; index++) {
      if (target && index !== target.edgeIndex) continue;
      const [c, d] = edge(project, room.id, index);
      const dx = d.x - c.x, dy = d.y - c.y;
      const targetLength = Math.hypot(dx, dy);
      const cross = (direction.x * dy - direction.y * dx) / targetLength;
      const dot = (direction.x * dx + direction.y * dy) / targetLength;
      // Inward normals must face opposite sides, independently of polygon winding.
      if (Math.abs(cross) > MAX_PARALLEL_CROSS || dot * sourceWinding * targetWinding >= 0) continue;
      const projections = endpoints.map(point => ((point.x - c.x) * dx + (point.y - c.y) * dy) / targetLength ** 2);
      if (projections.some(fraction => fraction < -EPS || fraction > 1 + EPS)) continue;
      const distances = endpoints.map(point => Math.abs(dx * (point.y - c.y) - dy * (point.x - c.x)) / targetLength * pixelsToMetres);
      if (distances.some(distanceM => distanceM > .6 + EPS)) continue;
      const distanceM = Math.max(...distances);
      if (nearest && nearest.distanceM <= distanceM) continue;
      nearest = { distanceM, span: {
        roomId: room.id, edgeIndex: index,
        start: Math.max(0, Math.min(...projections)), end: Math.min(1, Math.max(...projections)),
      } };
    }
  }
  return nearest?.span ?? null;
}

export function placeOpening(project: Project, roomId: string, edgeIndex: number, position: number, kind: OpeningKind): Opening {
  const current = ProjectSchema.parse(project);
  const pixelsToMetres = scale(current);
  if (current.ceilingHeightM === null) throw new Error('Для проёмов требуется высота потолка');
  const [a, b] = edge(current, roomId, edgeIndex);
  const defaultWidth = kind === 'door' ? .8 : kind === 'window' ? 1.2 : 1;
  const widthM = Math.min(defaultWidth, Math.hypot(b.x - a.x, b.y - a.y) * pixelsToMetres);
  const primary = makeSpan(current, roomId, edgeIndex, position, widthM);
  const mirrored = mirroredSpan(current, primary);
  const sillHeightM = kind === 'window' ? .85 : 0;
  const opening = OpeningSchema.parse({
    id: crypto.randomUUID(), kind, sillHeightM,
    heightM: Math.min(kind === 'window' ? 1.5 : 2.2, current.ceilingHeightM - sillHeightM),
    spans: mirrored ? [primary, mirrored] : [primary],
  });
  ProjectSchema.parse({ ...current, openings: [...current.openings, opening] });
  return opening;
}

export function resizeOpening(project: Project, id: string, widthM: number): Project {
  const current = ProjectSchema.parse(project);
  const opening = current.openings.find(opening => opening.id === id);
  if (!opening) throw new Error('Проём не найден');
  const original = opening.spans[0];
  const primary = makeSpan(current, original.roomId, original.edgeIndex, (original.start + original.end) / 2, widthM);
  const mirrored = mirroredSpan(current, primary, opening.spans[1]);
  if (opening.spans.length === 2 && !mirrored) throw new Error('Проём не помещается на второй стороне стены');
  const resized = { ...opening, spans: mirrored ? [primary, mirrored] : [primary] };
  return ProjectSchema.parse({ ...current, openings: current.openings.map(item => item.id === id ? resized : item) });
}

export function removeRoom(project: Project, id: string): Project {
  return ProjectSchema.parse({
    ...project, rooms: project.rooms.filter(room => room.id !== id),
    zones: project.zones.filter(zone => zone.roomId !== id),
    sceneObjects: project.sceneObjects.filter(object => object.roomId !== id),
    openings: project.openings.filter(opening => opening.spans.every(span => span.roomId !== id)),
  });
}

export function getWallSections(heightM: number, apertures: WallAperture[]): WallSection[] {
  if (!Number.isFinite(heightM) || heightM <= 0) throw new Error('Некорректная высота стены');
  const sorted = [...apertures].sort((a, b) => a.start - b.start);
  const sections: WallSection[] = [];
  let cursor = 0;
  for (const aperture of sorted) {
    const { start, end, sillHeightM, heightM: openingHeightM } = aperture;
    if (![start, end, sillHeightM, openingHeightM].every(Number.isFinite) || start < cursor || start < 0 || end > 1 || start >= end || sillHeightM < 0 || openingHeightM <= 0 || sillHeightM + openingHeightM > heightM + EPS) {
      throw new Error('Некорректный или пересекающийся проём');
    }
    if (cursor < start) sections.push({ start: cursor, end: start, bottomM: 0, topM: heightM });
    if (sillHeightM > 0) sections.push({ start, end, bottomM: 0, topM: sillHeightM });
    const top = sillHeightM + openingHeightM;
    if (top < heightM - EPS) sections.push({ start, end, bottomM: top, topM: heightM });
    cursor = end;
  }
  if (cursor < 1) sections.push({ start: cursor, end: 1, bottomM: 0, topM: heightM });
  return sections;
}
