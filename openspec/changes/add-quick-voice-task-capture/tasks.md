## 1. Route And Capture Flow

- [x] 1.1 Add a dedicated `/quick-add` page for the compact voice capture experience.
- [x] 1.2 Extract or adapt the existing voice recording logic so quick capture can record audio and call the existing transcription route.
- [x] 1.3 Automatically create a new card with `plazo: Tareas` after a successful non-empty transcript.
- [x] 1.4 Reset the quick capture screen after success so the user can immediately record another task.

## 2. Small-Screen UX

- [x] 2.1 Design the `/quick-add` page with one primary recording control that fits very small touch screens.
- [x] 2.2 Add clear recording, transcribing, saving, success, and error states.
- [x] 2.3 Add a minimal navigation affordance back to the full home board.
- [x] 2.4 Ensure text, controls, and status messages do not overflow on a 4-inch cover-screen viewport.

## 3. Validation And Tests

- [x] 3.1 Add E2E coverage for creating a `Tareas` card from `/quick-add` using mocked microphone and transcription behavior.
- [x] 3.2 Add E2E coverage for at least one failure path where no task is created.
- [x] 3.3 Run lint, build, and the Playwright E2E suite.
