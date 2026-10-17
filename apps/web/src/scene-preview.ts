import type { Point, Project, SceneObject } from '@roompilot/domain';
import type { TranslationKey } from './translations';

export type PreviewOverrides = Readonly<Record<string, boolean>>;
export type PreviewTarget = { id: string; objectId: string; channel: string; labelKey: TranslationKey; ordinal: number; type: 'light' | 'device'; defaultOn: boolean };
const lights: Partial<Record<SceneObject['kind'], TranslationKey>> = {
  pendant: 'devicePendant', 'pendant-round': 'devicePendant', 'floor-lamp': 'deviceFloorLamp', sconce: 'deviceSconce',
  'ceiling-light': 'deviceCeiling', track: 'deviceTrack', mirror: 'deviceMirror', downlight: 'deviceDownlight',
};
export function getPreviewTargets(objects: SceneObject[]): PreviewTarget[] {
  const counters = new Map<string, number>();
  return objects.flatMap(object => {
    const channels: { channel: string; labelKey: TranslationKey; type: 'light' | 'device' }[] = [];
    if (lights[object.kind]) channels.push({ channel: 'light', labelKey: lights[object.kind]!, type: 'light' });
    if (object.kind === 'kitchen-cook' || object.kind === 'kitchen-sink') channels.push({ channel: 'task-light', labelKey: 'deviceTaskLight', type: 'light' });
    if (object.kind === 'kitchen-cook') channels.push({ channel: 'display-light', labelKey: 'deviceDisplayLight', type: 'light' });
    if (object.kind === 'tv-console') channels.push({ channel: 'screen', labelKey: 'deviceTV', type: 'device' });
    if (object.kind === 'air-conditioner') channels.push({ channel: 'power', labelKey: 'deviceAC', type: 'device' });
    return channels.map(channel => {
      const ordinal = (counters.get(channel.labelKey) ?? 0) + 1; counters.set(channel.labelKey, ordinal);
      return { ...channel, id: `${object.id}:${channel.channel}`, objectId: object.id, ordinal, defaultOn: channel.type === 'light' };
    });
  });
}
export function previewEnabled(target: PreviewTarget, overrides: PreviewOverrides): boolean {
  return typeof overrides[target.id] === 'boolean' ? overrides[target.id] : target.defaultOn;
}
export function togglePreviewTarget(targets: PreviewTarget[], overrides: PreviewOverrides, id: string): PreviewOverrides {
  const target = targets.find(target => target.id === id);
  return target ? { ...overrides, [id]: !previewEnabled(target, overrides) } : overrides;
}
export function setPreviewLights(targets: PreviewTarget[], overrides: PreviewOverrides, on: boolean): PreviewOverrides {
  return { ...overrides, ...Object.fromEntries(targets.filter(target => target.type === 'light').map(target => [target.id, on])) };
}
function contains(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
/** At most three regional lights; contribution is derived from all enabled channels. */
export function getPreviewLightGroups(project: Project, targets: PreviewTarget[], overrides: PreviewOverrides) {
  const groups = new Map<string, { id: string; x: number; y: number; count: number; enabled: number }>();
  for (const target of targets.filter(target => target.type === 'light')) {
    const object = project.sceneObjects.find(object => object.id === target.objectId)!;
    const id = project.zones.find(zone => zone.roomId === object.roomId && contains(object.position, zone.polygon))?.id ?? object.roomId;
    const group = groups.get(id) ?? { id, x: 0, y: 0, count: 0, enabled: 0 };
    group.x += object.position.x; group.y += object.position.y; group.count++; group.enabled += Number(previewEnabled(target, overrides)); groups.set(id, group);
  }
  const regions = [...groups.values()], clusters = regions.slice(0, 3).map(group => ({ ...group }));
  for (const region of regions.slice(3)) {
    const distance = (group: typeof region) => (group.x / group.count - region.x / region.count) ** 2 + (group.y / group.count - region.y / region.count) ** 2;
    const nearest = clusters.reduce((best, group) => distance(group) < distance(best) ? group : best);
    nearest.x += region.x; nearest.y += region.y; nearest.count += region.count; nearest.enabled += region.enabled;
  }
  return clusters.map(group => ({ id: group.id, x: group.x / group.count, y: group.y / group.count, intensity: 9 * group.enabled / group.count }));
}
