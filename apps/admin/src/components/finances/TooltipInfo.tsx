import React, { useState, useRef, useEffect } from 'react';
import { Info } from '@phosphor-icons/react';

interface TooltipInfoProps {
  text: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
  iconSize?: number;
}

export const TooltipInfo: React.FC<TooltipInfoProps> = ({
  text,
  className = '',
  align = 'center',
  iconSize = 13,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsVisible(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  const clampDesktopPopover = (el: HTMLDivElement | null) => {
    tooltipRef.current = el;
    if (!el || typeof window === 'undefined') return;
    el.style.marginLeft = '0px';
    const rect = el.getBoundingClientRect();
    const pad = 12;
    const vw = window.innerWidth;
    if (rect.left < pad) {
      el.style.marginLeft = `${Math.ceil(pad - rect.left)}px`;
    } else if (rect.right > vw - pad) {
      el.style.marginLeft = `${Math.floor(vw - pad - rect.right)}px`;
    }
  };

  const canHoverPopover = () =>
    typeof window !== 'undefined' &&
    window.innerWidth >= 768 &&
    Boolean(window.matchMedia?.('(hover: hover)').matches);

  const alignClasses =
    align === 'left'
      ? 'left-0 sm:-left-2'
      : align === 'right'
      ? 'right-0 sm:-right-2'
      : 'left-1/2 -translate-x-1/2';

  const arrowAlignClasses =
    align === 'left'
      ? 'left-3'
      : align === 'right'
      ? 'right-3'
      : 'left-1/2 -translate-x-1/2';

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible((v) => !v);
        }}
        onMouseEnter={() => {
          if (canHoverPopover()) setIsVisible(true);
        }}
        onMouseLeave={() => {
          if (canHoverPopover()) setIsVisible(false);
        }}
        className="text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors cursor-help min-w-[44px] min-h-[44px] -m-3 inline-flex items-center justify-center rounded-full hover:bg-gray-100 shrink-0"
        aria-label="Más información"
        aria-expanded={isVisible}
        title={text}
      >
        <Info size={iconSize} weight="bold" />
      </button>

      {isVisible && (
        <>
          {/* Mobile bottom sheet (< 768 px): nunca se sale del viewport */}
          <div
            className="md:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Detalle del indicador"
          >
            <div
              className="w-full max-w-lg rounded-t-2xl bg-white p-5 pb-6 shadow-2xl border-t border-gray-200 text-left normal-case"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-bold text-gray-900">Detalle del indicador</span>
                <button
                  type="button"
                  onClick={() => setIsVisible(false)}
                  aria-label="Cerrar"
                  className="min-w-[44px] min-h-[44px] -mr-2 -my-2 inline-flex items-center justify-center rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-lg font-bold"
                >
                  ×
                </button>
              </div>
              <p className="text-sm leading-relaxed text-gray-800 font-normal whitespace-normal">
                {text}
              </p>
            </div>
          </div>

          {/* Desktop / Tablet popover (>= 768 px), con clamp horizontal al viewport */}
          <div
            ref={clampDesktopPopover}
            role="tooltip"
            className={`hidden md:block absolute bottom-full mb-1.5 z-50 w-64 max-w-[calc(100vw-24px)] p-3 text-xs font-normal leading-relaxed text-white bg-gray-900/95 backdrop-blur-xs rounded-xl shadow-xl pointer-events-none normal-case whitespace-normal text-left ${alignClasses}`}
          >
            {text}
            <div
              className={`absolute top-full border-4 border-transparent border-t-gray-900/95 ${arrowAlignClasses}`}
            />
          </div>
        </>
      )}
    </span>
  );
};
