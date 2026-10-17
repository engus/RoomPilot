# RoomPilot

RoomPilot is a free application for creating an interactive 3D apartment map and controlling Home Assistant devices. The owner selected the name RoomPilot and created https://github.com/engus/RoomPilot. The intended distribution is open source; the owner has not selected a license yet.

## Current apartment-first milestone

The owner redirected work from a general apartment editor to a detailed, recognizable dollhouse of their own home. Start with the existing kitchen/living/corridor shell, add furniture, fixtures, colors and characteristic details from owner-supplied photographs, then connect real Home Assistant entities. After that, document how another user can repeat the approach. Keep the existing editor as supporting tooling; further editor expansion is not the current priority. Assisted modeling from photos is distinct from unattended interior-photo reconstruction.

Outdoor ambience now supports manual Day/Night and optional Auto sunlight. The local server computes the current sun position from private configuration and an explicit plan orientation. The user confirmed the balcony-facing top of their current plan is east; exact location/address are private runtime data and must not enter this document or Git. Weather, neighboring-building shadows and actual indoor lighting state require later data/integration.

## Existing floor-plan workflow

Users upload a floor plan, review room outlines and names, inspect printed and computed areas, and supply missing scale and ceiling height. The application builds a simplified 3D model. A later milestone will let users place HA entities on the model and control their devices directly.

Priorities are an approachable setup process, a stylized lightweight scene, browser access across operating systems, local operation, and optional AI assistance. Reference: https://github.com/0xProbabillity/house-control. No reference implementation code has been copied.

The owner clarified the visual direction: a recognizable interactive dollhouse, with solid joined opaque walls and no hollow gaps between nearby room faces. Architectural fidelity is secondary. Keep accurate source metadata separate from display simplification; the derived preview never rewrites room geometry or measured areas. The scene has a shallow base, full-depth door/window apertures and selectable floors/walls/zones. Presentation widths are conventions, not recognized construction measurements.

Documentation is written in English. The interface supports English and Russian; communication with the owner is in Russian. Language defaults to the browser preference, with English fallback. Light, dark, and system themes are selectable and persisted independently of project data.

## First MVP

1. Upload a PNG/JPEG floor plan, including a photograph of a paper plan.
2. Use a multimodal API to propose room outlines, names, printed areas, and explicitly labelled ceiling height.
3. Review the overlay against the original image; edit names, reported areas, and room vertices; draw and delete rooms manually.
4. Preserve printed area separately from geometrically calculated area. Computed area remains unknown until calibrated.
5. Establish scale with two selected points and a known real-world length in metres.
6. Request ceiling height when absent. A detected value also requires user confirmation and remains editable.
7. Offer 2D and simplified 3D previews, plus versioned JSON project export/import. Physical scale and confirmed ceiling height are prerequisites for 3D.
8. Report missing credentials or provider failure explicitly. Demo mode is a separate, labelled action.
9. Add door, window and passage objects on room edges, edit their dimensions, and preview actual wall apertures. Version 1/2/3 imports migrate to version 4; new exports preserve openings, zones and optional apartment context.
10. Divide a physical room into named wall-free zones; edit their polygons, inspect calibrated areas and select them in 2D/3D. Preserve physical room walls and door/window attachments.
11. Collect optional habitable-room counts, approximate area with balcony inclusion, bathroom count/layout and ancillary-space counts before recognition. Treat them as hints, independently of physical polygons and calibration. Preserve answers in full and openings-only recognition and project exports.

Unattended interior-photo reconstruction, multiple floors, native/PWA packaging, and architectural accuracy are outside the first iteration. Furniture from owner photos and HA control are now the next apartment-first milestone described above. The owner previously authorized openings: these now have manual placement and 2D/3D rendering. OpenRouter now recognizes doors and windows alongside rooms, or adds them to an existing plan without replacing its geometry. Other providers remain room-only.

The public demo uses the owner-authorized assisted apartment geometry, redrawn in code, with their confirmed room names: balcony, parents’ bedroom, children’s bedroom, combined bathroom/WC, storage, and the shared kitchen/living/corridor space. The three functions in the shared space are separate zones. Its apartment brief records three habitable rooms and approximately 58 m² excluding the balcony, one combined bathroom/WC, one kitchen, one balcony and one storage room. Printed areas sum to 58.29 m² excluding the balcony and 60.67 m² including it; approximate context does not change these values. The original floor-plan pixels and annotated image remain private. Demo calibration and a 2.5 m ceiling are supplied for immediate 3D.

## Architecture

- pnpm 11 monorepo: `apps/web`, `apps/server`, `packages/domain`.
- Web: TypeScript, React, Vite; SVG for the small 2D editor; Three.js / React Three Fiber for 3D.
- Server: Node.js, Fastify, multipart uploads, Sharp, and thin fetch adapters for OpenAI Responses, Gemini Generate Content, and OpenRouter Chat Completions. Keys and model selection are server configured; the browser chooses only an allowlisted provider.
- Domain: Zod schemas and pure geometry/calibration functions.
- Projects currently export to JSON. A server-side project library and SQLite belong to a later milestone; this workflow does not require a database.
- SVG replaces the previously proposed Konva for this small editor: standard DOM interactions and one fewer canvas engine. Revisit when the editor becomes more complex.
- Geometry, future entity bindings, and live HA state remain distinct concerns.

## Deployment and Raspberry Pi

The server neither renders 3D nor runs a model: browsers render the scene and the configured provider performs inference. Linux arm64/x64 with Node.js 22+ is the target, including suitable Raspberry Pi hardware.

HA OS packaging will use an HA app with Ingress; HA Container will use a separate container. Hardware compatibility and memory usage are not measured yet. Build frontend assets in CI or on a development computer and distribute completed assets to the Pi.

The current development server binds only to loopback. Production packaging, network authentication, and public access require a separate milestone.

## Cost and privacy

The manual editor and normal device control should not depend on an AI subscription. Users may supply their own API key and pay their provider directly. A local vision model can be supported later on suitable separate hardware.

A floor-plan image is transmitted only on the explicit recognition action. The server does not retain uploaded images on disk. Exported JSON includes the private source image. There is currently no autosave, and users must export their work before leaving.

Recognition supports an explicit OpenAI / Gemini / OpenRouter selection with no cross-service fallback. Provider configuration presence is distinct from account access and quota. Gemini free-tier content may be used for product improvement; OpenRouter forwards content to its model provider. Configure keys separately in the ignored root `.env` file.

## Next milestones

- Furnish the owner's kitchen/living/corridor from photographs and bind real HA lighting/sensor entities; document repeatable scene-building and configuration steps.
- Server-side project library, SQLite, and backups.
- A full shared-wall graph, better opening detection quality, and a more complete geometry editor. The current preview unions nearby boundary strips into solid walls and links one aperture to up to two compatible faces; it is still a stylized presentation rather than a CAD wall graph.
- HA authentication, live entity state, and object-to-entity placement.
- Furnishing a selected room from photos and interchangeable AI providers.
- Docker arm64/x64, HA app / Ingress, and PWA delivery.

## Git workflow

The owner has authorized a standing workflow: after each meaningful completed change, run the relevant checks, commit the coherent change, and push to the configured upstream. This includes documentation and agent-rule updates. Review staged files for secrets and unrelated changes, verify the remote commit after each push, and report authentication or verification blockers explicitly. This authorization does not automatically include deployments, releases, or pull-request merges.

## Specification and implementation

Acceptance criteria and limitations: `docs/superpowers/specs/2026-10-17-plan-import-design.md`.
Implementation plan: `docs/superpowers/plans/2026-10-17-plan-import.md`.
