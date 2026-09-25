import React from 'react';
import { WarningCircle } from '@phosphor-icons/react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-gray-200 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-xs">
          <WarningCircle size={28} weight="duotone" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Página no encontrada
          </h1>
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            El enlace que ingresaste no corresponde a una página de reservas válida o el negocio no existe.
          </p>
        </div>

        <p className="text-[11px] text-gray-400">
          Verificá el enlace que recibiste por WhatsApp o correo electrónico.
        </p>
      </div>
    </div>
  );
};
