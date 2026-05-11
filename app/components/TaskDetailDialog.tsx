'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project, Task } from '@/types';
import { updateTask } from '@/lib/data';
import { dateTimeInputToPocketDate, pocketDateToDateTimeInput } from '@/lib/taskDates';

type TaskPlazo = Task['plazo'];

type Props = {
  task: Task;
  projects: Project[];
  children: React.ReactNode;
  triggerClassName: string;
  triggerLabel: string;
  onSaved?: (task: Task) => void;
};

export default function TaskDetailDialog({ task, projects, children, triggerClassName, triggerLabel, onSaved }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [isCompleted, setIsCompleted] = useState(task.is_completed);
  const [projectId, setProjectId] = useState(task.project || '');
  const [realizationAt, setRealizationAt] = useState(pocketDateToDateTimeInput(task.realization_at));
  const [dueAt, setDueAt] = useState(pocketDateToDateTimeInput(task.due_at));
  const [plazo, setPlazo] = useState<TaskPlazo>(task.plazo || '');
  const [error, setError] = useState('');
  const titleId = useId();
  const descriptionId = useId();
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    setTitle(task.title);
    setDescription(task.description || '');
    setIsCompleted(task.is_completed);
    setProjectId(task.project || '');
    setRealizationAt(pocketDateToDateTimeInput(task.realization_at));
    setDueAt(pocketDateToDateTimeInput(task.due_at));
    setPlazo(task.plazo || '');
    setError('');
  }, [isOpen, task]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, isOpen]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('La tarea necesita un titulo.');
      return;
    }

    const updatedTask: Task = {
      ...task,
      title: trimmedTitle,
      description: description.trim(),
      is_completed: isCompleted,
      project: projectId,
      realization_at: dateTimeInputToPocketDate(realizationAt),
      due_at: dateTimeInputToPocketDate(dueAt),
      plazo,
    };

    setIsLoading(true);
    setError('');

    try {
      await updateTask({
        id: task.id,
        title: updatedTask.title,
        description: updatedTask.description,
        is_completed: updatedTask.is_completed,
        project: updatedTask.project,
        realization_at: updatedTask.realization_at,
        due_at: updatedTask.due_at,
        plazo: updatedTask.plazo,
      });
      onSaved?.(updatedTask);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating task detail:', error);
      setError('No se pudo guardar la tarea. Intentalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button type="button" aria-label={triggerLabel} onClick={() => setIsOpen(true)} className={triggerClassName}>
        {children}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/55 px-0 py-0 backdrop-blur-sm sm:items-stretch sm:justify-end sm:px-6 sm:py-6">
          <button
            type="button"
            aria-label="Cerrar detalle de tarea"
            className="absolute inset-0 cursor-default"
            disabled={isLoading}
            onClick={() => setIsOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:h-full sm:max-h-none sm:max-w-xl sm:rounded-2xl"
          >
            <header className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id={titleId} className="text-xl font-bold text-gray-950 dark:text-white">
                    Detalle de tarea
                  </h2>
                  <p id={descriptionId} className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Edita los datos principales sin perder el contexto del workspace.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                  aria-label="Cerrar"
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Titulo
                  <input
                    type="text"
                    aria-label="Titulo de tarea"
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      if (error) setError('');
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-base font-medium text-gray-950 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                    autoFocus
                    required
                  />
                </label>

                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Descripcion
                  <textarea
                    aria-label="Descripcion de tarea"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="mt-1 w-full resize-y rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-950 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200">
                  Completada
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={(event) => setIsCompleted(event.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900"
                  />
                </label>

                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Proyecto
                  <select
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-950 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="">Sin proyecto</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Realizacion
                    <input
                      type="datetime-local"
                      value={realizationAt}
                      onChange={(event) => setRealizationAt(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-950 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Vencimiento
                    <input
                      type="datetime-local"
                      value={dueAt}
                      onChange={(event) => setDueAt(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-950 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                    />
                  </label>
                </div>

                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Plazo
                  <select
                    value={plazo}
                    onChange={(event) => setPlazo(event.target.value as TaskPlazo)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-950 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="">Sin plazo</option>
                    <option value="Corto">Corto</option>
                    <option value="Mediano">Mediano</option>
                    <option value="Largo">Largo</option>
                  </select>
                </label>
              </div>
            </div>

            <footer className="border-t border-gray-200 px-5 py-4 dark:border-gray-700">
              {error ? (
                <p role="alert" className="mb-3 text-sm font-medium text-red-600 dark:text-red-300">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isLoading || !title.trim()}
                  onClick={handleSave}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? 'Guardando...' : 'Guardar tarea'}
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
