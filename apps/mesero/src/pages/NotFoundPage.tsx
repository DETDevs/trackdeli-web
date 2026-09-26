import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WarningCircle, ArrowLeft } from '@phosphor-icons/react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
        <WarningCircle size={36} weight="duotone" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Página no encontrada</h1>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        No pudimos encontrar la pantalla o mesa que buscabas.
      </p>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white font-medium text-sm shadow-md active:scale-95 transition-all"
      >
        <ArrowLeft size={18} weight="bold" />
        Volver atrás
      </button>
    </div>
  );
};
