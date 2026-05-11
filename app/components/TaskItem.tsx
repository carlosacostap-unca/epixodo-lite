'use client';

import { useState } from 'react';
import { Task } from '@/types';
import { useRouter } from 'next/navigation';
import { deleteTask, updateTask } from '@/lib/data';
import ConfirmDialog from './ConfirmDialog';

export default function TaskItem({ task }: { task: Task }) {
  const [isCompleted, setIsCompleted] = useState(task.is_completed);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [error, setError] = useState('');
  const router = useRouter();

  const toggleStatus = async () => {
    setIsLoading(true);
    setError('');
    const newStatus = !isCompleted;
    setIsCompleted(newStatus);
    try {
      await updateTask({
        id: task.id,
        is_completed: newStatus,
      });
      router.refresh();
    } catch (error) {
      setIsCompleted(!newStatus);
      console.error('Error updating task status:', error);
      setError('No se pudo actualizar el estado de la tarea.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('La tarea necesita un título.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await updateTask({
        id: task.id,
        title: trimmedTitle,
      });
      setTitle(trimmedTitle);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating task title:', error);
      setError('No se pudo actualizar la tarea. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    setIsLoading(true);
    setError('');
    try {
      await deleteTask(task.id);
      setIsDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('No se pudo eliminar la tarea. Inténtalo de nuevo.');
      setIsDeleteDialogOpen(false);
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all group gap-3 ${isCompleted ? 'opacity-70' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 flex-grow">
          <div className="pt-1 sm:pt-0 flex-shrink-0">
            <input
              type="checkbox"
              aria-label={`Marcar tarea ${task.title}`}
              checked={isCompleted}
              onChange={toggleStatus}
              disabled={isLoading}
              className="w-6 h-6 cursor-pointer rounded-full border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-blue-600 transition disabled:cursor-not-allowed"
            />
          </div>
          {isEditing ? (
            <div className="flex flex-col sm:flex-row gap-2 flex-grow w-full">
              <input
                type="text"
                aria-label="Título de tarea"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError('');
                }}
                className="flex-grow p-2 bg-gray-50 border border-gray-200 rounded-xl dark:bg-gray-900 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                autoFocus
                required
                aria-describedby={error ? `task-error-${task.id}` : undefined}
              />
              <div className="flex gap-2">
                <button onClick={handleUpdate} disabled={isLoading || !title.trim()} className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                  {isLoading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => {
                    setTitle(task.title);
                    setError('');
                    setIsEditing(false);
                  }}
                  disabled={isLoading}
                  className="text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <span className={`text-lg font-medium transition-all ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
              {task.title}
            </span>
          )}
        </div>
        {!isEditing && (
          <div className="flex gap-2 flex-shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity justify-end">
            <button
              onClick={() => {
                setError('');
                setIsEditing(true);
              }}
              disabled={isLoading}
              className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition disabled:opacity-50"
              aria-label="Editar tarea"
              title="Editar tarea"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isLoading}
              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
              aria-label="Eliminar tarea"
              title="Eliminar tarea"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Eliminar tarea"
        description={`Esto eliminará "${task.title}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar tarea"
        isLoading={isLoading}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteTask}
      />
      {error ? (
        <p id={`task-error-${task.id}`} role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
