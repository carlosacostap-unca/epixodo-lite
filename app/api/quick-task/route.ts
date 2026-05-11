import { createE2EProject } from '@/lib/e2eStore';
import { pb } from '@/lib/pocketbase';
import { QUICK_TASK_DESCRIPTION } from '@/lib/projectSections';
import type { Project } from '@/types';

const useE2EFixtures = process.env.NEXT_PUBLIC_E2E_MOCKS === '1';

type QuickTaskRequest = {
  title?: unknown;
};

type PocketBaseValidationError = {
  status?: number;
  response?: {
    data?: {
      plazo?: unknown;
    };
  };
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isUnsupportedTareasError(error: unknown) {
  const validationError = error as PocketBaseValidationError;
  return validationError.status === 400 && Boolean(validationError.response?.data?.plazo);
}

export async function POST(request: Request) {
  const body = (await request.json()) as QuickTaskRequest;
  const title = typeof body.title === 'string' ? body.title.trim() : '';

  if (!title) {
    return jsonError('Falta el texto de la tarea.', 400);
  }

  const projectInput = {
    title,
    description: QUICK_TASK_DESCRIPTION,
    plazo: 'Tareas' as Project['plazo'],
  };

  try {
    if (useE2EFixtures) {
      return Response.json({ project: createE2EProject(projectInput) });
    }

    try {
      const project = await pb.collection('projects').create<Project>(projectInput);
      return Response.json({ project });
    } catch (error) {
      if (!isUnsupportedTareasError(error)) {
        throw error;
      }

      const project = await pb.collection('projects').create<Project>({
        ...projectInput,
        plazo: '',
      });
      return Response.json({ project, usedFallbackSection: true });
    }
  } catch (error) {
    console.error('Quick task create error:', error);
    return jsonError('No se pudo guardar la tarea en Tareas.', 500);
  }
}
