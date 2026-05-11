import { createRoutedVoiceTask } from '@/lib/voiceTaskRouting';

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

  try {
    const result = await createRoutedVoiceTask(title);
    return Response.json(result);
  } catch (error) {
    console.error('Quick task create error:', error);
    return jsonError('No se pudo guardar la tarea.', 500);
  }
}
