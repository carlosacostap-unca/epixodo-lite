import type { Project, Task } from '@/types';

export type ConversationAction = 'create_task' | 'list_today' | 'list_inbox' | 'list_projects' | 'complete_task' | 'assign_task' | 'unknown';

export type ConversationIntent = {
  action: ConversationAction;
  taskText: string;
  taskId: string | null;
  projectId: string | null;
};

type OpenAIResponseContent = {
  type?: string;
  text?: string;
};

type OpenAIResponseOutput = {
  content?: OpenAIResponseContent[];
};

type OpenAIResponsesPayload = {
  output_text?: string;
  output?: OpenAIResponseOutput[];
};

const DEFAULT_MODEL = 'gpt-5-mini';

function extractOutputText(payload: OpenAIResponsesPayload) {
  if (typeof payload.output_text === 'string') return payload.output_text;

  for (const output of payload.output || []) {
    for (const content of output.content || []) {
      if (typeof content.text === 'string') return content.text;
    }
  }

  return '';
}

function normalizeText(value: string) {
  return value.toLocaleLowerCase('es-AR').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function cleanTaskText(message: string) {
  return message
    .replace(/^(por favor\s+)?(crear|crea|agregar|agrega|anadir|añadir|anadi|añadi|sumar|suma)\s+(una\s+)?(nueva\s+)?tarea\s*(para|de|que)?\s*/i, '')
    .replace(/^(tengo que|hay que|recordame que|necesito que)\s+/i, '')
    .trim();
}

function findTaskId(message: string, tasks: Task[]) {
  const normalizedMessage = normalizeText(message);
  return tasks.find((task) => normalizedMessage.includes(normalizeText(task.title)))?.id || null;
}

function findProjectId(message: string, projects: Project[]) {
  const normalizedMessage = normalizeText(message);
  return projects.find((project) => normalizedMessage.includes(normalizeText(project.title)))?.id || null;
}

function localIntent(message: string, projects: Project[], tasks: Task[]): ConversationIntent {
  const normalized = normalizeText(message);

  if (normalized.includes('hoy') || normalized.includes('para hoy') || normalized.includes('tareas tengo')) {
    return { action: 'list_today', taskText: '', taskId: null, projectId: null };
  }

  if (normalized.includes('inbox') || normalized.includes('sin proyecto') || normalized.includes('sin asignar')) {
    return { action: 'list_inbox', taskText: '', taskId: null, projectId: null };
  }

  if (normalized.includes('proyectos') && !normalized.includes('asigna')) {
    return { action: 'list_projects', taskText: '', taskId: null, projectId: null };
  }

  if (normalized.includes('completa') || normalized.includes('termina') || normalized.includes('marcar como hecha')) {
    return { action: 'complete_task', taskText: cleanTaskText(message), taskId: findTaskId(message, tasks), projectId: null };
  }

  if (normalized.includes('asigna') || normalized.includes('mover') || normalized.includes('relaciona')) {
    return {
      action: 'assign_task',
      taskText: cleanTaskText(message),
      taskId: findTaskId(message, tasks),
      projectId: findProjectId(message, projects),
    };
  }

  if (/^(crear|crea|agregar|agrega|anadir|añadir|sumar|suma|tengo que|hay que|recordame|necesito)/i.test(message.trim())) {
    return { action: 'create_task', taskText: cleanTaskText(message), taskId: null, projectId: null };
  }

  return { action: 'unknown', taskText: '', taskId: null, projectId: null };
}

function coerceIntent(value: unknown, fallback: ConversationIntent): ConversationIntent {
  const input = value as Partial<ConversationIntent>;
  const actions: ConversationAction[] = ['create_task', 'list_today', 'list_inbox', 'list_projects', 'complete_task', 'assign_task', 'unknown'];
  const action = input.action && actions.includes(input.action) ? input.action : fallback.action;

  return {
    action,
    taskText: typeof input.taskText === 'string' ? input.taskText.trim() : fallback.taskText,
    taskId: typeof input.taskId === 'string' && input.taskId.trim() ? input.taskId.trim() : fallback.taskId,
    projectId: typeof input.projectId === 'string' && input.projectId.trim() ? input.projectId.trim() : fallback.projectId,
  };
}

export async function analyzeConversationIntent(message: string, projects: Project[], tasks: Task[]) {
  const fallback = localIntent(message, projects, tasks);

  if (process.env.NEXT_PUBLIC_E2E_MOCKS === '1') {
    return fallback;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_CONVERSATION_MODEL || DEFAULT_MODEL,
      input: [
        {
          role: 'system',
          content:
            'Clasifica mensajes en espanol para operar una app de tareas. Devuelve solo la accion. Usa ids existentes cuando puedas. No inventes ids.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            message,
            projects: projects.map((project) => ({ id: project.id, title: project.title })),
            tasks: tasks.map((task) => ({ id: task.id, title: task.title, project: task.project, is_completed: task.is_completed })),
          }),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'conversation_intent',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              action: {
                type: 'string',
                enum: ['create_task', 'list_today', 'list_inbox', 'list_projects', 'complete_task', 'assign_task', 'unknown'],
              },
              taskText: {
                type: 'string',
                description: 'Texto accionable para crear o buscar una tarea. Vacio si no aplica.',
              },
              taskId: {
                type: ['string', 'null'],
              },
              projectId: {
                type: ['string', 'null'],
              },
            },
            required: ['action', 'taskText', 'taskId', 'projectId'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    return fallback;
  }

  const payload = (await response.json()) as OpenAIResponsesPayload;
  const outputText = extractOutputText(payload);
  if (!outputText) return fallback;

  try {
    return coerceIntent(JSON.parse(outputText), fallback);
  } catch {
    return fallback;
  }
}
