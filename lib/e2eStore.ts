import type { Project, Task } from '@/types';
import { e2eProjects, e2eTasks } from '@/lib/e2eFixtures';
import {
  isUnassignedTasksProject,
  UNASSIGNED_TASKS_PROJECT_DESCRIPTION,
  UNASSIGNED_TASKS_PROJECT_TITLE,
} from '@/lib/unassignedTasks';

type ProjectPlazo = Project['plazo'];
type ProjectCreateInput = Pick<Project, 'title' | 'description' | 'plazo'>;
type ProjectUpdateInput = Partial<ProjectCreateInput> & Pick<Project, 'id'>;
type ProjectOrderInput = Pick<Project, 'id' | 'order'> & { plazo: ProjectPlazo };
type TaskCreateInput = Pick<Task, 'title' | 'is_completed' | 'project'>;
type TaskUpdateInput = Partial<Pick<Task, 'title' | 'is_completed' | 'project'>> & Pick<Task, 'id'>;

const UNASSIGNED_E2E_PROJECT_ID = 'e2e-project-unassigned-tasks';

type E2EStore = {
  nextProjectId: number;
  nextTaskId: number;
  projects: Project[];
  tasks: Task[];
};

declare global {
  var __epixodoE2EStore: E2EStore | undefined;
}

function cloneProject(project: Project): Project {
  return { ...project };
}

function cloneTask(task: Task): Task {
  return { ...task };
}

function now() {
  return new Date().toISOString();
}

function getStore() {
  globalThis.__epixodoE2EStore ??= {
    nextProjectId: 1,
    nextTaskId: 1,
    projects: e2eProjects.map(cloneProject),
    tasks: e2eTasks.map(cloneTask),
  };

  return globalThis.__epixodoE2EStore;
}

export function resetE2EStore() {
  globalThis.__epixodoE2EStore = undefined;
  getStore();
}

export function listE2EProjects() {
  return getStore().projects.map(cloneProject);
}

export function getOrCreateE2EUnassignedProject() {
  const store = getStore();
  const existing = store.projects.find((project) => project.id === UNASSIGNED_E2E_PROJECT_ID || isUnassignedTasksProject(project));
  if (existing) return cloneProject(existing);

  const timestamp = now();
  const project: Project = {
    id: UNASSIGNED_E2E_PROJECT_ID,
    title: UNASSIGNED_TASKS_PROJECT_TITLE,
    description: UNASSIGNED_TASKS_PROJECT_DESCRIPTION,
    plazo: '',
    order: 999,
    created: timestamp,
    updated: timestamp,
  };

  store.projects.push(project);
  return cloneProject(project);
}

export function getE2EProject(projectId: string) {
  const project = getStore().projects.find((item) => item.id === projectId);
  return project ? cloneProject(project) : null;
}

export function createE2EProject(project: ProjectCreateInput) {
  const store = getStore();
  const timestamp = now();
  const createdProject: Project = {
    id: `e2e-project-created-${store.nextProjectId++}`,
    title: project.title,
    description: project.description,
    plazo: project.plazo,
    order: store.projects.filter((item) => item.plazo === project.plazo).length,
    created: timestamp,
    updated: timestamp,
  };

  store.projects.push(createdProject);
  return cloneProject(createdProject);
}

export function updateE2EProject(project: ProjectUpdateInput) {
  const store = getStore();
  const index = store.projects.findIndex((item) => item.id === project.id);
  if (index === -1) return null;

  store.projects[index] = {
    ...store.projects[index],
    ...project,
    updated: now(),
  };

  return cloneProject(store.projects[index]);
}

export function deleteE2EProject(projectId: string) {
  const store = getStore();
  store.projects = store.projects.filter((project) => project.id !== projectId);
  store.tasks = store.tasks.filter((task) => task.project !== projectId);
}

export function updateE2EProjectOrder(projects: ProjectOrderInput[]) {
  const store = getStore();

  for (const project of projects) {
    const index = store.projects.findIndex((item) => item.id === project.id);
    if (index !== -1) {
      store.projects[index] = {
        ...store.projects[index],
        plazo: project.plazo,
        order: project.order,
        updated: now(),
      };
    }
  }
}

export function listE2ETasks() {
  return getStore().tasks.map(cloneTask);
}

export function listE2EUnassignedTasks() {
  const unassignedProject = getOrCreateE2EUnassignedProject();

  return getStore()
    .tasks.filter((task) => task.project === unassignedProject.id)
    .map(cloneTask);
}

export function createE2ETask(task: TaskCreateInput) {
  const store = getStore();
  const timestamp = now();
  const createdTask: Task = {
    id: `e2e-task-created-${store.nextTaskId++}`,
    title: task.title,
    is_completed: task.is_completed,
    project: task.project,
    created: timestamp,
    updated: timestamp,
  };

  store.tasks.push(createdTask);
  return cloneTask(createdTask);
}

export function updateE2ETask(task: TaskUpdateInput) {
  const store = getStore();
  const index = store.tasks.findIndex((item) => item.id === task.id);
  if (index === -1) return null;

  store.tasks[index] = {
    ...store.tasks[index],
    ...task,
    updated: now(),
  };

  return cloneTask(store.tasks[index]);
}

export function deleteE2ETask(taskId: string) {
  const store = getStore();
  store.tasks = store.tasks.filter((task) => task.id !== taskId);
}
