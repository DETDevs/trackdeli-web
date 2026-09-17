import React from 'react';
import { WarningCircle } from '@phosphor-icons/react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4 selection:bg-brand-500 selection:text-black">
      <div className="max-w-md w-full p-8 rounded-2xl bg-gray-800/60 border border-gray-800 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto text-amber-400">
          <WarningCircle size={28} weight="duotone" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-100">
            Página no encontrada
          </h1>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            El enlace que ingresaste no corresponde a una página de reservas válida o el negocio no existe.
          </p>
        </div>

        <p className="text-[11px] text-gray-500">
          Verificá el enlace que recibiste por WhatsApp o correo electrónico.
        </p>
      </div>
    </div>
  );
};
