import type { SceneObject } from '@roompilot/domain';

// Approximate photo-guided assemblies. Positions are plan pixels; dimensions are metres.
// These procedural models contain no photograph pixels or private metadata.
function item(id: string, kind: SceneObject['kind'], x: number, y: number, sizeM: SceneObject['sizeM'], rotationRad = 0, elevationM = 0): SceneObject {
  return { id, roomId: 'main', kind, position: { x, y }, sizeM, rotationRad, elevationM };
}
export const DEMO_FURNISHINGS: SceneObject[] = [
  item('kitchen-cooking-run', 'kitchen-cook', 739, 220, [1.86, 2.44, .6], -Math.PI / 2),
  item('kitchen-sink-run', 'kitchen-sink', 644, 275, [1.8, 2.44, .6], Math.PI),
  item('kitchen-integrated-fridge', 'fridge', 589, 168, [.52, 2.44, .62]),
  item('kitchen-window-radiator', 'radiator', 667, 151, [1.1, .65, .12]),
  item('kitchen-robot-dock', 'robot-vacuum', 622, 164, [.36, .65, .38]),
  item('dining-table', 'table', 478, 203, [1.25, .76, .78]),
  item('dining-chair-left', 'chair', 410, 203, [.5, .81, .52], Math.PI / 2),
  item('dining-chair-right', 'chair', 544, 203, [.5, .81, .52], -Math.PI / 2),
  item('dining-pendant-left', 'pendant', 455, 203, [.44, .68, .44], 0, 1.8),
  item('dining-pendant-right', 'pendant', 499, 203, [.4, .74, .4], .25, 1.74),
  item('dining-radiator', 'radiator', 477, 150, [1.15, .65, .12]),
  item('dining-sideboard', 'sideboard', 388, 233, [1.05, .62, .32], Math.PI / 2),
  item('dining-tripod-lamp', 'floor-lamp', 401, 280, [.48, 1.55, .48]),
  item('dining-oak-panel', 'wall-panel', 373, 218, [1.85, 2.48, .025], Math.PI / 2),
  item('dining-moss-art', 'moss-art', 376, 226, [.37, .65, .055], Math.PI / 2, 1.15),
  item('dining-air-conditioner', 'air-conditioner', 379, 180, [.82, .28, .16], Math.PI / 2, 2.05),
  item('dining-air-unit', 'air-unit', 418, 146, [.28, .4, .07], 0, 1.2),
  item('living-rug', 'rug', 462, 367, [1.95, .018, 2.1]),
  item('living-armchair', 'chair', 400, 355, [.65, .86, .65], Math.PI / 2),
  item('living-tv-console', 'tv-console', 548, 365, [1.72, 1.42, .4], -Math.PI / 2),
  item('living-subwoofer', 'subwoofer', 549, 445, [.31, .44, .31]),
  item('living-sconce-east', 'sconce', 563, 286, [.1, .45, .08], -Math.PI / 2, 1.35),
  item('living-sconce-west', 'sconce', 563, 446, [.1, .45, .08], -Math.PI / 2, 1.35),
  item('living-purple-ceiling-light', 'ceiling-light', 467, 364, [.6, .08, .6], 0, 2.39),
  item('living-linear-track', 'track', 467, 265, [2.05, .035, .045], 0, 2.43),
  item('kitchen-linear-track', 'track', 657, 211, [1.2, .035, .045], 0, 2.43),
  item('hall-shoe-cabinet', 'shoe-cabinet', 447, 555, [1.1, 1.12, .26], Math.PI),
  item('hall-generic-print', 'print', 447, 565, [.48, .65, .025], Math.PI, 1.38),
  item('hall-bicycle', 'bike', 340, 549, [1.65, 1.05, .34]),
  item('hall-entry-mirror', 'mirror', 660, 564, [.64, 1.94, .025], Math.PI, .14),
  item('hall-entry-bench', 'bench', 719, 553, [.68, .45, .3], Math.PI),
  item('hall-coats', 'coat-hooks', 721, 563, [.65, 1.05, .07], Math.PI, .95),
  item('hall-entry-runner', 'rug', 683, 515, [1.65, .015, .55]),
  item('hall-wall-control', 'wall-control', 756, 558, [.16, .12, .025], Math.PI, 1.3),
  ...[288, 362, 436, 510, 584, 658, 732].map((x, i) => item(`hall-downlight-${i + 1}`, 'downlight', x, 519, [.12, .04, .12], 0, 2.43)),
];
