## Why

The current home screen is useful for managing the full board, but it is too dense for very small cover screens such as the external display on a Motorola Razr Fold. Users need a low-friction way to capture a spoken task quickly, without navigating the full board or manually confirming every step.

## What Changes

- Add a quick voice capture experience optimized for very small screens.
- Provide a single prominent recording control that can record a spoken task, transcribe it with OpenAI, and create a new card in the existing `Tareas` section.
- Make the quick capture flow auto-save by default after successful transcription.
- Show concise progress and result states for recording, transcribing, saving, success, and failure.
- Keep the existing full home board experience available for normal screens and regular project management workflows.

## Capabilities

### New Capabilities
- `quick-voice-task-capture`: Covers the compact voice-first task capture flow for small screens and optional direct access.

### Modified Capabilities
- None.

## Impact

- Affected UI: home entry point or a dedicated quick-capture route, plus responsive behavior for very small screens.
- Affected API: existing voice transcription route may be reused; task creation continues to use the existing project/card creation flow with `plazo: Tareas`.
- Affected storage: new quick-captured items are stored as existing project cards in the `Tareas` board section.
- External dependency: OpenAI Audio Transcriptions API remains required for voice-to-text outside E2E tests.
