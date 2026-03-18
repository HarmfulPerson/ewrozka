'use client';

import { useEffect, useRef, useState } from 'react';
import { TopicDto } from '../lib/api';

interface TopicDropdownProps {
  topics: TopicDto[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

export function TopicDropdown({ topics, selected, onChange }: TopicDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const label =
    selected.length === 0
      ? 'Specjalizacje'
      : selected.length === 1
        ? topics.find(t => t.id === selected[0])?.name ?? 'Specjalizacje'
        : `Specjalizacje (${selected.length})`;

  return (
    <div className="ogl-dropdown" ref={ref}>
      <button
        type="button"
        className={`ogl-dropdown__trigger${selected.length > 0 ? ' ogl-dropdown__trigger--active' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
        </svg>
        <span>{label}</span>
        <svg
          className={`ogl-dropdown__chevron${open ? ' ogl-dropdown__chevron--open' : ''}`}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="ogl-dropdown__menu">
          {topics.map(t => (
            <label key={t.id} className="ogl-dropdown__item">
              <input
                type="checkbox"
                checked={selected.includes(t.id)}
                onChange={() => toggle(t.id)}
                className="ogl-dropdown__checkbox"
              />
              <span className={`ogl-dropdown__checkmark${selected.includes(t.id) ? ' ogl-dropdown__checkmark--checked' : ''}`}>
                {selected.includes(t.id) && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span className="ogl-dropdown__label">{t.name}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <button
              type="button"
              className="ogl-dropdown__clear"
              onClick={() => { onChange([]); setOpen(false); }}
            >
              Wyczyść
            </button>
          )}
        </div>
      )}
    </div>
  );
}
