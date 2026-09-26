import React from 'react';
import { User, SignOut, ArrowLeft, Storefront } from '@phosphor-icons/react';

interface HeaderProps {
  waiterName?: string;
  businessName?: string;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onLogout?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  waiterName,
  businessName,
  title,
  subtitle,
  onBack,
  onLogout,
  rightAction,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 shadow-xs">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {/* Left: Back button or Business avatar */}
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-xl text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer touch-manipulation flex items-center justify-center shrink-0"
              title="Volver"
            >
              <ArrowLeft size={20} weight="bold" />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Storefront size={18} weight="duotone" />
            </div>
          )}

          <div className="min-w-0">
            {title ? (
              <>
                <h1 className="text-sm font-bold text-gray-900 truncate leading-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">
                    {subtitle}
                  </p>
                )}
              </>
            ) : (
              <>
                <h1 className="text-sm font-bold text-gray-900 truncate leading-tight">
                  {businessName || 'Comandero'}
                </h1>
                {waiterName && (
                  <p className="text-[11px] font-medium text-emerald-700 truncate flex items-center gap-1 mt-0.5">
                    <User size={12} weight="bold" />
                    <span>{waiterName}</span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: custom action or Logout */}
        <div className="flex items-center gap-2 shrink-0">
          {rightAction}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors cursor-pointer touch-manipulation flex items-center justify-center"
              title="Cerrar turno de mesero"
            >
              <SignOut size={19} weight="bold" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
