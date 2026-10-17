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

## Gemini geometry error investigation

- Reproduced the owner's generic invalid-draft report with one authorized request on the existing private plan. Gemini returned HTTP 200, finish reason `STOP`, and valid JSON. Two room polygons failed the existing topology validator; one contained crossing edges. This was a geometry failure, not a truncated or non-JSON response. The raw response remains local and ignored.
- The adapter now classifies invalid room topology as `invalid_geometry`, without returning provider text or relaxing validation. The interface explains the outline problem in English/Russian and preserves the existing source and edits. Error copy clarifies that work remains in the editor and requires export to save; there is no autosave.
- Synthetic regression cases cover crossing edges, a vertex touching a nonadjacent edge, and valid concave geometry. Browser coverage checks the specific error and exports the unchanged source with the user's edits after failure. No retries, extra provider requests, or automatic geometry repair are introduced.
- Observed the new adapter/API regressions fail before implementation and pass afterward. Replaying the private response locally now produces `invalid_geometry`, with no additional cloud call. Verification: 62 unit/integration tests, strict typechecks, production build, and nine browser scenarios pass. The existing 3D bundle-size warning remains.

## Overlapping room review

- The owner's OpenRouter screenshot showed a large polygon covering a smaller room and an uncovered corridor. Existing schema validation checked each polygon independently, so valid individual shapes could still overlap. Correct room coverage and printed metadata were not established by schema success.
- Added `findRoomOverlaps` in the domain package using `polygon-clipping` 0.15.7. It checks interior intersection area, including containment and identical polygons; shared walls/corners and concave cutouts are allowed. Bounding-box rejection reduces unnecessary clipping, and roundoff-sized slivers relative to the smaller room are ignored. No source geometry or metadata is modified.
- The web editor shows localized overlap counts and numbered room pairs. The check is local and updates on recognized/imported documents and manual edits. It is a warning, not a new schema restriction or a 3D readiness gate. Up to five pairs are named to bound the notice.
- Expanded the shared provider instructions to inspect corridors/balconies and small spaces, trace interior wall faces, preserve concavity, avoid swallowed rooms, and copy printed areas carefully. No live request was made for this change; improved inference quality and automatic detection of omitted spaces remain unverified.
- Observed five geometry regressions fail before implementation. Verification: 68 unit/integration tests, strict typechecks, production build, and ten browser scenarios pass. The browser regression shows a containment warning, switches language, deletes the overlapping room, checks that the warning clears, and sends no recognition request. The existing 3D chunk warning remains.
- During development, adding a React hook reset the agent's open editor state. The earlier ignored exported draft was available for recovery; the owner's latest six-room response was not saved locally and could not be recovered from a screenshot. Added an agent rule to export the active document before changes that can trigger hot updates or reloads. This is a workflow safeguard, not project autosave.
- Reimported the earlier saved draft in the live editor and visually verified its overlap warning. Independent code review found no blocking issue; its extreme 100-room/100-vertex containment benchmark took about 675 ms on this host. Geometry checks are memoized by the room list, so name/area edits can also repeat that work; low-power hardware performance remains unverified.

## OpenRouter new-prompt live comparison

- The owner explicitly requested another recognition of the existing plan using the expanded extraction instructions. Exported the active document to an ignored local checkpoint before testing. No frontend source or dependency changes were needed.
- One request through the current adapter used `dots-studio/dots-3-note-preview:free` with reasoning disabled. OpenRouter reported the same model ID and AtlasCloud provider, HTTP 200 and finish reason `stop`. This avoids the variable model choice of `openrouter/free`, although one run is not a controlled quality benchmark.
- The response was complete JSON and contained six spaces, including a previously omitted balcony. Its main polygon failed topology validation, so the adapter returned `invalid_geometry` and no new project was applied.
- Visual comparison and diagnostic interior samples found that the omitted corridor was still uncovered and the small room still lay within the raw main outline. A printed area was also misread. The more detailed main polygon introduced self-intersection rather than a usable wall trace; the new prompt did not resolve the two requested defects in this run.
- Kept the prior valid project intact. The raw response and clearly labelled diagnostic overlay remain local and ignored; no private image, coordinates, credentials, or exported project are committed. No retry, fallback, or automatic repair was performed.

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
