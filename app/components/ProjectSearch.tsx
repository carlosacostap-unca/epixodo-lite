'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ProjectSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query) {
        router.push(`/?q=${encodeURIComponent(query)}`);
      } else {
        router.push(`/`);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query, router]);

  return (
    <div className="mb-6">
      <input
        type="text"
        placeholder="Buscar proyectos por título o descripción..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full p-3 border rounded-lg shadow-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
      />
    </div>
  );
}
