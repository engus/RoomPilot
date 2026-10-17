# RoomPilot

A 3D home dashboard for Home Assistant, with a visual floor-plan editor and optional AI-assisted setup.

**Current focus:** a recognizable interactive dollhouse of the owner's apartment, starting with the kitchen, living area and corridor. The floor-plan editor remains supporting tooling. Furniture and fixtures from owner photographs and Home Assistant device control are next; HA control is not implemented yet. The project is intended to be free and open source; its license has not been selected by the owner yet.

## Milestone 1
- Import a PNG/JPEG floor plan, including a photograph of a paper plan.
- Optionally describe the apartment before recognition: habitable rooms, approximate area and balcony inclusion, bathroom count/layout, kitchens, balconies and storage rooms.
- Recognize room outlines, names, printed areas, and explicitly labelled ceiling height through OpenAI, Google Gemini, or OpenRouter. Select the destination before sending an image.
- Review overlays on the original image; edit room names, reported areas, and vertices; draw and delete rooms manually.
- Calibrate scale using two points and one known distance. Keep printed areas separate from geometrically calculated areas.
- Confirm ceiling height, preview in 2D/3D, and export/import a versioned JSON project.
- Place doors, windows and open passages on selected room walls; edit widths/heights and window sill heights, and preview actual wall apertures in 3D.
- Use an explicitly labelled demo or work manually without an API key.

AI results are drafts and require review. Ordinary interior photographs cannot reconstruct a floor plan in this milestone. OpenRouter also recognizes doors and windows; OpenAI and Gemini currently return rooms only. All openings remain manually editable. Furniture, a full shared-wall graph, and accurate architectural reconstruction are deferred. The 3D view is an interactive dollhouse with opaque joined walls, a shallow base and actual apertures.

## Doors, windows and project versions

After setting scale and ceiling height, select a room, choose **Add door**, **Add window** or **Add passage**, and click its wall. The view returns to the plan for placement. Choose an existing opening on the plan or in its selector to edit dimensions or delete it. New manual dimensions are editable defaults, not measurements inferred from the source.

A nearby opposite wall face can be linked to the same opening so both faces are cut in 3D. Resizing keeps that connection and fails if the existing second face no longer fits. The preview merges nearby wall strips into closed opaque volumes and cuts apertures through their full depth. Door/window frames align to that display volume. Door leaves are shown partly open with an illustrative inward swing; hinge side and actual opening direction are not encoded. No device command is sent.

The model favors a recognizable toy-house appearance over architectural precision. Its wall widths are display conventions (0.24 m outward padding and a 0.04 m inner lip), not inferred measurements. Parallel face gaps up to 0.48 m join; larger separations remain empty. Square corner caps seal joints, including angled outlines. Source room/zone polygons, printed/computed areas, calibration and exported documents are unchanged by viewing in 3D. Floors, walls and zones remain selectable. Very detailed plans exceeding the preview geometry budget show a specific message and remain editable/exportable in 2D; no geometry is silently discarded.

Exports use project version 4 with `openings`, `zones` and nullable `apartmentBrief`. Version 1 imports get empty openings/zones; version 2 imports preserve openings and get empty zones; versions 1–3 get unknown apartment context. Unsupported versions and invalid references are rejected. Clearing scale or ceiling preserves the existing openings and disables 3D. Deleting a room removes its attached openings. Full recognition replaces room geometry and produces a new draft (including detected openings when using OpenRouter), so export existing work before recognizing the full plan again.

With **OpenRouter** selected, **Recognize windows and doors** sends the image and fixed normalized room outlines to the configured model. It preserves room IDs, calibration, ceiling confirmation and existing openings, appending only valid non-conflicting suggestions. Repeated detection skips duplicate/conflicting suggestions. The model marks aperture endpoints; RoomPilot snaps them to compatible wall faces and cuts those faces in 3D. Review positions against the source: near-wall snapping does not guarantee correct detection.

