import { pb } from '@/lib/pocketbase';
import type { Project, Task } from '@/types';
import {
  getE2EProject,
  getOrCreateE2EUnassignedProject,
  listE2EProjects,
  listE2EUnassignedTasks,
  listE2ETasks,
} from '@/lib/e2eStore';
import { findUnassignedTasksProject } from '@/lib/unassignedTaskStore';
import { isUnassignedTasksProject } from '@/lib/unassignedTasks';
import type { RecordFullListOptions } from 'pocketbase';

type ProjectPlazo = Project['plazo'];
type ProjectCreateInput = Pick<Project, 'title' | 'description' | 'plazo'>;
type ProjectUpdateInput = Partial<ProjectCreateInput> & Pick<Project, 'id'>;
type ProjectOrderInput = Pick<Project, 'id' | 'order'> & { plazo: ProjectPlazo };
type TaskCreateInput = Pick<Task, 'title' | 'is_completed' | 'project'>;
type TaskUpdateInput = Partial<Pick<Task, 'title' | 'is_completed' | 'project'>> & Pick<Task, 'id'>;

const useE2EFixtures = process.env.NEXT_PUBLIC_E2E_MOCKS === '1';

function textMatches(value: string, query: string) {
  return value.toLocaleLowerCase('es-AR').includes(query.toLocaleLowerCase('es-AR'));
}

function byProjectOrder(a: Project, b: Project) {
  return (a.order || 0) - (b.order || 0) || b.created.localeCompare(a.created);
}

async function postE2EAction(action: string, payload = {}) {
  const response = await fetch('/api/e2e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!response.ok) {
    throw new Error(`E2E action failed: ${action}`);
  }

  return response.json();
}

export async function getProjects(query = '') {
  if (useE2EFixtures) {
    return listE2EProjects()
      .filter((project) => !isUnassignedTasksProject(project))
      .filter((project) => {
        if (!query) return true;
        return textMatches(project.title, query) || textMatches(project.description, query);
      })
      .map((project) => ({ ...project }))
      .sort(byProjectOrder);
  }

  const options: RecordFullListOptions = { sort: 'order,-created' };
  if (query) {
    options.filter = `title ~ "${query}" || description ~ "${query}"`;
  }

  const projects = await pb.collection('projects').getFullList<Project>(options);
  return projects.filter((project) => !isUnassignedTasksProject(project));
}

export async function getProject(projectId: string) {
  if (useE2EFixtures) {
    return getE2EProject(projectId);
  }

  return pb.collection('projects').getOne<Project>(projectId);
}

export async function createProject(project: ProjectCreateInput) {
  if (useE2EFixtures) {
    await postE2EAction('createProject', { project });
    return;
  }

  await pb.collection('projects').create(project);
}

export async function updateProject(project: ProjectUpdateInput) {
  if (useE2EFixtures) {
    await postE2EAction('updateProject', { project });
    return;
  }

  const { id, ...data } = project;
  await pb.collection('projects').update(id, data);
}

export async function deleteProject(projectId: string) {
  if (useE2EFixtures) {
    await postE2EAction('deleteProject', { projectId });
    return;
  }

  await pb.collection('projects').delete(projectId);
}

export async function updateProjectOrder(projects: ProjectOrderInput[]) {
  if (useE2EFixtures) {
    await postE2EAction('updateProjectOrder', { projects });
    return;
  }

  await Promise.all(
    projects.map((project) =>
      pb.collection('projects').update(project.id, {
        plazo: project.plazo,
        order: project.order,
      }),
    ),
  );
}

export async function getTasks(projectId: string, query = '') {
  if (useE2EFixtures) {
    return listE2ETasks()
      .filter((task) => task.project === projectId)
      .filter((task) => !query || textMatches(task.title, query))
      .map((task) => ({ ...task }))
      .sort((a, b) => a.created.localeCompare(b.created));
  }

  let filter = `project = "${projectId}"`;
  if (query) {
    filter += ` && title ~ "${query}"`;
  }

  return pb.collection('tasks').getFullList<Task>({
    filter,
    sort: 'created',
  });
}

export async function getUnassignedTasks(query = '') {
  if (useE2EFixtures) {
    getOrCreateE2EUnassignedProject();
    return listE2EUnassignedTasks()
      .filter((task) => !query || textMatches(task.title, query))
      .sort((a, b) => a.created.localeCompare(b.created));
  }

  const project = await findUnassignedTasksProject();
  if (!project) {
    return [];
  }

  let filter = `project = "${project.id}"`;
  if (query) {
    filter += ` && title ~ "${query}"`;
  }

  return pb.collection('tasks').getFullList<Task>({
    filter,
    sort: 'created',
  });
}

export async function createTask(task: TaskCreateInput) {
  if (useE2EFixtures) {
    await postE2EAction('createTask', { task });
    return;
  }

  await pb.collection('tasks').create(task);
}

export async function updateTask(task: TaskUpdateInput) {
  if (useE2EFixtures) {
    await postE2EAction('updateTask', { task });
    return;
  }

  const { id, ...data } = task;
  await pb.collection('tasks').update(id, data);
}

export async function assignTaskToProject(taskId: string, projectId: string) {
  return updateTask({ id: taskId, project: projectId });
}

export async function deleteTask(taskId: string) {
  if (useE2EFixtures) {
    await postE2EAction('deleteTask', { taskId });
    return;
  }

  await pb.collection('tasks').delete(taskId);
}
