'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProjectSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('q') || '';
  const currentParams = searchParams.toString();
  const [query, setQuery] = useState(currentQuery);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(currentParams);
      params.set('view', 'projects');

      if (query) {
        params.set('q', query);
      } else {
        params.delete('q');
      }

      if (params.get('q') === currentQuery && params.get('view') === 'projects') {
        return;
      }

      router.push(`/?${params.toString()}`);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [currentParams, currentQuery, query, router]);

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar proyectos por titulo o descripcion..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Buscar proyectos"
        className="w-full rounded-lg border border-gray-200 bg-white p-3 shadow-sm outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
    </div>
  );
}
