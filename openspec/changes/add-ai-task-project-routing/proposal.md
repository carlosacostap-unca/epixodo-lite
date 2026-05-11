## Why

Voice capture currently creates standalone cards, but projects are made of tasks and spoken input often contains enough context to route the task directly into an existing project. Adding AI analysis after transcription can reduce manual organization while preserving a safe fallback for ambiguous tasks.

## What Changes

- Analyze transcribed voice text with OpenAI before creating the final task.
- Refine the transcribed text into a clean task title.
- Compare the task against existing projects and assign it only when the model has high confidence.
- Create unassigned tasks when no project can be inferred confidently.
- Add a UI surface for unassigned tasks so the user can later assign them to a project.
- Apply the routing behavior to both the `/quick-add` flow and the existing home voice capture flow.
- Keep the flow conservative: medium or low confidence MUST leave the task unassigned.

## Capabilities

### New Capabilities
- `ai-task-project-routing`: Covers AI analysis of transcribed task text, project matching, title refinement, and unassigned-task fallback.

### Modified Capabilities
- None.

## Impact

- Affected API: voice task creation routes will need a server-side AI analysis step using the existing `OPENAI_API_KEY`.
- Affected data model: tasks must support an unassigned state or an equivalent inbox representation.
- Affected UI: both `/quick-add` and home voice capture must create tasks through the same analysis/routing behavior; the app needs a way to list and assign unassigned tasks.
- External dependency: OpenAI text model, preferably a current low-cost mini model with Structured Outputs support.
