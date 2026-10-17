import { z } from 'zod';
import { ProjectSchema, type Project, type OpeningSpan } from './schema';
import { getOpeningSegment } from './openings';

export const RecognizedOpeningSchema = z.object({
  kind: z.enum(['door', 'window']),
  heightM: z.number().finite().positive().max(10).nullable(),
  sillHeightM: z.number().finite().nonnegative().max(10).nullable(),
  spans: z.array(z.object({
    roomIndex: z.number().int().min(0).max(99), edgeIndex: z.number().int().min(0).max(99),
    start: z.number().finite().min(0).max(1), end: z.number().finite().min(0).max(1),
  }).strict().refine(span => span.start < span.end)).min(1).max(2),
}).strict();

// Validate candidates individually: one malformed aperture must not discard valid rooms.
export const OpeningRecognitionSchema = z.object({
  openings: z.array(z.unknown()).max(200), warnings: z.array(z.string().max(500)).max(30),
}).strict();
export type OpeningRecognition = z.infer<typeof OpeningRecognitionSchema>;

const NormalizedPoint = z.object({ x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1) }).strict();
export const DetectedOpeningSchema = RecognizedOpeningSchema.omit({ spans: true }).extend({ segment: z.tuple([NormalizedPoint, NormalizedPoint]) });

export function applyDetectedOpenings(project: Project, candidates: unknown[]): { project: Project; warnings: string[] } {
  const current = ProjectSchema.parse(project);
  const diagonal = Math.hypot(current.source.width, current.source.height);
  const tolerance = Math.min(diagonal * .025, current.calibration ? .6 / current.calibration.metresPerPixel : Infinity);
  const mapped = candidates.map(candidate => {
    const parsed = DetectedOpeningSchema.safeParse(candidate);
    if (!parsed.success) return null;
    const { segment, ...draft } = parsed.data;
    const [a, b] = segment.map(point => ({ x: point.x * current.source.width, y: point.y * current.source.height }));
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    if (length < 2) return null;
    const matches: { roomIndex: number; span: OpeningSpan; distance: number }[] = [];
    current.rooms.forEach((room, roomIndex) => room.polygon.forEach((c, edgeIndex) => {
      const d = room.polygon[(edgeIndex + 1) % room.polygon.length];
      const ex = d.x - c.x, ey = d.y - c.y, edgeLength = Math.hypot(ex, ey);
      if (Math.abs(dx * ey - dy * ex) / (length * edgeLength) > .1) return;
      const positions = [a, b].map(p => ((p.x - c.x) * ex + (p.y - c.y) * ey) / edgeLength ** 2);
      if (positions.some(t => t < -2 / edgeLength || t > 1 + 2 / edgeLength)) return;
      const distance = Math.max(...[a, b].map(p => Math.abs(ex * (p.y - c.y) - ey * (p.x - c.x)) / edgeLength));
      if (distance > tolerance) return;
      matches.push({ roomIndex, distance, span: { roomId: room.id, edgeIndex, start: Math.max(0, Math.min(...positions)), end: Math.min(1, Math.max(...positions)) } });
    }));
    matches.sort((a, b) => a.distance - b.distance);
    const primary = matches[0];
    if (!primary) return null;
    const secondary = matches.slice(1).find(match => sameAperture(current, [primary.span, match.span]));
    const spans = (secondary ? [primary, secondary] : [primary]).map(({ roomIndex, span }) => ({ roomIndex, edgeIndex: span.edgeIndex, start: span.start, end: span.end }));
    return { ...draft, spans };
  });
  return applyRecognizedOpenings(current, mapped);
}

function sameAperture(project: Project, spans: OpeningSpan[]): boolean {
  if (spans.length === 1) return true;
  const [first, second] = spans;
  if (first.roomId === second.roomId) return false;
  const segment = (span: OpeningSpan) => getOpeningSegment(project, span);
  const [a, b] = segment(first), [c, d] = segment(second);
  const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
  const ex = d.x - c.x, ey = d.y - c.y, otherLength = Math.hypot(ex, ey);
  if (Math.abs(dx * ey - dy * ex) / (length * otherLength) > .05) return false;
  const winding = (id: string) => {
    const polygon = project.rooms.find(room => room.id === id)!.polygon;
    return Math.sign(polygon.reduce((sum, p, i) => { const q = polygon[(i + 1) % polygon.length]; return sum + p.x * q.y - q.x * p.y; }, 0));
  };
  if ((dx * ex + dy * ey) * winding(first.roomId) * winding(second.roomId) >= 0) return false;
  const tolerance = project.calibration ? .6 / project.calibration.metresPerPixel : Math.hypot(project.source.width, project.source.height) * .025;
  const distances = [c, d].map(p => Math.abs(dx * (p.y - a.y) - dy * (p.x - a.x)) / length);
  if (distances.some(distance => distance > tolerance)) return false;
  const projected = [c, d].map(p => ((p.x - a.x) * dx + (p.y - a.y) * dy) / length);
  const alignmentTolerance = Math.max(2, length * .05);
  return Math.abs(Math.min(...projected)) <= alignmentTolerance && Math.abs(Math.max(...projected) - length) <= alignmentTolerance;
}

export function applyRecognizedOpenings(project: Project, candidates: unknown[]): { project: Project; warnings: string[] } {
  let current = ProjectSchema.parse(project);
  let skipped = 0, defaults = 0;
  if (candidates.length > 200) throw new Error('Too many opening candidates.');
  for (const candidate of candidates) {
    const parsed = RecognizedOpeningSchema.safeParse(candidate);
    if (!parsed.success) { skipped++; continue; }
    const draft = parsed.data;
    const spans = draft.spans.map(span => ({ roomId: current.rooms[span.roomIndex]?.id ?? '', edgeIndex: span.edgeIndex, start: span.start, end: span.end }));
    const usesDefaults = draft.heightM === null || (draft.kind === 'window' && draft.sillHeightM === null);
    const suggestedSill = Math.max(0, Math.min(.85, (current.ceilingHeightM ?? 10) - (draft.heightM ?? .1)));
    const sillHeightM = draft.kind === 'window' ? draft.sillHeightM ?? suggestedSill : 0;
    if (draft.kind === 'door' && draft.sillHeightM !== null && draft.sillHeightM !== 0) { skipped++; continue; }
    const heightM = draft.heightM ?? Math.min(draft.kind === 'window' ? 1.5 : 2.2, (current.ceilingHeightM ?? 10) - sillHeightM);
    const opening = { id: crypto.randomUUID(), kind: draft.kind, heightM, sillHeightM, spans };
    const next = ProjectSchema.safeParse({ ...current, openings: [...current.openings, opening] });
    if (!next.success || !sameAperture(current, spans)) { skipped++; continue; }
    current = next.data;
    if (usesDefaults) defaults++;
  }
  const added = current.openings.length - project.openings.length;
  const warnings = [];
  if (!added) warnings.push('No new valid openings detected. Existing openings were preserved.');
  if (skipped) warnings.push(`Skipped ${skipped} invalid, duplicate or conflicting opening suggestions.`);
  if (defaults) warnings.push(`${defaults} openings use editable preview dimensions for unreadable heights/sills (door up to 2.2 m; window up to 1.5 m, suggested sill 0.85 m; defaults adjusted to the known ceiling). Review before use.`);
  return { project: current, warnings };
}
