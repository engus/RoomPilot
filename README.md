# RoomPilot

A 3D home dashboard for Home Assistant, with a visual floor-plan editor and optional AI-assisted setup.

**Current milestone:** local floor-plan import and review. Home Assistant device control, furnishing from interior photographs, and home-server packaging are planned. HA control is not implemented yet. The project is intended to be free and open source; its license has not been selected by the owner yet.

## Milestone 1
- Import a PNG/JPEG floor plan, including a photograph of a paper plan.
- Recognize room outlines, names, printed areas, and explicitly labelled ceiling height through OpenAI, Google Gemini, or OpenRouter. Select the destination before sending an image.
- Review overlays on the original image; edit room names, reported areas, and vertices; draw and delete rooms manually.
- Calibrate scale using two points and one known distance. Keep printed areas separate from geometrically calculated areas.
- Confirm ceiling height, preview in 2D/3D, and export/import a versioned JSON project.
- Use an explicitly labelled demo or work manually without an API key.

AI results are drafts and require review. Ordinary interior photographs cannot reconstruct a floor plan in this milestone. Openings, furniture, shared-wall topology, and accurate architectural reconstruction are deferred. The current 3D view shows simplified room volumes.

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

Reference: [House Control](https://github.com/0xProbabillity/house-control). No source code from the reference has been copied into this version.
