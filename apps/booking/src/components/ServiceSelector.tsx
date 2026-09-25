import React from 'react';
import { Clock, Check, User, Users } from '@phosphor-icons/react';
import type { BookingServiceItem } from '../types/booking';

interface ServiceSelectorProps {
  services: BookingServiceItem[];
  selectedService: BookingServiceItem | null;
  onSelectService: (service: BookingServiceItem) => void;
  isLoading?: boolean;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  services,
  selectedService,
  onSelectService,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white border border-gray-200 animate-pulse space-y-2.5 shadow-xs"
          >
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-64 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
        <p className="text-sm text-gray-700 font-medium">
          No hay servicios disponibles en este momento.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Por favor, contactá al negocio directamente para consultar turnos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {services.map((service) => {
        const isSelected = selectedService?.id === service.id;
        const assignedSpecialists = service.specialists || (service.specialist ? [service.specialist] : []);

        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelectService(service)}
            className={`w-full text-left p-4 rounded-2xl border transition-all relative shadow-xs ${
              isSelected
                ? 'bg-emerald-50/70 border-brand-500 ring-2 ring-brand-500/20'
                : 'bg-white hover:bg-gray-50/80 border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0 pr-3">
                <h3 className="text-sm font-bold text-gray-900 truncate">
                  {service.name}
                </h3>

                {/* Especialistas asignados */}
                {assignedSpecialists.length > 1 ? (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                    <Users size={13} weight="bold" />
                    <span>{assignedSpecialists.length} especialistas disponibles</span>
                  </div>
                ) : assignedSpecialists.length === 1 ? (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 truncate">
                    <User size={13} className="text-gray-400 shrink-0" />
                    <span className="truncate">
                      Atendido por{' '}
                      <span className="text-gray-800 font-semibold">
                        {assignedSpecialists[0].name}
                      </span>
                      {assignedSpecialists[0].specialty?.trim()
                        ? ` — ${assignedSpecialists[0].specialty.trim()}`
                        : ''}
                    </span>
                  </p>
                ) : null}

                {service.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {service.description}
                  </p>
                )}
              </div>

              {/* Indicador de Selección */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                  isSelected
                    ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {isSelected && <Check size={12} weight="bold" />}
              </div>
            </div>

            {/* Badges: Duración & Precio */}
            <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-gray-100 text-xs">
              <span className="inline-flex items-center gap-1 font-medium text-gray-600">
                <Clock size={14} className="text-gray-400" />
                {service.durationMinutes} min
              </span>
              <span className="text-gray-300">•</span>
              <span className="font-bold text-brand-600">
                C$ {service.price.toFixed(2)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
