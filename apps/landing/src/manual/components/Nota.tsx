import React from 'react';

export interface NotaProps {
  tipo: 'tip' | 'warn';
  children: React.ReactNode;
}

export const Nota: React.FC<NotaProps> = ({ tipo, children }) => {
  return (
    <div className={`note ${tipo}`}>
      {tipo === 'tip' ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v4h1" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3 2 20h20L12 3Z" />
          <path d="M12 10v4M12 17h.01" />
        </svg>
      )}
      <p>{children}</p>
    </div>
  );
};
