import { getOpeningSegment, type Project } from '@roompilot/domain';
import { DEMO_SIZE } from './demo-layout';
import { buildDemoProject } from './demo-project';
import { en, ru } from './translations';
import type { Language } from './preferences';

export function createDemo(language: Language = 'ru'): Project {
  const canvas = document.createElement('canvas');
  canvas.width = DEMO_SIZE.width; canvas.height = DEMO_SIZE.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error((language === 'ru' ? ru : en).demoFailed);
  context.fillStyle = '#fffefa'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#eeeae1'; context.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 20) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, canvas.height); context.stroke(); }
  for (let y = 0; y < canvas.height; y += 20) { context.beginPath(); context.moveTo(0, y); context.lineTo(canvas.width, y); context.stroke(); }
  const project = buildDemoProject({ ...DEMO_SIZE, dataUrl: canvas.toDataURL('image/png') }, language);
  for (const room of project.rooms) {
    context.beginPath(); room.polygon.forEach((point, i) => i ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.closePath(); context.fillStyle = '#f4f1e9'; context.fill(); context.strokeStyle = '#69766b'; context.lineWidth = 7; context.stroke();
  }
  for (const opening of project.openings) for (const span of opening.spans) {
    const [a, b] = getOpeningSegment(project, span);
    context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.strokeStyle = '#fffefa'; context.lineWidth = 11; context.stroke();
  }
  return { ...project, source: { ...project.source, dataUrl: canvas.toDataURL('image/png') } };
}
