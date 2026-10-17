# Milestone 1 verification

Date: 2026-10-17. Environment: Windows, Node.js 24.19.0, pnpm 11.25.0.

## Verified locally

- Unit/integration suite: 37 passing tests across domain geometry, image upload/API behavior, provider response handling, editor imports, and appearance preferences.
- Strict TypeScript checks pass for all workspaces.
- Production frontend build passes. Server build currently performs typechecking; runtime uses `tsx`.
- Seven browser acceptance scenarios pass: labelled demo; project import, metadata confirmation and real WebGL canvas; export content and re-import; invalid import; language/theme persistence and system appearance changes; manual drawing/calibration without AI transmission; JPEG recognition request MIME; preserving edits made during an in-flight recognition request.
- 3D screenshot inspected after the browser run.
- Independent review performed. Four important findings were reproduced and fixed: small-coordinate polygon intersections, relative calibration validation, imported JPEG content type, and stale recognition overwriting edits.

No live provider request was made. API quality, model availability, Raspberry Pi/ARM deployment, HA integration, and production/public hosting are not verified.

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
