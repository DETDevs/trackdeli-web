import { Clock, CurrencyDollar, Check, User } from '@phosphor-icons/react';
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
            className="p-4 rounded-xl bg-gray-800/40 border border-gray-800 animate-pulse space-y-2"
          >
            <div className="h-5 w-40 bg-gray-700/50 rounded" />
            <div className="h-4 w-64 bg-gray-700/30 rounded" />
            <div className="h-4 w-24 bg-gray-700/30 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl bg-gray-800/30 border border-gray-800">
        <p className="text-sm text-gray-400 font-medium">
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

        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelectService(service)}
            className={`w-full text-left p-4 rounded-xl border transition-all relative ${
              isSelected
                ? 'bg-brand-500/10 border-brand-500/60 ring-1 ring-brand-500/50'
                : 'bg-gray-800/60 hover:bg-gray-800 border-gray-700/70 hover:border-gray-600'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0 pr-4">
                <h3 className="text-sm font-semibold text-gray-100 truncate">
                  {service.name}
                </h3>
                {service.specialist?.name && (
                  <p className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
                    <User size={13} className="text-gray-500 shrink-0" />
                    <span className="truncate">
                      Atendido por{' '}
                      <span className="text-gray-300 font-medium">
                        {service.specialist.name}
                      </span>
                      {service.specialist.specialty?.trim()
                        ? ` — ${service.specialist.specialty.trim()}`
                        : ''}
                    </span>
                  </p>
                )}
                {service.description && (
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {service.description}
                  </p>
                )}
              </div>

              {/* Check indicator */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                  isSelected
                    ? 'bg-brand-500 border-brand-500 text-black'
                    : 'border-gray-600 bg-transparent'
                }`}
              >
                {isSelected && <Check size={12} weight="bold" />}
              </div>
            </div>

            {/* Badges: Duration & Price */}
            <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-gray-700/40 text-xs">
              <span className="inline-flex items-center gap-1 font-medium text-gray-300">
                <Clock size={14} className="text-gray-400" />
                {service.durationMinutes} min
              </span>
              <span className="text-gray-600">•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-brand-400">
                <CurrencyDollar size={14} />
                ${service.price.toFixed(2)} USD
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
