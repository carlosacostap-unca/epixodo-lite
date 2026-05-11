'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/lib/data';

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
};

type BrowserSpeechRecognitionErrorEvent = Event & {
  error?: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onend: ((event: Event) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

export default function VoiceTaskCapture() {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const router = useRouter();

  useEffect(() => {
    setIsSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));

    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('El dictado por voz no está disponible en este navegador.');
      return;
    }

    setError('');
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let nextTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        nextTranscript += event.results[index][0].transcript;
      }

      setTranscript(nextTranscript.trim());
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError('No se pudo tomar el dictado. Inténtalo de nuevo.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const handleSave = async () => {
    const title = transcript.trim();
    if (!title) {
      setError('Dicta o escribe una tarea antes de guardarla.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await createProject({
        title,
        description: 'Creada por dictado de voz.',
        plazo: 'Tareas',
      });
      setTranscript('');
      router.refresh();
    } catch (error) {
      console.error('Error creating voice task:', error);
      setError('No se pudo guardar la tarea dictada. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <label htmlFor="voice-task-transcript" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tarea por voz
          </label>
          <input
            id="voice-task-transcript"
            type="text"
            value={transcript}
            onChange={(event) => {
              setTranscript(event.target.value);
              if (error) setError('');
            }}
            placeholder="Dicta una tarea para enviarla a Tareas"
            aria-label="Texto dictado"
            aria-describedby={error ? 'voice-task-error' : undefined}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl dark:bg-gray-900 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            disabled={isSaving}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={!isSupported || isSaving}
            className="bg-gray-900 text-white px-5 py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition shadow-sm font-medium whitespace-nowrap dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            {isListening ? 'Detener dictado' : 'Dictar tarea'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !transcript.trim()}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-sm font-medium whitespace-nowrap"
          >
            {isSaving ? 'Guardando...' : 'Guardar en Tareas'}
          </button>
        </div>
      </div>
      {!isSupported ? (
        <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
          El dictado por voz no está disponible en este navegador.
        </p>
      ) : null}
      {error ? (
        <p id="voice-task-error" role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </section>
  );
}
