import React from 'react';
import {
  Motorcycle,
  SignOut,
  WhatsappLogo,
  LockKey,
} from '@phosphor-icons/react';

interface DeliveryAccessBlockedProps {
  businessName?: string;
  onLogout: () => void;
}

export const DeliveryAccessBlocked: React.FC<DeliveryAccessBlockedProps> = ({
  businessName,
  onLogout,
}) => {
  const whatsappUrl = `https://wa.me/50588068133?text=${encodeURIComponent(
    `Hola, deseo activar el servicio de Delivery para mi negocio (${businessName || 'mi negocio'}) en TrackDeli.`
  )}`;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-xs">
          TD
        </div>
        <div className="font-semibold text-base text-gray-900 tracking-tight">TrackDeli</div>
      </div>

      {/* Main Alert Card */}
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200/70 shadow-xl shadow-gray-200/50 p-6 sm:p-8 text-center space-y-5">
        {/* Icon & Status Badge */}
        <div className="relative inline-flex items-center justify-center mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shadow-xs">
            <Motorcycle size={34} weight="duotone" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs shadow-xs border-2 border-white">
            <LockKey size={12} weight="bold" />
          </div>
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 mb-2.5 uppercase tracking-wide">
            Panel restringido
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
            Servicio de Delivery no activo
          </h2>
          {businessName && (
            <p className="text-xs text-gray-500 font-medium mt-1">
              Negocio: <span className="text-gray-800 font-semibold">{businessName}</span>
            </p>
          )}
        </div>

        {/* Informative message */}
        <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 text-xs text-gray-600 leading-relaxed text-left">
          Tu negocio no tiene el servicio de Delivery activo. Gestiona tus otros servicios (POS, Citas, Cartera de Cobro) desde la aplicación de escritorio TrackDeli POS.
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            <WhatsappLogo size={16} weight="fill" />
            <span>Solicitar activación de Delivery</span>
          </a>

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200/80 text-gray-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            <SignOut size={16} weight="regular" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-gray-400 mt-8">
        TrackDeli · Plataforma de Envíos y Logística
      </p>
    </div>
  );
};
