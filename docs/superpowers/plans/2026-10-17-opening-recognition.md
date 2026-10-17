# OpenRouter Opening Recognition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Recognize editable windows and doors through OpenRouter in full and openings-only workflows.

**Architecture:** Bounded provider draft spans map to existing version 2 openings through pure domain validation. The server owns schema/prompt and image validation; the editor applies guarded responses to the existing renderers.

**Tech Stack:** Existing TypeScript, Zod, Fastify, React, Three.js and pnpm; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-17-opening-recognition-design.md`

## Global Constraints

- Documentation/code English, UI EN/RU, private plans and credentials ignored.
- Keep project version 2 and existing provider contracts compatible.
- Preserve current checkout and export any active editor before frontend edits.
- Check, commit and push each coherent deliverable; verify remote SHA.

## Review Focus

- Invalid/unrelated paired walls and wrong room indices cannot cut unrelated rooms.
- Nullable dimensions get disclosed preview defaults, never guessed scale.
- Repeated detection preserves manual openings and does not duplicate conflicts.
- Invalid embedded image or origin is rejected before provider use.
- In-flight room edits invalidate the result; failures preserve the project.

### Task 1: Draft conversion and provider integration

**Files:** `packages/domain/src/recognized-openings.ts`, its tests, domain schema/index, `apps/server/src/recognition.ts`, recognition tests.

**Interfaces:** `DetectedOpeningSchema` (image segments), `RecognizedOpeningSchema` (internal indexed spans), `OpeningRecognitionSchema`, `applyDetectedOpenings(project, openings): { project, warnings }`; `recognizeOpenings(project, config, signal): Promise<OpeningRecognition>`.

**Ruling:** Live index/fraction output consistently misassigned walls; switch the provider contract to image endpoints and deterministic wall matching, as recorded in the spec. Keep indexed candidate validation internal.

- [x] Add failing domain tests for mapping/paired wall geometry, null dimensions, conflicts, invalid indices, no scale and ceiling fit; observe RED.
- [x] Implement conversion and optional full-recognition openings, keeping room-only drafts compatible; observe GREEN.
- [x] Add failing OpenRouter full/openings-only request/response tests; implement strict schemas, dedicated context and adapter, keeping OpenAI/Gemini unchanged.
- [x] Run unit suite/typecheck and include the coherent backend/domain changes with the verified Task 2 feature commit.

### Task 2: Endpoint and editor

**Files:** server app/tests; web api/tests, App, translations; browser tests; English project docs.

**Interfaces:** `POST /api/recognize-openings` JSON `{ project }` returns `{ project, warnings }`; frontend `recognizeOpenings(project)` uses OpenRouter only.

- [x] Add failing API tests for preserving metadata/manual openings, malformed images, origin, timeout and conflicting suggestions; implement route with shared busy slot.
- [x] Add failing browser test for detecting symbols, preserved metadata/export, 3D and stale response protection; implement button and translations.
- [x] Run `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm test:e2e`; inspect failures and screenshots.
- [x] Review final diff independently, resolve important findings, run one private live OpenRouter request and inspect returned 2D/3D draft if valid.
- [x] Update English documentation with evidence/limits, review staged diff for secrets, commit, push and verify matching remote SHA.

Completion evidence and model-quality limits: `docs/verification.md`. Full checks passed before the client deadline follow-up; the final rerun includes its RED/GREEN test. Private provider output was inspected without weakening geometry checks or substituting manual tracing.
