# Outdoor Day and Night Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation in the current checkout. Steps use checkbox syntax.

**Goal:** Add day/night ambience and locally calculated real-time sun lighting to the apartment dollhouse while the owner prepares kitchen/living/corridor photos.

**Architecture:** A browser-only outdoor preference drives a dedicated scene environment component (sky, ambient/hemisphere and directional illumination, ground). The optional Auto mode reads a validated calculated snapshot from a loopback API every minute, with a 5-second request deadline. Local server configuration retains coordinates and plan bearing; only derived sun direction/elevation, phase and timestamp reach the browser. A compact EN/RU control inside the 3D viewer is independent of interface appearance. The same calibrated geometry, camera and device state remain untouched.

**Tech Stack:** Existing React, Three.js/R3F, lucide icons and localStorage; SunCalc 2.1.1 on the server (built-in types, degree-valued azimuth clockwise from north). No external runtime request or API key.

**Spec:** Owner's 2026-10-17 scope change: focus on a detailed dollhouse of their apartment, furnish the kitchen/living/corridor from photos, integrate HA next, document replication afterward. They requested day/night outdoor work now, then supplied private coordinates and confirmed the balcony faces almost exactly east. This authorizes configuring location locally for sunlight; no address or coordinates belong in Git. The balcony side is the top of the current plan, so its upward bearing is 90 degrees. Weather, scenery, occlusion by neighboring buildings and HA fixtures remain deferred.

## Global constraints

- English docs/code; EN/RU controls, keyboard-accessible pressed buttons.
- Start at Day unless a valid saved day/night/auto preference exists; tolerate unavailable/blocked storage. Keep the preference outside project v4 and export/import. With missing/invalid automatic data, explicitly show that Day is a fallback and keep manual modes available.
- Day has bright warm directional light and pale sky/ground; Night has cool lower-intensity moon/sky lighting while keeping rooms readable. Do not invent indoor lights or imply HA control.
- Lighting is independent of UI light/dark/system theme. Neutral scene materials do not change with UI appearance.
- Change environment without resetting camera, selecting rooms, rebuilding wall geometry or sending device/provider requests. Auto performs only local derived-state GET requests. No automatic geolocation or credentials; private coordinates stay in ignored server .env, not project exports, public fixtures, route responses or logs.
- Current browser inventory contains no previous working tab. A fresh tab was opened and has no active document; previous ignored backup remains intact.

## Review focus

- Saved unsupported values or storage failures must still permit manual controls.
- Night selection persists through switching to 2D/3D and reload/import without changing the project.
- Theme changes do not switch outdoor mode or alter the rendered environment.
- Actual rendered canvas changes between day/night, while room selection and exports remain valid.
- Keep rendering bounded; avoid additional shadow-casting lights or new geometry on ordinary selection.

### Task 1: Environment controls and rendering

**Files:** new `components/SceneEnvironment.tsx`, `use-outdoor-environment.ts`, domain environment response contract, server solar calculation/route/tests; modify `RoomScene.tsx`, `SolidWalls.tsx`, preferences, translations and styles; browser tests; English product/verification docs.

**Interfaces:** `OutdoorMode = 'day' | 'night' | 'auto'`, `resolveOutdoorMode(saved)`, local preference `roompilot.outdoorMode`; `SceneEnvironment({ mode, solar, size })` renders inside the existing Canvas. `GET /api/environment` returns configured=false or a strict `SolarEnvironment`; config uses SUN_LATITUDE, SUN_LONGITUDE and PLAN_UP_BEARING_DEG. Day=solar altitude>0, twilight=-6..0, night<=-6; artistic night fill is not a measured moon position. Calculations use UTC instants, independent of server timezone.

- [x] Add failing browser checks for pressed states, theme independence, persistence, request-free toggles and unchanged exports; observe RED.
- [x] Implement the bounded preference and EN/RU controls, lighting/sky/ground, neutral scene materials and stable geometry/camera.
- [x] Run unit, type, build and full browser checks; inspect day/night screenshots and request independent review.
- [x] Document the apartment-first milestone and manual-lighting limits; stage privacy-safe files, commit/push and verify remote SHA.
