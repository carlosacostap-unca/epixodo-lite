import Link from 'next/link';
import type { Project, Task } from '@/types';
import { groupTodayTasks } from '@/lib/taskViews';
import CreateProject from './CreateProject';
import ProjectBoard from './ProjectBoard';
import ProjectList from './ProjectList';
import ProjectSearch from './ProjectSearch';
import TaskSummaryCard from './TaskSummaryCard';
import UnassignedTasks from './UnassignedTasks';
import VoiceTaskCapture from './VoiceTaskCapture';
import ConversationalAssistant from './ConversationalAssistant';
import InteractionModeSwitch from './InteractionModeSwitch';

export type WorkspaceView = 'today' | 'inbox' | 'projects';

type Props = {
  activeView: WorkspaceView;
  projects: Project[];
  visibleProjects: Project[];
  tasks: Task[];
  unassignedTasks: Task[];
  query: string;
};

const VIEW_LABELS: Record<WorkspaceView, string> = {
  today: 'Hoy',
  inbox: 'Inbox',
  projects: 'Proyectos',
};

function workspaceHref(view: WorkspaceView, query = '') {
  const params = new URLSearchParams();
  params.set('view', view);
  if (view === 'projects' && query) params.set('q', query);
  return `/?${params.toString()}`;
}

function projectMap(projects: Project[]) {
  return new Map(projects.map((project) => [project.id, project]));
}

function WorkspaceNav({
  activeView,
  query,
  inboxCount,
  todayCount,
  projectCount,
}: {
  activeView: WorkspaceView;
  query: string;
  inboxCount: number;
  todayCount: number;
  projectCount: number;
}) {
  const counts: Record<WorkspaceView, number> = {
    today: todayCount,
    inbox: inboxCount,
    projects: projectCount,
  };

  return (
    <nav aria-label="Vistas principales" className="flex gap-2 lg:flex-col">
      {(Object.keys(VIEW_LABELS) as WorkspaceView[]).map((view) => {
        const isActive = view === activeView;

        return (
          <Link
            key={view}
            href={workspaceHref(view, query)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-11 flex-1 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition lg:flex-none ${
              isActive
                ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'
                : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <span>{VIEW_LABELS[view]}</span>
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                isActive
                  ? 'bg-white/20 text-white dark:bg-gray-950/10 dark:text-gray-950'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {counts[view]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function TodayView({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const groups = groupTodayTasks(tasks);
  const projectsById = projectMap(projects);
  const sections = [
    { key: 'overdue', title: 'Vencidas', description: 'Tareas con vencimiento anterior a hoy.', tasks: groups.overdue },
    { key: 'today', title: 'Para hoy', description: 'Tareas que vencen o estan previstas para hoy.', tasks: groups.today },
    { key: 'upcoming', title: 'Proximas', description: 'Tareas ya fechadas para mas adelante.', tasks: groups.upcoming },
    { key: 'unscheduled', title: 'Sin fecha', description: 'Trabajo pendiente que todavia no tiene horario ni vencimiento.', tasks: groups.unscheduled },
  ];

  return (
    <div className="space-y-6">
      <VoiceTaskCapture />

      {sections.map((section) => (
        <section key={section.key} className="space-y-3">
          <div>
            <h2 className="text-xl font-bold text-gray-950 dark:text-white">{section.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">{section.description}</p>
          </div>
          {section.tasks.length > 0 ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {section.tasks.map((task) => (
                <TaskSummaryCard key={task.id} task={task} projects={projects} project={projectsById.get(task.project)} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white/60 p-5 text-sm font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
              No hay tareas en este grupo.
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function InboxView({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  return (
    <UnassignedTasks
      initialTasks={tasks}
      projects={projects}
      title="Inbox"
      description="Tareas reales sin proyecto asignado. Asignalas cuando la relacion con un proyecto este clara."
      emptyTitle="Inbox limpio"
      emptyDescription="Cuando el dictado o la IA no puedan ubicar una tarea, aparecera aca para revisarla."
      showEmptyState
    />
  );
}

function ProjectsView({
  projects,
  visibleProjects,
  query,
}: {
  projects: Project[];
  visibleProjects: Project[];
  query: string;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white">Proyectos</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
            En pantallas chicas se muestran como lista. En escritorio se conserva el tablero con movimiento por plazo.
          </p>
        </div>
        <ProjectSearch />
      </div>

      <CreateProject />

      {query && visibleProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white/70 p-8 text-center dark:border-gray-700 dark:bg-gray-900/60">
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">No se encontraron proyectos</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Intenta con otra busqueda o limpia el filtro.</p>
        </div>
      ) : (
        <>
          <div className="lg:hidden">
            <ProjectList projects={visibleProjects} />
          </div>
          <div className="hidden lg:block">
            <ProjectBoard initialProjects={visibleProjects} />
          </div>
        </>
      )}

      <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
        Nota: la seccion de proyectos llamada Tareas se mantiene para organizacion heredada. El Inbox usa registros de tareas sin proyecto.
      </p>
      <span className="sr-only">{projects.length} proyectos disponibles para asignacion de tareas.</span>
    </div>
  );
}

export default function WorkspaceShell({ activeView, projects, visibleProjects, tasks, unassignedTasks, query }: Props) {
  const todayGroups = groupTodayTasks(tasks);
  const todayCount = todayGroups.overdue.length + todayGroups.today.length;
  const visualView = (
    <>
      {activeView === 'today' ? <TodayView tasks={tasks} projects={projects} /> : null}
      {activeView === 'inbox' ? <InboxView tasks={unassignedTasks} projects={projects} /> : null}
      {activeView === 'projects' ? <ProjectsView projects={projects} visibleProjects={visibleProjects} query={query} /> : null}
    </>
  );

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-950 dark:bg-gray-950 dark:text-white">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-gray-200 bg-white/80 px-5 py-6 dark:border-gray-800 dark:bg-gray-900/70 lg:block">
          <div className="sticky top-6 space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-300">Epixodo Lite</p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Panel</h1>
            </div>
            <WorkspaceNav
              activeView={activeView}
              query={query}
              inboxCount={unassignedTasks.length}
              todayCount={todayCount}
              projectCount={visibleProjects.length}
            />
          </div>
        </aside>

        <div className="min-w-0 px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-10">
          <header className="mb-5 space-y-4 lg:mb-8">
            <div className="lg:hidden">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-300">Epixodo Lite</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Panel</h1>
            </div>
            <div className="sticky top-0 z-20 -mx-4 border-b border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 sm:-mx-6 sm:px-6 lg:hidden">
              <WorkspaceNav
                activeView={activeView}
                query={query}
                inboxCount={unassignedTasks.length}
                todayCount={todayCount}
                projectCount={visibleProjects.length}
              />
            </div>
          </header>

          <section className="mx-auto max-w-6xl">
            <InteractionModeSwitch visual={visualView} conversational={<ConversationalAssistant />} />
          </section>
        </div>
      </div>
    </main>
  );
}
