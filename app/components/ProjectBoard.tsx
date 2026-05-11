'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Project } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatProjectDate } from '@/lib/formatDate';
import { updateProjectOrder } from '@/lib/data';

type ProjectPlazo = Project['plazo'];

const COLUMNS = [
  { id: 'Corto', title: 'Corto Plazo', color: 'bg-red-50/50 dark:bg-red-900/10', headerColor: 'text-red-600 dark:text-red-400' },
  { id: 'Mediano', title: 'Mediano Plazo', color: 'bg-yellow-50/50 dark:bg-yellow-900/10', headerColor: 'text-yellow-600 dark:text-yellow-400' },
  { id: 'Largo', title: 'Largo Plazo', color: 'bg-green-50/50 dark:bg-green-900/10', headerColor: 'text-green-600 dark:text-green-400' },
  { id: 'Tareas', title: 'Tareas', color: 'bg-cyan-50/50 dark:bg-cyan-900/10', headerColor: 'text-cyan-700 dark:text-cyan-300' },
  { id: '', title: 'Sin plazo', color: 'bg-gray-50 dark:bg-gray-800/50', headerColor: 'text-gray-600 dark:text-gray-400' }
] as const;

const longPressDelay = 550;
const orderErrorMessage = 'No se pudo guardar el nuevo orden. Revisa la conexión e inténtalo de nuevo.';

export default function ProjectBoard({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [moveProject, setMoveProject] = useState<Project | null>(null);
  const [isMovingProject, setIsMovingProject] = useState(false);
  const [orderError, setOrderError] = useState('');
  const moveDialogTitleId = useId();
  const moveDialogDescriptionId = useId();
  const longPressTimerRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!moveProject) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isMovingProject) {
        setMoveProject(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMovingProject, moveProject]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('projectId', projectId);
    setDraggedProjectId(projectId);
    setOrderError('');
  };

  const handleDragEnd = () => {
    setDraggedProjectId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const persistProjectOrder = async (updatedProjects: Project[]) => {
    try {
      setOrderError('');
      await updateProjectOrder(updatedProjects);
      router.refresh();
    } catch (error) {
      console.error('Error updating project orders:', error);
      setOrderError(orderErrorMessage);
      setProjects(initialProjects);
    }
  };

  const applyProjectOrder = (updatedProjects: Project[]) => {
    setProjects(prev => {
      const newProjects = [...prev];
      updatedProjects.forEach(up => {
        const idx = newProjects.findIndex(p => p.id === up.id);
        if (idx !== -1) newProjects[idx] = up;
      });
      return newProjects;
    });
  };

  const moveProjectToColumn = async (project: Project, newPlazo: ProjectPlazo) => {
    if ((project.plazo || '') === newPlazo) {
      setMoveProject(null);
      return;
    }

    setIsMovingProject(true);
    const columnProjects = projects.filter(p => (p.plazo || '') === newPlazo && p.id !== project.id);
    columnProjects.sort((a, b) => (a.order || 0) - (b.order || 0));
    columnProjects.push({ ...project, plazo: newPlazo });

    const updatedProjects = columnProjects.map((p, index) => ({ ...p, order: index }));
    applyProjectOrder(updatedProjects);
    await persistProjectOrder(updatedProjects);
    setIsMovingProject(false);
    setMoveProject(null);
  };

  const handleTouchPointerDown = (event: React.PointerEvent, project: Project) => {
    if (event.pointerType === 'mouse') return;

    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = true;
      setMoveProject(project);
      setDraggedProjectId(null);
    }, longPressDelay);
  };

  const handleTouchPointerEnd = () => {
    clearLongPressTimer();

    if (suppressNextClickRef.current) {
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 500);
    }
  };

  const handleProjectLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!suppressNextClickRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    suppressNextClickRef.current = false;
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
    const columnProjects = projects.filter(p => (p.plazo || '') === targetPlazo && p.id !== draggedId);
    columnProjects.sort((a, b) => (a.order || 0) - (b.order || 0));

    const targetIndex = columnProjects.findIndex(p => p.id === targetProjectId);
    columnProjects.splice(targetIndex, 0, { ...draggedProject, plazo: targetPlazo });

    const updatedProjects = columnProjects.map((p, index) => ({ ...p, order: index }));
    applyProjectOrder(updatedProjects);
    await persistProjectOrder(updatedProjects);
  };

  const handleDropOnColumn = async (e: React.DragEvent, newPlazo: ProjectPlazo) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('projectId');
    if (!draggedId) return;

    const draggedProject = projects.find(p => p.id === draggedId);
    if (!draggedProject) return;

    const columnProjects = projects.filter(p => (p.plazo || '') === newPlazo && p.id !== draggedId);
    columnProjects.sort((a, b) => (a.order || 0) - (b.order || 0));
    columnProjects.push({ ...draggedProject, plazo: newPlazo });

    const updatedProjects = columnProjects.map((p, index) => ({ ...p, order: index }));
    applyProjectOrder(updatedProjects);
    await persistProjectOrder(updatedProjects);
  };

  return (
    <div className="flex flex-col gap-6 pb-6 min-h-[500px]">
      {orderError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          {orderError}
        </p>
      ) : null}
      {COLUMNS.map(column => {
        const columnProjects = projects
          .filter(p => (p.plazo || '') === column.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        return (
          <div
            key={column.id}
            data-testid={`project-section-${column.id || 'sin-plazo'}`}
            className={`w-full rounded-2xl p-6 border border-gray-200 dark:border-gray-700 transition-colors ${column.color}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnColumn(e, column.id)}
          >
            <h3
              aria-label={column.title}
              className={`font-bold mb-6 flex items-center justify-between text-xl ${column.headerColor}`}
            >
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
                  onPointerDown={(e) => handleTouchPointerDown(e, project)}
                  onPointerMove={handleTouchPointerEnd}
                  onPointerUp={handleTouchPointerEnd}
                  onPointerCancel={handleTouchPointerEnd}
                  data-testid={`project-card-${project.id}`}
                  className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative flex flex-col h-full select-none ${draggedProjectId === project.id ? 'opacity-50' : 'opacity-100'}`}
                >
                  <Link href={`/projects/${project.id}`} onClick={handleProjectLinkClick} className="flex-1 flex flex-col">
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 leading-tight">{project.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 flex-1 leading-relaxed">
                      {project.description || 'Sin descripción'}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50 dark:border-gray-700/50">
                      <div className="text-xs font-medium text-gray-500 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1.5 rounded-md">
                        {formatProjectDate(project.created)}
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
      {moveProject ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/50 px-4 py-6 backdrop-blur-sm sm:items-center">
          <button
            type="button"
            aria-label="Cerrar selector de sección"
            className="absolute inset-0 cursor-default"
            disabled={isMovingProject}
            onClick={() => setMoveProject(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={moveDialogTitleId}
            aria-describedby={moveDialogDescriptionId}
            className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            <h2 id={moveDialogTitleId} className="text-lg font-bold text-gray-950 dark:text-white">
              Mover proyecto
            </h2>
            <p id={moveDialogDescriptionId} className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Elige a qué sección mover <span className="font-medium">{moveProject.title}</span>.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2">
              {COLUMNS.map(column => {
                const isCurrent = (moveProject.plazo || '') === column.id;

                return (
                  <button
                    key={column.id}
                    type="button"
                    disabled={isMovingProject || isCurrent}
                    onClick={() => moveProjectToColumn(moveProject, column.id)}
                    className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    <span>{column.title}</span>
                    {isCurrent ? <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Actual</span> : null}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={isMovingProject}
              onClick={() => setMoveProject(null)}
              className="mt-4 w-full rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
