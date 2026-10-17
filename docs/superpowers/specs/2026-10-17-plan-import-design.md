# RoomPilot: plan import, milestone 1

Date: 2026-10-17. User authorized starting this MVP and creating the project structure and project/agent documentation. Technical choices below are implementation decisions, not separately approved user preferences.

## Goal and boundaries
Turn a PNG/JPEG floor-plan image into a reviewable apartment document with room polygons, names, reported areas, optional ceiling height, explicit scale calibration, 2D overlay and simplified 3D preview. A photo of a paper plan is supported as an image; ordinary interior photographs are not a reliable floor-plan source and are outside this milestone.

One floor; finite simple room polygons, at least 3 points, positive area, no self-intersection. Recognition may be imperfect and must be editable. Rooms have persistent IDs and names. No arbitrary AI-generated code is executed. No HA control in this iteration; future bindings will be separate from geometry.

## Flow
1. Select PNG/JPEG (maximum 10 MiB); show source preview. Recognition is a separate explicit action with disclosure that the image is sent to the configured provider.
2. Server verifies actual image type, limits decoded pixels, applies orientation and bounds longest side to 1800 pixels. Calls configured provider with a timeout, receives strict JSON, validates it, converts normalized coordinates into pixels and returns a draft and the normalized source image. No upload is persisted.
3. Show the source with room polygon overlays, room list, editable names and reported areas. Unlabelled rooms use `Комната N`. Missing areas stay unknown. Clicking a room selects it; dragging a vertex edits its outline. Add/remove rooms through a simple drawing mode and remove action.
4. Scale is unknown initially even if reported areas exist: do not infer reliable physical dimensions from room area labels. Select two points and enter known length in metres. Positive pixel distance and length establish metresPerPixel. Render calibration line and allow resetting it. Invalid calibration never enables 3D.
5. Prompt for ceiling height if absent; show provider-proposed value as editable and unconfirmed until the user confirms it. Valid range 1.5–10 metres. Clearing it invalidates 3D readiness.
6. Show reported square metres separately from computed area = pixel polygon area × metresPerPixel². No exact accuracy claims. Highlight sizeable differences, do not overwrite source labels.
7. 3D is available only with valid scale and confirmed height. Browser builds room floor meshes and simple wall outlines/extrusions. This is a room-volume preview: shared partitions, openings and furniture are deferred. Room names and areas remain in the adjacent accessible HTML list. Interactive orbit/zoom and room selection.
8. Export a versioned JSON document, including embedded source image and calibration. Import validates everything and restores state. No automatic persistent storage or hidden upload retention. Explicitly remind users to export their work.

## Architecture and interfaces
- Documentation is English. UI language is selectable English/Russian, initially browser Russian or English fallback. Light, dark, and system appearance are selectable; system preference changes are followed. Persist only these preferences locally.
- pnpm 11 workspaces; Node.js 22+; TypeScript strict; React + Vite, Three/R3F; Fastify + multipart + Sharp; Zod. Unit/integration tests use Vitest; browser tests use Playwright.
- `packages/domain/src/index.ts` exports schemas/types, `polygonArea`, `validatePolygon`, `createProject`, `getComputedArea`, `calibrateProject`, and `isReadyFor3D`.
- Version 1 Project: id, name, source {dataUrl,width,height}, rooms [{id,name,polygon:[{x,y}],reportedAreaM2:number|null}], calibration {points:[Point,Point],lengthM,metresPerPixel}|null, ceilingHeightM:number|null, ceilingHeightConfirmed:boolean, schemaVersion:1.
- `POST /api/recognize` accepts multipart `file`; returns `{project,warnings}`. `GET /api/health` returns `{status:'ok',recognitionConfigured:boolean}` without secrets.
- Adapter input: validated normalized image; output: room names/areas/polygons in normalized coordinates [0,1], optional ceiling height, warnings. OpenAI model and key are server env configuration, no hardcoded model assumption. Missing configuration returns 503, malformed file 400/413/415, provider failure 502/504. Never return provider raw errors or secrets.
- API listens on 127.0.0.1 by default; frontend dev server proxies `/api`. No permissive CORS. LAN/public exposure and authentication require a later deployment milestone. No production Docker/add-on claim in this iteration.
- Runtime provider adapter is replaceable; do not install or run a model on a Pi. Recognition tests use injected providers, explicitly test-only; runtime never silently substitutes mock results.
- Project exports contain private floor-plan images and should not be committed. `.env` is ignored. No key is required to build/test, use the separately labelled example, manually draw rooms, or import a project.

## Acceptance checks
- Build and strict typecheck all workspaces.
- Geometry tests: concave polygon, self-crossing, duplicate/degenerate vertices, unscaled unknown area, calibrated area, negative/zero scale rejected.
- Schema tests: bounded points, finite values, invalid source image prefix, mismatched calibration values, unsupported version, invalid height and confirmed-without-height rejected.
- Server tests: absent key, healthy configuration, real image upload to injected provider, spoofed image, oversized upload, malformed provider response, timeout/error sanitization.
- Browser flow: labelled demo -> edit name -> scale -> ceiling confirmation -> 3D -> JSON export/import; manual room creation without API; no key path reports unavailable rather than claiming recognition succeeded.
- Browser preference checks: switch English/Russian and light/dark/system, reload, verify saved choices; follow OS colour-scheme changes in system mode.
- No live AI quality or Raspberry Pi performance claims without real inputs/hardware.

## Decisions left to the builder
Visual layout and colours, exact file decomposition within these boundaries, reasonable image/polygon count limits, test fixture geometry, and provider request timeout (bounded, documented). Use CSS/SVG for the interface, no AI-generated visual assets required.
