import { z } from 'zod';

export const SceneObjectSchema = z.object({
  id: z.string().min(1).max(100), roomId: z.string().min(1).max(100),
  kind: z.enum(['kitchen-cook', 'kitchen-sink', 'fridge', 'tall-cabinet', 'table', 'chair', 'pendant', 'pendant-round', 'floor-lamp', 'sideboard', 'moss-art', 'air-conditioner', 'air-unit', 'radiator', 'rug', 'tv-console', 'subwoofer', 'sconce', 'ceiling-light', 'track', 'mirror', 'shoe-cabinet', 'bike', 'bench', 'coat-hooks', 'downlight', 'wall-panel', 'robot-vacuum', 'wall-control', 'print']),
  position: z.object({ x: z.number().finite().nonnegative(), y: z.number().finite().nonnegative() }).strict(),
  elevationM: z.number().finite().min(0).max(10),
  rotationRad: z.number().finite().min(-Math.PI * 2).max(Math.PI * 2),
  sizeM: z.tuple([z.number().finite().min(.01).max(20), z.number().finite().min(.01).max(10), z.number().finite().min(.01).max(20)]),
}).strict();

export type SceneObject = z.infer<typeof SceneObjectSchema>;

/** The same Y rotation convention as Three.js; image Y becomes world Z. */
export function sceneObjectFootprint(object: SceneObject, metresPerPixel: number) {
  const [width, , depth] = object.sizeM, c = Math.cos(object.rotationRad), s = Math.sin(object.rotationRad);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => ({
    x: object.position.x + (x * width / 2 * c + z * depth / 2 * s) / metresPerPixel,
    y: object.position.y + (-x * width / 2 * s + z * depth / 2 * c) / metresPerPixel,
  }));
}
