'use client';
import { useState } from 'react';
import { pb } from '@/lib/pocketbase';
import { useRouter } from 'next/navigation';

export default function CreateProject() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [plazo, setPlazo] = useState<'Corto' | 'Mediano' | 'Largo' | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setIsLoading(true);
    try {
      await pb.collection('projects').create({
        title,
        description,
        plazo,
      });
      setTitle('');
      setDescription('');
      setPlazo('');
      router.refresh();
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error al crear el proyecto. Revisa la consola para más detalles.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Crear Nuevo Proyecto
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4">
          <input
            type="text"
            placeholder="Título del proyecto"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl dark:bg-gray-900 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            disabled={isLoading}
          />
        </div>
        <div className="md:col-span-4">
          <input
            type="text"
            placeholder="Descripción breve (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl dark:bg-gray-900 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            disabled={isLoading}
          />
        </div>
        <div className="md:col-span-4 flex gap-3">
          <select
            value={plazo}
            onChange={(e: any) => setPlazo(e.target.value)}
            className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl dark:bg-gray-900 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            disabled={isLoading}
          >
            <option value="">Sin plazo</option>
            <option value="Corto">Corto Plazo</option>
            <option value="Mediano">Mediano Plazo</option>
            <option value="Largo">Largo Plazo</option>
          </select>
          <button 
            type="submit" 
            disabled={isLoading || !title.trim()}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-sm font-medium whitespace-nowrap"
          >
            {isLoading ? '...' : 'Crear'}
          </button>
        </div>
      </div>
    </form>
  );
}
