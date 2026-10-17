import { z } from 'zod';
import { validatePolygon } from './geometry';
import { isPolygonWithinRoom, zonePolygonsOverlap } from './zones';
import { ApartmentBriefOrNullSchema } from './apartment-brief';
import { SceneObjectSchema, sceneObjectFootprint } from './scene-objects';

export const PointSchema = z.object({ x: z.number().finite().nonnegative(), y: z.number().finite().nonnegative() }).strict();
const PolygonSchema = z.array(PointSchema).min(3).max(100).refine(validatePolygon, 'Некорректный контур комнаты');
export const SourceSchema = z.object({
  dataUrl: z.string().max(20_000_000).regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/),
  width: z.number().int().min(1).max(4096),
  height: z.number().int().min(1).max(4096),
}).strict();
export const RoomSchema = z.object({
  id: z.string().min(1).max(100), name: z.string().trim().min(1).max(120),
  polygon: PolygonSchema, reportedAreaM2: z.number().finite().positive().max(100_000).nullable(),
}).strict();
export const ZoneSchema = z.object({
  id: z.string().min(1).max(100), roomId: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(120), polygon: PolygonSchema,
}).strict();
const CalibrationSchema = z.object({
  points: z.tuple([PointSchema, PointSchema]),
  lengthM: z.number().finite().positive().max(10_000),
  metresPerPixel: z.number().finite().positive().max(10_000),
}).strict().superRefine((value, ctx) => {
  const [a, b] = value.points;
  const distance = Math.hypot(a.x - b.x, a.y - b.y);
  const expected = value.lengthM / distance;
  if (distance < 1 || !Number.isFinite(expected) || expected <= 0 || Math.abs(value.metresPerPixel / expected - 1) > 1e-8) ctx.addIssue({ code: 'custom', message: 'Некорректный масштаб' });
});
export const OpeningKindSchema = z.enum(['door', 'window', 'passage']);
export const OpeningSpanSchema = z.object({
  roomId: z.string().min(1).max(100), edgeIndex: z.number().int().nonnegative(),
  start: z.number().finite().min(0).max(1), end: z.number().finite().min(0).max(1),
}).strict().refine(span => span.start < span.end, 'Некорректная ширина проёма');
export const OpeningSchema = z.object({
  id: z.string().min(1).max(100), kind: OpeningKindSchema,
  heightM: z.number().finite().positive().max(10), sillHeightM: z.number().finite().nonnegative().max(10),
  spans: z.array(OpeningSpanSchema).min(1).max(2),
}).strict().superRefine((value, ctx) => {
  if (value.kind !== 'window' && value.sillHeightM !== 0) ctx.addIssue({ code: 'custom', message: 'Дверь или проход должны начинаться от пола' });
  if (new Set(value.spans.map(span => span.roomId)).size !== value.spans.length) ctx.addIssue({ code: 'custom', message: 'Повторяющаяся комната в проёме' });
});
const projectFields = {
  id: z.string().min(1).max(100), name: z.string().trim().min(1).max(120),
  source: SourceSchema, rooms: z.array(RoomSchema).max(100),
  calibration: CalibrationSchema.nullable(), ceilingHeightM: z.number().finite().min(1.5).max(10).nullable(),
  ceilingHeightConfirmed: z.boolean(),
};
const LegacyProjectSchema = z.object({ schemaVersion: z.literal(1), ...projectFields }).strict();
const Version2ProjectSchema = z.object({ schemaVersion: z.literal(2), ...projectFields, openings: z.array(OpeningSchema).max(200) }).strict();
const Version3ProjectSchema = z.object({ schemaVersion: z.literal(3), ...projectFields, openings: z.array(OpeningSchema).max(200), zones: z.array(ZoneSchema).max(200) }).strict();
const version4Fields = { ...projectFields, openings: z.array(OpeningSchema).max(200), zones: z.array(ZoneSchema).max(200), apartmentBrief: ApartmentBriefOrNullSchema };
const Version4ProjectSchema = z.object({ schemaVersion: z.literal(4), ...version4Fields }).strict();
const CurrentProjectSchema = z.object({ schemaVersion: z.literal(5), ...version4Fields, sceneObjects: z.array(SceneObjectSchema).max(200) }).strict();
export const ProjectSchema = z.union([CurrentProjectSchema, Version4ProjectSchema, Version3ProjectSchema, Version2ProjectSchema, LegacyProjectSchema])
  .transform(value => value.schemaVersion === 5 ? value : { ...value, schemaVersion: 5 as const, sceneObjects: [], openings: 'openings' in value ? value.openings : [], zones: 'zones' in value ? value.zones : [], apartmentBrief: 'apartmentBrief' in value ? value.apartmentBrief : null })
  .superRefine((value, ctx) => {
  if (new Set(value.sceneObjects.map(object => object.id)).size !== value.sceneObjects.length) ctx.addIssue({ code: 'custom', message: 'Duplicate scene object ID.' });
  value.sceneObjects.forEach((object, index) => {
    const room = value.rooms.find(room => room.id === object.roomId);
    if (!room || (value.calibration && !isPolygonWithinRoom(sceneObjectFootprint(object, value.calibration.metresPerPixel), room.polygon))) ctx.addIssue({ code: 'custom', path: ['sceneObjects', index], message: 'Scene object must fit inside its parent room when scale is known.' });
    if (value.ceilingHeightM !== null && object.elevationM + object.sizeM[1] > value.ceilingHeightM + 1e-8) ctx.addIssue({ code: 'custom', path: ['sceneObjects', index], message: 'Scene object exceeds ceiling height.' });
  });
  const points = [...value.rooms.flatMap(r => r.polygon), ...value.zones.flatMap(zone => zone.polygon), ...value.sceneObjects.map(object => object.position), ...(value.calibration?.points ?? [])];
  if (points.some(p => p.x > value.source.width || p.y > value.source.height)) ctx.addIssue({ code: 'custom', message: 'Точка за пределами изображения' });
  if (new Set(value.rooms.map(r => r.id)).size !== value.rooms.length) ctx.addIssue({ code: 'custom', message: 'Повторяющийся идентификатор комнаты' });
  if (value.ceilingHeightConfirmed && value.ceilingHeightM === null) ctx.addIssue({ code: 'custom', message: 'Не указана высота потолка' });
  if (new Set(value.zones.map(zone => zone.id)).size !== value.zones.length) ctx.addIssue({ code: 'custom', message: 'Duplicate zone ID.' });
  value.zones.forEach((zone, index) => {
    const parent = value.rooms.find(room => room.id === zone.roomId);
    if (!parent || !isPolygonWithinRoom(zone.polygon, parent.polygon)) ctx.addIssue({ code: 'custom', path: ['zones', index], message: 'Zone must remain inside its parent room.' });
    if (value.zones.slice(0, index).some(other => other.roomId === zone.roomId && zonePolygonsOverlap(other.polygon, zone.polygon))) ctx.addIssue({ code: 'custom', path: ['zones', index], message: 'Zone interiors must not overlap.' });
  });
  const openingIds = new Set<string>();
  const edgeSpans = new Map<string, OpeningSpan[]>();
  for (const opening of value.openings) {
    if (openingIds.has(opening.id)) ctx.addIssue({ code: 'custom', message: 'Повторяющийся идентификатор проёма' });
    openingIds.add(opening.id);
    if (value.ceilingHeightM !== null && opening.sillHeightM + opening.heightM > value.ceilingHeightM + 1e-8) {
      ctx.addIssue({ code: 'custom', message: 'Проём не помещается по высоте потолка' });
    }
    for (const span of opening.spans) {
      const room = value.rooms.find(room => room.id === span.roomId);
      if (!room || span.edgeIndex >= room.polygon.length) ctx.addIssue({ code: 'custom', message: 'Не найдена стена проёма' });
      const key = JSON.stringify([span.roomId, span.edgeIndex]);
      const others = edgeSpans.get(key) ?? [];
      if (others.some(other => span.start < other.end && span.end > other.start)) ctx.addIssue({ code: 'custom', message: 'Проёмы на стене пересекаются' });
      others.push(span);
      edgeSpans.set(key, others);
    }
  }
});

export const RecognitionSchema = z.object({
  openings: z.array(z.unknown()).max(200).optional(),
  rooms: z.array(z.object({
    name: z.string().max(120).nullable(), reportedAreaM2: z.number().positive().max(100_000).nullable(),
    polygon: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict()).min(3).max(100).refine(validatePolygon, 'Некорректный контур'),
  }).strict()).max(100),
  ceilingHeightM: z.number().min(1.5).max(10).nullable(), warnings: z.array(z.string().max(500)).max(30),
}).strict();

export type Project = z.infer<typeof ProjectSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Recognition = z.infer<typeof RecognitionSchema>;
export type Opening = z.infer<typeof OpeningSchema>;
export type OpeningSpan = z.infer<typeof OpeningSpanSchema>;
export type OpeningKind = z.infer<typeof OpeningKindSchema>;
export type Zone = z.infer<typeof ZoneSchema>;
