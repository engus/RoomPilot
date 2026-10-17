import { createProject, type Project } from '@roompilot/domain';
import { en, ru } from './translations';
import type { Language } from './preferences';

export function createDemo(language: Language = 'ru'): Project {
  const labels = language === 'ru' ? ru : en;
  const canvas = document.createElement('canvas');
  canvas.width = 1000; canvas.height = 760;
  const context = canvas.getContext('2d');
  if (!context) throw new Error(labels.demoFailed);
  context.fillStyle = '#fffefa'; context.fillRect(0, 0, 1000, 760);
  context.strokeStyle = '#d6d3c8'; context.lineWidth = 1;
  for (let x = 0; x < 1000; x += 20) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 760); context.stroke(); }
  for (let y = 0; y < 760; y += 20) { context.beginPath(); context.moveTo(0, y); context.lineTo(1000, y); context.stroke(); }
  const rooms = [
    { name: labels.livingRoom, reportedAreaM2: 24, polygon: [{ x: .12, y: .14 }, { x: .55, y: .14 }, { x: .55, y: .6 }, { x: .12, y: .6 }] },
    { name: labels.bedroom, reportedAreaM2: 16.2, polygon: [{ x: .57, y: .14 }, { x: .87, y: .14 }, { x: .87, y: .6 }, { x: .57, y: .6 }] },
    { name: labels.kitchen, reportedAreaM2: 12.1, polygon: [{ x: .12, y: .62 }, { x: .45, y: .62 }, { x: .45, y: .88 }, { x: .12, y: .88 }] },
    { name: labels.hallway, reportedAreaM2: null, polygon: [{ x: .47, y: .62 }, { x: .72, y: .62 }, { x: .72, y: .88 }, { x: .47, y: .88 }] },
    { name: labels.bathroom, reportedAreaM2: 5.4, polygon: [{ x: .74, y: .62 }, { x: .87, y: .62 }, { x: .87, y: .88 }, { x: .74, y: .88 }] },
  ];
  for (const room of rooms) {
    context.fillStyle = '#f4f1e9'; context.strokeStyle = '#626c62'; context.lineWidth = 9;
    const first = room.polygon[0]; context.beginPath(); context.moveTo(first.x * 1000, first.y * 760);
    room.polygon.slice(1).forEach(point => context.lineTo(point.x * 1000, point.y * 760));
    context.closePath(); context.fill(); context.stroke();
  }
  // Furnishing marks belong only to this explicitly labelled illustrative source.
  context.strokeStyle = '#b6b9ad'; context.lineWidth = 2;
  context.strokeRect(155, 145, 190, 65); context.strokeRect(160, 220, 60, 115);
  context.strokeRect(628, 152, 180, 205); context.strokeRect(638, 162, 70, 40); context.strokeRect(728, 162, 70, 40);
  context.strokeRect(140, 500, 225, 28); context.strokeRect(140, 535, 30, 90);
  context.strokeRect(763, 500, 86, 58);
  context.font = '13px sans-serif'; context.fillStyle = '#697069'; context.fillText(`ROOMPILOT / ${labels.demoApartment.toUpperCase()}`, 120, 65);
  const project = createProject({ dataUrl: canvas.toDataURL('image/png'), width: 1000, height: 760 }, { rooms, ceilingHeightM: null, warnings: [] });
  return { ...project, name: labels.demoApartment };
}
