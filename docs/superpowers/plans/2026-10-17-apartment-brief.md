# Apartment Brief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Collect optional apartment context before recognition and preserve it through provider calls and project exports.

**Architecture:** Version 4 adds a bounded nullable apartmentBrief. An EN/RU form before AI actions edits project data through the revision counter. Full recognition accepts an optional multipart JSON field; adapters append its validated values as data without changing provider output schemas or geometry validation.

**Tech Stack:** Existing TypeScript/Zod/Fastify/React stack; no dependencies added.

**Spec:** `docs/superpowers/specs/2026-10-17-apartment-brief-design.md`

## Global Constraints

- English docs/code, EN/RU interface; preserve and back up active work before frontend changes.
- Unknown remains null/unknown; approximate floor area never establishes calibration.
- Do not equate living-room count with physical room polygons or zone count.
- Keep image/brief submission explicit to the selected provider; no fallback or live inference required.
- Check, commit, push and verify the remote branch under the standing owner authorization.

## Review Focus

- Zero counts versus blank inputs; fractions, excessive values, invalid JSON/enum and unknown fields.
- Optional multipart fields before/after the file, duplicated/unexpected parts rejected before provider calls.
- Every provider receives context as data; schemas and no-context behavior remain compatible.
- In-flight brief edits invalidate recognition results and preserve user answers.
- v1/v2/v3 migration and v4 export retain geometry, openings, zones and user metadata.

### Task 1: Validated metadata and provider transport

**Files:** domain apartment-brief/schema/index/tests; server app/recognition/tests and brief prompt helper.

**Interfaces:** `ApartmentBriefSchema`, `ApartmentBrief`, `createApartmentBrief()`, `Project.apartmentBrief: ApartmentBrief | null`; optional fifth `recognizeImage` argument and third `RecognitionProvider` argument; multipart field `apartmentBrief`.

- [x] Add failing migration/field-bound tests and server transport/rejection/provider request tests, observe RED.
- [x] Implement v4 migrations, optional bounded brief transport and per-provider context append; preserve brief in full/openings-only results.
- [x] Run scoped tests and typechecks; include coherent changes with Task 2 after the UI consumes them.

### Task 2: Questionnaire and corrected demo semantics

**Files:** new ApartmentBriefEditor, App/api/translations/styles, demo-project, browser tests, English docs.

- [x] Add failing browser coverage for demo values/combined bathroom, editable optional answers, request context and export/import.
- [x] Add the form above recognition, rename Rooms to Spaces, seed the confirmed demo context and preserve answers across successful recognition.
- [x] Run full unit/browser/type/build checks; independently review; inspect the UI and save proof.
- [x] Update docs, review staged privacy scope, commit/push and verify the remote SHA.
