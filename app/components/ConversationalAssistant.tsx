'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

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
  action: 'delete_task';
  taskId: string;
  taskTitle: string;
};

const AUDIO_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
const defaultSuggestions = ['Crear tarea para mañana', 'Que tengo para hoy?', 'Tareas vencidas', 'Mostrar Inbox'];

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

function nextMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ConversationalAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Decime que queres hacer con tus tareas.',
    },
  ]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState(defaultSuggestions);
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
    if (!trimmed || isLoading) return;

    setInput('');
    setIsLoading(true);
    setStatus('Procesando');
    setMessages((current) => [...current, { id: nextMessageId(), role: 'user', text: trimmed }]);

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, pendingAction }),
      });
      const data = (await response.json()) as ConversationResponse;
      const reply = data.reply || 'No pude procesar el mensaje.';

      if (!response.ok) {
        throw new Error(reply);
      }

      setMessages((current) => [...current, { id: nextMessageId(), role: 'assistant', text: reply }]);
      setSuggestions(data.suggestions?.length ? data.suggestions : defaultSuggestions);
      setPendingAction(data.pendingAction || null);
      router.refresh();
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: nextMessageId(), role: 'assistant', text: error instanceof Error ? error.message : 'No pude procesar el mensaje.' },
      ]);
    } finally {
      setIsLoading(false);
      setStatus('');
    }
  };

  const transcribeAudio = async (audioBlob: Blob, mimeType: string) => {
    setIsLoading(true);
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

      setIsLoading(false);
      setStatus('');
      await sendMessage(transcript);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: nextMessageId(), role: 'assistant', text: error instanceof Error ? error.message : 'No pude transcribir el audio.' },
      ]);
      setIsLoading(false);
      setStatus('');
    }
  };

  const startRecording = async () => {
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function' || !('MediaRecorder' in window)) {
      setMessages((current) => [...current, { id: nextMessageId(), role: 'assistant', text: 'La grabacion no esta disponible en este navegador.' }]);
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
        setMessages((current) => [...current, { id: nextMessageId(), role: 'assistant', text: 'No se pudo grabar el audio.' }]);
      };

      recorder.onstop = () => {
        setIsRecording(false);
        stopStream();

        const recordingMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeType });
        if (audioBlob.size === 0) {
          setMessages((current) => [...current, { id: nextMessageId(), role: 'assistant', text: 'No se recibio audio para transcribir.' }]);
          return;
        }

        void transcribeAudio(audioBlob, recordingMimeType);
      };

      recorder.start();
      setIsRecording(true);
      setStatus('Grabando');
    } catch (error) {
      console.error('Conversation microphone error:', error);
      stopStream();
      setMessages((current) => [...current, { id: nextMessageId(), role: 'assistant', text: 'No se pudo acceder al microfono.' }]);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.stop();
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white">Conversar</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Habla o escribe para operar tus tareas.</p>
        </div>
        {status ? <p role="status" className="text-sm font-semibold text-blue-600 dark:text-blue-300">{status}</p> : null}
      </div>

      <div className="mt-4 flex max-h-[420px] flex-col gap-3 overflow-y-auto rounded-lg bg-gray-50 p-3 dark:bg-gray-950">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[86%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-6 ${
              message.role === 'user'
                ? 'ml-auto bg-blue-600 text-white'
                : 'mr-auto border border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => void sendMessage(suggestion)}
            disabled={isLoading || isRecording}
            className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage(input);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Escribe una operacion..."
          aria-label="Mensaje conversacional"
          disabled={isLoading || isRecording}
          className="min-h-11 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-950 outline-none transition focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isSupported || (isLoading && !isRecording)}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
          >
            {isRecording ? 'Detener' : 'Hablar'}
          </button>
          <button
            type="submit"
            disabled={isLoading || isRecording || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </form>
    </section>
  );
}
