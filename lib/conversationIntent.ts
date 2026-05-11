import type { Project, Task } from '@/types';

type TaskPlazo = Task['plazo'];

export type ConversationAction =
  | 'create_task'
  | 'list_today'
  | 'list_overdue'
  | 'list_inbox'
  | 'list_projects'
  | 'complete_task'
  | 'assign_task'
  | 'update_due'
  | 'update_plazo'
  | 'rename_task'
  | 'delete_task'
  | 'unknown';

export type ConversationIntent = {
  action: ConversationAction;
  taskText: string;
  taskId: string | null;
  projectId: string | null;
  dueAt: string | null;
  plazo: TaskPlazo | null;
  newTitle: string;
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
const ACTIONS: ConversationAction[] = [
  'create_task',
  'list_today',
  'list_overdue',
  'list_inbox',
  'list_projects',
  'complete_task',
  'assign_task',
  'update_due',
  'update_plazo',
  'rename_task',
  'delete_task',
  'unknown',
];

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
    .replace(/^(por favor\s+)?(crear|crea|agregar|agrega|anadir|anadi|sumar|suma)\s+(una\s+)?(nueva\s+)?tarea\s*(para|de|que)?\s*/i, '')
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

function emptyIntent(action: ConversationAction, overrides: Partial<ConversationIntent> = {}): ConversationIntent {
  return {
    action,
    taskText: '',
    taskId: null,
    projectId: null,
    dueAt: null,
    plazo: null,
    newTitle: '',
    ...overrides,
  };
}

function findPlazo(message: string): TaskPlazo | null {
  const normalized = normalizeText(message);
  if (normalized.includes('corto')) return 'Corto';
  if (normalized.includes('mediano')) return 'Mediano';
  if (normalized.includes('largo')) return 'Largo';
  return null;
}

function dateToPocketDate(date: Date) {
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace('T', ' ');
}

function findDueAt(message: string) {
  const normalized = normalizeText(message);
  const timeMatch = normalized.match(/(?:a las|tipo|sobre las)\s+(\d{1,2})(?::(\d{2}))?/);
  const hour = timeMatch ? Math.min(Number(timeMatch[1]), 23) : 9;
  const minute = timeMatch?.[2] ? Math.min(Number(timeMatch[2]), 59) : 0;
  const date = new Date();

  if (normalized.includes('pasado manana')) {
    date.setDate(date.getDate() + 2);
  } else if (normalized.includes('manana')) {
    date.setDate(date.getDate() + 1);
  } else if (!normalized.includes('hoy')) {
    const isoMatch = normalized.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    const slashMatch = normalized.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);

    if (isoMatch) {
      date.setFullYear(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    } else if (slashMatch) {
      date.setFullYear(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1]));
    } else {
      return null;
    }
  }

  date.setHours(hour, minute, 0, 0);
  return dateToPocketDate(date);
}

function findNewTitle(message: string) {
  const quoted = message.match(/"([^"]+)"/)?.[1] || message.match(/'([^']+)'/)?.[1];
  if (quoted) return quoted.trim();

  const match = message.match(/\b(?:a|como)\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function localIntent(message: string, projects: Project[], tasks: Task[]): ConversationIntent {
  const normalized = normalizeText(message);
  const taskId = findTaskId(message, tasks);

  if (normalized.includes('vencida') || normalized.includes('vencido') || normalized.includes('atrasada')) {
    return emptyIntent('list_overdue');
  }

  if (normalized.includes('hoy') || normalized.includes('para hoy') || normalized.includes('tareas tengo')) {
    return emptyIntent('list_today');
  }

  if (normalized.includes('inbox') || normalized.includes('sin proyecto') || normalized.includes('sin asignar')) {
    return emptyIntent('list_inbox');
  }

  if (normalized.includes('proyectos') && !normalized.includes('asigna')) {
    return emptyIntent('list_projects');
  }

  if (normalized.includes('completa') || normalized.includes('termina') || normalized.includes('marcar como hecha')) {
    return emptyIntent('complete_task', { taskText: cleanTaskText(message), taskId });
  }

  if (normalized.includes('borra') || normalized.includes('elimina') || normalized.includes('borrar tarea') || normalized.includes('eliminar tarea')) {
    return emptyIntent('delete_task', { taskText: cleanTaskText(message), taskId });
  }

  if (normalized.includes('asigna') || normalized.includes('mover') || normalized.includes('relaciona')) {
    return emptyIntent('assign_task', {
      taskText: cleanTaskText(message),
      taskId,
      projectId: findProjectId(message, projects),
    });
  }

  if (normalized.includes('vence') || normalized.includes('vencimiento') || normalized.includes('fecha')) {
    return emptyIntent('update_due', { taskText: cleanTaskText(message), taskId, dueAt: findDueAt(message) });
  }

  if (normalized.includes('plazo')) {
    return emptyIntent('update_plazo', { taskText: cleanTaskText(message), taskId, plazo: findPlazo(message) });
  }

  if (normalized.includes('renombra') || normalized.includes('cambia el titulo') || normalized.includes('cambiar titulo')) {
    return emptyIntent('rename_task', { taskText: cleanTaskText(message), taskId, newTitle: findNewTitle(message) });
  }

  if (/^(crear|crea|agregar|agrega|anadir|sumar|suma|tengo que|hay que|recordame|necesito)/i.test(message.trim())) {
    return emptyIntent('create_task', { taskText: cleanTaskText(message), dueAt: findDueAt(message), plazo: findPlazo(message) });
  }

  return emptyIntent('unknown');
}

function coerceIntent(value: unknown, fallback: ConversationIntent): ConversationIntent {
  const input = value as Partial<ConversationIntent>;
  const action = input.action && ACTIONS.includes(input.action) ? input.action : fallback.action;
  const plazo = input.plazo === 'Corto' || input.plazo === 'Mediano' || input.plazo === 'Largo' || input.plazo === '' ? input.plazo : fallback.plazo;

  return {
    action,
    taskText: typeof input.taskText === 'string' ? input.taskText.trim() : fallback.taskText,
    taskId: typeof input.taskId === 'string' && input.taskId.trim() ? input.taskId.trim() : fallback.taskId,
    projectId: typeof input.projectId === 'string' && input.projectId.trim() ? input.projectId.trim() : fallback.projectId,
    dueAt: typeof input.dueAt === 'string' && input.dueAt.trim() ? input.dueAt.trim() : fallback.dueAt,
    plazo,
    newTitle: typeof input.newTitle === 'string' ? input.newTitle.trim() : fallback.newTitle,
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
            'Clasifica mensajes en espanol para operar una app de tareas. Devuelve JSON estricto. Usa ids existentes cuando puedas. No inventes ids. Para fechas devuelve dueAt en formato PocketBase YYYY-MM-DD HH:mm:ss.sssZ, o null.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            message,
            projects: projects.map((project) => ({ id: project.id, title: project.title })),
            tasks: tasks.map((task) => ({
              id: task.id,
              title: task.title,
              project: task.project,
              is_completed: task.is_completed,
              due_at: task.due_at,
              plazo: task.plazo,
            })),
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
                enum: ACTIONS,
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
              dueAt: {
                type: ['string', 'null'],
              },
              plazo: {
                type: ['string', 'null'],
                enum: ['Corto', 'Mediano', 'Largo', '', null],
              },
              newTitle: {
                type: 'string',
              },
            },
            required: ['action', 'taskText', 'taskId', 'projectId', 'dueAt', 'plazo', 'newTitle'],
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
