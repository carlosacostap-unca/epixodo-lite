'use client';

import { useState } from 'react';
import { pb } from '@/lib/pocketbase';
import { useRouter } from 'next/navigation';

export default function CreateTask({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    
    setIsLoading(true);
    try {
      await pb.collection('tasks').create({
        title,
        is_completed: false,
        project: projectId,
      });
      setTitle('');
      router.refresh(); // Refresh server component data
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error al crear la tarea. Revisa la consola para más detalles.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-2 flex flex-col sm:flex-row gap-3">
      <div className="relative flex-grow">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </div>
        <input
          type="text"
          placeholder="Añadir nueva tarea..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition dark:text-white placeholder-gray-400"
          disabled={isLoading}
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
    </form>
  );
}
