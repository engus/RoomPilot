import { ProjectSchema, type Project, type Source } from '@roompilot/domain';
import { DEMO_CALIBRATION, DEMO_OPENINGS, DEMO_ROOMS, DEMO_ZONES } from './demo-layout';
import { en, ru } from './translations';
import type { Language } from './preferences';

export function buildDemoProject(source: Source, language: Language): Project {
  const labels = language === 'ru' ? ru : en;
  return ProjectSchema.parse({
    schemaVersion: 4, id: crypto.randomUUID(), name: labels.demoApartment, source,
    apartmentBrief: { livingRooms: 3, approximateAreaM2: 58, balconyArea: 'excluded', bathrooms: 1, bathroomLayout: 'combined', kitchens: 1, balconies: 1, storageRooms: 1 },
    rooms: DEMO_ROOMS.map(({ nameKey, ...room }) => ({ ...room, name: labels[nameKey] })),
    zones: DEMO_ZONES.map(({ nameKey, ...zone }) => ({ ...zone, name: labels[nameKey] })),
    openings: DEMO_OPENINGS, calibration: DEMO_CALIBRATION, ceilingHeightM: 2.5, ceilingHeightConfirmed: true,
  });
}
