# Interactive Fixtures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Correct the photo-guided kitchen/living scene and toggle individual preview elements directly in 3D.

**Architecture:** Keep preview overrides outside Project in App-owned state, scoped to document replacement generation. A pure target catalog describes independent channels; procedural renderers consume channel states and click handlers. Keep schema v5 with additive model kinds only.

**Tech Stack:** Existing TypeScript, React, Three.js/R3F, Vitest, Playwright. No new product dependencies.

**Spec:** `docs/superpowers/specs/2026-10-18-interactive-fixtures-design.md`

## Global Constraints

- Current checkout and standing commit/push authorization; preserve active project first.
- Original/private decoded photographs remain ignored; no photo pixels, metadata or identifying text in product assets.
- English code/docs, EN/RU UI, Russian owner communication.
- No HA/network commands; preserve source geometry, calibration, areas and apertures.
- Preview state survives 2D/3D, appearance/outdoor and selection changes, but resets on document replacement.

## Review Focus

- One cabinet contains multiple independently toggleable channels.
- Orbit drags and event bubbling must not change device state.
- A same-ID imported document must reset previous overrides.
- Master light switch must not turn TV/AC previews on/off.
- Disabled fixtures cannot continue contributing local illumination; geometry uploads stay zero on toggles.

### Task 1: Target catalog, transient state and corrected template

**Files:** create `apps/web/src/scene-preview.ts`, `use-scene-preview.ts`; modify `App.tsx`, `demo-furnishings.ts`, domain `scene-objects.ts`; tests `scene-preview.test.ts`, `demo-project.test.ts`.

**Interfaces:** `getPreviewTargets(objects)` returns stable `{id,objectId,channel,labelKey,ordinal,type,defaultOn}` descriptors. `previewEnabled(target,overrides)` reads a boolean override or default. Pure toggle/master actions return a new override record. Hook scopes it to `${project.id}:${documentGeneration}` and retains it in App across view remounts.

- [x] Write tests for independent targets, safe unknown IDs, master isolation, and corrected refrigerator/storage/sink placement.
- [x] Observe tests fail, implement catalog/state/template/model kinds, then verify passing.

### Task 2: Renderers, interaction and visual corrections

**Files:** furnishing/kitchen/furniture/model-parts/RoomScene components, new accessible preview panel, translations/styles; `tests/e2e/interactive-fixtures.spec.ts`.

**Interfaces:** renderer takes target states and toggle callback. Kitchen task and display groups resolve separate channels. Direct clicks with movement <=4 px toggle; larger movement selects nothing. Three fixed regional lights aggregate enabled light targets. Target buttons expose identical actions with `aria-pressed` and EN/RU labels.

- [x] Write browser acceptance for direct mesh click, drag suppression, list state, remount, master, export and same-ID import reset; observe missing UI failure.
- [x] Implement interaction, status, channel-specific emission and bounded aggregate lighting.
- [x] Correct glass cabinet, rounded seating, distinct pendants and curved faucet; inspect kitchen and living in browser.
- [x] Run full unit suite, typecheck, build and serial browser suite; fresh review and fix substantive findings.
- [x] Stage privacy-safe diff, commit/push and verify remote SHA.

## Execution ledger

- Exported active editor before frontend changes to ignored local backup.
- Decoded 14 private HEIC references locally for inspection; conversion tooling lives in ignored data only.
- Execute inline under existing authorization; builder makes approximate placement/material decisions.

- Task 1 complete: target isolation/master/three-light budget and corrected-template tests observed RED then GREEN.
- Task 2 complete: direct raycast click, keyboard controls, live status, drag suppression and zero geometry upload tests pass. Full 156 unit tests, typecheck/build and29 serial browser scenarios passed; both interactive scenarios repeated after final appliance adjustment.
- Ruling: retain all imported lighting-region contributions by folding overflow into nearest of three stable clusters, rather than dropping later regions. Valid four-room test observed RED then GREEN.
- Ruling: keep last-action feedback outside the collapsible list; direct-click test reproduced hidden feedback and now passes.
- Fresh builder/code reviews and follow-up completed with no remaining findings. Active project backup and final refined export remain local/ignored. Standing authorization selects commit/push on current branch, without merge/deployment.
