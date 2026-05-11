'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createProject } from '@/lib/data';

type QuickCaptureState = 'idle' | 'recording' | 'transcribing' | 'saving' | 'success' | 'error';

type TranscriptionResponse = {
  transcript?: string;
  error?: string;
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

export default function QuickVoiceTaskCapture() {
  const [isSupported, setIsSupported] = useState(false);
  const [state, setState] = useState<QuickCaptureState>('idle');
  const [error, setError] = useState('');
  const [lastTaskTitle, setLastTaskTitle] = useState('');
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
        throw new Error('La transcripción quedó vacía.');
      }

      setState('saving');
      await createProject({
        title: transcript,
        description: 'Creada desde captura rápida por voz.',
        plazo: 'Tareas',
      });
      setLastTaskTitle(transcript);
      setState('success');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo crear la tarea.');
      setState('error');
    }
  };

  const startRecording = async () => {
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function' || !('MediaRecorder' in window)) {
      setError('La grabación de audio no está disponible en este navegador.');
      setState('error');
      return;
    }

    setError('');
    setLastTaskTitle('');
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
        setError('No se pudo grabar el audio. Inténtalo de nuevo.');
        setState('error');
        stopStream();
      };

      recorder.onstop = () => {
        stopStream();

        const recordingMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeType });
        if (audioBlob.size === 0) {
          setError('No se recibió audio para transcribir.');
          setState('error');
          return;
        }

        void createTaskFromAudio(audioBlob, recordingMimeType);
      };

      recorder.start();
      setState('recording');
    } catch (error) {
      console.error('Microphone access error:', error);
      setError('No se pudo acceder al micrófono. Revisa los permisos del navegador.');
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
  const buttonLabel = state === 'recording' ? 'Detener' : 'Grabar tarea';
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
    <main className="min-h-dvh bg-gray-950 text-white flex flex-col px-4 py-3 overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 text-sm">
        <p className="font-semibold tracking-wide">Captura rápida</p>
        <Link href="/" className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-white/80 hover:text-white">
          Inicio
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="min-h-16 max-w-72">
          <p role="status" className="text-sm font-semibold uppercase tracking-wider text-blue-200">
            {statusText}
          </p>
          {state === 'success' && lastTaskTitle ? (
            <p className="mt-2 text-lg font-semibold leading-tight break-words">{lastTaskTitle}</p>
          ) : (
            <h1 className="mt-2 text-2xl font-bold leading-tight">Decí tu tarea</h1>
          )}
        </div>

        <button
          type="button"
          onClick={state === 'recording' ? stopRecording : startRecording}
          disabled={!isSupported || (isBusy && state !== 'recording')}
          className="grid h-32 w-32 place-items-center rounded-full bg-blue-500 px-4 text-base font-bold text-white shadow-xl shadow-blue-950/40 transition hover:bg-blue-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300"
        >
          {buttonLabel}
        </button>

        <div className="min-h-14 max-w-72">
          {!isSupported ? (
            <p className="text-sm font-medium text-amber-200">La grabación no está disponible en este navegador.</p>
          ) : null}
          {state === 'recording' ? <p className="text-sm text-white/70">Tocá detener cuando termines.</p> : null}
          {state === 'transcribing' ? <p className="text-sm text-white/70">Procesando el audio con OpenAI.</p> : null}
          {state === 'saving' ? <p className="text-sm text-white/70">Añadiendo la tarjeta a Tareas.</p> : null}
          {state === 'success' ? <p className="text-sm text-green-200">Podés grabar otra tarea.</p> : null}
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
