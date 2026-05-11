'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  if (mimeType.includes('mp4')) return 'voice-task.mp4';
  return 'voice-task.webm';
}

export default function VoiceTaskCapture() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const transcribeAudio = async (audioBlob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setError('');
    setSuccess('');

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

      const nextTranscript = data.transcript?.trim();
      if (!nextTranscript) {
        throw new Error('La transcripcion quedo vacia.');
      }

      setTranscript(nextTranscript);
    } catch (error) {
      console.error('Voice transcription error:', error);
      setError(error instanceof Error ? error.message : 'No se pudo transcribir el audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function' || !('MediaRecorder' in window)) {
      setError('La grabacion de audio no esta disponible en este navegador.');
      return;
    }

    setError('');
    setSuccess('');
    setTranscript('');
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
        setIsRecording(false);
        stopStream();
      };

      recorder.onstop = () => {
        setIsRecording(false);
        stopStream();

        const recordingMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeType });
        if (audioBlob.size === 0) {
          setError('No se recibio audio para transcribir.');
          return;
        }

        void transcribeAudio(audioBlob, recordingMimeType);
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access error:', error);
      setError('No se pudo acceder al microfono. Revisa los permisos del navegador.');
      stopStream();
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.stop();
    }
  };

  const handleSave = async () => {
    const title = transcript.trim();
    if (!title) {
      setError('Graba o escribe una tarea antes de guardarla.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/quick-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = (await response.json()) as QuickTaskResponse;

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo guardar la tarea.');
      }

      setTranscript('');
      setSuccess(data.assignedProjectTitle ? `Tarea asignada a ${data.assignedProjectTitle}.` : 'Tarea creada sin proyecto.');
      router.refresh();
    } catch (error) {
      console.error('Error creating voice task:', error);
      setError(error instanceof Error ? error.message : 'No se pudo guardar la tarea dictada. Intentalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = isRecording || isTranscribing || isSaving;

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
              if (success) setSuccess('');
            }}
            placeholder="Graba una tarea para crearla con IA"
            aria-label="Texto dictado"
            aria-describedby={error ? 'voice-task-error' : success ? 'voice-task-success' : 'voice-task-status'}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl dark:bg-gray-900 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            disabled={isRecording || isTranscribing || isSaving}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isSupported || isTranscribing || isSaving}
            className="bg-gray-900 text-white px-5 py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition shadow-sm font-medium whitespace-nowrap dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            {isRecording ? 'Detener grabacion' : 'Grabar tarea'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isBusy || !transcript.trim()}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-sm font-medium whitespace-nowrap"
          >
            {isSaving ? 'Guardando...' : 'Crear tarea'}
          </button>
        </div>
      </div>
      {!isSupported ? (
        <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
          La grabacion de audio no esta disponible en este navegador.
        </p>
      ) : null}
      {isRecording || isTranscribing ? (
        <p id="voice-task-status" role="status" className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400">
          {isRecording ? 'Grabando...' : 'Transcribiendo con OpenAI...'}
        </p>
      ) : null}
      {error ? (
        <p id="voice-task-error" role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {success ? (
        <p id="voice-task-success" role="status" className="mt-3 text-sm font-medium text-green-700 dark:text-green-300">
          {success}
        </p>
      ) : null}
    </section>
  );
}
