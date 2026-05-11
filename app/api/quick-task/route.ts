import { createE2EProject } from '@/lib/e2eStore';
import { pb } from '@/lib/pocketbase';
import type { Project } from '@/types';

const useE2EFixtures = process.env.NEXT_PUBLIC_E2E_MOCKS === '1';

type QuickTaskRequest = {
  title?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const body = (await request.json()) as QuickTaskRequest;
  const title = typeof body.title === 'string' ? body.title.trim() : '';

  if (!title) {
    return jsonError('Falta el texto de la tarea.', 400);
  }

  const projectInput = {
    title,
    description: 'Creada desde captura rápida por voz.',
    plazo: 'Tareas' as Project['plazo'],
  };

  try {
    if (useE2EFixtures) {
      return Response.json({ project: createE2EProject(projectInput) });
    }

    const project = await pb.collection('projects').create<Project>(projectInput);
    return Response.json({ project });
  } catch (error) {
    console.error('Quick task create error:', error);
    return jsonError('No se pudo guardar la tarea en Tareas.', 500);
  }
}
