# RoomPilot

RoomPilot is a free application for creating an interactive 3D apartment map and controlling Home Assistant devices. The owner selected the name RoomPilot and created https://github.com/engus/RoomPilot. The intended distribution is open source; the owner has not selected a license yet.

## Product

Users upload a floor plan, review room outlines and names, inspect printed and computed areas, and supply missing scale and ceiling height. The application builds a simplified 3D model. A later milestone will let users place HA entities on the model and control their devices directly.

Priorities are an approachable setup process, a stylized lightweight scene, browser access across operating systems, local operation, and optional AI assistance. Reference: https://github.com/0xProbabillity/house-control. No reference implementation code has been copied.

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

Interior-photo reconstruction, furniture, doors/windows, HA control, multiple floors, native/PWA packaging, and architectural accuracy are outside this first iteration.

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

- Server-side project library, SQLite, and backups.
- Shared walls, openings, and a more complete geometry editor.
- HA authentication, live entity state, and object-to-entity placement.
- Furnishing a selected room from photos and interchangeable AI providers.
- Docker arm64/x64, HA app / Ingress, and PWA delivery.

## Git workflow

The owner has authorized a standing workflow: after each meaningful completed change, run the relevant checks, commit the coherent change, and push to the configured upstream. This includes documentation and agent-rule updates. Review staged files for secrets and unrelated changes, verify the remote commit after each push, and report authentication or verification blockers explicitly. This authorization does not automatically include deployments, releases, or pull-request merges.

## Specification and implementation

Acceptance criteria and limitations: `docs/superpowers/specs/2026-10-17-plan-import-design.md`.
Implementation plan: `docs/superpowers/plans/2026-10-17-plan-import.md`.
