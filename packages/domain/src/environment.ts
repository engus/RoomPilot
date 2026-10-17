import { z } from 'zod';

export const SolarEnvironmentSchema = z.object({
  configured: z.literal(true), phase: z.enum(['day', 'twilight', 'night']),
  solarElevationDeg: z.number().finite().min(-90).max(90),
  sunDirection: z.tuple([z.number().finite().min(-1).max(1), z.number().finite().min(-1).max(1), z.number().finite().min(-1).max(1)])
    .refine(value => Math.abs(Math.hypot(...value) - 1) < 1e-6),
  updatedAt: z.string().datetime(),
}).strict();
export type SolarEnvironment = z.infer<typeof SolarEnvironmentSchema>;
