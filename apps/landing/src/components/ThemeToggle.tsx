import React, { useEffect, useRef, useState } from 'react';
import { Monitor, Moon, Sun } from '@phosphor-icons/react';
import type { ThemePreference } from '../hooks/useTheme';

export interface ThemeToggleProps {
  theme: ThemePreference;
  onChange: (next: ThemePreference) => void;
}

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  title: string;
}> = [
  { value: 'light', label: 'Claro', title: 'Modo claro' },
  { value: 'auto', label: 'Automático', title: 'Automático (según tu dispositivo)' },
  { value: 'dark', label: 'Oscuro', title: 'Modo oscuro' },
];

const renderIcon = (value: ThemePreference, size: number, active: boolean) => {
  if (value === 'light') {
    return <Sun size={size} weight={active ? 'fill' : 'regular'} aria-hidden="true" />;
  }
  if (value === 'dark') {
    return <Moon size={size} weight={active ? 'fill' : 'regular'} aria-hidden="true" />;
  }
  return <Monitor size={size} weight={active ? 'bold' : 'regular'} aria-hidden="true" />;
};

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onChange }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (mobileWrapRef.current && !mobileWrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  return (
    <>
      {/* Desktop: control segmentado idéntico al estilo del Hero */}
      <div
        role="radiogroup"
        aria-label="Tema de apariencia"
        className="hidden sm:inline-flex items-center p-0.5 rounded-lg bg-[var(--lp-soft)] border border-[var(--lp-line)] gap-0.5"
      >
        {OPTIONS.map((opt) => {
          const isSelected = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={opt.title}
              title={opt.title}
              onClick={() => onChange(opt.value)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs leading-none transition-colors cursor-pointer select-none ${
                isSelected
                  ? 'bg-[var(--lp-btn-bg)] text-[var(--lp-btn-ink)] shadow-xs font-semibold'
                  : 'text-[var(--lp-muted)] hover:text-[var(--lp-ink)]'
              }`}
            >
              {renderIcon(opt.value, 14, isSelected)}
              {opt.value === 'auto' && <span className="text-[11px]">Auto</span>}
            </button>
          );
        })}
      </div>

      {/* Móvil: botón compacto con menú flotante Claro / Automático / Oscuro */}
      <div ref={mobileWrapRef} className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Cambiar tema"
          title="Cambiar tema"
          className="w-7 h-7 rounded-md bg-[var(--lp-soft)] border border-[var(--lp-line)] text-[var(--lp-ink)] inline-flex items-center justify-center cursor-pointer"
        >
          {renderIcon(theme, 15, true)}
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Seleccionar tema"
            className="absolute right-0 mt-2 w-40 p-1 rounded-xl bg-[var(--lp-surface)] border border-[var(--lp-line)] shadow-lg z-50"
          >
            {OPTIONS.map((opt) => {
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--lp-soft)] text-[var(--lp-ink)] font-semibold'
                      : 'text-[var(--lp-muted)] hover:text-[var(--lp-ink)] hover:bg-[var(--lp-soft)]'
                  }`}
                >
                  {renderIcon(opt.value, 15, isSelected)}
                  <span>{opt.label}</span>
                  {isSelected && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-[#8FD14F]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
