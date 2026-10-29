import React, { useState } from 'react';
import {
  Users,
  Receipt,
  CheckCircle,
  TrendUp,
  DownloadSimple,
  CaretDown,
  CaretUp,
  Package,
  CurrencyDollar,
} from '@phosphor-icons/react';
import { SalesBySellerReport, PeriodType } from '../../types/reports';
import { formatCurrency, formatQuantity } from '../../utils/formatters';

interface SellerReportTabProps {
  sellerData?: SalesBySellerReport | null;
  period: PeriodType;
  isLoading: boolean;
}

export const SellerReportTab: React.FC<SellerReportTabProps> = ({
  sellerData,
  isLoading,
}) => {
  const [expandedSellerId, setExpandedSellerId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
          ))}
        </div>
        <div className="h-80 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
      </div>
    );
  }

  const sellers = sellerData?.sellers || [];
  const periodRange = sellerData?.period;

  // Totales globales
  const totalNetSales = sellers.reduce((sum, s) => sum + s.netSales, 0);
  const totalGrossSales = sellers.reduce((sum, s) => sum + s.grossSales, 0);
  const totalReturns = sellers.reduce((sum, s) => sum + s.returnsDiscounted, 0);
  const totalTicketsSent = sellers.reduce((sum, s) => sum + s.ticketsSent, 0);
  const totalTicketsCharged = sellers.reduce((sum, s) => sum + s.ticketsCharged, 0);
  const totalTicketsCancelled = sellers.reduce((sum, s) => sum + s.ticketsCancelled, 0);
  const totalTicketsExpired = sellers.reduce((sum, s) => sum + s.ticketsExpired, 0);
  const totalSalesCount = sellers.reduce((sum, s) => sum + s.salesCount, 0);
  const totalUnitsSold = sellers.reduce((sum, s) => sum + s.unitsSold, 0);
  const globalConversionRate =
    totalTicketsSent > 0 ? Math.round((totalTicketsCharged / totalTicketsSent) * 10000) / 100 : 0;

  // Exportar a CSV
  const handleExportCsv = () => {
    if (sellers.length === 0) return;

    const headers = [
      'Vendedor',
      'Tickets Enviados',
      'Tickets Cobrados',
      'Tickets Anulados',
      'Tickets Vencidos',
      'Conversión (%)',
      'Venta Bruta (C$)',
      'Devoluciones (C$)',
      'Venta Neta (C$)',
      'Comprobantes',
      'Ticket Promedio (C$)',
      'Unidades Vendidas',
    ];

    const rows = sellers.map((s) => [
      `"${(s.sellerName || 'Sin nombre').replace(/"/g, '""')}"`,
      s.ticketsSent,
      s.ticketsCharged,
      s.ticketsCancelled,
      s.ticketsExpired,
      s.conversionRate.toFixed(2),
      s.grossSales.toFixed(2),
      s.returnsDiscounted.toFixed(2),
      s.netSales.toFixed(2),
      s.salesCount,
      s.averageTicket.toFixed(2),
      s.unitsSold.toFixed(2),
    ]);

    // Fila de totales
    rows.push([
      '"TOTALES"',
      totalTicketsSent,
      totalTicketsCharged,
      totalTicketsCancelled,
      totalTicketsExpired,
      globalConversionRate.toFixed(2),
      totalGrossSales.toFixed(2),
      totalReturns.toFixed(2),
      totalNetSales.toFixed(2),
      totalSalesCount,
      totalSalesCount > 0 ? (totalNetSales / totalSalesCount).toFixed(2) : '0.00',
      totalUnitsSold.toFixed(2),
    ]);

    const fromStr = periodRange?.from || 'inicio';
    const toStr = periodRange?.to || 'fin';
    const csvString = '﻿' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_vendedores_${fromStr}_al_${toStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleExpand = (sellerId: string) => {
    setExpandedSellerId((prev) => (prev === sellerId ? null : sellerId));
  };

  return (
    <div className="space-y-5">
      {/* Cabecera de la sección con botón de exportación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
            <Users size={22} weight="duotone" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">
              Reporte por Vendedor
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Control de tickets enviados, cobrados, ventas y devoluciones por vendedor
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={sellers.length === 0}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer self-start sm:self-auto shrink-0"
        >
          <DownloadSimple size={15} weight="bold" />
          <span>Descargar CSV</span>
        </button>
      </div>

      {/* KPI Cards Globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Venta Neta Total */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Venta neta vendedores</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CurrencyDollar size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatCurrency(totalNetSales)}
          </div>
          <div className="text-[11px] text-gray-400">
            Bruto {formatCurrency(totalGrossSales)} • Devs. -{formatCurrency(totalReturns)}
          </div>
        </div>

        {/* Tickets Enviados */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Tickets enviados</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Receipt size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {totalTicketsSent}
          </div>
          <div className="text-[11px] text-gray-400">
            {totalTicketsCancelled} anulados • {totalTicketsExpired} vencidos
          </div>
        </div>

        {/* Tickets Cobrados */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Tickets cobrados</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <CheckCircle size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {totalTicketsCharged}
          </div>
          <div className="text-[11px] text-gray-400">
            Comprobantes cobrados en caja
          </div>
        </div>

        {/* Tasa de Conversión */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Conversión promedio</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <TrendUp size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {globalConversionRate.toFixed(1)}%
          </div>
          <div className="text-[11px] text-gray-400">
            Tickets cobrados / enviados
          </div>
        </div>
      </div>

      {/* Tabla Detallada por Vendedor */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-700" weight="bold" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Desglose por Vendedor
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">
            {sellers.length} {sellers.length === 1 ? 'vendedor' : 'vendedores'}
          </span>
        </div>

        {sellers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Users size={24} />
            </div>
            <h4 className="text-sm font-bold text-gray-800">
              No hay actividad de vendedores
            </h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              No se encontraron tickets ni ventas asociadas a vendedores para el período seleccionado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-600 font-semibold text-[11px]">
                  <th className="py-3 px-4">Vendedor</th>
                  <th className="py-3 px-3 text-center">Tickets</th>
                  <th className="py-3 px-3 text-center">Conversión</th>
                  <th className="py-3 px-3 text-right">Venta Bruta</th>
                  <th className="py-3 px-3 text-right">Devoluciones</th>
                  <th className="py-3 px-3 text-right">Venta Neta</th>
                  <th className="py-3 px-3 text-center">Comprobantes</th>
                  <th className="py-3 px-3 text-right">Ticket Prom.</th>
                  <th className="py-3 px-3 text-right">Unidades</th>
                  <th className="py-3 px-4 text-center">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sellers.map((seller) => {
                  const isExpanded = expandedSellerId === seller.sellerId;
                  const convColor =
                    seller.conversionRate >= 75
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : seller.conversionRate >= 50
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200';

                  return (
                    <React.Fragment key={seller.sellerId}>
                      <tr
                        className={`transition-colors hover:bg-gray-50/60 ${
                          isExpanded ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        {/* Nombre del vendedor */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">
                            {seller.sellerName || 'Sin nombre'}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            ID: {seller.sellerId.slice(-6)}
                          </div>
                        </td>

                        {/* Tickets (Cobrados / Enviados / Anulados / Vencidos) */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                            <span className="text-emerald-700 font-bold" title="Cobrados">
                              {seller.ticketsCharged}
                            </span>
                            <span className="text-gray-300">/</span>
                            <span title="Total enviados">{seller.ticketsSent}</span>
                          </div>
                          {(seller.ticketsCancelled > 0 || seller.ticketsExpired > 0) && (
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {seller.ticketsCancelled > 0 && `${seller.ticketsCancelled} anul.`}
                              {seller.ticketsCancelled > 0 && seller.ticketsExpired > 0 && ' • '}
                              {seller.ticketsExpired > 0 && `${seller.ticketsExpired} venc.`}
                            </div>
                          )}
                        </td>

                        {/* Conversión */}
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${convColor}`}
                          >
                            {seller.conversionRate.toFixed(1)}%
                          </span>
                        </td>

                        {/* Venta Bruta */}
                        <td className="py-3.5 px-3 text-right font-medium text-gray-700">
                          {formatCurrency(seller.grossSales)}
                        </td>

                        {/* Devoluciones */}
                        <td className="py-3.5 px-3 text-right font-medium text-rose-600">
                          {seller.returnsDiscounted > 0
                            ? `-${formatCurrency(seller.returnsDiscounted)}`
                            : '—'}
                        </td>

                        {/* Venta Neta */}
                        <td className="py-3.5 px-3 text-right font-bold text-gray-900">
                          {formatCurrency(seller.netSales)}
                        </td>

                        {/* Comprobantes */}
                        <td className="py-3.5 px-3 text-center font-medium text-gray-700">
                          {seller.salesCount}
                        </td>

                        {/* Ticket Promedio */}
                        <td className="py-3.5 px-3 text-right font-medium text-gray-700">
                          {formatCurrency(seller.averageTicket)}
                        </td>

                        {/* Unidades Vendidas */}
                        <td className="py-3.5 px-3 text-right font-medium text-gray-700">
                          {formatQuantity(seller.unitsSold)}
                        </td>

                        {/* Botón Ver Productos */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(seller.sellerId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            <span>Top productos</span>
                            {isExpanded ? <CaretUp size={12} /> : <CaretDown size={12} />}
                          </button>
                        </td>
                      </tr>

                      {/* Desglose desplegable de productos más vendidos */}
                      {isExpanded && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={10} className="px-6 py-4">
                            <div className="bg-white rounded-xl border border-gray-200/70 p-4 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                  <Package size={15} className="text-amber-700" weight="bold" />
                                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                    Productos Más Vendidos por {seller.sellerName}
                                  </h4>
                                </div>
                                <span className="text-[11px] text-gray-400">Top 10</span>
                              </div>

                              {seller.topProducts.length === 0 ? (
                                <p className="text-xs text-gray-400 py-2">
                                  No hay productos registrados para este vendedor en el período.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                                  {seller.topProducts.map((p, idx) => (
                                    <div
                                      key={p.productId || p.productName || idx}
                                      className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 bg-gray-50/40 text-xs"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                                          {idx + 1}
                                        </span>
                                        <div className="min-w-0">
                                          <div className="font-semibold text-gray-900 truncate">
                                            {p.productName}
                                          </div>
                                          <div className="text-[11px] text-gray-400">
                                            {formatQuantity(p.units)}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right font-bold text-gray-900 shrink-0">
                                        {formatCurrency(p.revenue)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
