export * from './geometry';
export * from './overlaps';
export * from './schema';
export * from './openings';
export * from './recognized-openings';
export * from './zones';
export * from './apartment-brief';
export * from './solid-walls';

import { polygonArea, type Point } from './geometry';
import { ProjectSchema, type Project, type Room, type Source, type Recognition } from './schema';

export function createProject(source: Source, recognition: Recognition): Project {
  return ProjectSchema.parse({
    schemaVersion: 4, openings: [], zones: [], apartmentBrief: null, id: crypto.randomUUID(), name: 'Моя квартира', source,
    rooms: recognition.rooms.map((r, i) => ({
      id: crypto.randomUUID(), name: r.name?.trim() || `Комната ${i + 1}`,
      reportedAreaM2: r.reportedAreaM2,
      polygon: r.polygon.map(p => ({ x: p.x * source.width, y: p.y * source.height })),
    })),
    calibration: null, ceilingHeightM: recognition.ceilingHeightM, ceilingHeightConfirmed: false,
  });
}

export function getComputedArea(room: Room, project: Project): number | null {
  return project.calibration ? polygonArea(room.polygon) * project.calibration.metresPerPixel ** 2 : null;
}

export function calibrateProject(project: Project, points: [Point, Point], lengthM: number): Project {
  const [a, b] = points;
  return ProjectSchema.parse({ ...project, calibration: { points, lengthM, metresPerPixel: lengthM / Math.hypot(a.x - b.x, a.y - b.y) } });
}

export function isReadyFor3D(project: Project): boolean {
  return ProjectSchema.safeParse(project).success && project.rooms.length > 0 && project.calibration !== null && project.ceilingHeightM !== null && project.ceilingHeightConfirmed;
}
