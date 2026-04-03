import { pb } from '@/lib/pocketbase';
import { Project } from '@/types';
import CreateProject from './components/CreateProject';
import ProjectSearch from './components/ProjectSearch';
import ProjectBoard from './components/ProjectBoard';

export const revalidate = 0; 

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';

  let projects: Project[] = [];
  try {
    const options: any = { sort: 'order,-created' };
    if (q) {
      options.filter = `title ~ "${q}" || description ~ "${q}"`;
    }
    const records = await pb.collection('projects').getFullList<Project>(options);
    projects = records;
  } catch (error) {
    console.error("Error al obtener proyectos:", error);
  }

  return (
    <main className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-screen font-sans">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Gestión de <span className="text-blue-600 dark:text-blue-500">Proyectos</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
            Organiza tus metas moviendo las tarjetas entre los distintos plazos.
          </p>
        </div>
        <div className="w-full md:w-96">
          <ProjectSearch />
        </div>
      </header>
      
      <div className="mb-10">
        <CreateProject />
      </div>

      {q && projects.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <p className="text-xl font-medium text-gray-600 dark:text-gray-300">No se encontraron proyectos</p>
          <p className="text-gray-500 mt-2">Intenta con otra búsqueda o limpia el filtro.</p>
        </div>
      ) : (
        <ProjectBoard initialProjects={projects} />
      )}
    </main>
  );
}
