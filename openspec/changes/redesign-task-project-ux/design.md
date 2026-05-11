## Context

Epixodo Lite has evolved from a project board into a task-and-project workspace. Users can now capture tasks by voice, route them to projects with AI, keep tasks unassigned, and store task metadata such as description, realization time, due time, and operational plazo. The current UI still presents these capabilities through a board-first layout, which works poorly on small screens and becomes visually heavy on large screens.

The redesign must support three main usage contexts:

- Very small screens: quick voice capture with almost no navigation.
- Mobile phones: daily triage, inbox cleanup, and project browsing with low scrolling cost.
- Large screens: project work, task review, and metadata editing with enough density for repeated use.

The current implementation uses Next.js App Router, PocketBase, Tailwind classes, and Playwright E2E fixtures. The redesign should stay within this stack and avoid new dependencies unless implementation reveals a concrete need.

## Goals / Non-Goals

**Goals:**

- Make the default experience task-first while keeping projects visible and useful.
- Provide responsive layouts that are intentionally different for small and large screens.
- Keep quick voice capture optimized for very small cover screens.
- Reduce inline form clutter by moving task editing into a focused modal or inspector.
- Make Inbox and Today first-class views.
- Preserve existing project board and drag/touch movement behavior where it fits.
- Keep the implementation incremental so each step can be verified independently.

**Non-Goals:**

- No new PocketBase schema changes are planned.
- No authentication or multi-user permissions redesign.
- No calendar integration, notifications, reminders, or recurrence in this change.
- No replacement of OpenAI transcription/routing behavior beyond presenting its results better.
- No native mobile app; this remains a responsive web app.

## Decisions

### Decision: Use View-Based Navigation Instead Of One Home Screen

The app will expose primary views: Today, Inbox, and Projects. The home route can become the workspace shell and choose a default view, or route segments can be introduced if that is cleaner during implementation.

Rationale: the current home mixes creation, capture, unassigned tasks, search, and the full board. Separating views lets each screen have a clearer job and makes mobile much less crowded.

Alternatives considered:
- Keep one long home page and improve spacing. This is simpler but does not solve mobile scanning or the mental model problem.
- Create separate unrelated pages without shared navigation. This reduces page density but makes the app feel fragmented.

### Decision: Mobile Uses Lists, Desktop Uses Split Workspace

Small and medium screens will use compact lists and bottom/top navigation. Large screens will use a workspace layout with a navigation rail, central list/board, and optional right-side detail inspector.

Rationale: mobile users need thumb-friendly navigation and short surfaces. Desktop users need density and context without navigating away for every edit.

Alternatives considered:
- Use the same board everywhere. This preserves consistency but performs poorly on phones.
- Use only lists everywhere. This is simpler but removes the board affordance that is useful on desktop.

### Decision: Task Editing Moves To Modal/Inspector

Task cards/lists will show readable summaries. Editing title, description, realization time, due time, plazo, completion, and project assignment will happen in a focused task detail surface.

Rationale: inline editing now makes each task item too large and creates accessibility/test ambiguity with repeated form controls. A focused editor improves scanning and reduces accidental edits.

Alternatives considered:
- Keep inline expansion. Fast for one field, but it scales badly with task metadata.
- Navigate to a full task page. Clear, but too heavy for quick edits.

### Decision: Quick-Add Remains A Dedicated Capture Mode

`/quick-add` will remain intentionally minimal and independent from the full workspace. It should keep one primary recording button, compact status text, and a concise result.

Rationale: this route serves the Motorola Razr external screen use case. Pulling full navigation or metadata editing into it would defeat its purpose.

Alternatives considered:
- Redirect quick-add into the main app. This would simplify code but make cover-screen use worse.
- Add many post-capture controls to quick-add. Useful sometimes, but not for fast capture.

### Decision: Treat "Tareas" Project Section As Legacy/Project Organization, Not Task Inbox

The UX will use actual `tasks` records for task workflows. The existing project board section named "Tareas" may remain for legacy project cards, but task Inbox is based on tasks without `project`.

Rationale: the data model now distinguishes projects and tasks. The UI should stop teaching users that "Tareas" is a project column for task capture.

Alternatives considered:
- Remove the Tareas project section immediately. This could break existing user expectations and legacy records.
- Keep it as the main task inbox. This conflicts with the current task collection.

## Risks / Trade-offs

- Mobile and desktop layouts may diverge enough to increase implementation complexity -> Keep shared data components and only vary layout/navigation shells.
- Introducing an inspector/modal can add state-management complexity -> Start with a single selected task id/state in the relevant client component before introducing broader abstractions.
- Existing E2E tests may become brittle during navigation changes -> Update tests around user-visible workflows rather than exact DOM structure.
- The old "Tareas" project section may confuse users while Inbox is introduced -> Use copy and placement to make Inbox clearly task-based; preserve old section only where project board context requires it.
- Date/time metadata can create hydration inconsistencies -> Continue using stable formatting helpers and E2E coverage around displayed metadata.

## Migration Plan

1. Add the responsive workspace shell and navigation without removing existing project board functionality.
2. Introduce Today and Inbox views using existing task fields.
3. Move task editing into modal/inspector and keep existing update helpers.
4. Adjust project browsing for mobile and desktop separately.
5. Refine `/quick-add` as a standalone capture mode.
6. Update Playwright tests for mobile and desktop workflows.

Rollback strategy: because no schema migration is planned, rollback can revert UI changes while retaining all existing project/task data.

## Open Questions

- Should the default desktop landing view be Today or Projects?
- Should Today include tasks with `realization_at`, `due_at`, or both?
- Should the project board remain visible by default on desktop, or sit behind a Projects view toggle?
- Should completed tasks remain visible in Today/Inbox by default or collapse behind a filter?
