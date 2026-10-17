# Selectable recognition providers

The owner requested Gemini alongside OpenAI and reported an OpenRouter key. Extend the existing recognition workflow to all three providers without changing the project document format or transmitting an image before the recognition action.

## Implementation

1. Add failing adapter and API tests for provider-specific credentials, request/response formats, explicit routing, invalid selections, missing configuration, bounded responses, cancellation, and safe billing/authentication errors.
2. Keep the existing OpenAI configuration compatible. Add `GEMINI_API_KEY` / `GEMINI_MODEL`, `OPENROUTER_API_KEY` / `OPENROUTER_MODEL`, and optional `AI_PROVIDER` (default `openai`). Models remain server configured. Reuse the existing schema and geometry validation. Use fixed official endpoints, bounded response bodies, no retries, and no fallback between services.
3. Expose only provider IDs, model IDs, and configuration presence through health metadata. Accept an allowlisted provider query parameter on recognition; do not allow browser-supplied keys, model IDs, or endpoint URLs. Preserve multipart validation and the global concurrency limit.
4. Add a bilingual provider selector, selected model/configuration status, explicit destination disclosure, and localized errors. Keep selection in component state and disable changes during recognition. Mark configuration presence as distinct from account access or available quota.
5. Document setup and privacy differences in English. Add missing local `.env` entries without reading credentials into output or overwriting existing values.
6. Run unit/integration tests, typecheck, build, and browser tests with all network recognition mocked. Review staged changes, commit, push, and verify the remote SHA. Restart the local API and leave the UI ready for the owner's keys.

## Decisions

- Implement in the current checkout; this is a contained extension of the approved MVP architecture.
- Use native fetch adapters rather than introducing SDK dependencies.
- Live contract verification found two Gemini specifics: `responseFormat.text.mimeType` requires the REST enum `APPLICATION_JSON`, and this nested room/vertex schema is rejected when it includes array bounds. The Gemini request omits those bounds; runtime `RecognitionSchema` still enforces every room/vertex limit and geometry constraint.
- Gemini uses its documented Generate Content endpoint with structured JSON. OpenRouter uses Chat Completions, embedded image input, and required structured-output parameters.
- Document `gemini-3.8-flash` and `openrouter/free` as setup examples verified against current provider documentation. The latter deliberately delegates model selection to OpenRouter, so reproducible comparisons require selecting a specific compatible model instead.
- No cloud recognition test on the owner's private plan until their chosen provider's key is configured and they explicitly request that test. Automated tests do not spend credits.

## Review focus

- Selecting Gemini/OpenRouter must never use the OpenAI key or endpoint.
- Unknown/unconfigured selections must fail before image processing or provider credit use.
- Refusals, truncated output, malformed JSON, oversized bodies, and invalid polygons must never become a successful project.
- Health/error responses must not include secrets or raw upstream diagnostics.
- Changing providers must preserve current geometry and edits; recognition still applies only to the document revision that started it.

## Sources

- https://ai.google.dev/gemini-api/docs/generate-content/structured-output
- https://ai.google.dev/api/generate-content
- https://openrouter.ai/docs/guides/features/structured-outputs
- https://openrouter.ai/blog/tutorials/send-image-to-llm/
