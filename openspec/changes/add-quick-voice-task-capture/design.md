## Context

The app already supports voice task capture on the home screen: the browser records audio, a Next.js route handler sends it to OpenAI for transcription, and the resulting text can be saved as a card in the `Tareas` section. That flow still assumes a normal phone or desktop screen where the user can review text and press a separate save button.

The new use case is a very small cover screen, especially the external display on a Motorola Razr Fold. On that screen, the full board is visually noisy and the ideal interaction is closer to "open, record, done."

## Goals / Non-Goals

**Goals:**
- Provide a dedicated quick capture route at `/quick-add`.
- Optimize the first viewport for very small screens with one primary recording control.
- Automatically create a `Tareas` card after a successful transcription.
- Keep feedback legible and minimal: idle, recording, transcribing, saving, success, and error.
- Preserve the existing home board and current voice capture flow for normal use.

**Non-Goals:**
- Replace the full home board.
- Add authentication, account switching, or multi-user behavior.
- Add recurring tasks, reminders, due dates, or prioritization.
- Add speaker diarization.
- Require users to manually review every transcript before saving in quick mode.

## Decisions

### Dedicated Route

Use `/quick-add` instead of only relying on viewport detection.

Rationale:
- The user can bookmark or install this route as a direct shortcut on the phone.
- The same route can be opened intentionally on any device for quick capture.
- The main home screen remains stable and predictable.

Alternative considered: Automatically replace the home screen on very small viewports. This is convenient but riskier because users may lose access to the board when they actually wanted it.

### Auto-Save By Default

After recording stops and OpenAI returns a non-empty transcript, the system automatically creates a card in `Tareas`.

Rationale:
- The small-screen goal is capture speed, not careful editing.
- The existing full UI remains available for later cleanup or editing.

Alternative considered: Show the transcript with a required confirmation button. This reduces misheard-task risk, but adds friction and weakens the cover-screen use case.

### Existing Data Shape

Quick-captured tasks remain regular project cards with `plazo: Tareas`.

Rationale:
- This preserves the data model already used by the `Tareas` section.
- No migration is needed.
- The created item appears everywhere existing task cards appear.

### Reuse OpenAI Transcription Route

Reuse the existing server-side transcription route and current `OPENAI_API_KEY` configuration.

Rationale:
- API keys stay server-side.
- E2E tests can continue using mocked fixture behavior.
- The quick route does not need a separate OpenAI integration.

### Minimal Recovery Actions

On success, show a short confirmation and reset to allow another recording. On failure, show a concise error and a retry button.

Rationale:
- The interface must remain usable on a 4-inch screen.
- Users need to know whether the task was actually captured.

## Risks / Trade-offs

- Misheard transcription creates the wrong task -> Mitigation: keep created cards editable in the regular board; optionally add a future undo affordance if needed.
- Accidental recordings create unwanted tasks -> Mitigation: require an explicit tap to start and an explicit stop before processing.
- Browser microphone support varies -> Mitigation: show a clear unsupported/per permission error and keep the normal app available.
- Network or OpenAI failures block capture -> Mitigation: surface retry state; do not create a card unless transcription succeeds.
- Route discoverability may be low -> Mitigation: optionally add a small link or affordance from the home screen after implementation.
