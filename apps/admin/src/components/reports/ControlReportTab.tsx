import React, { useState } from 'react';
import {
  Prohibit,
  ArrowUUpLeft,
  Percent,
  CashRegister,
  ShieldCheck,
  CheckCircle,
  ShieldWarning,
} from '@phosphor-icons/react';
import { ControlReport, PeriodType } from '../../types/reports';
import { formatCurrency } from '../../utils/formatters';
import { formatManaguaDateTime } from '../../utils/dateManagua';

interface ControlReportTabProps {
  controlData?: ControlReport | null;
  period: PeriodType;
  isLoading: boolean;
}

export const ControlReportTab: React.FC<ControlReportTabProps> = ({
  controlData,
  isLoading,
}) => {
  const [activeSection, setActiveSection] = useState<'all' | 'voids' | 'returns' | 'discounts' | 'cash'>(
    'all'
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
          ))}
        </div>
        <div className="h-72 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
      </div>
    );
  }

  const voidCount = controlData?.voidedSales.count || 0;
  const returnCount = controlData?.returns.count || 0;
  const discountCount = controlData?.discounts.count || 0;
  const diffAmount = controlData?.cashDiscrepancies.totalDifference || 0;

  const isCleanPeriod =
    voidCount === 0 && returnCount === 0 && discountCount === 0 && diffAmount === 0;

  const renderSelfApprovedBadge = (isSelfApproved?: boolean) => {
    if (!isSelfApproved) return null;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
        <ShieldWarning size={11} weight="fill" />
        Autoaprobada
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Ventas Anuladas */}
        <div
          onClick={() => setActiveSection(activeSection === 'voids' ? 'all' : 'voids')}
          className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-1.5 ${
            activeSection === 'voids'
              ? 'border-gray-900 ring-1 ring-gray-900'
              : 'border-gray-200/80 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Ventas anuladas</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${voidCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
              <Prohibit size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {voidCount}
          </div>
          <div className="text-[11px] text-gray-400">
            Total: <span className="font-semibold text-gray-800">{formatCurrency(controlData?.voidedSales.totalAmount || 0)}</span>
          </div>
        </div>

        {/* Devoluciones */}
        <div
          onClick={() => setActiveSection(activeSection === 'returns' ? 'all' : 'returns')}
          className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-1.5 ${
            activeSection === 'returns'
              ? 'border-gray-900 ring-1 ring-gray-900'
              : 'border-gray-200/80 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Devoluciones</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${returnCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
              <ArrowUUpLeft size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {returnCount}
          </div>
          <div className="text-[11px] text-gray-400">
            Reembolsado: <span className="font-semibold text-gray-800">{formatCurrency(controlData?.returns.totalAmount || 0)}</span>
          </div>
        </div>

        {/* Descuentos Otorgados */}
        <div
          onClick={() => setActiveSection(activeSection === 'discounts' ? 'all' : 'discounts')}
          className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-1.5 ${
            activeSection === 'discounts'
              ? 'border-gray-900 ring-1 ring-gray-900'
              : 'border-gray-200/80 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Descuentos</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Percent size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {discountCount}
          </div>
          <div className="text-[11px] text-gray-400">
            Rebajado: <span className="font-semibold text-gray-800">{formatCurrency(controlData?.discounts.totalAmount || 0)}</span>
          </div>
        </div>

        {/* Diferencias en Cierres de Caja */}
        <div
          onClick={() => setActiveSection(activeSection === 'cash' ? 'all' : 'cash')}
          className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-1.5 ${
            activeSection === 'cash'
              ? 'border-gray-900 ring-1 ring-gray-900'
              : 'border-gray-200/80 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Diferencias de caja</span>
            <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
              <CashRegister size={16} weight="bold" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold tracking-tight ${
              diffAmount < 0
                ? 'text-red-600'
                : diffAmount > 0
                ? 'text-amber-600'
                : 'text-emerald-600'
            }`}
          >
            {diffAmount > 0
              ? `+${formatCurrency(diffAmount)}`
              : diffAmount < 0
              ? `-${formatCurrency(Math.abs(diffAmount))}`
              : 'C$ 0.00'}
          </div>
          <div className="text-[11px] text-gray-400 truncate">
            {controlData?.cashDiscrepancies.shortageCount || 0} faltantes · {controlData?.cashDiscrepancies.overageCount || 0} sobrantes
          </div>
        </div>
      </div>

      {/* Si todo el período no tiene novedades */}
      {isCleanPeriod ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-10 max-w-xl mx-auto text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck size={28} weight="duotone" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Sin novedades en este período</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            No se han registrado ventas anuladas, devoluciones, descuentos excesivos ni descuadres en
            los cierres de caja durante el período seleccionado.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selector de sub-sección / Eventos */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-gray-400 text-[11px] font-medium shrink-0">Filtrar:</span>
            {[
              { id: 'all', label: 'Todos los eventos' },
              { id: 'voids', label: `Anulaciones (${voidCount})` },
              { id: 'returns', label: `Devoluciones (${returnCount})` },
              { id: 'discounts', label: `Descuentos (${discountCount})` },
              { id: 'cash', label: 'Cierres de Caja' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveSection(f.id as any)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer shrink-0 ${
                  activeSection === f.id
                    ? 'bg-gray-900 text-white shadow-2xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 1. Ventas Anuladas Recientes */}
          {(activeSection === 'all' || activeSection === 'voids') && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Prohibit size={16} className="text-red-500" weight="bold" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Ventas Anuladas
                  </h3>
                </div>
                <span className="text-[11px] text-gray-400">{voidCount} registradas</span>
              </div>

              {!controlData?.voidedSales.recent || controlData.voidedSales.recent.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  No hay ventas anuladas en este período.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Factura</th>
                        <th className="py-2.5 px-4 font-semibold">Fecha (Managua)</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Monto</th>
                        <th className="py-2.5 px-4 font-semibold">Cajero</th>
                        <th className="py-2.5 px-4 font-semibold">Autorizado por</th>
                        <th className="py-2.5 px-4 font-semibold">Motivo</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {controlData.voidedSales.recent.map((s) => {
                        const isSelf =
                          s.selfApproved ||
                          (Boolean(s.voidedBy?.id) && s.voidedBy?.id === s.approvedBy?.id);

                        return (
                          <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-gray-900">
                              {s.invoiceNumber}
                            </td>
                            <td className="py-2.5 px-4 text-gray-600 whitespace-nowrap">
                              {formatManaguaDateTime(s.voidedAt || s.createdAt)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-red-600">
                              {formatCurrency(s.total)}
                            </td>
                            <td className="py-2.5 px-4 text-gray-800 font-medium">
                              {s.cashier?.name || s.voidedBy?.name || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-gray-800 font-medium">
                              {s.approvedBy?.name || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-gray-500 italic max-w-xs truncate">
                              {s.voidReason || 'Sin motivo'}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {renderSelfApprovedBadge(isSelf)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 2. Devoluciones Recientes */}
          {(activeSection === 'all' || activeSection === 'returns') && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUUpLeft size={16} className="text-amber-500" weight="bold" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Devoluciones Recientes
                  </h3>
                </div>
                <span className="text-[11px] text-gray-400">{returnCount} registradas</span>
              </div>

              {!controlData?.returns.recent || controlData.returns.recent.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  No hay devoluciones registradas en este período.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Devolución #</th>
                        <th className="py-2.5 px-4 font-semibold">Fecha (Managua)</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Reembolsado</th>
                        <th className="py-2.5 px-4 font-semibold">Método</th>
                        <th className="py-2.5 px-4 font-semibold">Cajero</th>
                        <th className="py-2.5 px-4 font-semibold">Autorizado por</th>
                        <th className="py-2.5 px-4 font-semibold">Motivo</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {controlData.returns.recent.map((r) => {
                        const isSelf =
                          r.selfApproved ||
                          (Boolean(r.createdBy?.id) && r.createdBy?.id === r.approvedBy?.id);

                        return (
                          <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-gray-900">
                              {r.returnNumber}
                            </td>
                            <td className="py-2.5 px-4 text-gray-600 whitespace-nowrap">
                              {formatManaguaDateTime(r.createdAt)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-amber-600">
                              {formatCurrency(r.refundAmount)}
                            </td>
                            <td className="py-2.5 px-4 text-gray-600">{r.refundMethod}</td>
                            <td className="py-2.5 px-4 text-gray-800 font-medium">
                              {r.createdBy?.name || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-gray-800 font-medium">
                              {r.approvedBy?.name || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-gray-500 italic max-w-xs truncate">
                              {r.reason}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {renderSelfApprovedBadge(isSelf)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. Descuentos Otorgados */}
          {(activeSection === 'all' || activeSection === 'discounts') && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent size={16} className="text-blue-500" weight="bold" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Descuentos Otorgados
                  </h3>
                </div>
                <span className="text-[11px] text-gray-400">{discountCount} ventas con rebaja</span>
              </div>

              {!controlData?.discounts.recent || controlData.discounts.recent.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  No se aplicaron descuentos en este período.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Factura</th>
                        <th className="py-2.5 px-4 font-semibold">Fecha (Managua)</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Subtotal</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Descuento</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Total Facturado</th>
                        <th className="py-2.5 px-4 font-semibold">Cajero</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {controlData.discounts.recent.map((d) => (
                        <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-gray-900">
                            {d.invoiceNumber}
                          </td>
                          <td className="py-2.5 px-4 text-gray-600 whitespace-nowrap">
                            {formatManaguaDateTime(d.createdAt)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-gray-600">
                            {formatCurrency(d.subtotal)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-blue-600">
                            {formatCurrency(d.discountAmount)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-gray-900">
                            {formatCurrency(d.total)}
                          </td>
                          <td className="py-2.5 px-4 text-gray-800 font-medium">
                            {d.cashier?.name || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. Cierres de Caja y Discrepancias */}
          {(activeSection === 'all' || activeSection === 'cash') && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CashRegister size={16} className="text-gray-700" weight="bold" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Cierres de Caja y Arqueos
                  </h3>
                </div>
                <span className="text-[11px] text-gray-400">
                  {controlData?.cashDiscrepancies.closedRegistersCount || 0} turnos cerrados
                </span>
              </div>

              {!controlData?.cashDiscrepancies.recent || controlData.cashDiscrepancies.recent.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  No hay cierres de turno en este período.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Cajero</th>
                        <th className="py-2.5 px-4 font-semibold">Cierre (Managua)</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Efectivo Esperado</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Efectivo Contado</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Diferencia</th>
                        <th className="py-2.5 px-4 font-semibold">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {controlData.cashDiscrepancies.recent.map((reg) => {
                        const hasDiff = reg.difference !== 0;
                        const isShort = reg.difference < 0;

                        return (
                          <tr key={reg.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-gray-900">{reg.cashier.name}</td>
                            <td className="py-2.5 px-4 text-gray-600 whitespace-nowrap">
                              {formatManaguaDateTime(reg.closedAt)}
                            </td>
                            <td className="py-2.5 px-4 text-right text-gray-600">
                              {formatCurrency(reg.expectedCash)}
                            </td>
                            <td className="py-2.5 px-4 text-right text-gray-900 font-bold">
                              {formatCurrency(reg.closingCash)}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {hasDiff ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    isShort
                                      ? 'bg-red-50 text-red-700 border border-red-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {isShort
                                    ? `Faltante: -${formatCurrency(Math.abs(reg.difference))}`
                                    : `Sobrante: +${formatCurrency(reg.difference)}`}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-bold">
                                  <CheckCircle size={13} weight="bold" />
                                  <span>Cuadrada</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-gray-500 italic max-w-xs truncate">
                              {reg.notes || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
