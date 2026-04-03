'use client';
import { useState, useEffect } from 'react';
import { Project } from '@/types';
import Link from 'next/link';
import { pb } from '@/lib/pocketbase';
import { useRouter } from 'next/navigation';

const COLUMNS = [
  { id: 'Corto', title: 'Corto Plazo', color: 'bg-red-50/50 dark:bg-red-900/10', headerColor: 'text-red-600 dark:text-red-400' },
  { id: 'Mediano', title: 'Mediano Plazo', color: 'bg-yellow-50/50 dark:bg-yellow-900/10', headerColor: 'text-yellow-600 dark:text-yellow-400' },
  { id: 'Largo', title: 'Largo Plazo', color: 'bg-green-50/50 dark:bg-green-900/10', headerColor: 'text-green-600 dark:text-green-400' },
  { id: '', title: 'Sin plazo', color: 'bg-gray-50 dark:bg-gray-800/50', headerColor: 'text-gray-600 dark:text-gray-400' }
] as const;

export default function ProjectBoard({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('projectId', projectId);
    setDraggedProjectId(projectId);
    // Optional: set drag image or effect
  };

  const handleDragEnd = () => {
    setDraggedProjectId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDropOnProject = async (e: React.DragEvent, targetProjectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedId = e.dataTransfer.getData('projectId');
    if (!draggedId || draggedId === targetProjectId) return;

    const draggedProject = projects.find(p => p.id === draggedId);
    const targetProject = projects.find(p => p.id === targetProjectId);
    if (!draggedProject || !targetProject) return;

    const targetPlazo = targetProject.plazo || '';
    
    // Obtener los proyectos de la columna destino (excluyendo el que se está moviendo)
    let columnProjects = projects.filter(p => (p.plazo || '') === targetPlazo && p.id !== draggedId);
    // Asegurarse de que están ordenados por su orden actual o índice
    columnProjects.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Encontrar el índice donde queremos insertar
    const targetIndex = columnProjects.findIndex(p => p.id === targetProjectId);
    
    // Insertar el proyecto arrastrado en la nueva posición
    columnProjects.splice(targetIndex, 0, { ...draggedProject, plazo: targetPlazo as any });

    // Reasignar los valores de "order" (0, 1, 2, ...)
    const updatedProjects = columnProjects.map((p, index) => ({ ...p, order: index }));

    // Actualización optimista de la UI
    setProjects(prev => {
      const newProjects = [...prev];
      updatedProjects.forEach(up => {
        const idx = newProjects.findIndex(p => p.id === up.id);
        if (idx !== -1) newProjects[idx] = up;
      });
      return newProjects;
    });

    // Guardar los cambios en PocketBase
    try {
      await Promise.all(updatedProjects.map(up => 
        pb.collection('projects').update(up.id, { plazo: up.plazo, order: up.order })
      ));
      router.refresh();
    } catch (error) {
      console.error('Error updating project orders:', error);
      alert('Aviso: Hubo un problema guardando el orden. Asegúrate de que creaste el campo "order" (tipo Number) en la colección "projects" en PocketBase.');
      // Revert on failure
      setProjects(initialProjects);
    }
  };

  const handleDropOnColumn = async (e: React.DragEvent, newPlazo: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('projectId');
    if (!draggedId) return;

    const draggedProject = projects.find(p => p.id === draggedId);
    if (!draggedProject) return;

    // Si ya está en la columna y se soltó en la columna (no sobre un proyecto específico), lo ponemos al final
    let columnProjects = projects.filter(p => (p.plazo || '') === newPlazo && p.id !== draggedId);
    columnProjects.sort((a, b) => (a.order || 0) - (b.order || 0));

    columnProjects.push({ ...draggedProject, plazo: newPlazo as any });

    const updatedProjects = columnProjects.map((p, index) => ({ ...p, order: index }));

    // Actualización optimista de la UI
    setProjects(prev => {
      const newProjects = [...prev];
      updatedProjects.forEach(up => {
        const idx = newProjects.findIndex(p => p.id === up.id);
        if (idx !== -1) newProjects[idx] = up;
      });
      return newProjects;
    });

    try {
      await Promise.all(updatedProjects.map(up => 
        pb.collection('projects').update(up.id, { plazo: up.plazo, order: up.order })
      ));
      router.refresh();
    } catch (error) {
      console.error('Error updating project orders:', error);
      alert('Aviso: Hubo un problema guardando el orden. Asegúrate de que creaste el campo "order" (tipo Number) en la colección "projects" en PocketBase.');
      setProjects(initialProjects);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-6 min-h-[500px]">
      {COLUMNS.map(column => {
        const columnProjects = projects
          .filter(p => (p.plazo || '') === column.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        return (
          <div 
            key={column.id}
            className={`w-full rounded-2xl p-6 border border-gray-200 dark:border-gray-700 transition-colors ${column.color}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnColumn(e, column.id)}
          >
            <h3 className={`font-bold mb-6 flex items-center justify-between text-xl ${column.headerColor}`}>
              {column.title}
              <span className="bg-white/80 dark:bg-gray-800 text-sm py-1.5 px-3.5 rounded-full shadow-sm text-gray-700 dark:text-gray-300 font-medium">
                {columnProjects.length} {columnProjects.length === 1 ? 'proyecto' : 'proyectos'}
              </span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 min-h-[120px]">
              {columnProjects.map(project => (
                <div
                  key={project.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, project.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnProject(e, project.id)}
                  className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative flex flex-col h-full ${draggedProjectId === project.id ? 'opacity-50' : 'opacity-100'}`}
                >
                  <Link href={`/projects/${project.id}`} className="flex-1 flex flex-col">
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 leading-tight">{project.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 flex-1 leading-relaxed">
                      {project.description || 'Sin descripción'}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50 dark:border-gray-700/50">
                      <div className="text-xs font-medium text-gray-500 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1.5 rounded-md">
                        {new Date(project.created).toLocaleDateString()}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
              {columnProjects.length === 0 && (
                <div className="col-span-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center text-gray-400 text-sm h-32 flex flex-col items-center justify-center gap-3">
                  <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-full">
                    <svg className="w-6 h-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                  </div>
                  <span className="font-medium">Arrastra un proyecto aquí</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
