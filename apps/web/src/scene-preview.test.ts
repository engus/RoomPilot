import { expect, it } from 'vitest';
import { buildDemoProject } from './demo-project';
import { DEMO_SIZE } from './demo-layout';
import { ProjectSchema } from '@roompilot/domain';
import { getPreviewTargets, previewEnabled, togglePreviewTarget, setPreviewLights, getPreviewLightGroups } from './scene-preview';

const project = () => buildDemoProject({ ...DEMO_SIZE, dataUrl: 'data:image/png;base64,YQ==' }, 'en');
it('assigns independent channels to lights, cabinet strips/display, TV and AC only', () => {
  const targets = getPreviewTargets(project().sceneObjects);
  expect(targets.filter(target => target.objectId === 'kitchen-cooking-run').map(target => target.channel)).toEqual(['task-light', 'display-light']);
  expect(targets.some(target => target.objectId === 'dining-table')).toBe(false);
  expect(new Set(targets.map(target => target.id)).size).toBe(targets.length);
  const left = targets.find(target => target.objectId === 'dining-pendant-left')!, right = targets.find(target => target.objectId === 'dining-pendant-right')!;
  const overrides = togglePreviewTarget(targets, {}, left.id);
  expect(previewEnabled(left, overrides)).toBe(false); expect(previewEnabled(right, overrides)).toBe(true);
  expect(previewEnabled(left, togglePreviewTarget(targets, overrides, left.id))).toBe(true);
  expect(togglePreviewTarget(targets, overrides, 'unknown')).toEqual(overrides);
});
it('switches all lighting without changing a device preview or mutating input', () => {
  const targets = getPreviewTargets(project().sceneObjects), tv = targets.find(target => target.objectId === 'living-tv-console')!;
  expect(previewEnabled(tv, {})).toBe(false);
  const overrides = togglePreviewTarget(targets, {}, tv.id), off = setPreviewLights(targets, overrides, false);
  expect(previewEnabled(tv, off)).toBe(true);
  expect(targets.filter(target => target.type === 'light').every(target => !previewEnabled(target, off))).toBe(true);
  expect(setPreviewLights(targets, off, true)[tv.id]).toBe(true);
  expect(overrides).toEqual({ [tv.id]: true });
});
it('bounds aggregate light count and stops illumination from disabled channels', () => {
  const p = project(), targets = getPreviewTargets(p.sceneObjects);
  const groups = getPreviewLightGroups(p, targets, {});
  expect(groups).toHaveLength(3); expect(groups.every(group => group.intensity > 0)).toBe(true);
  const off = getPreviewLightGroups(p, targets, setPreviewLights(targets, {}, false));
  expect(off.every(group => group.intensity === 0)).toBe(true);
  const left = targets.find(target => target.objectId === 'dining-pendant-left')!;
  const oneOff = getPreviewLightGroups(p, targets, togglePreviewTarget(targets, {}, left.id));
  expect(oneOff.reduce((sum, g) => sum + g.intensity, 0)).toBeLessThan(groups.reduce((sum, g) => sum + g.intensity, 0));
});

it('retains illumination contributions from every region when an imported scene has more than three', () => {
  const coordinates = [[20, 20], [70, 20], [20, 70], [70, 70]];
  const p = ProjectSchema.parse({ ...project(), source: { width: 100, height: 100, dataUrl: 'data:image/png;base64,YQ==' }, openings: [], zones: [],
    calibration: { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], lengthM: 10, metresPerPixel: .1 },
    rooms: coordinates.map(([x, y], i) => ({ id: `room-${i}`, name: `Room ${i}`, reportedAreaM2: null, polygon: [{ x: x - 10, y: y - 10 }, { x: x + 10, y: y - 10 }, { x: x + 10, y: y + 10 }, { x: x - 10, y: y + 10 }] })),
    sceneObjects: coordinates.map(([x, y], i) => ({ id: `light-${i}`, roomId: `room-${i}`, kind: 'pendant', position: { x, y }, sizeM: [.3, .5, .3], rotationRad: 0, elevationM: 1.7 })),
  });
  const targets = getPreviewTargets(p.sceneObjects), onlyLast = { ...setPreviewLights(targets, {}, false), [targets[3].id]: true };
  const groups = getPreviewLightGroups(p, targets, onlyLast);
  expect(groups).toHaveLength(3); expect(groups.some(group => group.intensity > 0)).toBe(true);
});
