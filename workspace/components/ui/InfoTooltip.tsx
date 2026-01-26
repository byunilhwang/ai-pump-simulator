'use client';

import { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  title: string;
  children: React.ReactNode;
}

export default function InfoTooltip({ title, children }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={tooltipRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ml-2 w-5 h-5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white text-xs font-bold transition-colors flex items-center justify-center"
        aria-label={`${title} 설명 보기`}
      >
        ?
      </button>
      
      {isOpen && (
        <div className="absolute z-50 left-0 top-full mt-2 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-xl p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-semibold">{title}</h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-slate-300 text-sm leading-relaxed space-y-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
