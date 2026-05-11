'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTask } from '@/lib/data';

export default function CreateTask({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Agrega un título para crear la tarea.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await createTask({
        title: trimmedTitle,
        is_completed: false,
        project: projectId,
      });
      setTitle('');
      router.refresh();
    } catch (error) {
      console.error('Error creating task:', error);
      setError('No se pudo crear la tarea. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-2 space-y-2">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <label htmlFor="task-title" className="sr-only">
            Título de la tarea
          </label>
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
          <input
            id="task-title"
            type="text"
            placeholder="Añadir nueva tarea..."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition dark:text-white placeholder-gray-400"
            disabled={isLoading}
            required
            aria-describedby={error ? 'create-task-error' : undefined}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !title.trim()}
          className="bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition shadow-sm whitespace-nowrap flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Agregando...
            </>
          ) : (
            'Agregar Tarea'
          )}
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
