import { analyzeConversationIntent } from '@/lib/conversationIntent';
import { createE2ETask, deleteE2ETask, listE2EProjects, listE2ETasks, updateE2ETask } from '@/lib/e2eStore';
import { pb } from '@/lib/pocketbase';
import { formatPocketDateTime } from '@/lib/taskDates';
import { groupTodayTasks } from '@/lib/taskViews';
import { createRoutedVoiceTask } from '@/lib/voiceTaskRouting';
import type { Project, Task } from '@/types';

const useE2EFixtures = process.env.NEXT_PUBLIC_E2E_MOCKS === '1';

type PendingAction = {
  action: 'delete_task';
  taskId: string;
  taskTitle: string;
};

type ConversationRequest = {
  message?: string;
  pendingAction?: PendingAction | null;
};

const defaultSuggestions = ['Crear tarea para mañana', 'Que tengo para hoy?', 'Tareas vencidas', 'Mostrar Inbox'];
const projectSuggestions = ['Listar proyectos', 'Mostrar Inbox', 'Que tengo para hoy?'];
const confirmationSuggestions = ['Confirmar borrado', 'Cancelar'];

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

function findTask(intentTaskId: string | null, taskText: string, tasks: Task[]) {
  if (intentTaskId) {
    const byId = tasks.find((task) => task.id === intentTaskId);
    if (byId) return byId;
  }

  const normalizedText = normalizeText(taskText);
  return tasks.find((task) => normalizedText && normalizeText(task.title).includes(normalizedText)) || null;
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

function missingTaskReply() {
  return 'No pude identificar que tarea queres modificar. Proba nombrandola como aparece en la lista.';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConversationRequest;
    const message = body.message?.trim();

    if (!message) {
      return Response.json({ reply: 'Decime que queres hacer con tus tareas.', suggestions: defaultSuggestions }, { status: 400 });
    }

    if (body.pendingAction?.action === 'delete_task') {
      if (isCancellation(message)) {
        return Response.json({ reply: `Ok, mantuve "${body.pendingAction.taskTitle}".`, suggestions: defaultSuggestions, pendingAction: null });
      }

      if (isConfirmation(message)) {
        await deleteTask(body.pendingAction.taskId);
        return Response.json({ reply: `Listo, borre "${body.pendingAction.taskTitle}".`, suggestions: defaultSuggestions, pendingAction: null });
      }

      return Response.json({
        reply: `Necesito que confirmes si queres borrar "${body.pendingAction.taskTitle}".`,
        suggestions: confirmationSuggestions,
        pendingAction: body.pendingAction,
      });
    }

    const [projects, tasks] = await Promise.all([listProjects(), listTasks()]);
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
      return Response.json({ reply, suggestions: ['Tareas vencidas', 'Mostrar Inbox', 'Crear tarea para mañana'] });
    }

    if (intent.action === 'list_overdue') {
      const groups = groupTodayTasks(tasks);
      const reply =
        groups.overdue.length > 0
          ? `Tenes estas tareas vencidas:\n${bulletList(groups.overdue.map((task) => formatTask(task, projects)))}`
          : 'No tenes tareas vencidas.';
      return Response.json({ reply, suggestions: ['Que tengo para hoy?', 'Mostrar Inbox', 'Crear tarea para mañana'] });
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
        return Response.json({ reply: missingTaskReply(), suggestions: defaultSuggestions });
      }

      await updateTask({ id: task.id, is_completed: true });
      return Response.json({ reply: `Listo, marque "${task.title}" como completada.`, suggestions: defaultSuggestions });
    }

    if (intent.action === 'assign_task') {
      const task = findTask(intent.taskId, intent.taskText || message, tasks);
      const project = intent.projectId ? projects.find((item) => item.id === intent.projectId) : null;

      if (!task || !project) {
        return Response.json({ reply: 'Necesito reconocer una tarea y un proyecto para asignarla. Proba con "asigna [tarea] a [proyecto]".', suggestions: projectSuggestions });
      }

      await updateTask({ id: task.id, project: project.id });
      return Response.json({ reply: `Listo, asigne "${task.title}" a ${project.title}.`, suggestions: projectSuggestions });
    }

    if (intent.action === 'update_due') {
      const task = findTask(intent.taskId, intent.taskText || message, tasks);
      const dueAt = normalizeDueAt(intent.dueAt);

      if (!task) {
        return Response.json({ reply: missingTaskReply(), suggestions: defaultSuggestions });
      }

      if (!dueAt) {
        return Response.json({ reply: `Reconoci la tarea "${task.title}", pero necesito una fecha de vencimiento. Por ejemplo: "vence mañana a las 9".`, suggestions: defaultSuggestions });
      }

      await updateTask({ id: task.id, due_at: dueAt });
      return Response.json({ reply: `Listo, "${task.title}" vence ${formatPocketDateTime(dueAt)}.`, suggestions: defaultSuggestions });
    }

    if (intent.action === 'update_plazo') {
      const task = findTask(intent.taskId, intent.taskText || message, tasks);

      if (!task) {
        return Response.json({ reply: missingTaskReply(), suggestions: defaultSuggestions });
      }

      if (!intent.plazo) {
        return Response.json({ reply: `Reconoci la tarea "${task.title}", pero necesito saber si el plazo es Corto, Mediano o Largo.`, suggestions: defaultSuggestions });
      }

      await updateTask({ id: task.id, plazo: intent.plazo });
      return Response.json({ reply: `Listo, cambie "${task.title}" a plazo ${intent.plazo}.`, suggestions: defaultSuggestions });
    }

    if (intent.action === 'rename_task') {
      const task = findTask(intent.taskId, intent.taskText || message, tasks);

      if (!task) {
        return Response.json({ reply: missingTaskReply(), suggestions: defaultSuggestions });
      }

      if (!intent.newTitle) {
        return Response.json({ reply: `Reconoci la tarea "${task.title}", pero necesito el titulo nuevo. Proba con: renombra ${task.title} como "nuevo titulo".`, suggestions: defaultSuggestions });
      }

      await updateTask({ id: task.id, title: intent.newTitle });
      return Response.json({ reply: `Listo, renombre "${task.title}" como "${intent.newTitle}".`, suggestions: defaultSuggestions });
    }

    if (intent.action === 'delete_task') {
      const task = findTask(intent.taskId, intent.taskText || message, tasks);

      if (!task) {
        return Response.json({ reply: missingTaskReply(), suggestions: defaultSuggestions });
      }

      const pendingAction: PendingAction = { action: 'delete_task', taskId: task.id, taskTitle: task.title };
      return Response.json({
        reply: `Antes de borrar "${task.title}", necesito confirmacion.`,
        suggestions: confirmationSuggestions,
        pendingAction,
      });
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
