import React from 'react';
import {
  Wallet,
  WarningCircle,
  Clock,
  Desktop,
  Users,
  Info,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useCreditPortfolioSummary } from '../../hooks/useFinances';
import { formatCurrency } from '../../utils/formatters';

interface ReceivablesNoticeProps {
  currency?: string;
}

export const ReceivablesNotice: React.FC<ReceivablesNoticeProps> = ({ currency = 'NIO' }) => {
  const { data: summary, isLoading, isFetching, refetch } = useCreditPortfolioSummary();

  return (
    <div className="space-y-5">
      {/* KPI Cards de Lectura */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total por cobrar */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total por cobrar</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 font-mono">
            {isLoading ? '—' : formatCurrency(summary?.totalPortfolio || 0, currency)}
          </div>
          <p className="text-[11px] text-gray-400">Cartera total fiada a clientes</p>
        </div>

        {/* Cartera vencida */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600">Cartera vencida</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <WarningCircle size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-700 font-mono">
            {isLoading ? '—' : formatCurrency(summary?.overduePortfolio || 0, currency)}
          </div>
          <p className="text-[11px] text-gray-400">Saldos con fecha de pago expirada</p>
        </div>

        {/* Cartera al corriente */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Al corriente</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Clock size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-700 font-mono">
            {isLoading ? '—' : formatCurrency(summary?.currentPortfolio || 0, currency)}
          </div>
          <p className="text-[11px] text-gray-400">Dentro del plazo de crédito</p>
        </div>

        {/* Cuentas por cobrar */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Cuentas pendientes</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 font-mono">
            {isLoading ? '—' : summary?.unpaidAccountsCount || 0}
          </div>
          <p className="text-[11px] text-gray-400">
            {summary?.customersCount ? `${summary.customersCount} clientes con saldo` : 'Cuentas activas'}
          </p>
        </div>
      </div>

      {/* Banner / Card Informativo de Gestión en Escritorio */}
      <div className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Desktop size={26} weight="duotone" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-gray-900">
              Gestión de cartera de clientes disponible en la aplicación de escritorio
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">
              La administración operativa de cuentas de clientes —como convenios de pago, emisión de cortes de crédito quincenales o mensuales, bloqueo por mora y recepción de abonos en caja registradora— se realiza desde la aplicación de escritorio <strong>TrackDeli POS</strong>.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">
              Esta sección web te permite dar seguimiento gerencial en tiempo real al saldo total colocado y a la cartera vencida desde cualquier celular o navegador.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <Info size={14} />
            <span>Datos sincronizados en tiempo real con el servidor</span>
          </span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <ArrowsClockwise size={13} className={isFetching ? 'animate-spin' : ''} />
            <span>Actualizar saldos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
