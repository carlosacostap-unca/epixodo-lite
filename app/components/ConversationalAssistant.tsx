'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type ConversationResponse = {
  reply?: string;
  suggestions?: string[];
  pendingAction?: PendingAction | null;
};

type TranscriptionResponse = {
  transcript?: string;
  error?: string;
};

type PendingAction = {
  action: string;
  [key: string]: unknown;
};

type ScreenState = 'idle' | 'processing' | 'result';

const AUDIO_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
const defaultSuggestions = ['Crear tarea para manana', 'Que tengo para hoy?', 'Tareas vencidas', 'Mostrar Inbox'];

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return '';
  }

  return AUDIO_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
}

function getAudioFileName(mimeType: string) {
  if (mimeType.includes('mp4')) return 'conversation.mp4';
  return 'conversation.webm';
}

export default function ConversationalAssistant() {
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [reply, setReply] = useState('Decime que queres hacer con tus tareas.');
  const [lastRequest, setLastRequest] = useState('');
  const [suggestions, setSuggestions] = useState(defaultSuggestions);
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    setIsSupported(typeof navigator.mediaDevices?.getUserMedia === 'function' && 'MediaRecorder' in window);

    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder?.state === 'recording') {
        recorder.onstop = null;
        recorder.stop();
      }
      stopStream();
    };
  }, [stopStream]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || screenState === 'processing') return;

    setLastRequest(trimmed);
    setScreenState('processing');
    setStatus('Procesando');

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, pendingAction }),
      });
      const data = (await response.json()) as ConversationResponse;
      const nextReply = data.reply || 'No pude procesar el mensaje.';

      if (!response.ok) {
        throw new Error(nextReply);
      }

      setReply(nextReply);
      setSuggestions(data.suggestions?.length ? data.suggestions : defaultSuggestions);
      setPendingAction(data.pendingAction || null);
      router.refresh();
    } catch (error) {
      setReply(error instanceof Error ? error.message : 'No pude procesar el mensaje.');
    } finally {
      setScreenState('result');
      setStatus('');
    }
  };

  const transcribeAudio = async (audioBlob: Blob, mimeType: string) => {
    setScreenState('processing');
    setStatus('Transcribiendo');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, getAudioFileName(mimeType));
      const response = await fetch('/api/voice-task/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json()) as TranscriptionResponse;

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo transcribir el audio.');
      }

      const transcript = data.transcript?.trim();
      if (!transcript) {
        throw new Error('La transcripcion quedo vacia.');
      }

      await sendMessage(transcript);
    } catch (error) {
      setReply(error instanceof Error ? error.message : 'No pude transcribir el audio.');
      setScreenState('result');
      setStatus('');
    }
  };

  const startRecording = async () => {
    if (screenState === 'processing') return;

    if (typeof navigator.mediaDevices?.getUserMedia !== 'function' || !('MediaRecorder' in window)) {
      setReply('La grabacion no esta disponible en este navegador.');
      setScreenState('result');
      return;
    }

    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setIsRecording(false);
        stopStream();
        setReply('No se pudo grabar el audio.');
        setScreenState('result');
      };

      recorder.onstop = () => {
        setIsRecording(false);
        stopStream();

        const recordingMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeType });
        if (audioBlob.size === 0) {
          setReply('No se recibio audio para transcribir.');
          setScreenState('result');
          return;
        }

        void transcribeAudio(audioBlob, recordingMimeType);
      };

      recorder.start();
      setIsRecording(true);
      setStatus('Grabando');
      setScreenState('idle');
    } catch (error) {
      console.error('Conversation microphone error:', error);
      stopStream();
      setReply('No se pudo acceder al microfono.');
      setScreenState('result');
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.stop();
    }
  };

  const isBusy = screenState === 'processing';

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <style jsx>{`
        @keyframes conversational-reveal {
          from {
            clip-path: inset(0 100% 0 0);
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            clip-path: inset(0 0 0 0);
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes conversational-pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.72;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.28;
          }
        }

        .reply-reveal {
          animation: conversational-reveal 520ms ease-out both;
        }

        .voice-pulse {
          animation: conversational-pulse 1.4s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .reply-reveal,
          .voice-pulse {
            animation: none;
          }
        }
      `}</style>

      <div className="min-h-[440px] px-4 py-4 sm:min-h-[520px] sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto flex min-h-[400px] max-w-3xl flex-col justify-between gap-4 sm:min-h-[480px] sm:gap-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-950 dark:text-white sm:text-xl">Conversar</h2>
              {lastRequest ? <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">Ultimo pedido: {lastRequest}</p> : null}
            </div>
            {status ? (
              <p role="status" className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                {status}
              </p>
            ) : null}
          </div>

          <div className="flex flex-1 items-center justify-center">
            {screenState === 'processing' ? (
              <div className="w-full text-center" aria-live="polite">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-600/10">
                  <span className="voice-pulse h-16 w-16 rounded-full bg-blue-600" />
                </div>
                <p className="text-2xl font-extrabold text-gray-950 dark:text-white">Procesando</p>
              </div>
            ) : screenState === 'result' ? (
              <div key={reply} className="reply-reveal w-full" aria-live="polite">
                <p className="whitespace-pre-wrap text-balance text-xl font-bold leading-tight text-gray-950 dark:text-white sm:text-4xl">
                  {reply}
                </p>
              </div>
            ) : (
              <div className="w-full text-center">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!isSupported && !isRecording}
                  aria-pressed={isRecording}
                  className="mx-auto flex aspect-square w-44 max-w-[64vw] flex-col items-center justify-center rounded-full bg-gray-950 text-white shadow-xl shadow-gray-950/20 transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-100 sm:w-64"
                >
                  <span className="text-xs font-bold uppercase tracking-wide sm:text-sm">{isRecording ? 'Grabando' : 'Presionar'}</span>
                  <span className="mt-1 text-4xl font-black sm:mt-2 sm:text-5xl">{isRecording ? 'Detener' : 'Hablar'}</span>
                </button>
                {!isSupported ? <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">Microfono no disponible</p> : null}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {screenState === 'result' ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!isSupported || isBusy}
                  className="rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-100 sm:px-5 sm:py-3"
                >
                  {isRecording ? 'Detener' : 'Hablar de nuevo'}
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void sendMessage(suggestion)}
                  disabled={isBusy || isRecording}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 sm:px-3 sm:text-xs"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
