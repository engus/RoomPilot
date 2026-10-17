# RoomPilot: visual interpretation, openings, and 3D

## Intent and authorization

The owner requests that Codex visually interpret the existing private plan, compare its draft with OpenRouter, and show the apartment in 3D with doors/windows. The owner confirmed a 2.5 m ceiling and centimetres for printed linear dimensions. This extends the earlier MVP boundary that deferred openings. Implementation remains in the current checkout and follows the standing commit/push workflow.

## Product behavior

- Preserve the active editor export before code/dependency updates. Keep every private plan, tracing script, comparison, and screenshot under ignored local paths.
- Create a separate Codex visual draft from the owner's existing image without calling a paid/cloud recognition API. Trace actual wall recesses, retain the connected main space/corridor, read printed areas independently, and assign clearly described room names where none are printed. This is assisted visual tracing, not a new automated Codex endpoint or an architectural accuracy claim.
- Calibrate that draft against a visible printed length with centimetres converted to metres. Record the confirmed ceiling height. Compare overlap, corridor coverage, balcony, and area labels with the stored API response. Preserve uncertainties and differences between computed and printed areas.
- Windows, doors, and open passages are project objects attached to room edges. They are visible in 2D and produce actual gaps in 3D walls, with window frames/glass and a stylized door leaf. A single physical opening may reference both faces of a partition so neither face blocks the passage.
- Provide bilingual manual placement/removal and editing of opening width, height and window sill. Placement requires a calibrated image and a selected room; click an edge to place. Room recognition through OpenAI/Gemini/OpenRouter remains room-only for this increment and must not silently claim to recognize openings.
- Import version 1 projects without data loss. Export version 2 projects. Resetting scale or changing height continues to disable 3D until prerequisites are valid/confirmed. Invalid opening edits fail explicitly.

## Document and geometry

Project version 2 retains all prior fields and adds `openings: Opening[]` (maximum 200). Legacy version 1 documents migrate to version 2 with an empty opening list. Unsupported versions and unknown fields remain rejected.

`Opening` contains `id`, `kind` (`door`, `window`, `passage`), `heightM`, `sillHeightM`, and `spans` (one or two). A span contains `roomId`, `edgeIndex`, `start`, and `end`; endpoints are fractions of the directed room edge with `0 <= start < end <= 1`. Door/passage sill is zero. All heights are finite; openings must fit a known ceiling. IDs are unique, referenced room/edge exists, and two openings cannot overlap along the same room edge. Deleting a room removes openings referencing it. Moving vertices preserves edge-relative anchoring; this is not a constraint-based CAD editor.

The builder's choice is to retain the existing room-face wall representation rather than introduce a separate editable shared-wall graph. The same opening can cut both room faces; this avoids blocked duplicate skins while keeping the current floor editor compatible. Wall thickness remains a stylized preview value rather than a measurement inferred from the drawing.

Pure domain helpers construct/resize openings, derive their segment endpoints, and split a wall into solid horizontal/vertical pieces around its apertures. Manual defaults are editable draft values: door width 0.8 m, window width 1.2 m, passage width 1.0 m, door/passage height 2.2 m, window height 1.5 m and sill 0.85 m, bounded to the available edge/ceiling. These defaults never set the apartment ceiling or scale. Matching a second face uses near-parallel edges and at most 0.6 m normal separation; choose the nearest compatible edge and validate the resulting document.

## Technical boundaries

Use existing TypeScript, React, SVG, Three.js/R3F, Zod and pnpm. No Drei, CSG engine, model SDK, cloud fallback, HA command, new persistence service, or native wrapper. Documentation and commits are English; interface English/Russian. No new credential is needed. Keep source geometry, openings, and future HA bindings separate.

## Verification

Regression tests cover legacy migration, bad references, overlapping spans, invalid heights, cleanup on deletion, placement near an edge end, mirrored partition faces, and exact wall-piece dimensions around doors/windows. Browser checks exercise placement, editing, removal, export/import, scale reset, ceiling confirmation, and WebGL rendering with openings. Inspect both 2D and 3D screenshots of the private draft. Run unit/integration tests, strict typechecks, build, and browser acceptance; commit/push coherent checkpoints after verification and keep the app open on the resulting draft.
