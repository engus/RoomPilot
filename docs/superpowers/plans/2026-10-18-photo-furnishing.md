# Photo Furnishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Furnish the owner's kitchen/living/corridor in the recognizable dollhouse style.

**Architecture:** Version 5 adds validated scene-object instances; procedural Three.js assemblies render a code-defined demo layout. Preview controls remain local and independent of HA and outdoor ambience.

**Tech Stack:** TypeScript, Zod, React Three Fiber, Three.js, Vitest, Playwright; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-18-photo-furnishing-design.md`

## Global Constraints

- Private photographs remain outside Git; no photo pixels or private paths in product code.
- Preserve apartment geometry, calibration, areas, zones and apertures.
- English code/docs; English and Russian interface; Russian owner communication.
- Keep the current checkout and preserve active editor data before frontend edits.
- No real HA commands or fabricated indoor device state.

## Review Focus

- Legacy imports have no furnishings and retain all other metadata.
- Imported object dimensions, containment, height, parent IDs and count are validated.
- Room deletion and recognition cannot leave dangling furniture references.
- Hidden furniture/preview lighting cannot reset orbit or break room/zone selection.
- Bounded geometry and light counts remain usable on this host.

### Task 1: Persistent scene objects and demo layout

**Files:** domain `scene-objects.ts`, `schema.ts`, `index.ts`; web `demo-furnishings.ts`, `demo-project.ts`, `App.tsx`; focused domain/web tests.

**Interfaces:** `SceneObject { id, roomId, kind, position: {x,y}, elevationM, rotationRad, sizeM: [width,height,depth] }`; `Project.sceneObjects`; `removeRoom` filters dependent objects. Local model front faces +Z; rotation uses Three.js Y convention.

- [x] Write failing tests for v4 migration, v5 round-trip, rejection of bad objects, parent deletion and recognizable demo kinds.
- [x] Run focused tests and observe failure.
- [x] Implement version 5 schema, object footprint/height checks and max 200 instances; migrate all older documents. Add demo objects with stable semantic IDs and fit footprints inside `main`.
- [x] Run focused tests; expect PASS.

### Task 2: Procedural furnishings and preview controls

**Files:** `components/FurnishingMeshes.tsx`, `components/FurnitureModels.tsx`, `components/RoomScene.tsx`, `components/ZoneMeshes.tsx`, translations/styles; browser furnishing scenario.

**Interfaces:** renderer consumes validated instances, calibrated coordinates and origin. Visibility and preview lights are local viewer state. Furniture click selects its room.

- [x] Write browser test for furnished demo, preview-light/visibility controls, export/import preservation and parent deletion.
- [x] Run test and observe missing controls.
- [x] Implement reusable bounded models, floor finish, emissive fixtures and at most three extra point lights. Integrate controls and selection overlays.
- [x] Inspect furnished scene from multiple angles, Day/Night and light preview; fix visible placement issues.
- [x] Run full tests, typecheck, build and serial Playwright suite; expect PASS.
- [x] Fresh review, address findings, review staged privacy-safe diff, commit and push; verify remote SHA.

## Execution ledger

- Initial editor inspection: empty project, export disabled; no active data to preserve. Existing private backups are retained.
- Owner authorization covers implementation and routine commit/push. Routine placement/material decisions are builder choices; implement inline.

- Task 1 complete: domain and demo tests observed RED then GREEN. Version 5 migrates old documents, keeps stable scene IDs and removes parent dependencies.
- Task 2 complete: procedural models, independent preview switches, zone view selector and floor finish inspected in the browser. 151 unit/integration tests, typecheck, build and 27 serial browser scenarios pass.
- Ruling: missing scale/ceiling must preserve 2D/export, matching existing opening behavior; physical furniture checks defer until metadata is known. Regression reproduced, fixed and tested.
- Ruling: add an explicit named-zone camera selector because the whole-apartment frame makes furniture too small. Only explicit frame changes reset camera framing; selection/light/theme changes do not.
- Fresh builder and code reviews completed; metadata reset finding resolved. Standing authorization selects commit/push to the current branch; no merge, deployment or release.
