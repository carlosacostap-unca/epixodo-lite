import Link from 'next/link';
import type { Project } from '@/types';
import { formatProjectDate } from '@/lib/formatDate';
import { getProjectSection } from '@/lib/projectSections';

const SECTIONS = [
  { id: 'Corto', title: 'Corto plazo' },
  { id: 'Mediano', title: 'Mediano plazo' },
  { id: 'Largo', title: 'Largo plazo' },
  { id: 'Tareas', title: 'Tareas de proyecto' },
  { id: '', title: 'Sin plazo' },
] as const;

export default function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <div className="space-y-5">
      {SECTIONS.map((section) => {
        const sectionProjects = projects
          .filter((project) => getProjectSection(project) === section.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        if (sectionProjects.length === 0) return null;

        return (
          <section key={section.id || 'none'} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{section.title}</h3>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {sectionProjects.length}
              </span>
            </div>
            <div className="space-y-2">
              {sectionProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  data-testid={`project-list-card-${project.id}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-900 dark:hover:bg-blue-950/20"
                >
                  <h4 className="text-base font-semibold leading-tight text-gray-950 dark:text-white">{project.title}</h4>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {project.description || 'Sin descripcion'}
                  </p>
                  <p className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400">{formatProjectDate(project.created)}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
