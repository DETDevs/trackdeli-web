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
    <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        {/* Negocio info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 text-brand-500">
            {business?.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Storefront size={22} weight="duotone" />
            )}
          </div>

          <div className="min-w-0">
            {isLoading ? (
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-48 bg-gray-800/60 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <h1 className="text-base font-semibold text-gray-100 truncate tracking-tight">
                  {business?.name || 'Reservas Online'}
                </h1>
                {business?.posAddress && (
                  <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                    <MapPin size={13} className="shrink-0 text-gray-500" />
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
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors"
            title="Contactar por WhatsApp"
          >
            <WhatsappLogo size={16} weight="fill" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        )}
      </div>
    </header>
  );
};
