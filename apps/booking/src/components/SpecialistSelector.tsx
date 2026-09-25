import React from 'react';
import { ArrowLeft, Check, Sparkle, User } from '@phosphor-icons/react';
import type { BookingSpecialistInfo } from '../types/booking';

interface SpecialistSelectorProps {
  specialists: BookingSpecialistInfo[];
  selectedSpecialist: BookingSpecialistInfo | 'any' | null;
  onSelectSpecialist: (specialist: BookingSpecialistInfo | 'any') => void;
  onBack: () => void;
  serviceName: string;
}

export const SpecialistSelector: React.FC<SpecialistSelectorProps> = ({
  specialists,
  selectedSpecialist,
  onSelectSpecialist,
  onBack,
  serviceName,
}) => {
  const isAnySelected = selectedSpecialist === 'any';

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Botón de regreso al paso 1A */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors py-1 px-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft size={14} weight="bold" />
          Cambiar servicio
        </button>
        <span className="text-xs text-gray-400 font-medium truncate max-w-[200px]">
          {serviceName}
        </span>
      </div>

      <div className="pb-1">
        <h2 className="text-base font-bold text-gray-900 tracking-tight">
          ¿Con quién te gustaría atenderte?
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Elegí a tu profesional de preferencia o dejalo libre para ver más horarios.
        </p>
      </div>

      <div className="space-y-2.5">
        {/* Opción 1: Cualquier especialista disponible (Recomendado) */}
        <button
          type="button"
          onClick={() => onSelectSpecialist('any')}
          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-xs ${
            isAnySelected
              ? 'bg-emerald-50/70 border-brand-500 ring-2 ring-brand-500/20'
              : 'bg-white hover:bg-gray-50/80 border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isAnySelected
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-brand-50 text-brand-600'
              }`}
            >
              <Sparkle size={22} weight="fill" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">
                  Cualquier especialista disponible
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-100 text-brand-800 border border-brand-200">
                  Más opciones
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Te asignamos automáticamente al primer profesional libre en el horario que elijas.
              </p>
            </div>
          </div>

          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
              isAnySelected
                ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                : 'border-gray-300 bg-white'
            }`}
          >
            {isAnySelected && <Check size={13} weight="bold" />}
          </div>
        </button>

        {/* Especialistas individuales */}
        {specialists.map((specialist) => {
          const isSelected =
            selectedSpecialist !== 'any' && selectedSpecialist?.id === specialist.id;

          return (
            <button
              key={specialist.id}
              type="button"
              onClick={() => onSelectSpecialist(specialist)}
              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-xs ${
                isSelected
                  ? 'bg-emerald-50/70 border-brand-500 ring-2 ring-brand-500/20'
                  : 'bg-white hover:bg-gray-50/80 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <User size={22} weight="duotone" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    {specialist.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {specialist.specialty?.trim() || 'Especialista'}
                  </p>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                  isSelected
                    ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {isSelected && <Check size={13} weight="bold" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
