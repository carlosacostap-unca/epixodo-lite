import { analyzeConversationIntent } from '@/lib/conversationIntent';
import { createE2ETask, listE2EProjects, listE2ETasks, updateE2ETask } from '@/lib/e2eStore';
import { pb } from '@/lib/pocketbase';
import { groupTodayTasks } from '@/lib/taskViews';
import { createRoutedVoiceTask } from '@/lib/voiceTaskRouting';
import type { Project, Task } from '@/types';

const useE2EFixtures = process.env.NEXT_PUBLIC_E2E_MOCKS === '1';

type ConversationRequest = {
  message?: string;
};

const suggestions = ['Crear tarea', 'Que tengo para hoy?', 'Mostrar Inbox', 'Listar proyectos'];

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

async function updateTask(task: Pick<Task, 'id'> & Partial<Pick<Task, 'is_completed' | 'project'>>) {
  if (useE2EFixtures) return updateE2ETask(task);
  const { id, ...data } = task;
  return pb.collection('tasks').update<Task>(id, data);
}

function findTask(intentTaskId: string | null, taskText: string, tasks: Task[]) {
  if (intentTaskId) {
    const byId = tasks.find((task) => task.id === intentTaskId);
    if (byId) return byId;
  }

  const normalizedText = taskText.toLocaleLowerCase('es-AR');
  return tasks.find((task) => normalizedText && task.title.toLocaleLowerCase('es-AR').includes(normalizedText)) || null;
}

function projectTitle(projectId: string, projects: Project[]) {
  return projects.find((project) => project.id === projectId)?.title || 'el proyecto elegido';
}

function formatTask(task: Task, projects: Project[]) {
  const project = task.project ? ` (${projectTitle(task.project, projects)})` : '';
  return `${task.title}${project}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConversationRequest;
    const message = body.message?.trim();

    if (!message) {
      return Response.json({ reply: 'Decime que queres hacer con tus tareas.', suggestions }, { status: 400 });
    }

    const [projects, tasks] = await Promise.all([listProjects(), listTasks()]);
    const intent = await analyzeConversationIntent(message, projects, tasks);

    if (intent.action === 'create_task') {
      const taskText = intent.taskText || message;
      const routedTask = useE2EFixtures
        ? { task: createE2ETask({ title: taskText, description: '', is_completed: false }), assignedProjectTitle: null }
        : await createRoutedVoiceTask(taskText);

      const placement = routedTask.assignedProjectTitle ? `La asigne a ${routedTask.assignedProjectTitle}.` : 'La deje en Inbox para que la puedas revisar.';
      return Response.json({ reply: `Listo, cree la tarea "${routedTask.task.title}". ${placement}`, suggestions });
    }

    if (intent.action === 'list_today') {
      const groups = groupTodayTasks(tasks);
      const todayTasks = [...groups.overdue, ...groups.today];
      const reply =
        todayTasks.length > 0
          ? `Para hoy tenes:\n${bulletList(todayTasks.map((task) => formatTask(task, projects)))}`
          : 'No tenes tareas vencidas ni marcadas para hoy.';
      return Response.json({ reply, suggestions });
    }

    if (intent.action === 'list_inbox') {
      const inboxTasks = tasks.filter((task) => !task.project);
      const reply = inboxTasks.length > 0 ? `En Inbox tenes:\n${bulletList(inboxTasks.map((task) => task.title))}` : 'Inbox esta limpio.';
      return Response.json({ reply, suggestions });
    }

    if (intent.action === 'list_projects') {
      const reply = projects.length > 0 ? `Tus proyectos son:\n${bulletList(projects.map((project) => project.title))}` : 'Todavia no hay proyectos.';
      return Response.json({ reply, suggestions });
    }

    if (intent.action === 'complete_task') {
      const task = findTask(intent.taskId, intent.taskText || message, tasks);
      if (!task) {
        return Response.json({ reply: 'No pude identificar que tarea queres completar. Proba nombrandola como aparece en la lista.', suggestions });
      }

      await updateTask({ id: task.id, is_completed: true });
      return Response.json({ reply: `Listo, marque "${task.title}" como completada.`, suggestions });
    }

    if (intent.action === 'assign_task') {
      const task = findTask(intent.taskId, intent.taskText || message, tasks);
      const project = intent.projectId ? projects.find((item) => item.id === intent.projectId) : null;

      if (!task || !project) {
        return Response.json({ reply: 'Necesito reconocer una tarea y un proyecto para asignarla. Proba con "asigna [tarea] a [proyecto]".', suggestions });
      }

      await updateTask({ id: task.id, project: project.id });
      return Response.json({ reply: `Listo, asigne "${task.title}" a ${project.title}.`, suggestions });
    }

    return Response.json({
      reply: 'Puedo crear tareas, decirte que tenes para hoy, mostrar Inbox, listar proyectos, completar tareas o asignarlas a proyectos.',
      suggestions,
    });
  } catch (error) {
    console.error('Conversation error:', error);
    return Response.json({ reply: 'No pude procesar el mensaje. Intentalo de nuevo.', suggestions }, { status: 500 });
  }
}
