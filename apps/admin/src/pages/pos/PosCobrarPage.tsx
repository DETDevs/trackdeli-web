import React from 'react';
import { NavLink } from 'react-router-dom';
import { CreditCard, ArrowLeft, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { usePosWebAccess } from '../../hooks/usePosWebAccess';
import { useAuthStore } from '../../store/auth.store';

export const PosCobrarPage: React.FC = () => {
  const { webBillingEnabled, canCobrar, isLoading } = usePosWebAccess();
  const user = useAuthStore((s) => s.user);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-gray-500 font-medium">Verificando módulo de facturación...</p>
      </div>
    );
  }

  // Si la facturación web no está habilitada
  if (!webBillingEnabled) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mx-auto">
            <CreditCard size={30} weight="duotone" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 uppercase tracking-wide mb-2">
              Módulo adicional
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              Facturación web no habilitada
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
              La facturación desde la web es un módulo adicional que no está activo en este negocio. Pedile al administrador que lo active desde el panel de Superadmin.
            </p>
          </div>

          <div className="pt-2">
            <NavLink
              to="/pos/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Volver al resumen POS</span>
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  // Si no tiene rol autorizado para cobrar
  if (!canCobrar) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200/60 flex items-center justify-center text-red-600 mx-auto">
            <WarningCircle size={30} weight="duotone" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200/60 uppercase tracking-wide mb-2">
              Permiso insuficiente
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              Rol no autorizado para cobrar
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
              Tu usuario ({user?.role || 'sin rol'}) no tiene permisos para realizar operaciones de cobro en el punto de venta.
            </p>
          </div>

          <div className="pt-2">
            <NavLink
              to="/pos/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Volver al resumen POS</span>
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  // Módulo habilitado y rol autorizado
  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6">
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 mx-auto">
          <CheckCircle size={30} weight="duotone" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 uppercase tracking-wide mb-2">
            Módulo Habilitado
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
            Módulo de Facturación Web
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
            Tu negocio tiene la facturación web habilitada. La interfaz completa de cobro móvil se conectará en el Ticket 165c.
          </p>
        </div>

        <div className="pt-2">
          <NavLink
            to="/pos/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Volver al resumen</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
};
