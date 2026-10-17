import { z } from 'zod';

const count = z.number().int().min(0).max(100).nullable();
export const ApartmentBriefSchema = z.object({
  livingRooms: count, approximateAreaM2: z.number().finite().positive().max(100_000).nullable(),
  balconyArea: z.enum(['included', 'excluded', 'unknown']),
  bathrooms: count, bathroomLayout: z.enum(['combined', 'separate', 'mixed', 'unknown']),
  kitchens: count, balconies: count, storageRooms: count,
}).strict();
export type ApartmentBrief = z.infer<typeof ApartmentBriefSchema>;
export function createApartmentBrief(): ApartmentBrief {
  return { livingRooms: null, approximateAreaM2: null, balconyArea: 'unknown', bathrooms: null, bathroomLayout: 'unknown', kitchens: null, balconies: null, storageRooms: null };
}
export const ApartmentBriefOrNullSchema = ApartmentBriefSchema.nullable().transform(value => value && Object.entries(value).some(([, item]) => item !== null && item !== 'unknown') ? value : null);
