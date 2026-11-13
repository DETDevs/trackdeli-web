import React from 'react';
import {
  HandCoins,
  Money,
  CreditCard,
  ArrowsLeftRight,
  User,
  Printer,
  Info,
} from '@phosphor-icons/react';
import type { PosTipsReportResponse, PosWaiterData } from 'api-client';
import { formatCurrency } from '../../utils/formatters';
import { formatTipPaymentMethodEs } from '../../utils/reportsTabsPrintBuilders';

interface TipsReportTabProps {
  tipsData?: PosTipsReportResponse;
  isLoading: boolean;
  waiterId: string;
  paymentMethod: string;
  waiters: PosWaiterData[];
  onChangeWaiterId: (value: string) => void;
  onChangePaymentMethod: (value: string) => void;
  onPrint?: () => void;
  isPreparingPrint?: boolean;
}

export const TipsReportTab: React.FC<TipsReportTabProps> = ({
  tipsData,
  isLoading,
  waiterId,
  paymentMethod,
  waiters,
  onChangeWaiterId,
  onChangePaymentMethod,
  onPrint,
  isPreparingPrint = false,
}) => {
  const totalBase = Number(tipsData?.totals?.baseTotal || 0);
  const totalCount = Number(tipsData?.totals?.count || 0);
  const byMethod = tipsData?.totals?.byMethod || [];
  const byCurrency = tipsData?.totals?.byCurrency || [];
  const byWaiter = tipsData?.byWaiter || [];

  const getMethodTotal = (methodKey: string): number => {
    const found = byMethod.find((m) => m.paymentMethod === methodKey);
    return Number(found?.baseTotal || 0);
  };

  const getMethodCount = (methodKey: string): number => {
    const found = byMethod.find((m) => m.paymentMethod === methodKey);
    return Number(found?.count || 0);
  };

  const usdItem = byCurrency.find((c) => c.currency === 'USD');

  if (isLoading && !tipsData) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-white rounded-2xl border border-gray-200/80 animate-pulse p-4"
            />
          ))}
        </div>
        <div className="h-64 bg-white rounded-2xl border border-gray-200/80 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Nota informativa + filtros + Imprimir */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2">
            <Info size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              Las propinas son voluntarias y se registran aparte de las ventas, el IVA y las ganancias del negocio.
            </span>
          </div>

          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              disabled={isPreparingPrint}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Printer size={15} weight="bold" />
              <span>{isPreparingPrint ? 'Preparando...' : 'Imprimir reporte'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="tips-filter-waiter"
              className="block text-xs font-semibold text-gray-700 mb-1"
            >
              Filtrar por mesero
            </label>
            <select
              id="tips-filter-waiter"
              value={waiterId}
              onChange={(e) => onChangeWaiterId(e.target.value)}
              className="w-full px-3 py-2 min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900"
            >
              <option value="">Todos los meseros</option>
              {waiters.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}{w.active === false ? ' (Inactivo)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="tips-filter-method"
              className="block text-xs font-semibold text-gray-700 mb-1"
            >
              Filtrar por método de pago
            </label>
            <select
              id="tips-filter-method"
              value={paymentMethod}
              onChange={(e) => onChangePaymentMethod(e.target.value)}
              className="w-full px-3 py-2 min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900"
            >
              <option value="">Todos los métodos</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Total propinas (base C$)</span>
            <HandCoins size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-gray-900 tabular-nums whitespace-nowrap">
            {formatCurrency(totalBase)}
          </div>
          <p className="text-xs text-gray-500">
            {totalCount} {totalCount === 1 ? 'propina registrada' : 'propinas registradas'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Efectivo</span>
            <Money size={18} className="text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-gray-900 tabular-nums whitespace-nowrap">
            {formatCurrency(getMethodTotal('EFECTIVO'))}
          </div>
          <p className="text-xs text-gray-500">
            {getMethodCount('EFECTIVO')} registros
            {usdItem && Number(usdItem.amount || 0) > 0
              ? ` · Incluye US$ ${Number(usdItem.amount).toFixed(2)}`
              : ''}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Tarjeta</span>
            <CreditCard size={18} className="text-blue-600" />
          </div>
          <div className="text-xl font-bold text-gray-900 tabular-nums whitespace-nowrap">
            {formatCurrency(getMethodTotal('TARJETA'))}
          </div>
          <p className="text-xs text-gray-500">{getMethodCount('TARJETA')} registros</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Transferencia</span>
            <ArrowsLeftRight size={18} className="text-purple-600" />
          </div>
          <div className="text-xl font-bold text-gray-900 tabular-nums whitespace-nowrap">
            {formatCurrency(getMethodTotal('TRANSFERENCIA'))}
          </div>
          <p className="text-xs text-gray-500">{getMethodCount('TRANSFERENCIA')} registros</p>
        </div>
      </div>

      {/* Tablas: Por método y Por mesero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Por método de pago */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Totales por método de pago</h3>
          {byMethod.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">
              Sin propinas registradas en este período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-left">
                    <th className="py-2 pr-3 font-semibold">Método</th>
                    <th className="py-2 px-2 font-semibold text-right">Cantidad</th>
                    <th className="py-2 px-2 font-semibold text-right">%</th>
                    <th className="py-2 pl-2 font-semibold text-right">Total (C$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byMethod.map((m) => {
                    const pct = totalBase > 0 ? (Number(m.baseTotal || 0) / totalBase) * 100 : 0;
                    return (
                      <tr key={m.paymentMethod} className="text-gray-800">
                        <td className="py-2.5 pr-3 font-medium">
                          {formatTipPaymentMethodEs(m.paymentMethod)}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums whitespace-nowrap">
                          {m.count}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums whitespace-nowrap text-gray-500">
                          {pct.toFixed(1)}%
                        </td>
                        <td className="py-2.5 pl-2 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                          {formatCurrency(m.baseTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Por mesero */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <User size={16} className="text-gray-600" />
              <span>Propinas por mesero</span>
            </h3>
            <span className="text-xs text-gray-500">{byWaiter.length} en el período</span>
          </div>

          {byWaiter.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">
              Sin propinas registradas por mesero en este período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-left">
                    <th className="py-2 pr-3 font-semibold">Mesero / Origen</th>
                    <th className="py-2 px-2 font-semibold text-right">Cantidad</th>
                    <th className="py-2 px-2 font-semibold text-right">%</th>
                    <th className="py-2 pl-2 font-semibold text-right">Total (C$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byWaiter.map((w) => {
                    const pct = totalBase > 0 ? (Number(w.baseTotal || 0) / totalBase) * 100 : 0;
                    return (
                      <tr key={w.waiterId ?? w.waiterName} className="text-gray-800">
                        <td className="py-2.5 pr-3 font-medium">
                          {w.waiterName || 'Sin mesero asignado'}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums whitespace-nowrap">
                          {w.count}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums whitespace-nowrap text-gray-500">
                          {pct.toFixed(1)}%
                        </td>
                        <td className="py-2.5 pl-2 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                          {formatCurrency(w.baseTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

