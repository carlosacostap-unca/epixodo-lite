import type { Project, Task } from '@/types';
import { formatPocketDateTime } from '@/lib/taskDates';
import TaskDetailDialog from './TaskDetailDialog';

type Props = {
  task: Task;
  projects: Project[];
  project?: Project;
};

export default function TaskSummaryCard({ task, projects, project }: Props) {
  const details = [
    task.plazo ? `Plazo: ${task.plazo}` : '',
    task.realization_at ? `Realizacion: ${formatPocketDateTime(task.realization_at)}` : '',
    task.due_at ? `Vence: ${formatPocketDateTime(task.due_at)}` : '',
  ].filter(Boolean);

  return (
    <TaskDetailDialog
      task={task}
      projects={projects}
      triggerLabel={`Abrir detalles de ${task.title}`}
      triggerClassName="block w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-900 dark:hover:bg-blue-950/20"
    >
      <span className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-1 h-3 w-3 flex-none rounded-full border ${task.is_completed ? 'border-green-500 bg-green-500' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900'}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold leading-snug text-gray-950 dark:text-white">{task.title}</span>
          {task.description ? (
            <span className="mt-1 block line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-gray-300">
              {task.description}
            </span>
          ) : null}
          <span className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            {project ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                {project.title}
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                Inbox
              </span>
            )}
            {details.map((detail) => (
              <span key={detail} className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
                {detail}
              </span>
            ))}
          </span>
        </span>
      </span>
    </TaskDetailDialog>
  );
}
