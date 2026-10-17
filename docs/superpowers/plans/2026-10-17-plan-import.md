# RoomPilot Plan Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver the first local floor-plan import and review workflow.

**Architecture:** Browser owns editing and 3D. A loopback-only Fastify server normalizes image uploads and calls a configured AI provider. Shared Zod schemas and pure geometry prevent unscaled or invalid drafts being treated as measurements.

**Tech Stack:** pnpm 11, Node.js 22+, TypeScript, React/Vite, SVG, Three.js/R3F, Fastify/Sharp/Zod, Vitest/Playwright.

**Spec:** `docs/superpowers/specs/2026-10-17-plan-import-design.md`.

## Global Constraints
- One floor, PNG/JPEG, maximum 10 MiB. Node.js 22+; pnpm 11.
- No automatic physical scale from AI guesses; positive explicit calibration required.
- No 3D until scale and user-confirmed ceiling height are valid.
- No provider secrets in browser, Git, logs, or errors. No silent simulated recognition.
- Use current checkout on `codex/roompilot-mvp`; it was empty with no commits, so a worktree adds no isolation benefit.
- The owner subsequently authorized commits and pushes after each meaningful completed change. Apply the standing workflow in AGENTS.md. Deployment and releases remain separate actions.
- Documentation is English; UI supports selectable English/Russian and light/dark/system themes. Rename the workspace folder to RoomPilot after stopping running tools, then restore workspace links and re-verify.

## Review Focus
- Imported JSON can forge derived scale: schema must cross-check length/distance.
- Image MIME can lie: decoded content must match allowed PNG/JPEG.
- Dragged vertices can create invalid rooms: reject invalid completed edits.
- Missing area/height must stay unknown and block misleading 3D.
- Provider errors must remain useful without leaking credentials or payloads.

## Task 1: Domain and workspace
Files: root workspace/config; `packages/domain/src/index.ts`, `packages/domain/src/index.test.ts`.
Interfaces produced: `Point`, `Room`, `Project`, `ProjectSchema`, `RecognitionSchema`, `polygonArea(points)`, `validatePolygon(points)`, `createProject(source,recognition)`, `getComputedArea(room,project)`, `calibrateProject(project,points,lengthM)`, `isReadyFor3D(project)`.
- [x] Create pnpm workspace, strict TS config, scripts, ignore rules and test runner.
- [x] Write tests covering concave area, self-crossing/degenerate contours, scale, ceiling gating, forged imports and missing labels.
- [x] Run `pnpm test` and observe failing missing exports.
- [x] Implement shared schemas and geometry; rerun tests and typecheck.
- [ ] Commit domain/workspace with passing tests.

## Task 2: Recognition server
Files: `apps/server/src/app.ts`, `recognition.ts`, `index.ts`, `app.test.ts`; config and `.env.example`.
Consumes domain schemas. Produces `buildApp({provider?,config?})`, `recognizeImage(image,config)` and `/api/health`, `/api/recognize` routes.
- [x] Write integration tests for injected provider, missing config, spoofed image, bounds and sanitized provider failures.
- [x] Observe RED; implement upload validation/normalization and Responses API adapter using strict structured output.
- [x] Run server tests, including a real tiny PNG fixture, and typecheck.
- [ ] Commit server with passing tests. No live provider call without user key.

## Task 3: Editor and 3D
Files: `apps/web/src/App.tsx`, `components/PlanCanvas.tsx`, `RoomScene.tsx`, `styles.css`, `api.ts`, `demo.ts`, `main.tsx` and Vite config.
Consumes Task 1 project model and Task 2 endpoints. Produces Russian upload/review/calibration/height/export/import flow.
- [x] Write focused state/interaction tests for missing metadata and export readiness; observe RED before helper implementation.
- [x] Implement labelled demo, manual polygons, room selection/vertex dragging, editable metadata, explicit scale and ceiling confirmation.
- [x] Implement upload disclosure, provider error states and project JSON import/export.
- [x] Build client-side 3D gated on valid dimensions; add keyboard-accessible controls and responsive layout.
- [x] Implement persisted English/Russian and light/dark/system preferences; verify browser defaults, reload persistence, and system theme changes.
- [x] Run browser acceptance against local servers, inspect a screenshot, and commit.

## Task 4: Documentation and verification
Files: `README.md`, `AGENTS.md`, `project.md`, docs, browser tests and CI as appropriate.
- [x] Document setup, current scope, key/model configuration, local-only deployment, private exports and manual fallback.
- [x] Run `pnpm test`, `pnpm typecheck`, `pnpm build`, and browser acceptance; read results.
- [x] Perform fresh reviewer check, resolve material findings, and report limitations accurately.
- [x] Keep work local until the user's publication request; the owner has now authorized routine commits and pushes.

## Execution notes
- Domain, API, editor, locale/theme, and acceptance tests implemented and verified locally.
- Independent review identified four important findings; all were reproduced with failing tests and fixed (relative scale validation, small-coordinate intersections, JPEG MIME, stale AI responses).
- Original per-task commit steps remain unchecked: the initial implementation was prepared before a Git author was configured. The owner subsequently selected engus and the GitHub noreply address and authorized committing/pushing meaningful changes. The initial MVP is being captured as one coherent baseline.
- The owner requested renaming the workspace to RoomPilot; dependencies and checks are to be verified again after the move.
- The actual folder rename is pending Codex releasing its Windows directory handles. The guarded relocation script was tested on a disposable copy: rename, refreshed links, 37 tests, strict typechecks, build, and seven browser scenarios passed at the new path.
