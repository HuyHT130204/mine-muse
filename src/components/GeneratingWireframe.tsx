'use client';

import React from 'react';

interface GeneratingWireframeProps {
  logs: string[];
  onStop?: () => void;
}

export default function GeneratingWireframe({ logs, onStop }: GeneratingWireframeProps) {
  const progressPercent = Math.min(100, Math.round((logs.length / 8) * 100));
  const listRef = React.useRef<HTMLUListElement | null>(null);

  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // Auto-scroll to bottom so new items appear while older are pushed up
    el.scrollTop = el.scrollHeight;
  }, [logs]);
  return (
    <div className="mb-8 animate-[mm-fade-in_var(--duration-slow)_var(--ease-standard)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Generating Content</h2>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center text-sm text-gray-500">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-2" />
            Working...
          </span>
          {onStop && (
            <button onClick={onStop} className="h-7 px-3 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium">
              Stop
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: skeleton cards */}
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="border border-gray-100 rounded-xl p-4 mm-card">
              <div className="h-4 w-32 rounded mb-3 mm-shimmer" />
              <div className="flex space-x-2 mb-3">
                {['', '', '', ''].map((__, i) => (
                  <div key={i} className="h-6 w-16 rounded-full mm-shimmer" />
                ))}
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full rounded mm-shimmer" />
                <div className="h-4 w-5/6 rounded mm-shimmer" />
                <div className="h-4 w-4/6 rounded mm-shimmer" />
              </div>
            </div>
          ))}
        </div>

        {/* Right: live logs and progress - fixed height, scrollable */}
        <div className="border border-gray-100 rounded-xl p-4 bg-white mm-card">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-900">Progress</div>
              <div className="text-xs text-gray-500">{progressPercent}%</div>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)',
                  transition: 'width var(--duration-slow) var(--ease-emphasized)'
                }}
              />
            </div>
          </div>
          <ul ref={listRef} className="text-[13px] space-y-2 max-h-80 overflow-y-auto pr-1">
            {logs.map((line, i) => (
              <li key={i} className="relative flex items-center">
                <span className="mr-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
                <div className="relative flex-1 rounded-md border border-blue-100 bg-blue-50/60 px-3 py-2 overflow-hidden">
                  <span className="absolute inset-0 mm-shimmer opacity-40" />
                  <span className="relative whitespace-pre-wrap text-blue-900">{line}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}


