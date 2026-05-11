## ADDED Requirements

### Requirement: Focused Task Detail Surface
The system SHALL provide a focused task detail surface for viewing and editing task metadata instead of expanding long edit forms inline inside task lists.

#### Scenario: User opens task details
- **WHEN** a user selects a task from a list, Inbox, Today, or project detail view
- **THEN** the system opens a focused detail surface showing the task title, description, completion state, project assignment, realization time, due time, and plazo

#### Scenario: User closes task details
- **WHEN** a user closes the task detail surface
- **THEN** the system returns the user to the same list or workspace context

### Requirement: Task Metadata Editing
The system SHALL allow users to edit task title, description, completion state, project assignment, realization time, due time, and plazo from the task detail surface.

#### Scenario: User edits task metadata
- **WHEN** a user changes task metadata and saves
- **THEN** the system persists the updated fields to the task record and refreshes affected task lists

#### Scenario: User clears optional metadata
- **WHEN** a user clears optional task metadata such as description, project, realization time, due time, or plazo
- **THEN** the system stores the cleared value and displays the task without that metadata

### Requirement: Task Summary Cards
The system SHALL keep task rows or cards readable by showing summary information and avoiding large always-visible edit forms.

#### Scenario: Task has metadata
- **WHEN** a task has description, realization time, due time, or plazo
- **THEN** the system displays a compact summary suitable for scanning

#### Scenario: Task has no metadata
- **WHEN** a task only has a title and completion state
- **THEN** the system displays a compact row/card without empty metadata labels

### Requirement: Responsive Detail Behavior
The system SHALL adapt task detail editing to viewport size.

#### Scenario: Mobile user opens task details
- **WHEN** a task detail is opened on a phone-sized screen
- **THEN** the system displays the detail surface as a full-screen or near-full-screen modal optimized for touch

#### Scenario: Desktop user opens task details
- **WHEN** a task detail is opened on a desktop-sized screen
- **THEN** the system displays the detail surface as an inspector or modal that preserves broader workspace context
