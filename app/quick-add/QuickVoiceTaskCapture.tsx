'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type QuickCaptureState = 'idle' | 'recording' | 'transcribing' | 'saving' | 'success' | 'error';

type TranscriptionResponse = {
  transcript?: string;
  error?: string;
};

type QuickTaskResponse = {
  error?: string;
  task?: {
    title: string;
  };
  assignedProjectTitle?: string | null;
  isUnassigned?: boolean;
};

const AUDIO_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return '';
  }

  return AUDIO_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
}

function getAudioFileName(mimeType: string) {
  if (mimeType.includes('mp4')) return 'quick-task.mp4';
  return 'quick-task.webm';
}

function getPlacementText(saveData: QuickTaskResponse) {
  if (saveData.assignedProjectTitle) {
    return `Asignada a ${saveData.assignedProjectTitle}`;
  }

  return 'Quedo en Inbox';
}

export default function QuickVoiceTaskCapture() {
  const [isSupported, setIsSupported] = useState(false);
  const [state, setState] = useState<QuickCaptureState>('idle');
  const [error, setError] = useState('');
  const [lastTaskTitle, setLastTaskTitle] = useState('');
  const [lastTaskPlacement, setLastTaskPlacement] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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

  const createTaskFromAudio = async (audioBlob: Blob, mimeType: string) => {
    setState('transcribing');
    setError('');

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

      setState('saving');
      const saveResponse = await fetch('/api/quick-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: transcript }),
      });
      const saveData = (await saveResponse.json()) as QuickTaskResponse;

      if (!saveResponse.ok) {
        throw new Error(saveData.error || 'No se pudo guardar la tarea.');
      }

      setLastTaskTitle(saveData.task?.title || transcript);
      setLastTaskPlacement(getPlacementText(saveData));
      setState('success');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo crear la tarea.');
      setState('error');
    }
  };

  const startRecording = async () => {
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function' || !('MediaRecorder' in window)) {
      setError('La grabacion de audio no esta disponible en este navegador.');
      setState('error');
      return;
    }

    setError('');
    setLastTaskTitle('');
    setLastTaskPlacement('');
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
        setError('No se pudo grabar el audio. Intentalo de nuevo.');
        setState('error');
        stopStream();
      };

      recorder.onstop = () => {
        stopStream();

        const recordingMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeType });
        if (audioBlob.size === 0) {
          setError('No se recibio audio para transcribir.');
          setState('error');
          return;
        }

        void createTaskFromAudio(audioBlob, recordingMimeType);
      };

      recorder.start();
      setState('recording');
    } catch (error) {
      console.error('Microphone access error:', error);
      setError('No se pudo acceder al microfono. Revisa los permisos del navegador.');
      setState('error');
      stopStream();
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.stop();
    }
  };

  const isBusy = state === 'recording' || state === 'transcribing' || state === 'saving';
  const buttonLabel = state === 'recording' ? 'Detener' : 'Grabar';
  const buttonAriaLabel = state === 'recording' ? 'Detener' : 'Grabar tarea';
  const statusText =
    state === 'recording'
      ? 'Grabando'
      : state === 'transcribing'
        ? 'Transcribiendo'
        : state === 'saving'
          ? 'Guardando'
          : state === 'success'
            ? 'Tarea creada'
            : state === 'error'
              ? 'No se pudo crear'
              : 'Listo';

  return (
    <main className="flex min-h-dvh flex-col overflow-hidden bg-gray-950 px-4 py-3 text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 text-xs">
        <p className="font-semibold tracking-wide text-white/80">Captura rapida</p>
        <Link href="/" className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white">
          Inicio
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="min-h-14 max-w-72">
          <p role="status" className="text-xs font-semibold uppercase tracking-wider text-blue-200">
            {statusText}
          </p>
          {state === 'success' && lastTaskTitle ? (
            <p className="mt-1.5 text-lg font-semibold leading-tight break-words">{lastTaskTitle}</p>
          ) : (
            <h1 className="mt-1.5 text-2xl font-bold leading-tight">Deci tu tarea</h1>
          )}
        </div>

        <button
          type="button"
          aria-label={buttonAriaLabel}
          onClick={state === 'recording' ? stopRecording : startRecording}
          disabled={!isSupported || (isBusy && state !== 'recording')}
          className="grid aspect-square w-[clamp(6.5rem,34vw,8rem)] place-items-center rounded-full bg-blue-500 px-4 text-base font-bold text-white shadow-xl shadow-blue-950/40 transition hover:bg-blue-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300"
        >
          {buttonLabel}
        </button>

        <div className="min-h-12 max-w-72">
          {!isSupported ? (
            <p className="text-sm font-medium text-amber-200">La grabacion no esta disponible en este navegador.</p>
          ) : null}
          {state === 'recording' ? <p className="text-sm text-white/70">Toca detener al terminar.</p> : null}
          {state === 'transcribing' ? <p className="text-sm text-white/70">OpenAI esta transcribiendo.</p> : null}
          {state === 'saving' ? <p className="text-sm text-white/70">Analizando y guardando.</p> : null}
          {state === 'success' ? <p className="text-sm text-green-200">{lastTaskPlacement || 'Podes grabar otra tarea.'}</p> : null}
          {state === 'error' && error ? (
            <p role="alert" className="text-sm font-medium text-red-200">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
