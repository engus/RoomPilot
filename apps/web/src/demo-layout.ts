import type { Opening, Project, Room, Zone } from '@roompilot/domain';
import type { TranslationKey } from './translations';

// Derived apartment layout explicitly approved by the owner for the public demo.
// Source pixels, provider responses and private file paths are deliberately absent.
export const DEMO_SIZE = {"width": 886, "height": 1050};
export const DEMO_ROOMS: (Omit<Room, 'name'> & { nameKey: TranslationKey })[] = [
  {"id": "upper-left","polygon": [{"x": 134,"y": 142},{"x": 361,"y": 142},{"x": 361,"y": 459},{"x": 273,"y": 459},{"x": 273,"y": 419},{"x": 263,"y": 419},{"x": 263,"y": 459},{"x": 134,"y": 459}],"reportedAreaM2": 12.5,"nameKey": "demoParentsBedroom"},
  {"id": "lower-left","polygon": [{"x": 134,"y": 599},{"x": 237.00000000000003,"y": 599},{"x": 237.00000000000003,"y": 635},{"x": 245,"y": 635},{"x": 245,"y": 599},{"x": 332,"y": 599},{"x": 332,"y": 999},{"x": 134,"y": 999}],"reportedAreaM2": 13.73,"nameKey": "demoChildrenBedroom"},
  {"id": "right-small","polygon": [{"x": 574,"y": 308},{"x": 763,"y": 308},{"x": 763,"y": 467},{"x": 642,"y": 467},{"x": 642,"y": 430},{"x": 574,"y": 430}],"reportedAreaM2": 4.8,"nameKey": "demoToilet"},
  {"id": "left-small","polygon": [{"x": 134,"y": 468},{"x": 225,"y": 468},{"x": 225,"y": 567},{"x": 134,"y": 567}],"reportedAreaM2": 1.57,"nameKey": "demoStorage"},
  {"id": "main","polygon": [{"x": 370,"y": 142},{"x": 763,"y": 142},{"x": 763,"y": 299},{"x": 574,"y": 299},{"x": 574,"y": 254},{"x": 567,"y": 254},{"x": 567,"y": 476},{"x": 574,"y": 476},{"x": 574,"y": 438},{"x": 635,"y": 438},{"x": 635,"y": 476},{"x": 763,"y": 476},{"x": 763,"y": 482},{"x": 793,"y": 482},{"x": 793,"y": 544},{"x": 763,"y": 544},{"x": 763,"y": 567},{"x": 315,"y": 567},{"x": 315,"y": 599},{"x": 248.99999999999997,"y": 599},{"x": 248.99999999999997,"y": 567},{"x": 234,"y": 567},{"x": 234,"y": 468},{"x": 370,"y": 468}],"reportedAreaM2": 25.69,"nameKey": "demoSharedRoom"},
  {"id": "balcony","polygon": [{"x": 134,"y": 49},{"x": 361,"y": 49},{"x": 361,"y": 109},{"x": 134,"y": 109}],"reportedAreaM2": 2.38,"nameKey": "demoBalcony"},
];
export const DEMO_OPENINGS: Opening[] = [
  {"id": "window-upper-left","kind": "window","heightM": 1.5,"sillHeightM": 0.85,"spans": [{"roomId": "upper-left","edgeIndex": 0,"start": 0.1277533039647577,"end": 0.5462555066079295},{"roomId": "balcony","edgeIndex": 2,"start": 0.45374449339207046,"end": 0.8722466960352423}]},
  {"id": "door-balcony","kind": "door","heightM": 2.25,"sillHeightM": 0,"spans": [{"roomId": "upper-left","edgeIndex": 0,"start": 0.5462555066079295,"end": 0.8149779735682819},{"roomId": "balcony","edgeIndex": 2,"start": 0.18502202643171806,"end": 0.45374449339207046}]},
  {"id": "window-main-1","kind": "window","heightM": 1.5,"sillHeightM": 0.85,"spans": [{"roomId": "main","edgeIndex": 0,"start": 0.1628498727735369,"end": 0.3944020356234097}]},
  {"id": "window-main-2","kind": "window","heightM": 1.5,"sillHeightM": 0.85,"spans": [{"roomId": "main","edgeIndex": 0,"start": 0.6412213740458015,"end": 0.8727735368956743}]},
  {"id": "window-lower-left","kind": "window","heightM": 1.5,"sillHeightM": 0.85,"spans": [{"roomId": "lower-left","edgeIndex": 6,"start": 0.2676767676767677,"end": 0.7575757575757576}]},
  {"id": "door-upper-left","kind": "door","heightM": 2.2,"sillHeightM": 0,"spans": [{"roomId": "upper-left","edgeIndex": 2,"start": 0.20454545454545456,"end": 0.8977272727272727},{"roomId": "main","edgeIndex": 22,"start": 0.35294117647058826,"end": 0.8014705882352942}]},
  {"id": "door-lower-left","kind": "door","heightM": 2.2,"sillHeightM": 0,"spans": [{"roomId": "lower-left","edgeIndex": 4,"start": 0.04597701149425287,"end": 0.7471264367816092},{"roomId": "main","edgeIndex": 18,"start": 0.07575757575757572,"end": 0.9999999999999996}]},
  {"id": "door-right-small","kind": "door","heightM": 2.2,"sillHeightM": 0,"spans": [{"roomId": "right-small","edgeIndex": 2,"start": 0.4132231404958678,"end": 0.9090909090909091},{"roomId": "main","edgeIndex": 10,"start": 0.140625,"end": 0.609375}]},
  {"id": "door-left-small","kind": "door","heightM": 2.2,"sillHeightM": 0,"spans": [{"roomId": "left-small","edgeIndex": 1,"start": 0.12121212121212122,"end": 0.8787878787878788},{"roomId": "main","edgeIndex": 21,"start": 0.12121212121212122,"end": 0.8787878787878788}]},
  {"id": "door-entrance","kind": "door","heightM": 2.2,"sillHeightM": 0,"spans": [{"roomId": "main","edgeIndex": 13,"start": 0,"end": 1}]},
  // Owner-confirmed wraparound glazing; full-height panels are a stylized preview.
  {"id": "balcony-glazing-front","kind": "window","heightM": 2.5,"sillHeightM": 0,"spans": [{"roomId": "balcony","edgeIndex": 0,"start": 0,"end": 1}]},
  {"id": "balcony-glazing-right","kind": "window","heightM": 2.5,"sillHeightM": 0,"spans": [{"roomId": "balcony","edgeIndex": 1,"start": 0,"end": 1}]},
  {"id": "balcony-glazing-left","kind": "window","heightM": 2.5,"sillHeightM": 0,"spans": [{"roomId": "balcony","edgeIndex": 3,"start": 0,"end": 1}]},
];
export const DEMO_CALIBRATION: NonNullable<Project['calibration']> = {"points": [{"x": 315, "y": 567}, {"x": 763, "y": 567}], "lengthM": 5.88, "metresPerPixel": 0.013125};
export const DEMO_ZONES: (Omit<Zone, 'name'> & { nameKey: TranslationKey })[] = [
  {"id": "demo-living","roomId": "main","nameKey": "demoLivingZone","polygon": [{"x": 370,"y": 142},{"x": 567,"y": 142},{"x": 567,"y": 476},{"x": 370,"y": 476}]},
  {"id": "demo-kitchen","roomId": "main","nameKey": "demoKitchenZone","polygon": [{"x": 567,"y": 142},{"x": 763,"y": 142},{"x": 763,"y": 299},{"x": 574,"y": 299},{"x": 574,"y": 254},{"x": 567,"y": 254}]},
  {"id": "demo-corridor","roomId": "main","nameKey": "demoCorridorZone","polygon": [{"x": 234,"y": 468},{"x": 370,"y": 468},{"x": 370,"y": 476},{"x": 574,"y": 476},{"x": 574,"y": 438},{"x": 635,"y": 438},{"x": 635,"y": 476},{"x": 763,"y": 476},{"x": 763,"y": 482},{"x": 793,"y": 482},{"x": 793,"y": 544},{"x": 763,"y": 544},{"x": 763,"y": 567},{"x": 315,"y": 567},{"x": 315,"y": 599},{"x": 249,"y": 599},{"x": 249,"y": 567},{"x": 234,"y": 567}]},
];
