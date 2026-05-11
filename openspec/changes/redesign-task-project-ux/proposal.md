## Why

The app now has useful task and project capabilities, but the experience has become too dense: capture, organization, project management, task metadata, and board movement all compete on the same screens. The next step is to redesign the product around the real usage contexts: fast mobile capture, daily task triage, and wider-screen project work.

## What Changes

- Introduce a task-first information architecture with primary views for Today, Inbox, and Projects.
- Replace the current all-in-one home layout with responsive layouts optimized separately for small screens and large screens.
- Preserve the ultra-compact `/quick-add` voice capture flow for very small screens, but make it feel like a focused capture mode.
- Add an Inbox view/area for unassigned or incomplete tasks, with quick assignment and editing affordances.
- Add a Today view that surfaces overdue tasks, tasks due today, scheduled tasks, and unscheduled work.
- Rework project browsing so mobile uses a compact list/sectioned list while large screens can use a denser board or split view.
- Move task editing into a dedicated modal or inspector-style surface instead of expanding long forms inside task lists.
- Keep existing data capabilities: voice capture, AI task routing, task metadata, project assignment, and project board movement.

## Capabilities

### New Capabilities
- `responsive-task-workspace`: Covers responsive navigation, Today/Inbox/Projects views, small-screen layouts, large-screen workspace layout, and task/project information hierarchy.
- `task-detail-editing`: Covers viewing and editing task metadata in a focused modal or inspector surface rather than dense inline list editing.

### Modified Capabilities
- None.

## Impact

- Affected UI: home page, project board, project detail page, quick-add route, task list items, unassigned task surface, create/edit task flows.
- Affected UX behavior: primary navigation and default landing experience will shift from board-first to task/workspace-first.
- Affected tests: Playwright coverage should be updated for mobile capture, mobile navigation, desktop workspace, Inbox assignment, Today grouping, and task-detail editing.
- No new external dependencies are expected.
- No PocketBase schema changes are expected for this redesign; it should use existing projects and tasks fields.
