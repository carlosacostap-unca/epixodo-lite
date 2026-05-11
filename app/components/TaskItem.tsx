'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Task } from '@/types';
import { deleteTask, updateTask } from '@/lib/data';
import {
  dateTimeInputToPocketDate,
  formatPocketDateTime,
  pocketDateToDateTimeInput,
} from '@/lib/taskDates';
import ConfirmDialog from './ConfirmDialog';

type TaskPlazo = Task['plazo'];

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

export default function TaskItem({ task }: { task: Task }) {
  const [isCompleted, setIsCompleted] = useState(task.is_completed);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [realizationAt, setRealizationAt] = useState(pocketDateToDateTimeInput(task.realization_at));
  const [dueAt, setDueAt] = useState(pocketDateToDateTimeInput(task.due_at));
  const [plazo, setPlazo] = useState<TaskPlazo>(task.plazo || '');
  const [error, setError] = useState('');
  const router = useRouter();

  const resetEditState = () => {
    setTitle(task.title);
    setDescription(task.description || '');
    setRealizationAt(pocketDateToDateTimeInput(task.realization_at));
    setDueAt(pocketDateToDateTimeInput(task.due_at));
    setPlazo(task.plazo || '');
    setError('');
    setIsEditing(false);
  };

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
      setError('La tarea necesita un titulo.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await updateTask({
        id: task.id,
        title: trimmedTitle,
        description: description.trim(),
        realization_at: dateTimeInputToPocketDate(realizationAt),
        due_at: dateTimeInputToPocketDate(dueAt),
        plazo,
      });
      setTitle(trimmedTitle);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating task:', error);
      setError('No se pudo actualizar la tarea. Intentalo de nuevo.');
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
    <div className={`group flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${isCompleted ? 'opacity-70' : ''}`}>
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

          {isEditing ? (
            <div className="flex w-full flex-col gap-3">
              <input
                type="text"
                aria-label="Titulo de tarea"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (error) setError('');
                }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                autoFocus
                required
                aria-describedby={error ? `task-error-${task.id}` : undefined}
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                aria-label="Descripcion de tarea"
                placeholder="Descripcion opcional"
                rows={2}
                className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 p-2 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                  Realizacion
                  <input
                    type="datetime-local"
                    value={realizationAt}
                    onChange={(event) => setRealizationAt(event.target.value)}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                  Vencimiento
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(event) => setDueAt(event.target.value)}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                  Plazo
                  <select
                    value={plazo}
                    onChange={(event) => setPlazo(event.target.value as TaskPlazo)}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Sin plazo</option>
                    <option value="Corto">Corto</option>
                    <option value="Mediano">Mediano</option>
                    <option value="Largo">Largo</option>
                  </select>
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={handleUpdate} disabled={isLoading || !title.trim()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50">
                  {isLoading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={resetEditState}
                  disabled={isLoading}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="min-w-0 flex-grow">
              <p className={`text-lg font-medium transition-all ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
                {title}
              </p>
              {task.description ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-500 dark:text-gray-400">{task.description}</p> : null}
              <div className="mt-2">
                <TaskMetadata task={task} />
              </div>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex flex-shrink-0 justify-end gap-2 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <button
              onClick={() => {
                setError('');
                setIsEditing(true);
              }}
              disabled={isLoading}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              aria-label="Editar tarea"
              title="Editar tarea"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isLoading}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              aria-label="Eliminar tarea"
              title="Eliminar tarea"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        )}
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
        <p id={`task-error-${task.id}`} role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
