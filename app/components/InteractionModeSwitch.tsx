'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

type Props = {
  visual: ReactNode;
  conversational: ReactNode;
  desktopNav: ReactNode;
  mobileNav: ReactNode;
};

export default function InteractionModeSwitch({ visual, conversational, desktopNav, mobileNav }: Props) {
  const [mode, setMode] = useState<'visual' | 'conversational'>('visual');
  const isVisualMode = mode === 'visual';
  const modeSwitch = (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => setMode('visual')}
        aria-pressed={isVisualMode}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${
          isVisualMode
            ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
      >
        Vistas
      </button>
      <button
        type="button"
        onClick={() => setMode('conversational')}
        aria-pressed={!isVisualMode}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${
          !isVisualMode
            ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
      >
        Conversar
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-950 dark:bg-gray-950 dark:text-white">
      <div className={`mx-auto grid min-h-screen max-w-[1600px] ${isVisualMode ? 'lg:grid-cols-[240px_1fr]' : ''}`}>
        {isVisualMode ? (
          <aside className="hidden border-r border-gray-200 bg-white/80 px-5 py-6 dark:border-gray-800 dark:bg-gray-900/70 lg:block">
            <div className="sticky top-6 space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-300">Epixodo Lite</p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Panel</h1>
              </div>
              {desktopNav}
            </div>
          </aside>
        ) : null}

        <div className="min-w-0 px-4 py-4 pb-24 sm:px-6 sm:py-5 lg:px-8 lg:py-8 lg:pb-10">
          <header className="mb-5 space-y-4 lg:mb-8">
            <div className="flex items-start justify-between gap-3">
              <div className={isVisualMode ? 'lg:hidden' : ''}>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-300">Epixodo Lite</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Panel</h1>
              </div>
              <div className="ml-auto shrink-0">{modeSwitch}</div>
            </div>

            {isVisualMode ? (
              <div className="sticky top-0 z-20 -mx-4 border-b border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 sm:-mx-6 sm:px-6 lg:hidden">
                {mobileNav}
              </div>
            ) : null}
          </header>

          <section className="mx-auto max-w-6xl">{isVisualMode ? visual : conversational}</section>
        </div>
      </div>
    </main>
  );
}
