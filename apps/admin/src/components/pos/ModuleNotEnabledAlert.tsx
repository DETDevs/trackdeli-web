import React from 'react';
import { Storefront, WhatsappLogo } from '@phosphor-icons/react';

interface ModuleNotEnabledAlertProps {
  moduleName?: string;
  message?: string;
}

export const ModuleNotEnabledAlert: React.FC<ModuleNotEnabledAlertProps> = ({
  moduleName = 'Punto de Venta (POS)',
  message,
}) => {
  const whatsappUrl = `https://wa.me/50588068133?text=${encodeURIComponent(
    `Hola, deseo activar el módulo de ${moduleName} para mi negocio en TrackDeli.`
  )}`;

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-8 text-center max-w-lg mx-auto shadow-2xs space-y-4 my-8">
      <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mx-auto shadow-2xs">
        <Storefront size={28} weight="duotone" />
      </div>

      <div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200/70 mb-2 uppercase tracking-wide">
          Módulo no disponible
        </span>
        <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
          El módulo de {moduleName} no está habilitado
        </h3>
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
          {message ||
            'Tu suscripción actual no incluye este servicio. Puedes consultar con el equipo de soporte para habilitarlo en tu cuenta.'}
        </p>
      </div>

      <div className="pt-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
        >
          <WhatsappLogo size={16} weight="fill" />
          <span>Consultar activación de POS</span>
        </a>
      </div>
    </div>
  );
};
