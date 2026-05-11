const OPENAI_TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';
const TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe-2025-12-15';
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

type OpenAITranscriptionResponse = {
  text?: string;
  error?: {
    message?: string;
  };
};

const useE2EFixtures = process.env.NEXT_PUBLIC_E2E_MOCKS === '1';

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const audio = formData.get('audio');

  if (!(audio instanceof File)) {
    return jsonError('Falta el audio para transcribir.', 400);
  }

  if (audio.size === 0) {
    return jsonError('El audio recibido está vacío.', 400);
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return jsonError('El audio supera el límite de 25 MB.', 413);
  }

  if (useE2EFixtures) {
    return Response.json({ transcript: 'Llamar al proveedor' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError('Falta configurar OPENAI_API_KEY en el servidor.', 500);
  }

  const openAIFormData = new FormData();
  openAIFormData.append('file', audio, audio.name || 'voice-task.webm');
  openAIFormData.append('model', TRANSCRIPTION_MODEL);
  openAIFormData.append('language', 'es');
  openAIFormData.append('response_format', 'json');
  openAIFormData.append('prompt', 'Transcribe una tarea breve en español para una lista de pendientes.');

  const response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: openAIFormData,
  });

  const data = (await response.json()) as OpenAITranscriptionResponse;

  if (!response.ok) {
    const message = data.error?.message || 'OpenAI no pudo transcribir el audio.';
    return jsonError(message, response.status);
  }

  const transcript = data.text?.trim();
  if (!transcript) {
    return jsonError('OpenAI devolvió una transcripción vacía.', 422);
  }

  return Response.json({ transcript });
}
