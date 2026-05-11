## 1. Data Model And Server Foundations

- [x] 1.1 Decide and implement how tasks can exist without a project in PocketBase and local E2E fixtures.
- [x] 1.2 Update TypeScript types and data helpers to represent assigned and unassigned tasks safely.
- [x] 1.3 Add server helpers to list project candidates for AI routing with only id, title, and short description.

## 2. AI Routing Pipeline

- [x] 2.1 Add an OpenAI task routing helper using Structured Outputs and a configurable model defaulting to `gpt-5-mini`.
- [x] 2.2 Implement conservative confidence handling so only high-confidence matches produce a project assignment.
- [x] 2.3 Add fallback behavior that creates an unassigned task when AI routing fails or returns invalid output.
- [x] 2.4 Ensure the created task title uses the refined title from AI analysis, falling back to the transcript when needed.

## 3. Voice Flow Integration

- [x] 3.1 Update `/quick-add` to create routed tasks instead of standalone quick project cards.
- [x] 3.2 Update the home voice capture flow to create routed tasks after the user saves voice-derived text.
- [x] 3.3 Keep user-facing success and error states clear for assigned and unassigned outcomes.

## 4. Unassigned Task UI

- [x] 4.1 Add an unassigned tasks area that lists tasks without a project.
- [x] 4.2 Add controls to assign an unassigned task to an existing project.
- [x] 4.3 Refresh affected views after assignment so the task appears under the selected project.

## 5. Validation

- [x] 5.1 Add E2E coverage for high-confidence AI assignment to an existing project.
- [x] 5.2 Add E2E coverage for medium/low confidence leaving a task unassigned.
- [x] 5.3 Add E2E coverage for assigning an unassigned task manually.
- [x] 5.4 Run lint, build, OpenSpec validation, and the Playwright E2E suite.
