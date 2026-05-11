'use client';
import { useState } from 'react';
import { Project } from '@/types';
import { useRouter } from 'next/navigation';
import { formatProjectDate } from '@/lib/formatDate';
import { deleteProject, updateProject } from '@/lib/data';
import ConfirmDialog from './ConfirmDialog';

type ProjectPlazo = Project['plazo'];

export default function EditableProject({ project }: { project: Project }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [plazo, setPlazo] = useState<ProjectPlazo>(project.plazo || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleUpdate = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('El proyecto necesita un título.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await updateProject({
        id: project.id,
        title: trimmedTitle,
        description,
        plazo,
      });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating project:', error);
      setError('No se pudo actualizar el proyecto. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    setError('');
    try {
      await deleteProject(project.id);
      setIsDeleteDialogOpen(false);
      router.push('/');
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('No se pudo eliminar el proyecto. Inténtalo de nuevo.');
      setIsDeleteDialogOpen(false);
      setIsLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-gray-800/80 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/60 mb-8 flex flex-col gap-5 relative backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white">Editar Proyecto</h2>
        </div>
        <div>
          <label htmlFor="edit-project-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Título
          </label>
          <input
            id="edit-project-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl dark:bg-gray-900/50 dark:border-gray-700 dark:text-white text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-400"
            placeholder="Título del proyecto"
            required
            aria-describedby={error ? 'edit-project-error' : undefined}
          />
        </div>
        <div>
          <label htmlFor="edit-project-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Descripción
          </label>
          <textarea
            id="edit-project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl dark:bg-gray-900/50 dark:border-gray-700 dark:text-white min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-400"
            placeholder="Descripción del proyecto"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-grow">
            <label htmlFor="edit-project-plazo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sección
            </label>
            <select
              id="edit-project-plazo"
              value={plazo}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlazo(e.target.value as ProjectPlazo)}
              className="p-4 bg-gray-50 border border-gray-200 rounded-xl dark:bg-gray-900/50 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition w-full appearance-none cursor-pointer"
            >
              <option value="">Sin plazo</option>
              <option value="Corto">Corto Plazo</option>
              <option value="Mediano">Mediano Plazo</option>
              <option value="Largo">Largo Plazo</option>
              <option value="Tareas">Tareas</option>
            </select>
          </div>
        </div>
        {error ? (
          <p id="edit-project-error" role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div className="flex gap-3 mt-2">
          <button onClick={handleUpdate} disabled={isLoading || !title.trim()} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition shadow-sm flex items-center gap-2">
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button
            onClick={() => {
              setError('');
              setIsEditing(false);
            }}
            disabled={isLoading}
            className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-8 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800/80 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/60 mb-8 relative group transition-all hover:shadow-md backdrop-blur-xl">
      <div className="absolute top-6 right-6 flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            setError('');
            setIsEditing(true);
          }}
          disabled={isLoading}
          className="bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm flex items-center gap-2 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Editar
        </button>
        <button
          onClick={() => setIsDeleteDialogOpen(true)}
          disabled={isLoading}
          className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm flex items-center gap-2 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          {isLoading ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>
      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Eliminar proyecto"
        description={`Esto eliminará "${project.title}" y todas sus tareas. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar proyecto"
        isLoading={isLoading}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />
      <h1 className="text-4xl font-extrabold mb-4 text-gray-900 dark:text-white pr-40 tracking-tight">{project.title}</h1>
      {project.plazo ? (
        <div className="inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm px-3 py-1.5 rounded-full mb-4 font-semibold border border-blue-100 dark:border-blue-800">
          Sección: {project.plazo}
        </div>
      ) : (
        <div className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm px-3 py-1.5 rounded-full mb-4 font-semibold">
          Sin plazo
        </div>
      )}
      <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg leading-relaxed whitespace-pre-wrap">{project.description || 'Sin descripción añadida.'}</p>
      {error ? (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-sm text-gray-500">
        <span>Creado el {formatProjectDate(project.created)}</span>
        <span className="font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">ID: {project.id}</span>
      </div>
    </div>
  );
}