Readable opening heights and sill heights are copied in metres. Unreadable values use explicitly disclosed editable preview defaults: doors up to 2.2 m, windows up to 1.5 m with a suggested 0.85 m sill, adjusted only for unknown values to fit a known ceiling. Width follows the detected image segment; metric width remains unknown without calibration. Invalid candidates are skipped with warnings, while provider failures leave the editor unchanged. 3D still requires scale and confirmed ceiling height. Model quality and free-tier availability vary; automatic retry and provider fallback are not used.

## Demo and zones

**Open demo** loads the owner-authorized assisted apartment interpretation with six physical rooms, six doors, four original windows, three additional balcony glazing sections and a confirmed 2.5 m ceiling. The balcony's three exposed sides use full-height glass and frames; the apartment-facing wall retains its existing window and door. Full-height glazing is a stylized representation of the owner's clarification, not a measured frame specification. All sections use ordinary editable window objects and round-trip in project exports. Its 5.88 m calibration is carried over from the source measurement, independently of reported areas. The background illustration is redrawn in code; uploaded images and handwritten markings are not bundled. Demo names are created in the selected EN/RU language and stay editable. Reopening the demo resets its edits; export first to keep them. No provider call is needed.

The main open space contains **Living area**, **Kitchen** and **Corridor** zones. Rooms own physical walls; zones mark floor regions and do not introduce walls. Their divisions are illustrative and editable. Room reported areas and computed zone areas stay separate. Zone areas remain unknown until calibrated.

Select a room and choose **Add zone**, draw its polygon, then **Finish zone**. Choose a zone from the nested room list, 2D plan or 3D floor to rename/delete it; drag its vertices in 2D to adjust its boundary. Sibling zones can share edges but their interiors cannot overlap, and the whole polygon must stay inside its parent, including concave recesses. Invalid zone drags and room edits are rejected while keeping the previous geometry. Deleting a room also removes its zones and openings. Zones round-trip in version 4 exports. Full AI recognition creates a new unzoned draft; openings-only detection preserves zones.

## Apartment context

The optional **About the apartment** form distinguishes habitable rooms (bedrooms and living areas) from the physical **Spaces** list. A three-room apartment can also contain a kitchen, bathroom, corridor, balcony and storage; open living/kitchen/corridor functions can share one physical room with several zones. Bathroom count means sanitary sets: one combined bathroom/WC counts as one, as does one separate bathroom and WC pair. The layout selector explains how those facilities are arranged.

Blank numbers mean unknown; zero is an explicit count. Approximate area and balcony inclusion are context only and never establish scale or reshape geometry. Answers are sent with the image only on explicit recognition, to the selected provider; openings-only detection also receives and preserves them. Editing the form makes no provider call. Invalid answers must be corrected or cleared before recognition/export, and edits during recognition prevent the old result from replacing newer work.

The demo contains three habitable rooms, approximately 58 m² excluding its balcony, one combined bathroom/WC, one kitchen, one balcony and one storage room. Printed physical areas remain unchanged: 58.29 m² without the balcony and 60.67 m² with it. The questionnaire supplies recognition hints; it does not guarantee complete or accurate extraction.

## Outdoor day, night and sunlight

The 3D viewer has **Day**, **Night** and **Auto** controls, independent of the interface's Light/Dark/System appearance. Manual modes change the sky, ground and scene lighting locally without sending a request on each toggle. The choice persists as a browser preference, outside the project export. Room/zone selection, camera orbit and source geometry stay intact. Night uses cool artistic fill so the model remains readable; indoor fixtures are not automatically switched on and HA commands are not sent.

For **Auto**, configure these private values in the ignored root `.env`, then restart the server:

```dotenv
SUN_LATITUDE=your-latitude
SUN_LONGITUDE=your-longitude
PLAN_UP_BEARING_DEG=your-plan-up-bearing
```

