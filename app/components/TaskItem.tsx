'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project, Task } from '@/types';
import { deleteTask, updateTask } from '@/lib/data';
import { formatPocketDateTime } from '@/lib/taskDates';
import ConfirmDialog from './ConfirmDialog';
import TaskDetailDialog from './TaskDetailDialog';

function TaskMetadata({ task }: { task: Task }) {
  const items = [
    task.plazo ? `Plazo: ${task.plazo}` : '',
    task.realization_at ? `Realizacion: ${formatPocketDateTime(task.realization_at)}` : '',
    task.due_at ? `Vence: ${formatPocketDateTime(task.due_at)}` : '',
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-900/70">
          {item}
        </span>
      ))}
    </div>
  );
}

export default function TaskItem({ task, projects }: { task: Task; projects: Project[] }) {
  const [isCompleted, setIsCompleted] = useState(task.is_completed);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

  const handleDeleteTask = async () => {
    setIsLoading(true);
    setError('');
    try {
      await deleteTask(task.id);
      setIsDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('No se pudo eliminar la tarea. Intentalo de nuevo.');
      setIsDeleteDialogOpen(false);
      setIsLoading(false);
    }
  };

  return (
    <div className={`group flex flex-col gap-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${isCompleted ? 'opacity-70' : ''}`}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-grow items-start gap-4">
          <div className="pt-1">
            <input
              type="checkbox"
              aria-label={`Marcar tarea ${task.title}`}
              checked={isCompleted}
              onChange={toggleStatus}
              disabled={isLoading}
              className="h-6 w-6 cursor-pointer rounded-full border-gray-300 text-blue-600 transition focus:ring-blue-500 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-blue-600"
            />
          </div>

          <TaskDetailDialog
            task={{ ...task, is_completed: isCompleted }}
            projects={projects}
            triggerLabel={`Abrir detalles de ${task.title}`}
            triggerClassName="min-w-0 flex-grow rounded-lg text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            onSaved={(updatedTask) => setIsCompleted(updatedTask.is_completed)}
          >
            <span className="block">
              <span className={`block text-lg font-medium transition-all ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
                {task.title}
              </span>
              {task.description ? (
                <span className="mt-1 block whitespace-pre-wrap text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {task.description}
                </span>
              ) : null}
              <span className="mt-2 block">
                <TaskMetadata task={task} />
              </span>
            </span>
          </TaskDetailDialog>
        </div>

        <div className="flex flex-shrink-0 justify-end gap-2 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isLoading}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            aria-label="Eliminar tarea"
            title="Eliminar tarea"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Eliminar tarea"
        description={`Esto eliminara "${task.title}". Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar tarea"
        isLoading={isLoading}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteTask}
      />

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
