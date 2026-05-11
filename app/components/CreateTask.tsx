'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTask } from '@/lib/data';
import { dateTimeInputToPocketDate } from '@/lib/taskDates';
import type { Task } from '@/types';

type TaskPlazo = Task['plazo'];

export default function CreateTask({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [realizationAt, setRealizationAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [plazo, setPlazo] = useState<TaskPlazo>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setRealizationAt('');
    setDueAt('');
    setPlazo('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Agrega un titulo para crear la tarea.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await createTask({
        title: trimmedTitle,
        description: description.trim(),
        is_completed: false,
        project: projectId,
        realization_at: dateTimeInputToPocketDate(realizationAt),
        due_at: dateTimeInputToPocketDate(dueAt),
        plazo,
      });
      clearForm();
      router.refresh();
    } catch (error) {
      console.error('Error creating task:', error);
      setError('No se pudo crear la tarea. Intentalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-2 space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label htmlFor="task-title" className="sr-only">
            Titulo de la tarea
          </label>
          <input
            id="task-title"
            type="text"
            placeholder="Añadir nueva tarea..."
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (error) setError('');
            }}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white"
            disabled={isLoading}
            required
            aria-describedby={error ? 'create-task-error' : undefined}
          />
        </div>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Descripcion opcional"
          aria-label="Descripcion de la tarea"
          rows={2}
          disabled={isLoading}
          className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white"
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-600 dark:text-gray-300">
            Realizacion
            <input
              type="datetime-local"
              value={realizationAt}
              onChange={(event) => setRealizationAt(event.target.value)}
              disabled={isLoading}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-600 dark:text-gray-300">
            Vencimiento
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              disabled={isLoading}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-600 dark:text-gray-300">
            Plazo
            <select
              value={plazo}
              onChange={(event) => setPlazo(event.target.value as TaskPlazo)}
              disabled={isLoading}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white"
            >
              <option value="">Sin plazo</option>
              <option value="Corto">Corto</option>
              <option value="Mediano">Mediano</option>
              <option value="Largo">Largo</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading || !title.trim()}
          className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
        >
          {isLoading ? 'Agregando...' : 'Agregar Tarea'}
        </button>
      </div>

      {error ? (
        <p id="create-task-error" role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
