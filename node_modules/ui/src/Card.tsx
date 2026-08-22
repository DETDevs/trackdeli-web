import React from 'react';

export const Card = ({ children, header, className = '' }: { children: React.ReactNode, header?: React.ReactNode, className?: string }) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
      {header && (
        <div className="px-5 py-4 border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
          {header}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
};
