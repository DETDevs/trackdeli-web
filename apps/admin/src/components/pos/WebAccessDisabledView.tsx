import React from 'react';
import { LockKey, Globe, SignOut, ArrowLeft } from '@phosphor-icons/react';
import { NavLink } from 'react-router-dom';

interface WebAccessDisabledViewProps {
  isFullScreen?: boolean;
  hasDelivery?: boolean;
  onLogout?: () => void;
}

export const WebAccessDisabledView: React.FC<WebAccessDisabledViewProps> = ({
  isFullScreen = false,
  hasDelivery = false,
  onLogout,
}) => {
  const cardContent = (
    <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200/80 shadow-xl shadow-gray-200/40 p-6 sm:p-8 text-center space-y-5">
      {/* Icon & Badge */}
      <div className="relative inline-flex items-center justify-center mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shadow-xs">
          <Globe size={32} weight="duotone" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs shadow-xs border-2 border-white">
          <LockKey size={12} weight="bold" />
        </div>
      </div>

      <div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 mb-2 uppercase tracking-wide">
          Acceso no incluido
        </span>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
          Acceso web no habilitado
        </h2>
      </div>

      {/* Mensaje exacto requerido */}
      <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 text-sm text-gray-700 leading-relaxed text-center font-medium">
        Tu plan no incluye el acceso web. Pedile al administrador de tu negocio que lo active.
      </div>

      {/* Acciones */}
      <div className="space-y-2.5 pt-2">
        {hasDelivery && (
          <NavLink
            to="/dashboard"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Ir al panel de Delivery</span>
          </NavLink>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200/80 text-gray-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            <SignOut size={16} weight="regular" />
            <span>Cerrar sesión</span>
          </button>
        )}
      </div>
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-xs">
            TD
          </div>
          <div className="font-semibold text-base text-gray-900 tracking-tight">TrackDeli</div>
        </div>

        {cardContent}

        <p className="text-[11px] text-gray-400 mt-8">
          TrackDeli · Plataforma para Negocios
        </p>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 flex items-center justify-center">
      {cardContent}
    </div>
  );
};
