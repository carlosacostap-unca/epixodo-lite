'use client';

import { useState } from 'react';

type Props = {
  visual: React.ReactNode;
  conversational: React.ReactNode;
};

export default function InteractionModeSwitch({ visual, conversational }: Props) {
  const [mode, setMode] = useState<'visual' | 'conversational'>('visual');

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setMode('visual')}
          aria-pressed={mode === 'visual'}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            mode === 'visual'
              ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          Vistas
        </button>
        <button
          type="button"
          onClick={() => setMode('conversational')}
          aria-pressed={mode === 'conversational'}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            mode === 'conversational'
              ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          Conversar
        </button>
      </div>

      {mode === 'visual' ? visual : conversational}
    </div>
  );
}
