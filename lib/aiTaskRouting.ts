export type ProjectCandidate = {
  id: string;
  title: string;
  description: string;
};

export type TaskRoutingAnalysis = {
  taskTitle: string;
  projectId: string | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
};

type OpenAIResponseContent = {
  type?: string;
  text?: string;
};

type OpenAIResponseOutput = {
  content?: OpenAIResponseContent[];
};

type OpenAIResponsesPayload = {
  output_text?: string;
  output?: OpenAIResponseOutput[];
};

const DEFAULT_MODEL = 'gpt-5-mini';

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function fallbackTaskTitle(transcript: string) {
  const normalized = normalizeWhitespace(transcript)
    .replace(
      /^(bueno|eh|em|este|por favor|recordame que|recordar que|tengo que|hay que|necesito que|quiero que|me gustaria que)\s+/i,
      '',
    )
    .replace(/[.?!]+$/g, '');

  if (!normalized) return 'Nueva tarea';
  return normalized.charAt(0).toLocaleUpperCase('es-AR') + normalized.slice(1);
}

function extractOutputText(payload: OpenAIResponsesPayload) {
  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  for (const output of payload.output || []) {
    for (const content of output.content || []) {
      if (typeof content.text === 'string') {
        return content.text;
      }
    }
  }

  return '';
}

function coerceAnalysis(value: unknown, transcript: string): TaskRoutingAnalysis {
  const input = value as Partial<TaskRoutingAnalysis>;
  const confidence = input.confidence === 'high' || input.confidence === 'medium' || input.confidence === 'low' ? input.confidence : 'low';
  const projectId = typeof input.projectId === 'string' && input.projectId.trim() ? input.projectId.trim() : null;
  const taskTitle = typeof input.taskTitle === 'string' && input.taskTitle.trim() ? fallbackTaskTitle(input.taskTitle) : fallbackTaskTitle(transcript);
  const reason = typeof input.reason === 'string' ? input.reason : '';

  return {
    taskTitle,
    projectId,
    confidence,
    reason,
  };
}

function mockAnalysis(transcript: string, projects: ProjectCandidate[]): TaskRoutingAnalysis {
  const title = fallbackTaskTitle(transcript);
  const lowerTranscript = transcript.toLocaleLowerCase('es-AR');
  const launchProject = projects.find((project) => project.title.toLocaleLowerCase('es-AR').includes('lanzamiento'));

  if (launchProject && (lowerTranscript.includes('lanzamiento') || lowerTranscript.includes('producto'))) {
    return {
      taskTitle: title,
      projectId: launchProject.id,
      confidence: 'high',
      reason: 'Coincide con el proyecto de lanzamiento.',
    };
  }

  return {
    taskTitle: title,
    projectId: null,
    confidence: 'low',
    reason: 'No hay un proyecto suficientemente claro.',
  };
}

export async function analyzeTaskRouting(transcript: string, projects: ProjectCandidate[]): Promise<TaskRoutingAnalysis> {
  if (process.env.NEXT_PUBLIC_E2E_MOCKS === '1') {
    return mockAnalysis(transcript, projects);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TASK_ROUTING_MODEL || DEFAULT_MODEL,
      input: [
        {
          role: 'system',
          content:
            [
              'Analiza tareas dictadas en espanol rioplatense.',
              'No copies la transcripcion literal: transforma el texto hablado en un titulo breve, limpio y accionable.',
              'Elimina muletillas, repeticiones, saludos, explicaciones meta y frases como "tengo que", "me gustaria", "recordame que".',
              'El titulo debe ser natural para una lista de tareas, idealmente entre 3 y 10 palabras.',
              'No inventes informacion que no este en el audio.',
              'Decide si corresponde asignarla a un proyecto existente.',
              'Solo usa confidence high cuando el proyecto es claramente mencionado o inferible sin ambiguedad.',
              'Si no hay confianza alta, deja projectId en null.',
            ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({
            transcript,
            projects,
          }),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'task_routing',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              taskTitle: {
                type: 'string',
                description: 'Titulo refinado, breve y accionable para la tarea.',
              },
              projectId: {
                type: ['string', 'null'],
                description: 'Id exacto del proyecto elegido, o null si no hay confianza alta.',
              },
              confidence: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
              },
              reason: {
                type: 'string',
              },
            },
            required: ['taskTitle', 'projectId', 'confidence', 'reason'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI task routing failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as OpenAIResponsesPayload;
  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error('OpenAI task routing returned an empty response.');
  }

  return coerceAnalysis(JSON.parse(outputText), transcript);
}
