# Milestone 1 verification

Date: 2026-10-17. Environment: Windows, Node.js 24.19.0, pnpm 11.25.0.

## Verified locally

- Unit/integration suite: 37 passing tests across domain geometry, image upload/API behavior, provider response handling, editor imports, and appearance preferences.
- Strict TypeScript checks pass for all workspaces.
- Production frontend build passes. Server build currently performs typechecking; runtime uses `tsx`.
- Seven browser acceptance scenarios pass: labelled demo; project import, metadata confirmation and real WebGL canvas; export content and re-import; invalid import; language/theme persistence and system appearance changes; manual drawing/calibration without AI transmission; JPEG recognition request MIME; preserving edits made during an in-flight recognition request.
- 3D screenshot inspected after the browser run.
- Independent review performed. Four important findings were reproduced and fixed: small-coordinate polygon intersections, relative calibration validation, imported JPEG content type, and stale recognition overwriting edits.

The initial baseline used mocked providers only. A subsequent owner-authorized OpenAI smoke test accepted the configured credentials and found the configured model, but inference returned HTTP 429 with `credit_balance_exhausted`. OpenRouter later returned a validated draft during the live test described below. Reliable floor-plan recognition quality, Raspberry Pi/ARM deployment, HA integration, and production/public hosting remain unverified.

## Selectable AI providers

- OpenAI, Gemini, and OpenRouter have independent server-side key/model settings and fixed provider endpoints. The browser selects a provider ID only; credentials are never returned by health metadata.
- Unit/integration suite: 57 passing tests, including provider-specific payloads, explicit routing, missing credentials, safe billing/access errors, and invalid/truncated/refused responses.
- Typechecks and production build pass; the existing 3D chunk-size warning remains.
- Eight browser scenarios pass. The additional scenario changes provider without changing the plan, verifies the selected destination, locks the selector during inference, displays a localized quota error, and preserves editing after failure.
- Automated provider requests are intercepted and do not spend credits. These checks establish request/response contract handling, not recognition quality or account availability.
- Independent review found an outer-timeout error-code gap, fixed with a failing/passing API regression test. Live Gemini contract probes exposed a MIME enum mismatch in the guide example and a nested-array schema compilation rejection; both received failing/passing adapter checks. The API reference, rather than the guide's MIME example, establishes `APPLICATION_JSON`. Array limits remain enforced by domain validation after generation.
- With the owner's authorization, Gemini model metadata and minimal text/schema probes returned HTTP 200. The private floor-plan test subsequently reached the 120-second timeout; the next attempt using lower thinking depth returned the adapter's provider balance/budget error. No recognized rooms were produced, and no further attempts or automatic provider switch were made. Gemini 3/4 now use `LOW`; earlier Gemini models do not receive the unsupported thinking-level option. Successful Gemini recognition of a real floor plan remains unverified.

## OpenRouter live test and reasoning control

- The owner authorized testing their existing plan through OpenRouter. `openrouter/free` returned HTTP 404: no endpoints could handle the requested parameters. The public catalog advertised compatible explicit free vision models.
- `nvidia/nemotron-3.5-super-vl:free` timed out with its default settings. A diagnostic request with reasoning disabled returned an empty recognition result despite a visible plan; this is an inference-quality failure, not a usable draft.
- `dots-studio/dots-3-note-preview:free` with reasoning disabled returned room polygons, reported areas, and ceiling height through the existing adapter. Domain validation and project creation succeeded. Visual comparison found omitted space, an incorrect printed area, and a coarse polygon overlapping another room. This establishes a working provider contract, not architectural accuracy. No private image, coordinates, credentials, or exported project are committed.
- Added optional `OPENROUTER_REASONING=off` to reproduce the successful request through the application; absent or `default` preserves provider defaults. Unsupported endpoints still fail explicitly. Focused configuration/request tests were observed failing before implementation and passing afterward.
- Verification after the change: 58 unit/integration tests, TypeScript checks, production build, and eight browser acceptance scenarios pass. The existing 3D bundle warning remains.

## Workspace rename

The requested target folder name is `RoomPilot`. In-session rename attempts were rejected by Windows because VS Code and Codex runtime processes held the original directory open. Closing the VS Code folder did not release the Codex handles. No process was forcibly terminated and the source directory remains intact.

`scripts/Rename-Workspace.ps1` performs a guarded rename after those programs close, refuses an existing destination, refreshes pnpm workspace links and runs all checks from the new path. `-WhatIf` previews the operation. The rename and post-move verification remain pending; do not describe them as completed until that script succeeds.

The script was exercised on a disposable copy with installed workspace junctions: the copy was renamed to RoomPilot, pnpm recreated the links, and all 37 unit/integration tests, typechecks, production build, and seven browser checks passed from the relocated path. This verifies the relocation procedure, not completion of the actual user-folder rename.

Tool policy rejected removal of the disposable copy (`blocked by policy`), including a narrower literal-path cleanup attempt. The copy remains under the Git-ignored `.superpowers/move-check` directory. No alternative deletion mechanism was used.

## Antivirus report

AVG quarantined a generated Vite cache file for `@react-three/drei` as `JS:Prontexi-Z [Trj]`. The npm distribution integrity recorded in the initial lockfile matched registry metadata; this establishes package provenance, not a clean-malware verdict for the quarantined artifact.

Drei was removed from project dependencies. Camera controls and grid rendering now use Three.js directly. Browser checks pass without Drei. No antivirus exclusions were created, protection was not disabled, and the quarantined artifact was not restored. Definitive classification of that artifact requires antivirus-vendor analysis.

## Deferred limitations

- Browser image dimensions are checked after image decoding. Very large compressed inputs can temporarily consume substantial browser memory before rejection; server decoding has an explicit input-pixel limit.
- The lazy 3D bundle is approximately 904 kB before gzip; Vite emits a chunk-size warning. Further splitting/performance work is deferred.
- There is no project autosave, shared-wall topology, openings, furniture, or HA device control in this milestone.
- The initial implementation was prepared before Git identity and publication were configured. The owner subsequently authorized routine commits/pushes and selected `engus` with the GitHub noreply address as the repository-local author. Follow `AGENTS.md` for the current publication workflow.
