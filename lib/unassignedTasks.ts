import type { Project } from '@/types';

export const UNASSIGNED_TASKS_PROJECT_TITLE = 'Tareas sin asignar';
export const UNASSIGNED_TASKS_PROJECT_DESCRIPTION = 'Proyecto tecnico para tareas sin asignar.';

export function isUnassignedTasksProject(project: Pick<Project, 'description'>) {
  return project.description === UNASSIGNED_TASKS_PROJECT_DESCRIPTION;
}
