## ADDED Requirements

### Requirement: Voice tasks are analyzed before creation
The system SHALL analyze transcribed voice text with OpenAI before creating a task from either voice capture entry point.

#### Scenario: Quick capture creates a voice task
- **WHEN** the user records a task through `/quick-add` and transcription succeeds
- **THEN** the system analyzes the transcript before creating the task

#### Scenario: Home capture creates a voice task
- **WHEN** the user records or enters voice-derived text through the home voice capture flow and saves it
- **THEN** the system analyzes the text before creating the task

### Requirement: Task title is refined
The system SHALL create the task using a concise, cleaned-up task title produced from the transcribed text.

#### Scenario: Transcript includes filler words
- **WHEN** the transcript contains filler words, hesitations, or extra phrasing
- **THEN** the created task title uses a refined action-oriented title instead of the raw transcript

### Requirement: High-confidence project assignment
The system SHALL assign a voice-created task to an existing project only when AI analysis identifies a high-confidence match.

#### Scenario: Project match is high confidence
- **WHEN** AI analysis returns an existing project id with high confidence
- **THEN** the system creates the task assigned to that project

#### Scenario: Project match is medium confidence
- **WHEN** AI analysis returns an existing project id with medium confidence
- **THEN** the system creates the task as unassigned

#### Scenario: Project match is low confidence
- **WHEN** AI analysis returns no project or a low-confidence project match
- **THEN** the system creates the task as unassigned

### Requirement: Unassigned task inbox
The system SHALL provide a way to view tasks that are not assigned to a project and assign them later.

#### Scenario: Task has no project assignment
- **WHEN** a voice-created task is unassigned
- **THEN** the system displays it in an unassigned tasks area

#### Scenario: User assigns an unassigned task
- **WHEN** the user selects a project for an unassigned task
- **THEN** the system updates the task so it belongs to the selected project

### Requirement: AI routing failures do not lose captured work
The system SHALL still create an unassigned task when transcription succeeds but AI project routing fails.

#### Scenario: OpenAI routing request fails
- **WHEN** transcription succeeds but the AI routing request fails
- **THEN** the system creates an unassigned task using the best available cleaned title or transcript

#### Scenario: AI returns invalid structured output
- **WHEN** the AI response cannot be parsed or does not match the expected schema
- **THEN** the system creates an unassigned task using the best available cleaned title or transcript
