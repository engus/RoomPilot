import { ProjectSchema, type Project } from '@roompilot/domain';

export const MAX_PROJECT_BYTES = 20 * 1024 * 1024;
export function parseProjectText(text: string): Project {
  if (new TextEncoder().encode(text).byteLength > MAX_PROJECT_BYTES) throw new Error('Проект больше 20 МиБ.');
  return ProjectSchema.parse(JSON.parse(text));
}
export function getMissingMetadata(project: Project): string[] {
  return [!project.rooms.length && 'Добавьте комнаты', !project.calibration && 'Задайте масштаб',
    (!project.ceilingHeightM || !project.ceilingHeightConfirmed) && 'Подтвердите высоту потолка'].filter((value): value is string => Boolean(value));
}
export function updateCeiling(project: Project, value: string): Project {
  const numeric = value.trim() === '' ? null : Number(value);
  return { ...project, ceilingHeightM: numeric, ceilingHeightConfirmed: false };
}
