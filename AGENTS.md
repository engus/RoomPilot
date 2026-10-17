# RoomPilot — instructions for coding agents

## Start here
- Read `project.md`, then the relevant specification and plan in `docs/superpowers/`.
- Discuss user-facing work in Russian. Maintain all documentation in English. Code, identifiers, and commit messages use English. The application supports English and Russian with a user-selectable language.
- Use applicable installed Superpowers skills. A user's explicit authorization and preferences take precedence over skill defaults; do not invent additional approval gates.
- Keep implementation in the current checkout unless isolation is requested or needed to protect existing work. Never discard user changes.

## Project boundaries
- `apps/web`: React interface, image overlay editor, and browser-side Three.js rendering.
- `apps/server`: Fastify, bounded image uploads, AI provider calls, configuration; never expose provider credentials to the browser.
- `packages/domain`: versioned document schemas, geometry, area and scale calculations. No React, filesystem, network, or provider dependencies.
- `docs`: architecture, product scope, implementation plans, and operational limitations.
- Home Assistant is the future source of device state and control. Keep entity bindings separate from floor geometry. Do not implement independent vendor integrations.

## Working agreements
- Use TypeScript strict mode and pnpm workspaces. Node.js 22+; pnpm 11.
- Add focused failing tests before implementing geometry, validation, and server behavior. Verify the failure, implement, then verify passing tests.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm build` before claiming completion. Report precisely which checks ran and any limitations.
- Treat uploaded plans and AI responses as untrusted input. Validate size, actual image contents, coordinates, topology, and numeric bounds.
- AI creates a reviewable draft, never confirmed geometry or real device commands. No silent demo fallback on recognition failure.
- Coordinates are image pixels until scale is known; real dimensions use metres and areas square metres. Never present unscaled geometry as measured.
- Preserve reported area and computed area independently. Unknown values remain unknown. Ask for ceiling height when absent; never silently assign a real-world value.
- Keep private floor plans, uploads, `.env`, tokens, and runtime data out of Git. Do not log provider secrets or image payloads. The owner explicitly authorized distributing the derived apartment demo geometry and room labels on 2026-10-17; only that code-defined/redrawn demo is public, while original and annotated images, private exports and provider responses stay ignored.
- Before changing frontend code or dependencies while the owner's development editor is open, export its current document to an ignored local file. Hot updates can reset React state and dependency optimization can reload the page. Preserve the backup before reloading or replacing the active document; project autosave is not implemented.
- Keep modules focused. Do not add native wrappers, databases, background queues, authentication systems, or HA integrations before their milestone requires them.
- Support light, dark, and system appearance. Persist language/theme preferences separately from project data; preference persistence is not project autosave.
- After every meaningful completed change, run the checks appropriate to that change, create a focused Git commit, and push it to the current branch's configured upstream. The owner has explicitly authorized this ongoing commit-and-push workflow; do not ask for permission again for routine commits and pushes.
- Meaningful changes include completed features, fixes, refactors, configuration changes, and documentation or agent-rule updates. Commit coherent, reviewable changes rather than every intermediate edit. Do not publish broken or unverified code merely to create a checkpoint.
- Before committing, review the staged diff and exclude credentials, private plans, generated files, and unrelated user changes. Use clear English commit messages. After pushing, verify the remote branch points to the local commit and report the branch and short SHA.
- If checks, Git identity, authentication, or push permissions block publication, keep the work intact and report the exact blocker. Never invent an author identity, force-push, overwrite remote history, or silently claim a successful push.
- This standing authorization covers Git commits and pushes only. Publishing releases, deploying applications, and merging pull requests still require the relevant user authorization.

## Current milestone
See `docs/superpowers/specs/2026-10-17-plan-import-design.md` and the owner-authorized extension `docs/superpowers/specs/2026-10-17-openings-design.md`. The current milestone includes floor-plan import, review, calibration, ceiling height, 2D/3D preview, version 1/2 migration and version 3 export, manually editable doors/windows/passages, and named wall-free zones within rooms. Keep opening spans attached to valid room edges and remove their references when deleting a room. OpenRouter recognizes rooms and image-coordinate door/window segments, with a separate openings-only action preserving existing geometry and openings. Other providers remain room-only. Validate and snap AI segments deterministically; never treat model output as confirmed measurements. HA control, full CAD editing, and reconstruction from room photographs follow later.

Zones belong to a physical room, never create walls or opening targets, and must remain inside their parent without overlapping sibling interiors. Preserve zones during openings-only recognition; remove them when deleting their parent. See `docs/superpowers/specs/2026-10-17-demo-zones-design.md`.
