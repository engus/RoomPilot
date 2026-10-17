import { z } from 'zod';
import { validatePolygon } from './geometry';

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
export const ProjectSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().min(1).max(100), name: z.string().trim().min(1).max(120),
  source: SourceSchema, rooms: z.array(RoomSchema).max(100),
  calibration: CalibrationSchema.nullable(), ceilingHeightM: z.number().finite().min(1.5).max(10).nullable(),
  ceilingHeightConfirmed: z.boolean(),
}).strict().superRefine((value, ctx) => {
  const points = [...value.rooms.flatMap(r => r.polygon), ...(value.calibration?.points ?? [])];
  if (points.some(p => p.x > value.source.width || p.y > value.source.height)) ctx.addIssue({ code: 'custom', message: 'Точка за пределами изображения' });
  if (new Set(value.rooms.map(r => r.id)).size !== value.rooms.length) ctx.addIssue({ code: 'custom', message: 'Повторяющийся идентификатор комнаты' });
  if (value.ceilingHeightConfirmed && value.ceilingHeightM === null) ctx.addIssue({ code: 'custom', message: 'Не указана высота потолка' });
});

export const RecognitionSchema = z.object({
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
