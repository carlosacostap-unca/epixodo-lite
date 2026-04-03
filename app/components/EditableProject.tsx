'use client';
import { useState } from 'react';
import { pb } from '@/lib/pocketbase';
import { Project } from '@/types';
import { useRouter } from 'next/navigation';

export default function EditableProject({ project }: { project: Project }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [plazo, setPlazo] = useState(project.plazo || '');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdate = async () => {
    if (!title.trim()) return;
    setIsLoading(true);
    try {
      await pb.collection('projects').update(project.id, {
        title,
        description,
        plazo,
      });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Error al actualizar el proyecto.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este proyecto y todas sus tareas?')) return;
    setIsLoading(true);
    try {
      await pb.collection('projects').delete(project.id);
      router.push('/');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error al eliminar el proyecto.');
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
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          className="p-4 bg-gray-50 border border-gray-200 rounded-xl dark:bg-gray-900/50 dark:border-gray-700 dark:text-white text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-400"
          placeholder="Título del proyecto"
        />
        <textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          className="p-4 bg-gray-50 border border-gray-200 rounded-xl dark:bg-gray-900/50 dark:border-gray-700 dark:text-white min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-400"
          placeholder="Descripción del proyecto"
        />
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-grow">
            <select 
              value={plazo} 
              onChange={(e: any) => setPlazo(e.target.value)}
              className="p-4 bg-gray-50 border border-gray-200 rounded-xl dark:bg-gray-900/50 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition w-full appearance-none cursor-pointer"
            >
              <option value="">Sin plazo</option>
              <option value="Corto">Corto Plazo</option>
              <option value="Mediano">Mediano Plazo</option>
              <option value="Largo">Largo Plazo</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <button onClick={handleUpdate} disabled={isLoading} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2">
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button onClick={() => setIsEditing(false)} disabled={isLoading} className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-8 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition">
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
          onClick={() => setIsEditing(true)}
          className="bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Editar
        </button>
        <button 
          onClick={handleDelete}
          className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Eliminar
        </button>
      </div>
      <h1 className="text-4xl font-extrabold mb-4 text-gray-900 dark:text-white pr-40 tracking-tight">{project.title}</h1>
      {project.plazo ? (
        <div className="inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm px-3 py-1.5 rounded-full mb-4 font-semibold border border-blue-100 dark:border-blue-800">
          Plazo: {project.plazo}
        </div>
      ) : (
        <div className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm px-3 py-1.5 rounded-full mb-4 font-semibold">
          Sin plazo
        </div>
      )}
      <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg leading-relaxed whitespace-pre-wrap">{project.description || 'Sin descripción añadida.'}</p>
      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-sm text-gray-500">
        <span>Creado el {new Date(project.created).toLocaleDateString()}</span>
        <span className="font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">ID: {project.id}</span>
      </div>
    </div>
  );
}
