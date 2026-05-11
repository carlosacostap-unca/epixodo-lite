'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project, Task } from '@/types';
import { assignTaskToProject } from '@/lib/data';

type Props = {
  initialTasks: Task[];
  projects: Project[];
};

export default function UnassignedTasks({ initialTasks, projects }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Record<string, string>>({});
  const [loadingTaskId, setLoadingTaskId] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const assignTask = async (task: Task) => {
    const projectId = selectedProjectIds[task.id] || projects[0]?.id || '';
    if (!projectId) {
      setError('Crea un proyecto antes de asignar esta tarea.');
      return;
    }

    setLoadingTaskId(task.id);
    setError('');

    try {
      await assignTaskToProject(task.id, projectId);
      setTasks((currentTasks) => currentTasks.filter((item) => item.id !== task.id));
      router.refresh();
    } catch (error) {
      console.error('Error assigning unassigned task:', error);
      setError('No se pudo asignar la tarea. Intentalo de nuevo.');
    } finally {
      setLoadingTaskId('');
    }
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tareas sin asignar</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Revisa lo dictado y asignalo a un proyecto cuando corresponda.</p>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
          const isLoading = loadingTaskId === task.id;
          const selectedProjectId = selectedProjectIds[task.id] || projects[0]?.id || '';

          return (
            <div
              key={task.id}
              className="flex flex-col gap-3 rounded-xl border border-white/70 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-base font-semibold text-gray-900 dark:text-white">{task.title}</p>
              <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <select
                  value={selectedProjectId}
                  onChange={(event) =>
                    setSelectedProjectIds((current) => ({
                      ...current,
                      [task.id]: event.target.value,
                    }))
                  }
                  disabled={isLoading || projects.length === 0}
                  aria-label={`Proyecto para ${task.title}`}
                  className="min-w-56 rounded-xl border border-gray-200 bg-gray-50 p-2 text-sm font-medium text-gray-800 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void assignTask(task)}
                  disabled={isLoading || projects.length === 0}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? 'Asignando...' : 'Asignar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
