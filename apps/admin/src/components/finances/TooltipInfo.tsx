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
  const tooltipRef = useRef<HTMLDivElement>(null);

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
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="text-gray-400 hover:text-gray-700 focus:outline-none transition-colors cursor-help p-0.5 rounded-full hover:bg-gray-100"
        aria-label="Más información"
        title={text}
      >
        <Info size={iconSize} weight="bold" />
      </button>

      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute bottom-full mb-1.5 z-50 w-56 sm:w-64 p-2.5 text-[11px] font-normal leading-relaxed text-white bg-gray-900/95 backdrop-blur-xs rounded-xl shadow-xl pointer-events-none normal-case whitespace-normal ${alignClasses}`}
        >
          {text}
          <div
            className={`absolute top-full border-4 border-transparent border-t-gray-900/95 ${arrowAlignClasses}`}
          />
        </div>
      )}
    </span>
  );
};
