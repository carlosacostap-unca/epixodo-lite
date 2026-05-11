import type { Project, Task } from '@/types';

export const e2eProjects: Project[] = [
  {
    id: 'e2e-project-launch',
    title: 'Lanzamiento del producto',
    description: 'Coordinar el primer corte publico de Epixodo Lite.',
    plazo: 'Corto',
    order: 0,
    created: '2026-04-03 12:00:00.000Z',
    updated: '2026-04-03 12:00:00.000Z',
  },
  {
    id: 'e2e-project-research',
    title: 'Investigacion de usuarios',
    description: 'Entrevistas y aprendizajes para priorizar proximas mejoras.',
    plazo: 'Mediano',
    order: 0,
    created: '2026-04-04 12:00:00.000Z',
    updated: '2026-04-04 12:00:00.000Z',
  },
  {
    id: 'e2e-project-maintenance',
    title: 'Mantenimiento tecnico',
    description: 'Reducir deuda tecnica y mejorar la confiabilidad.',
    plazo: '',
    order: 0,
    created: '2026-04-05 12:00:00.000Z',
    updated: '2026-04-05 12:00:00.000Z',
  },
];

export const e2eTasks: Task[] = [
  {
    id: 'e2e-task-release-notes',
    title: 'Preparar notas de lanzamiento',
    is_completed: false,
    project: 'e2e-project-launch',
    created: '2026-04-03 13:00:00.000Z',
    updated: '2026-04-03 13:00:00.000Z',
  },
  {
    id: 'e2e-task-feedback',
    title: 'Revisar feedback inicial',
    is_completed: true,
    project: 'e2e-project-launch',
    created: '2026-04-03 14:00:00.000Z',
    updated: '2026-04-03 14:00:00.000Z',
  },
];
