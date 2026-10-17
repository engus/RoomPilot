# Solid Dollhouse Walls Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation in the current checkout. Steps use checkbox syntax.

**Goal:** Replace disconnected translucent room shells with an opaque, joined dollhouse model while retaining editable rooms, zones, windows and doors.

**Architecture:** Derive a display-only wall footprint from calibrated room boundaries using the existing polygon-clipping dependency. Union capped boundary strips, subtract room cores and extrude the resulting footprint in height bands with full-depth aperture cuts. Keep source geometry, areas, calibration and project version unchanged. Use the same opening placements for cuts and frames.

**Tech Stack:** Existing domain TypeScript/polygon-clipping, React Three Fiber and Three.js; no new dependencies.

**Spec:** Owner request and screenshots on 2026-10-17: recognizable, interactive toy/dollhouse styling; solid walls without inter-room cavities; architectural accuracy is secondary.

## Global constraints

- Preserve an ignored export before frontend edits; English docs/code and EN/RU UI.
- These are preview conventions, not measured wall thickness: outward padding 0.24 m, inward lip 0.04 m. Nearby wall gaps up to 0.48 m join; larger separations remain separate rather than filling missing rooms or outdoor space.
- Opaque neutral walls; selection belongs to colored floors/zones. Retain actual aperture heights, sills, widths and ceiling confirmation.
- Joined wall tops, sealed corners and a shallow base; no roofs, wall graph, CAD features, recognition changes or provider calls.
- Preserve exports exactly through 3D viewing; perform checks, commit/push and verify remote SHA under the standing workflow.
- Bound preview work before clipping (at most 2,000 source edges and edge-count × potential-height-bands <=40,000), then bound the derived footprint × layers to 100,000 vertices. Larger documents keep their 2D/editor/export workflow with localized explanation.

## Review focus

- Touching room faces still require a visible partition; subtract inset cores rather than complete floors.
- Close parallel faces must join, including the demo balcony gap, without filling room interiors or remote empty areas.
- Paired doors/windows cut through the entire shared volume and frames sit between faces. Exterior openings must not be filled by a neighboring corner strip.
- Concave and diagonal outlines, reversed winding and narrow recesses must produce finite closed shapes with holes.
- No recomputation on selection/theme-only changes; no source data mutation or changes to zones and manual opening editing.

### Task 1: Joined wall model and render integration

**Files:** create domain `solid-walls.ts` and tests; export from index. Modify `RoomScene.tsx`, `OpeningMeshes.tsx`, add a focused `SolidWalls.tsx`; update demo geometry regression and English docs.

**Interfaces:** `buildSolidWallModel(project)` returns metre-space wall/base polygons (outer ring plus holes), height layers and per-opening placement/cut information. Input is an already validated calibrated project with ceiling height. No persisted fields.

- [x] Write regressions for shared-wall samples, hollow interiors, remote separation, complete door/window cuts, mirrored frame placement, winding/diagonals and unchanged project data; observe RED.
- [x] Implement footprint union/subtraction and aperture height bands. Test demo inter-room gaps and the balcony bridge using independent sample points.
- [x] Replace thin room wall boxes with opaque extruded layers; keep selectable floors/zones, add a shallow solid base, and align opening meshes with the same cuts. Fit camera bounds to outward padding.
- [x] Run full unit/type/build/browser checks, inspect fresh 3D from above and low angle, save local proof and obtain independent code review.
- [x] Update preview limitations/docs, inspect staged privacy scope, commit/push and verify remote commit.

## Review and execution record

- The initial new geometry tests failed with the missing builder; implementation passed their shared-wall, opening, winding and mutation assertions. Independent review then identified two geometry defects, excessive worst-case layering, and constructor options recreated during selection/theme changes.
- Paired faces that no longer match the close parallel display wall are now rendered as separate local apertures, avoiding global cutters through unrelated rooms. Acute caps require up to sqrt(2) × outset reach for cuts and camera framing. Both geometric reproductions were observed failing, then passing after fixes.
- Review's accepted maximum-input probe exceeded 47 CPU seconds and 2.78 GB RAM before termination. Added conservative preflight/derived complexity limits and a specific 2D-preserving fallback; browser reproduction initially showed the generic graphics failure, then passed with the localized explanation.
- The browser geometry-upload regression initially measured 84 buffer uploads on room/theme changes, then zero after memoizing extrusion options and the common floor origin.
- Ruling: serialize Playwright workers — parallel runs repeatedly stalled navigation/image decoding across existing and new scenarios, while all 23 scenarios passed in 19.9 seconds in one worker. This trades browser test concurrency for reliability on shared host graphics resources; it does not change application behavior. Underlying host/driver cause is not established.
