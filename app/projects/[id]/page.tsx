import { pb } from '@/lib/pocketbase';
import { Project, Task } from '@/types';
import Link from 'next/link';
import CreateTask from '@/app/components/CreateTask';
import TaskItem from '@/app/components/TaskItem';
import EditableProject from '@/app/components/EditableProject';
import TaskSearch from '@/app/components/TaskSearch';

export const revalidate = 0; 

export default async function ProjectPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ tq?: string }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const projectId = resolvedParams.id;
  const tq = resolvedSearchParams.tq || '';
  
  let project: Project | null = null;
  let tasks: Task[] = [];

  try {
    project = await pb.collection('projects').getOne<Project>(projectId);
    
    let filterStr = `project = "${projectId}"`;
    if (tq) {
      filterStr += ` && title ~ "${tq}"`;
    }

    tasks = await pb.collection('tasks').getFullList<Task>({
      filter: filterStr,
      sort: 'created',
    });
  } catch (error) {
    console.error("Error al obtener datos del proyecto:", error);
  }

  if (!project) {
    return (
      <main className="p-8 max-w-2xl mx-auto text-center min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl font-extrabold mb-4 text-gray-900 dark:text-white">Proyecto no encontrado</h1>
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Volver al inicio
        </Link>
      </main>
    );
  }

  return (
    <main className="p-6 md:p-10 max-w-4xl mx-auto min-h-screen font-sans">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-8 font-medium transition group">
        <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </div>
        Volver a Proyectos
      </Link>
      
      <EditableProject project={project} />

      <div className="bg-white dark:bg-gray-800/80 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/60 backdrop-blur-xl">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Tareas</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona las actividades de este proyecto</p>
          </div>
          <div className="w-full md:w-72">
            <TaskSearch />
          </div>
        </header>
        
        <CreateTask projectId={project.id} />

        <div className="mt-8 flex flex-col gap-3">
          {tasks.length > 0 ? (
            tasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 border-dashed">
              <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
                {tq ? 'No se encontraron tareas con esa búsqueda.' : 'No hay tareas en este proyecto.'}
              </p>
              {!tq && <p className="text-gray-400 dark:text-gray-500 mt-1">Crea una arriba para empezar.</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
