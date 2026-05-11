import { analyzeConversationIntent, type ConversationAction } from '@/lib/conversationIntent';
import { createE2ETask, deleteE2ETask, listE2EProjects, listE2ETasks, updateE2ETask } from '@/lib/e2eStore';
import { pb } from '@/lib/pocketbase';
import { formatPocketDateTime } from '@/lib/taskDates';
import { groupTodayTasks } from '@/lib/taskViews';
import { createRoutedVoiceTask } from '@/lib/voiceTaskRouting';
import type { Project, Task } from '@/types';

const useE2EFixtures = process.env.NEXT_PUBLIC_E2E_MOCKS === '1';

type PendingChoice = {
  id: string;
  title: string;
};

type PendingTaskAction = Extract<ConversationAction, 'complete_task' | 'assign_task' | 'update_due' | 'update_plazo' | 'rename_task' | 'delete_task'>;

type PendingAction =
  | {
      action: 'delete_task';
      taskId: string;
      taskTitle: string;
    }
  | {
      action: 'clarify_task';
      originalAction: PendingTaskAction;
      taskText: string;
      projectId: string | null;
      dueAt: string | null;
      plazo: Task['plazo'] | null;
      newTitle: string;
      candidates: PendingChoice[];
    }
  | {
      action: 'clarify_project';
      taskId: string;
      taskTitle: string;
      candidates: PendingChoice[];
    }
  | {
      action: 'clarify_due';
      taskId: string;
      taskTitle: string;
    }
  | {
      action: 'clarify_plazo';
      taskId: string;
      taskTitle: string;
    }
  | {
      action: 'clarify_title';
      taskId: string;
      taskTitle: string;
    };

type ConversationRequest = {
  message?: string;
  pendingAction?: PendingAction | null;
};

const defaultSuggestions = ['Crear tarea para manana', 'Que tengo para hoy?', 'Tareas vencidas', 'Mostrar Inbox'];
const projectSuggestions = ['Listar proyectos', 'Mostrar Inbox', 'Que tengo para hoy?'];
const confirmationSuggestions = ['Confirmar borrado', 'Cancelar'];
const dueSuggestions = ['Hoy a las 9', 'Manana a las 9', 'Cancelar'];
const plazoSuggestions = ['Corto', 'Mediano', 'Largo', 'Cancelar'];

function bulletList(items: string[]) {
  return items.map((item) => `- ${item}`).join('\n');
}

async function listProjects() {
  if (useE2EFixtures) return listE2EProjects();
  return pb.collection('projects').getFullList<Project>({ sort: 'order,-created' });
}

async function listTasks() {
  if (useE2EFixtures) return listE2ETasks();
  return pb.collection('tasks').getFullList<Task>({ sort: 'due_at,realization_at,created' });
}

async function updateTask(task: Pick<Task, 'id'> & Partial<Pick<Task, 'title' | 'description' | 'is_completed' | 'project' | 'due_at' | 'plazo'>>) {
  if (useE2EFixtures) return updateE2ETask(task);
  const { id, ...data } = task;
  return pb.collection('tasks').update<Task>(id, data);
}

async function deleteTask(taskId: string) {
  if (useE2EFixtures) {
    deleteE2ETask(taskId);
    return;
  }

  await pb.collection('tasks').delete(taskId);
}

function normalizeText(value: string) {
  return value.toLocaleLowerCase('es-AR').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function isConfirmation(message: string) {
  const normalized = normalizeText(message);
  return normalized.includes('confirm') || normalized === 'si' || normalized === 'dale' || normalized.includes('borrar');
}

function isCancellation(message: string) {
  const normalized = normalizeText(message);
  return normalized.includes('cancel') || normalized === 'no' || normalized.includes('mantener');
}

function normalizeDueAt(value: string | null) {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().replace('T', ' ');
}

function dateToPocketDate(date: Date) {
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().replace('T', ' ');
}

function parseDueAt(message: string) {
  const normalized = normalizeText(message);
  const timeMatch = normalized.match(/(?:a las|tipo|sobre las)?\s*(\d{1,2})(?::(\d{2}))?/);
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
      return '';
    }
  }

  date.setHours(hour, minute, 0, 0);
  return dateToPocketDate(date);
}

