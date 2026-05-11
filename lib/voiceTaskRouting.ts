import { analyzeTaskRouting, fallbackTaskTitle, type ProjectCandidate, type TaskRoutingAnalysis } from '@/lib/aiTaskRouting';
import { createE2ETask, listE2EProjects } from '@/lib/e2eStore';
import { pb } from '@/lib/pocketbase';
import { dateTimeInputToPocketDate } from '@/lib/taskDates';
import type { Project, Task } from '@/types';

const useE2EFixtures = process.env.NEXT_PUBLIC_E2E_MOCKS === '1';

export type RoutedVoiceTaskResult = {
  task: Task;
  taskTitle: string;
  projectId: string | null;
  assignedProjectTitle: string | null;
  isUnassigned: boolean;
  confidence: TaskRoutingAnalysis['confidence'];
};

function toCandidate(project: Project): ProjectCandidate {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
  };
}

export async function listProjectCandidatesForRouting() {
  if (useE2EFixtures) {
    return listE2EProjects().map(toCandidate);
  }

  const projects = await pb.collection('projects').getFullList<Project>({
    sort: 'order,-created',
  });

  return projects.map(toCandidate);
}

function normalizeRouting(analysis: TaskRoutingAnalysis, projects: ProjectCandidate[]) {
  const matchedProject =
    analysis.confidence === 'high' && analysis.projectId
      ? projects.find((project) => project.id === analysis.projectId) || null
      : null;

  return {
    taskTitle: fallbackTaskTitle(analysis.taskTitle),
    taskDescription: analysis.taskDescription,
    realizationAt: analysis.realizationAt,
    dueAt: analysis.dueAt,
    plazo: analysis.plazo,
    matchedProject,
    confidence: analysis.confidence,
  };
}

function aiDateToPocketDate(value: string | null) {
  if (!value) return '';
  return dateTimeInputToPocketDate(value);
}

export async function createRoutedVoiceTask(transcript: string): Promise<RoutedVoiceTaskResult> {
  const projects = await listProjectCandidatesForRouting();
  const fallbackAnalysis: TaskRoutingAnalysis = {
    taskTitle: fallbackTaskTitle(transcript),
    taskDescription: '',
    projectId: null,
    realizationAt: null,
    dueAt: null,
    plazo: null,
    confidence: 'low',
    reason: 'Fallback local.',
  };

  let analysis = fallbackAnalysis;
  try {
    analysis = await analyzeTaskRouting(transcript, projects);
  } catch (error) {
    console.error('AI task routing failed; creating unassigned task:', error);
  }

  const { taskTitle, taskDescription, realizationAt, dueAt, plazo, matchedProject, confidence } = normalizeRouting(analysis, projects);
  const taskInput = {
    title: taskTitle,
    description: taskDescription,
    is_completed: false,
    ...(aiDateToPocketDate(realizationAt) ? { realization_at: aiDateToPocketDate(realizationAt) } : {}),
    ...(aiDateToPocketDate(dueAt) ? { due_at: aiDateToPocketDate(dueAt) } : {}),
    ...(plazo ? { plazo } : {}),
    ...(matchedProject ? { project: matchedProject.id } : {}),
  };

  const task = useE2EFixtures ? createE2ETask(taskInput) : await pb.collection('tasks').create<Task>(taskInput);

  return {
    task,
    taskTitle,
    projectId: matchedProject?.id || null,
    assignedProjectTitle: matchedProject?.title || null,
    isUnassigned: !matchedProject,
    confidence,
  };
}