All three values are required. Latitude is −90..90, longitude −180..180; bearing is 0..<360 degrees clockwise from north (0 means the top of the plan faces north, 90 east). This installation-level orientation applies to all viewed projects; it is not per-project metadata. Never publish the real values or a home address. No browser geolocation or provider key is needed.

The server calculates solar elevation and direction locally using [SunCalc 2.1.1](https://github.com/mourner/suncalc). Its API returns only calculated lighting data and a timestamp, with no raw location/bearing. The viewer checks availability when opened and refreshes once a minute in Auto, with a five-second request deadline. Missing, invalid or failed data shows **Auto unavailable · showing Day**; manual modes remain usable. Auto distinguishes daylight, civil twilight and night using the current UTC instant, so the server's display timezone does not change the sun calculation. Weather, neighboring structures, true moon position and architectural daylight simulation are outside this preview.

The interface supports English and Russian, defaulting to the browser language (Russian when applicable, English otherwise). Choose Light, Dark, or System appearance. Only these preferences are stored locally; project autosave is not implemented. Project documentation is maintained in English.

## Requirements and development

Use Node.js 22+ and pnpm 11. Dependencies are locked in `pnpm-lock.yaml`.

```sh
pnpm install
pnpm dev
```

Open [RoomPilot](http://127.0.0.1:5173). The API listens on `127.0.0.1:3001`; Vite proxies `/api`.

For recognition, copy `.env.example` to `.env` in the repository root and configure:

```dotenv
OPENAI_API_KEY=your-own-key
OPENAI_MODEL=your-vision-model-id
GEMINI_API_KEY=your-google-ai-studio-key
GEMINI_MODEL=gemini-3.8-flash
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=openrouter/free
AI_PROVIDER=openai
PORT=3001
```

Configure only the providers you want to use; leave other keys empty. Keys are independent and are never sent to another provider or to the browser. Do not use `VITE_` variables for credentials.

- OpenAI: create a project key at https://platform.openai.com/api-keys and explicitly set an image-input / Structured Outputs model available to the account. Requests use the Responses API.
- Gemini: create a key in https://aistudio.google.com/apikey and set `GEMINI_API_KEY`. The example model `gemini-3.8-flash` supports image input and structured JSON; free-tier availability and quotas depend on the project. Requests use Generate Content.
- OpenRouter: create a key at https://openrouter.ai/settings/keys and set `OPENROUTER_API_KEY`. `openrouter/free` is an example free router that selects a compatible model; its selection and availability may vary. To compare recognition quality consistently, configure a specific model supporting images and JSON Schema. Requests require structured-output support; incompatible models/endpoints fail explicitly.

`AI_PROVIDER` controls the initial UI selection and defaults to `openai`. The selector displays all three providers and their server configuration status. A key and model being present does not establish working credentials, model access, or available balance. There are no automatic retries or fallback between services. The interface distinguishes exhausted balance, request limits, access errors, timeouts, and invalid drafts without displaying raw upstream diagnostics.

If OpenRouter returns "No endpoints found that can handle the requested parameters", the selected route has no available endpoint satisfying both image input and JSON Schema. This can also affect `openrouter/free`. Check the current catalog at https://openrouter.ai/models and set a specific compatible free vision model in `OPENROUTER_MODEL`, then restart the API and refresh the interface. During a local test, the catalog advertised `nvidia/nemotron-3.5-super-vl:free` with image and structured-output support; catalog support alone does not guarantee current capacity or recognition quality. Keep the `:free` suffix if you intend to use a free endpoint.

For OpenRouter models that support reasoning control, optional `OPENROUTER_REASONING=off` sends `reasoning.enabled=false` to reduce latency. Omit it or set `default` to keep the model default. Unsupported endpoints fail explicitly; this setting does not disable JSON or geometry validation. A live test with `dots-studio/dots-3-note-preview:free` and reasoning off returned a schema-valid but inaccurate draft; every outline and printed value still needs review.

Restart the API after changing `.env`, then refresh the browser to update configuration status. If you change `PORT`, update the proxy in `apps/web/vite.config.ts` as well. `RECOGNITION_TIMEOUT_MS` can be increased up to 120000 for slower models.

Gemini 3/4 requests use the supported `LOW` thinking level to keep interactive recognition latency bounded; earlier Gemini models do not receive this option. Gemini receives a schema without nested array bounds because the bounded version was rejected during live grammar compilation. Room counts, vertex counts, coordinates, topology, and all other limits are still enforced locally before a draft is returned to the browser.

Without a key, you can open the labelled demo, import a saved project, or upload an image and draw room outlines manually. Recognition reports unavailable configuration rather than substituting a simulated result.

## Privacy and saving

Recognition sends the image to the configured cloud provider only when explicitly requested. Provider API usage is billed separately from the application. Credentials remain on the server. The server does not persist uploaded images to disk.

The interface names the selected destination before transmission. Gemini's free tier may use submitted content to improve Google products; review https://ai.google.dev/gemini-api/terms before sending a private plan. OpenRouter forwards requests to the serving model provider, whose data policy also applies: https://openrouter.ai/privacy. A free API tier is limited and is not a guarantee of permanently free or unlimited service.

**There is no autosave yet.** Use the export action before closing the tab. The JSON includes the source floor-plan image and should be treated as private. Do not publish it in Git. The import action restores a saved project.

## Structure

```text
apps/
  web/                  React interface, SVG editor, browser-side 3D
  server/               Fastify, image validation, AI adapter
packages/
  domain/               Project schemas, geometry, areas, calibration
docs/superpowers/
  specs/                Product scope and acceptance criteria
  plans/                Implementation tasks
tests/e2e/              Browser acceptance scenarios
AGENTS.md               Instructions for coding agents
project.md             Product description and roadmap
```

## Verification

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

API tests inject a test-only recognition provider and do not spend API credits. Recognition quality must be evaluated separately with a configured key and real floor plans.

See [verification notes](docs/verification.md) for measured results and current limitations.

## Renaming the workspace

Application imports do not depend on the containing folder name. Windows pnpm workspace junctions can reference the old absolute path, so dependencies should be re-linked after moving the folder.

Close Codex, VS Code, and terminals using the workspace. From a separate PowerShell window, run `scripts/Rename-Workspace.ps1` using its full path. The script changes its working directory to the parent, refuses an existing destination, renames to `RoomPilot`, reinstalls locked dependencies with refreshed links, and reruns all checks. Use `-WhatIf` first to preview. If installation fails after the rename, continue from the new folder; the script never deletes the project.

## Raspberry Pi and Home Assistant

The server is designed to remain lightweight: client browsers render 3D and an external provider runs AI inference. Installing a local AI model on the device running HA is unnecessary.

Linux arm64/x64, including suitable Raspberry Pi hardware, is a deployment target. HA OS packaging will use an HA app (add-on) with Ingress; HA Container installations will use a separate container. ARM builds, Pi performance, and memory consumption have not been verified yet.

This milestone is a local development environment. The API binds to loopback; authentication, public hosting, and production containers are not included. `pnpm build` produces the frontend bundle and typechecks the server. The server currently runs using `tsx`; no standalone production server bundle is produced.

## Documentation

- [Project overview](project.md)
- [Agent instructions](AGENTS.md)
- [MVP specification](docs/superpowers/specs/2026-10-17-plan-import-design.md)
- [Implementation plan](docs/superpowers/plans/2026-10-17-plan-import.md)
- [Openings specification](docs/superpowers/specs/2026-10-17-openings-design.md)
- [Openings implementation plan](docs/superpowers/plans/2026-10-17-openings.md)

Reference: [House Control](https://github.com/0xProbabillity/house-control). No source code from the reference has been copied into this version.
