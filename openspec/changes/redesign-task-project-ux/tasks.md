## 1. Workspace Structure

- [ ] 1.1 Define the responsive workspace navigation model for Today, Inbox, and Projects.
- [ ] 1.2 Refactor the home route into a workspace shell that can render the primary views.
- [ ] 1.3 Add mobile-friendly navigation for small screens without exposing the full desktop board by default.
- [ ] 1.4 Add desktop persistent navigation and a primary content region suitable for split-view work.

## 2. Today And Inbox Views

- [ ] 2.1 Add task query helpers for overdue, due today, scheduled/upcoming, and unscheduled tasks.
- [ ] 2.2 Implement the Today view with grouped task sections using existing task date fields.
- [ ] 2.3 Implement the Inbox view using tasks whose `project` relation is empty.
- [ ] 2.4 Preserve quick project assignment from Inbox and refresh affected views after assignment.

## 3. Projects Experience

- [ ] 3.1 Implement a mobile Projects list or sectioned list that replaces the full board on phone-sized screens.
- [ ] 3.2 Preserve the desktop project board and existing drag-and-drop/touch move behavior where appropriate.
- [ ] 3.3 Review how the legacy `Tareas` project section is presented so it does not conflict with task Inbox.
- [ ] 3.4 Keep project search usable across mobile and desktop layouts.

## 4. Task Detail Editing

- [ ] 4.1 Create a focused task detail modal or inspector component.
- [ ] 4.2 Move task title, description, completion, project assignment, realization time, due time, and plazo editing into the task detail surface.
- [ ] 4.3 Replace always-visible inline task edit forms with compact task summary rows/cards.
- [ ] 4.4 Make the task detail surface full-screen or near-full-screen on mobile and inspector/modal style on desktop.

## 5. Quick Capture Mode

- [ ] 5.1 Refine `/quick-add` visual layout for very small cover screens.
- [ ] 5.2 Keep one dominant recording action with concise status, error, and result states.
- [ ] 5.3 Ensure quick capture result text communicates whether the task was assigned or left in Inbox.

## 6. Validation

- [ ] 6.1 Update Playwright coverage for mobile navigation and mobile Projects list.
- [ ] 6.2 Add Playwright coverage for Today grouping and Inbox assignment.
- [ ] 6.3 Add Playwright coverage for task detail editing on desktop.
- [ ] 6.4 Add Playwright coverage for `/quick-add` on a very small viewport.
- [ ] 6.5 Run lint, build, OpenSpec validation, and the Playwright E2E suite.
