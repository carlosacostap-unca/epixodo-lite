## ADDED Requirements

### Requirement: Dedicated quick voice capture route
The system SHALL provide a dedicated quick voice capture route for creating new `Tareas` cards from spoken input.

#### Scenario: User opens quick capture route
- **WHEN** the user navigates to `/quick-add`
- **THEN** the system displays a compact voice capture screen instead of the full project board

#### Scenario: User needs access to the full app
- **WHEN** the user is on `/quick-add`
- **THEN** the system provides a minimal way to navigate back to the full home board

### Requirement: Small-screen first interface
The quick voice capture screen SHALL prioritize a single primary recording action that is usable on very small touch screens.

#### Scenario: Quick capture is idle
- **WHEN** no recording or processing is active
- **THEN** the system displays one prominent control to start recording a task

#### Scenario: User records a task
- **WHEN** the user starts recording
- **THEN** the system displays a clear recording state and a control to stop recording

### Requirement: Automatic transcription and task creation
The system SHALL transcribe recorded audio with OpenAI and automatically create a new card in the `Tareas` section when transcription succeeds.

#### Scenario: Recording is successfully transcribed
- **WHEN** the user stops recording and OpenAI returns a non-empty transcript
- **THEN** the system creates a new card using the transcript as the title and `Tareas` as the section

#### Scenario: Task is created
- **WHEN** the quick capture flow creates the task
- **THEN** the system displays a short success confirmation and returns to a state where the user can record another task

### Requirement: Failure handling
The quick voice capture screen SHALL avoid creating tasks when recording, transcription, or saving fails.

#### Scenario: Microphone access fails
- **WHEN** the browser denies or cannot provide microphone access
- **THEN** the system displays a concise error and does not create a task

#### Scenario: Transcription fails
- **WHEN** OpenAI cannot transcribe the recorded audio
- **THEN** the system displays a concise error and does not create a task

#### Scenario: Saving fails
- **WHEN** the transcript is available but task creation fails
- **THEN** the system displays a concise error and does not report success
