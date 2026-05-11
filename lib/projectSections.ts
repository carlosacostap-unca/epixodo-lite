import type { Project } from '@/types';

export const QUICK_TASK_DESCRIPTION = 'Creada desde captura rapida por voz.';

export function getProjectSection(project: Pick<Project, 'description' | 'plazo'>) {
  if (project.plazo === '' && project.description === QUICK_TASK_DESCRIPTION) {
    return 'Tareas';
  }

  return project.plazo || '';
}

export function getStoredProjectSection(project: Pick<Project, 'description' | 'plazo'>, section: Project['plazo']) {
  if (project.plazo === '' && project.description === QUICK_TASK_DESCRIPTION && section === 'Tareas') {
    return '';
  }

  return section;
}
