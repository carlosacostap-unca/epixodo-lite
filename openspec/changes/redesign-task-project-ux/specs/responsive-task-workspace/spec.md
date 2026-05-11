## ADDED Requirements

### Requirement: Primary Workspace Navigation
The system SHALL provide primary navigation for Today, Inbox, and Projects so users can move between daily work, unassigned work, and project organization without relying on one long home screen.

#### Scenario: User navigates between workspace views
- **WHEN** a user opens the main workspace
- **THEN** the system presents navigation entries for Today, Inbox, and Projects

#### Scenario: User selects a workspace view
- **WHEN** a user selects a primary navigation entry
- **THEN** the system displays the corresponding view without requiring the user to scroll through unrelated sections first

### Requirement: Mobile Workspace Layout
The system SHALL use a compact mobile layout for small screens that prioritizes task capture, Today, Inbox, and project lists over the desktop project board.

#### Scenario: Mobile user opens the workspace
- **WHEN** the viewport is a phone-sized screen
- **THEN** the system presents a compact navigation pattern and list-based content instead of the full multi-column project board

#### Scenario: Mobile user browses projects
- **WHEN** a mobile user opens Projects
- **THEN** the system displays projects in a readable list or sectioned list suitable for vertical scrolling

### Requirement: Desktop Workspace Layout
The system SHALL use a large-screen workspace layout that supports efficient project and task work with persistent navigation and enough space for task details.

#### Scenario: Desktop user opens the workspace
- **WHEN** the viewport is a desktop-sized screen
- **THEN** the system displays persistent navigation and a primary work area suitable for dense task or project management

#### Scenario: Desktop user works with a selected task
- **WHEN** a desktop user opens a task detail
- **THEN** the system can display task details in a modal or inspector without losing the surrounding task or project context

### Requirement: Today View
The system SHALL provide a Today view that groups relevant tasks by urgency and schedule using existing task date fields.

#### Scenario: User reviews due tasks
- **WHEN** a user opens Today
- **THEN** the system shows overdue tasks and tasks due today in clearly labeled groups

#### Scenario: User reviews unscheduled tasks
- **WHEN** Today contains tasks without due or realization times
- **THEN** the system provides a clear way to access or surface unscheduled work without mixing it ambiguously with dated work

### Requirement: Inbox View
The system SHALL provide an Inbox view for tasks that are not assigned to a project or still need triage.

#### Scenario: User reviews unassigned tasks
- **WHEN** a user opens Inbox
- **THEN** the system lists tasks whose `project` relation is empty

#### Scenario: User assigns an inbox task
- **WHEN** a user assigns an Inbox task to a project
- **THEN** the system updates the task relation and removes it from the unassigned Inbox list

### Requirement: Quick Capture Mode
The system SHALL preserve a dedicated quick voice capture mode optimized for very small screens.

#### Scenario: User opens quick capture on a cover screen
- **WHEN** a user opens `/quick-add` on a very small viewport
- **THEN** the system presents one dominant recording action with concise status and result text

#### Scenario: Quick capture saves a task
- **WHEN** voice capture succeeds
- **THEN** the system creates a task through the existing AI routing flow and shows whether it was assigned or left unassigned
