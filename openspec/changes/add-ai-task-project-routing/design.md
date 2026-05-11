## Context

The app currently has two voice entry points: the full home screen voice capture and the compact `/quick-add` capture. Both start with audio transcription, but they currently create standalone board cards instead of true project tasks.

The data model already has `projects` and `tasks`, where each task belongs to a project today. The new behavior needs an explicit unassigned task state so ambiguous voice input can be captured safely without being forced into the wrong project.

## Goals / Non-Goals

**Goals:**
- Add AI analysis after transcription for both voice capture flows.
- Use a low-cost current mini text model with Structured Outputs support, defaulting to `gpt-5-mini` unless a configured model override is provided.
- Refine the transcribed text into a clean task title.
- Match the task to an existing project only when confidence is high.
- Create unassigned tasks when confidence is medium, low, or no project is appropriate.
- Provide a UI path to list unassigned tasks and assign them to a project later.

**Non-Goals:**
- Do not auto-create new projects from voice input.
- Do not assign medium-confidence matches.
- Do not preserve the raw transcript in the task title.
- Do not add reminders, priorities, due dates, or recurring task behavior.
- Do not change non-voice manual task creation unless needed to support unassigned tasks.

## Decisions

### Shared Server-Side Voice Task Pipeline

Both `/quick-add` and the home voice capture should use a shared server-side pipeline after transcription:

1. Load existing projects.
2. Send the transcript and project candidates to OpenAI.
3. Receive structured analysis.
4. Create a task assigned to a project only when confidence is high.
5. Otherwise create an unassigned task.

Rationale: this keeps API keys server-side, avoids duplicate routing logic, and ensures both voice entry points behave consistently.

### Conservative Assignment

The AI may only assign a task when it returns a high-confidence project match. Medium and low confidence must produce an unassigned task.

Rationale: a missed assignment is easier to fix than a wrong assignment hidden inside the wrong project.

### Structured Output Contract

Use Structured Outputs with a schema similar to:

```json
{
  "taskTitle": "string",
  "projectId": "string or null",
  "confidence": "high | medium | low",
  "reason": "string"
}
```

Rationale: task creation should not depend on parsing free-form model text.

### Configurable Model

Default to `gpt-5-mini`, with an environment variable override such as `OPENAI_TASK_ROUTING_MODEL`.

Rationale: current docs list `gpt-5-mini` as a cost-efficient GPT-5 model for well-defined tasks and it supports Structured Outputs. A variable leaves room for account-specific model availability.

### Unassigned Tasks

Support unassigned tasks as first-class items. If PocketBase requires a task `project`, implementation must either update the schema to allow empty project values or introduce a dedicated inbox representation that behaves as unassigned in the UI.

Rationale: the product behavior needs a real place for "captured but not yet assigned" tasks.

## Risks / Trade-offs

- Wrong AI assignment -> Mitigation: assign only on high confidence; otherwise leave unassigned.
- Model unavailable in the account -> Mitigation: make the model configurable and document fallback.
- PocketBase task schema requires project -> Mitigation: include schema migration or inbox fallback as an implementation task.
- More latency after transcription -> Mitigation: use a mini model and keep the prompt/project payload concise.
- Large project lists increase prompt size -> Mitigation: send only active project id, title, and short description.
- User may want to see why a task was not assigned -> Mitigation: keep internal reason in logs or future metadata, but do not clutter the small-screen UI initially.
