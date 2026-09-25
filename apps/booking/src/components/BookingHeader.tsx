import React from 'react';
import { MapPin, WhatsappLogo, Storefront } from '@phosphor-icons/react';
import type { BusinessPublicInfo } from '../types/booking';

interface BookingHeaderProps {
  business?: BusinessPublicInfo;
  isLoading?: boolean;
}

export const BookingHeader: React.FC<BookingHeaderProps> = ({
  business,
  isLoading,
}) => {
  const whatsappUrl = business?.whatsappNumber
    ? `https://wa.me/${business.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola, me contacto para consultar sobre una reserva en ${business.name || 'el negocio'}.`
      )}`
    : null;

  return (
    <header className="border-b border-gray-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
        {/* Negocio info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden text-brand-600 shadow-xs">
            {business?.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Storefront size={22} weight="duotone" className="text-brand-600" />
            )}
          </div>

          <div className="min-w-0">
            {isLoading ? (
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <h1 className="text-base font-bold text-gray-900 truncate tracking-tight">
                  {business?.name || 'Reservas Online'}
                </h1>
                {business?.posAddress && (
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                    <MapPin size={13} className="shrink-0 text-gray-400" />
                    <span className="truncate">{business.posAddress}</span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* WhatsApp Contact Link */}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all shadow-xs"
            title="Contactar por WhatsApp"
          >
            <WhatsappLogo size={16} weight="fill" className="text-emerald-600" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        )}
      </div>
    </header>
  );
};