function parsePlazo(message: string): Task['plazo'] | null {
  const normalized = normalizeText(message);
  if (normalized.includes('corto')) return 'Corto';
  if (normalized.includes('mediano')) return 'Mediano';
  if (normalized.includes('largo')) return 'Largo';
  return null;
}

function findTask(intentTaskId: string | null, taskText: string, tasks: Task[]) {
  if (intentTaskId) {
    const byId = tasks.find((task) => task.id === intentTaskId);
    if (byId) return byId;
  }

  const normalizedText = normalizeText(taskText);
  return tasks.find((task) => normalizedText && taskTitleMatches(task, normalizedText)) || null;
}

function taskTitleMatches(task: Task, normalizedText: string) {
  const normalizedTitle = normalizeText(task.title);
  return normalizedTitle.includes(normalizedText) || normalizedText.includes(normalizedTitle);
}

function getSearchTokens(value: string) {
  const ignored = new Set(['asigna', 'asignar', 'borra', 'borrar', 'cambia', 'completa', 'completar', 'de', 'el', 'la', 'los', 'marca', 'plazo', 'tarea', 'termina', 'vence']);
  return normalizeText(value)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 4 && !ignored.has(token));
}

function rankTaskCandidates(message: string, taskText: string, tasks: Task[]) {
  const tokens = getSearchTokens(`${message} ${taskText}`);
  const scored = tasks
    .map((task) => {
      const title = normalizeText(task.title);
      const score = tokens.filter((token) => title.includes(token)).length;
      return { task, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.task.created.localeCompare(b.task.created));

  const candidates = scored.length > 0 ? scored.map(({ task }) => task) : tasks.filter((task) => !task.is_completed);
  return candidates.slice(0, 4).map((task) => ({ id: task.id, title: task.title }));
}

function findChoice(message: string, candidates: PendingChoice[]) {
  const normalized = normalizeText(message);
  const ordinalMap: Record<string, number> = {
    '1': 0,
    primera: 0,
    primero: 0,
    '2': 1,
    segunda: 1,
    segundo: 1,
    '3': 2,
    tercera: 2,
    tercero: 2,
    '4': 3,
    cuarta: 3,
    cuarto: 3,
  };
  const ordinal = Object.entries(ordinalMap).find(([key]) => normalized.includes(key))?.[1];
  if (ordinal !== undefined && candidates[ordinal]) return candidates[ordinal];

  return (
    candidates.find((candidate) => normalizeText(candidate.title) === normalized) ||
    candidates.find((candidate) => normalizeText(candidate.title).includes(normalized) || normalized.includes(normalizeText(candidate.title))) ||
    null
  );
}

function projectTitle(projectId: string, projects: Project[]) {
  return projects.find((project) => project.id === projectId)?.title || 'el proyecto elegido';
}

function formatTask(task: Task, projects: Project[]) {
  const project = task.project ? ` (${projectTitle(task.project, projects)})` : '';
  const due = task.due_at ? `, vence ${formatPocketDateTime(task.due_at)}` : '';
  const plazo = task.plazo ? `, plazo ${task.plazo}` : '';
  return `${task.title}${project}${due}${plazo}`;
}

function taskClarification(action: PendingTaskAction, message: string, taskText: string, tasks: Task[], overrides: Partial<PendingAction> = {}) {
  const candidates = rankTaskCandidates(message, taskText, tasks);
  if (candidates.length === 0) {
    return Response.json({ reply: 'No encontre tareas para esa operacion. Proba nombrando la tarea como aparece en la lista.', suggestions: defaultSuggestions });
  }

  return Response.json({
    reply: 'No estoy seguro de que tarea queres usar. Elegi una de estas.',
    suggestions: candidates.map((candidate) => candidate.title),
    pendingAction: {
      action: 'clarify_task',
      originalAction: action,
      taskText,
      projectId: null,
      dueAt: null,
      plazo: null,
      newTitle: '',
      candidates,
      ...overrides,
    },
  });
}

function projectClarification(task: Task, projects: Project[]) {
  const candidates = projects.slice(0, 4).map((project) => ({ id: project.id, title: project.title }));
  if (candidates.length === 0) {
    return Response.json({ reply: 'Necesito un proyecto, pero todavia no hay proyectos disponibles.', suggestions: defaultSuggestions });
  }

  return Response.json({
    reply: `A que proyecto queres asignar "${task.title}"?`,
    suggestions: candidates.map((candidate) => candidate.title),
    pendingAction: {
      action: 'clarify_project',
      taskId: task.id,
      taskTitle: task.title,
      candidates,
    },
  });
}

async function applyTaskAction(action: PendingTaskAction, task: Task, data: Pick<PendingAction & { projectId?: string | null; dueAt?: string | null; plazo?: Task['plazo'] | null; newTitle?: string }, 'projectId' | 'dueAt' | 'plazo' | 'newTitle'>, projects: Project[]) {
  if (action === 'complete_task') {
    await updateTask({ id: task.id, is_completed: true });
    return Response.json({ reply: `Listo, marque "${task.title}" como completada.`, suggestions: defaultSuggestions, pendingAction: null });
  }

  if (action === 'assign_task') {
    const project = data.projectId ? projects.find((item) => item.id === data.projectId) : null;
    if (!project) return projectClarification(task, projects);

    await updateTask({ id: task.id, project: project.id });
    return Response.json({ reply: `Listo, asigne "${task.title}" a ${project.title}.`, suggestions: projectSuggestions, pendingAction: null });
  }

  if (action === 'update_due') {
    const dueAt = normalizeDueAt(data.dueAt || '');
    if (!dueAt) {
      return Response.json({
        reply: `Cuando vence "${task.title}"?`,
        suggestions: dueSuggestions,
        pendingAction: { action: 'clarify_due', taskId: task.id, taskTitle: task.title },
      });
    }

    await updateTask({ id: task.id, due_at: dueAt });
    return Response.json({ reply: `Listo, "${task.title}" vence ${formatPocketDateTime(dueAt)}.`, suggestions: defaultSuggestions, pendingAction: null });
  }

  if (action === 'update_plazo') {
    if (!data.plazo) {
      return Response.json({
        reply: `Que plazo queres para "${task.title}"?`,
        suggestions: plazoSuggestions,
        pendingAction: { action: 'clarify_plazo', taskId: task.id, taskTitle: task.title },
      });
    }

    await updateTask({ id: task.id, plazo: data.plazo });
    return Response.json({ reply: `Listo, cambie "${task.title}" a plazo ${data.plazo}.`, suggestions: defaultSuggestions, pendingAction: null });
  }

  if (action === 'rename_task') {
    if (!data.newTitle) {
      return Response.json({
        reply: `Que titulo nuevo queres para "${task.title}"?`,
        suggestions: ['Cancelar'],
        pendingAction: { action: 'clarify_title', taskId: task.id, taskTitle: task.title },
      });
    }

    await updateTask({ id: task.id, title: data.newTitle });
    return Response.json({ reply: `Listo, renombre "${task.title}" como "${data.newTitle}".`, suggestions: defaultSuggestions, pendingAction: null });
  }

  const pendingAction: PendingAction = { action: 'delete_task', taskId: task.id, taskTitle: task.title };
  return Response.json({
    reply: `Antes de borrar "${task.title}", necesito confirmacion.`,
    suggestions: confirmationSuggestions,
    pendingAction,
  });
}

async function handlePendingAction(pendingAction: PendingAction, message: string, tasks: Task[], projects: Project[]) {
  if (isCancellation(message)) {
    return Response.json({ reply: 'Ok, no hice cambios.', suggestions: defaultSuggestions, pendingAction: null });
  }

  if (pendingAction.action === 'delete_task') {
    if (isConfirmation(message)) {
      await deleteTask(pendingAction.taskId);
      return Response.json({ reply: `Listo, borre "${pendingAction.taskTitle}".`, suggestions: defaultSuggestions, pendingAction: null });
    }

    return Response.json({
      reply: `Necesito que confirmes si queres borrar "${pendingAction.taskTitle}".`,
      suggestions: confirmationSuggestions,
      pendingAction,
    });
  }

  if (pendingAction.action === 'clarify_task') {
    const choice = findChoice(message, pendingAction.candidates);
    const task = choice ? tasks.find((item) => item.id === choice.id) : null;

    if (!task) {
      return Response.json({
        reply: 'No pude reconocer cual de esas tareas elegiste. Proba tocando uno de los botones.',
        suggestions: pendingAction.candidates.map((candidate) => candidate.title),
        pendingAction,
      });
    }

    return applyTaskAction(
      pendingAction.originalAction,
      task,
      {
        projectId: pendingAction.projectId,
        dueAt: pendingAction.dueAt,
        plazo: pendingAction.plazo,
        newTitle: pendingAction.newTitle,
      },
      projects,
    );
  }

  if (pendingAction.action === 'clarify_project') {
    const choice = findChoice(message, pendingAction.candidates);
    const project = choice ? projects.find((item) => item.id === choice.id) : null;

    if (!project) {
      return Response.json({
        reply: `No pude reconocer el proyecto para "${pendingAction.taskTitle}". Elegi uno de estos.`,
        suggestions: pendingAction.candidates.map((candidate) => candidate.title),
        pendingAction,
      });
    }

    await updateTask({ id: pendingAction.taskId, project: project.id });
    return Response.json({ reply: `Listo, asigne "${pendingAction.taskTitle}" a ${project.title}.`, suggestions: projectSuggestions, pendingAction: null });
  }

  if (pendingAction.action === 'clarify_due') {
    const dueAt = parseDueAt(message);
    if (!dueAt) {
      return Response.json({ reply: `Necesito una fecha para "${pendingAction.taskTitle}".`, suggestions: dueSuggestions, pendingAction });
    }

    await updateTask({ id: pendingAction.taskId, due_at: dueAt });
    return Response.json({ reply: `Listo, "${pendingAction.taskTitle}" vence ${formatPocketDateTime(dueAt)}.`, suggestions: defaultSuggestions, pendingAction: null });
  }

  if (pendingAction.action === 'clarify_plazo') {
    const plazo = parsePlazo(message);
    if (!plazo) {
      return Response.json({ reply: `Necesito saber si "${pendingAction.taskTitle}" va en Corto, Mediano o Largo.`, suggestions: plazoSuggestions, pendingAction });
    }

    await updateTask({ id: pendingAction.taskId, plazo });
    return Response.json({ reply: `Listo, cambie "${pendingAction.taskTitle}" a plazo ${plazo}.`, suggestions: defaultSuggestions, pendingAction: null });
  }

  const newTitle = message.trim();
  if (!newTitle) {
    return Response.json({ reply: `Que titulo nuevo queres para "${pendingAction.taskTitle}"?`, suggestions: ['Cancelar'], pendingAction });
  }

  await updateTask({ id: pendingAction.taskId, title: newTitle });
  return Response.json({ reply: `Listo, renombre "${pendingAction.taskTitle}" como "${newTitle}".`, suggestions: defaultSuggestions, pendingAction: null });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConversationRequest;
    const message = body.message?.trim();

    if (!message) {
      return Response.json({ reply: 'Decime que queres hacer con tus tareas.', suggestions: defaultSuggestions }, { status: 400 });
    }

    const [projects, tasks] = await Promise.all([listProjects(), listTasks()]);

    if (body.pendingAction) {
      return handlePendingAction(body.pendingAction, message, tasks, projects);
    }

    const intent = await analyzeConversationIntent(message, projects, tasks);

    if (intent.action === 'create_task') {
      const taskText = intent.taskText || message;
      const routedTask = useE2EFixtures
        ? {
            task: createE2ETask({
              title: taskText,
              description: '',
              is_completed: false,
              ...(intent.dueAt ? { due_at: normalizeDueAt(intent.dueAt) } : {}),
              ...(intent.plazo ? { plazo: intent.plazo } : {}),
            }),
            assignedProjectTitle: null,
          }
        : await createRoutedVoiceTask(taskText);

      const updates: Partial<Pick<Task, 'due_at' | 'plazo'>> = {};
      const dueAt = normalizeDueAt(intent.dueAt);
      if (dueAt) updates.due_at = dueAt;
      if (intent.plazo) updates.plazo = intent.plazo;

      if (!useE2EFixtures && Object.keys(updates).length > 0) {
        await updateTask({ id: routedTask.task.id, ...updates });
      }

      const placement = routedTask.assignedProjectTitle ? `La asigne a ${routedTask.assignedProjectTitle}.` : 'La deje en Inbox para que la puedas revisar.';
      const due = dueAt ? ` Vence ${formatPocketDateTime(dueAt)}.` : '';
      const plazo = intent.plazo ? ` Plazo ${intent.plazo}.` : '';
      return Response.json({ reply: `Listo, cree la tarea "${routedTask.task.title}". ${placement}${due}${plazo}`, suggestions: defaultSuggestions });
    }

    if (intent.action === 'list_today') {
      const groups = groupTodayTasks(tasks);
      const todayTasks = [...groups.overdue, ...groups.today];
      const reply =
        todayTasks.length > 0
          ? `Para hoy tenes:\n${bulletList(todayTasks.map((task) => formatTask(task, projects)))}`
          : 'No tenes tareas vencidas ni marcadas para hoy.';
      return Response.json({ reply, suggestions: ['Tareas vencidas', 'Mostrar Inbox', 'Crear tarea para manana'] });
    }

    if (intent.action === 'list_overdue') {
      const groups = groupTodayTasks(tasks);
      const reply =
        groups.overdue.length > 0
          ? `Tenes estas tareas vencidas:\n${bulletList(groups.overdue.map((task) => formatTask(task, projects)))}`
          : 'No tenes tareas vencidas.';
      return Response.json({ reply, suggestions: ['Que tengo para hoy?', 'Mostrar Inbox', 'Crear tarea para manana'] });
    }

    if (intent.action === 'list_inbox') {
      const inboxTasks = tasks.filter((task) => !task.project);
      const reply = inboxTasks.length > 0 ? `En Inbox tenes:\n${bulletList(inboxTasks.map((task) => formatTask(task, projects)))}` : 'Inbox esta limpio.';
      return Response.json({ reply, suggestions: projectSuggestions });
    }

    if (intent.action === 'list_projects') {
      const reply = projects.length > 0 ? `Tus proyectos son:\n${bulletList(projects.map((project) => project.title))}` : 'Todavia no hay proyectos.';
      return Response.json({ reply, suggestions: ['Mostrar Inbox', 'Que tengo para hoy?', 'Crear tarea'] });
    }

    if (intent.action === 'complete_task') {
      const task = findTask(intent.taskId, intent.taskText || message, tasks);
      if (!task) {
        return taskClarification('complete_task', message, intent.taskText, tasks);
      }

      return applyTaskAction('complete_task', task, {}, projects);
    }

    if (intent.action === 'assign_task') {
      const task = findTask(intent.taskId, intent.taskText || message, tasks);
      if (!task) {
        return taskClarification('assign_task', message, intent.taskText, tasks, { projectId: intent.projectId });
      }

      return applyTaskAction('assign_task', task, { projectId: intent.projectId }, projects);
    }

    if (intent.action === 'update_due') {
      const task = findTask(intent.taskId, intent.taskText || message, tasks);
      const dueAt = normalizeDueAt(intent.dueAt) || parseDueAt(message);

      if (!task) {
        return taskClarification('update_due', message, intent.taskText, tasks, { dueAt });
      }

      return applyTaskAction('update_due', task, { dueAt }, projects);
    }

    if (intent.action === 'update_plazo') {
      const task = findTask(intent.taskId, intent.taskText || message, tasks);
      const plazo = intent.plazo || parsePlazo(message);

      if (!task) {
        return taskClarification('update_plazo', message, intent.taskText, tasks, { plazo });
      }

      return applyTaskAction('update_plazo', task, { plazo }, projects);
    }

    if (intent.action === 'rename_task') {
      const task = findTask(intent.taskId, intent.taskText || message, tasks);

      if (!task) {
        return taskClarification('rename_task', message, intent.taskText, tasks, { newTitle: intent.newTitle });
      }

      return applyTaskAction('rename_task', task, { newTitle: intent.newTitle }, projects);
    }

    if (intent.action === 'delete_task') {
      const task = findTask(intent.taskId, intent.taskText || message, tasks);

      if (!task) {
        return taskClarification('delete_task', message, intent.taskText, tasks);
      }

      return applyTaskAction('delete_task', task, {}, projects);
    }

    return Response.json({
      reply:
        'Puedo crear tareas, consultar hoy o vencidas, mostrar Inbox, listar proyectos, completar, asignar, cambiar vencimientos, cambiar plazos, renombrar o borrar con confirmacion.',
      suggestions: defaultSuggestions,
    });
  } catch (error) {
    console.error('Conversation error:', error);
    return Response.json({ reply: 'No pude procesar el mensaje. Intentalo de nuevo.', suggestions: defaultSuggestions }, { status: 500 });
  }
}
