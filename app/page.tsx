import { getAllTasks, getProjects, getUnassignedTasks } from '@/lib/data';
import type { Project, Task } from '@/types';
import WorkspaceShell, { type WorkspaceView } from './components/WorkspaceShell';

export const revalidate = 0;

function normalizeView(view?: string): WorkspaceView {
  if (view === 'inbox' || view === 'projects') return view;
  return 'today';
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string }> }) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';
  const activeView = normalizeView(resolvedParams.view);

  let projects: Project[] = [];
  let visibleProjects: Project[] = [];
  let tasks: Task[] = [];
  let unassignedTasks: Task[] = [];

  try {
    [projects, visibleProjects, tasks, unassignedTasks] = await Promise.all([
      getProjects(),
      getProjects(q),
      getAllTasks(),
      getUnassignedTasks(),
    ]);
  } catch (error) {
    console.error('Error al obtener datos del workspace:', error);
  }

  return (
    <WorkspaceShell
      activeView={activeView}
      projects={projects}
      visibleProjects={visibleProjects}
      tasks={tasks}
      unassignedTasks={unassignedTasks}
      query={q}
    />
  );
}
