# Apartment Demo and Zones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship the owner-authorized apartment demo with named rooms and editable wall-free kitchen/living/corridor zones.

**Architecture:** Version 3 documents add parent-bound zone polygons independently of room walls. Pure domain validation protects containment and overlap; SVG and flat Three.js meshes render zones. A code-defined, localized demo derives from the approved assisted tracing with a redrawn source.

**Tech Stack:** TypeScript, Zod, polygon-clipping, React, SVG, Three.js; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-17-demo-zones-design.md`

## Global Constraints

- Documentation/code English, UI EN/RU; keep private source images and exports ignored.
- Publish only the derived demo layout explicitly authorized by the owner.
- Export the active project before frontend changes. Preserve existing checkout and user changes.
- Zones never create walls or accept wall openings. Scale remains required for computed areas.
- Migrate v1/v2 to v3 explicitly; no silent unsupported-version fallback.
- Run checks, commit, push and verify the remote branch after coherent deliverables.

## Review Focus

- A zone edge may leave a concave parent even when all vertices are inside.
- Touching boundaries are allowed; sibling interior overlap is rejected.
- Room edits/deletion and in-flight opening recognition must preserve valid zones or reject safely.
- The demo must work in EN/RU with all ten openings and immediate 3D, without image/network dependencies.
- Selection, drawing and vertex handles must not interfere with room/opening editing or scale calibration.

### Task 1: Versioned zone domain

**Files:** domain schema/index/openings, new zone geometry and tests, existing migration/API tests.

**Interfaces:** `Zone { id, roomId, name, polygon }`, `Project.zones`, `isPolygonWithinRoom(polygon, room)`, `getZoneArea(zone, project)`, `removeRoom` also cleans zones.

- [x] Add failing tests for v1/v2 migration, v3 round-trip, concave containment, shared boundaries/overlap, orphan zones and room cleanup.
- [x] Implement zone validation and explicit migration; update affected compatibility tests to expect v3.
- [x] Run domain/server/API checks and typechecks; include the coherent schema change in the feature commit after the UI consumes it.

### Task 2: Editor, renderer and approved demo

**Files:** web App, PlanCanvas, RoomScene, new ZoneEditor/ZoneMeshes, translations/styles, demo data/rendering, browser tests and English docs.

**Interfaces:** PlanCanvas zone selection/edit callbacks and draw-zone mode; RoomScene selectedZoneId/onZoneSelect; ZoneEditor receives the selected parent and invokes draw/rename/delete actions. `createDemo(language)` returns a validated calibrated v3 apartment with 6 rooms, 10 openings and 3 functional zones.

- [x] Add failing browser coverage for the new demo, ready 3D, localized names, zones export/import, drawing/renaming/deletion and invalid parent edits.
- [x] Implement a redrawn code-based demo, independent zone editing, flat floor visuals and guarded room edits. Keep geometry walls sourced only from rooms.
- [x] Run `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm test:e2e`; inspect 2D/3D and save screenshots.
- [x] Resolve independent final review findings, update documentation, review staged privacy scope, commit/push and verify matching remote SHA.

Final evidence: `docs/verification.md`. Owner-supplied room labels supersede provisional names. Domain/demo construction and three browser acceptance scenarios pass alongside the full existing suite; v3 legacy migrations and opening-only zone preservation are verified.
