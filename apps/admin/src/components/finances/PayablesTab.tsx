import React, { useState } from 'react';
import {
  CreditCard,
  WarningCircle,
  Clock,
  Users,
  MagnifyingGlass,
  Coins,
  Eye,
  CheckCircle,
} from '@phosphor-icons/react';
import { PayableItem } from '../../types/finances';
import { usePayablesSummary, usePayables } from '../../hooks/useFinances';
import { RegisterPayablePaymentModal } from './RegisterPayablePaymentModal';
import { PayableDetailModal } from './PayableDetailModal';
import { formatCurrency } from '../../utils/formatters';
import { formatManaguaDate } from '../../utils/dateManagua';

interface PayablesTabProps {
  currency?: string;
}

export const PayablesTab: React.FC<PayablesTabProps> = ({ currency = 'NIO' }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  // Modales
  const [selectedPayableForPayment, setSelectedPayableForPayment] = useState<PayableItem | null>(null);
  const [selectedPayableIdForDetail, setSelectedPayableIdForDetail] = useState<string | null>(null);

  // Queries
  const { data: summary, isLoading: isLoadingSummary } = usePayablesSummary();
  const { data: payablesData, isLoading: isLoadingPayables } = usePayables({
    search: search.trim() || undefined,
    status: statusFilter === 'OVERDUE' ? undefined : statusFilter,
    onlyOverdue: statusFilter === 'OVERDUE' ? true : undefined,
    page,
    pageSize,
  });

  const items = payablesData?.items || [];
  const totalItems = payablesData?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const renderStatusBadge = (item: PayableItem) => {
    if (item.status === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle size={12} weight="fill" />
          <span>Pagada</span>
        </span>
      );
    }
    if (item.isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <WarningCircle size={12} weight="fill" />
          <span>Vencida</span>
        </span>
      );
    }
    if (item.status === 'PARTIALLY_PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={12} weight="fill" />
          <span>Parcial</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
        <Clock size={12} weight="fill" />
        <span>Pendiente</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total por Pagar */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total por pagar</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <CreditCard size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 font-mono">
            {isLoadingSummary ? '—' : formatCurrency(summary?.totalPayable || 0, currency)}
          </div>
          <p className="text-[11px] text-gray-400">Deuda activa con proveedores</p>
        </div>

        {/* Total Vencido */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600">Cartera vencida</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <WarningCircle size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-700 font-mono">
            {isLoadingSummary ? '—' : formatCurrency(summary?.totalOverdue || 0, currency)}
          </div>
          <p className="text-[11px] text-gray-400">Requiere pago inmediato</p>
        </div>

        {/* Vence en 7 días */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600">Vence en 7 días</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-amber-700 font-mono">
            {isLoadingSummary ? '—' : formatCurrency(summary?.dueNext7Days || 0, currency)}
          </div>
          <p className="text-[11px] text-gray-400">Compromisos de la semana</p>
        </div>

        {/* Proveedores con deuda */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Proveedores</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 font-mono">
            {isLoadingSummary ? '—' : summary?.suppliersWithDebt || 0}
          </div>
          <p className="text-[11px] text-gray-400">Proveedores con saldo pendiente</p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Pills de estado */}
        <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl gap-0.5 overflow-x-auto max-w-full">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'PENDING', label: 'Pendientes' },
            { id: 'PARTIALLY_PAID', label: 'Parciales' },
            { id: 'OVERDUE', label: 'Vencidas' },
            { id: 'PAID', label: 'Pagadas' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => {
                setStatusFilter(pill.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === pill.id
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <div className="relative min-w-[240px]">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar proveedor o factura..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-gray-900"
          />
        </div>
      </div>

      {/* Lista / Tabla de Cuentas por Pagar */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {isLoadingPayables ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <CreditCard size={24} />
            </div>
            <h4 className="text-sm font-bold text-gray-800">No hay cuentas por pagar</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {search || statusFilter !== 'ALL'
                ? 'No se encontraron resultados con los filtros actuales.'
                : 'No tienes facturas de compras a crédito pendientes con proveedores.'}
            </p>
          </div>
        ) : (
          <>
            {/* Vista Desktop (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50/75 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Proveedor</th>
                    <th className="px-4 py-3 font-semibold">Factura</th>
                    <th className="px-4 py-3 font-semibold">Emisión</th>
                    <th className="px-4 py-3 font-semibold">Vencimiento</th>
                    <th className="px-4 py-3 font-semibold text-right">Total</th>
                    <th className="px-4 py-3 font-semibold text-right">Abonado</th>
                    <th className="px-4 py-3 font-semibold text-right">Saldo</th>
                    <th className="px-4 py-3 font-semibold text-center">Estado</th>
                    <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedPayableIdForDetail(item.id)}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900">{item.supplier.name}</div>
                        {item.supplier.phone && (
                          <div className="text-[11px] text-gray-400">{item.supplier.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-gray-800">
                        {item.invoiceNumber || `Compra #${item.purchaseId.slice(-6)}`}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                        {formatManaguaDate(item.purchaseDate)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div
                          className={`font-medium ${
                            item.isOverdue ? 'text-rose-600 font-semibold' : 'text-gray-700'
                          }`}
                        >
                          {formatManaguaDate(item.dueDate)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {item.status === 'PAID'
                            ? 'Liquidada'
                            : item.isOverdue
                            ? `${Math.abs(item.daysToDue)}d vencida`
                            : `${item.daysToDue}d restantes`}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-gray-600">
                        {formatCurrency(item.originalAmount, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-emerald-700">
                        {formatCurrency(item.paidAmount, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-900 text-sm">
                        {formatCurrency(item.balance, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-center">{renderStatusBadge(item)}</td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {item.balance > 0 && item.status !== 'PAID' && (
                            <button
                              onClick={() => setSelectedPayableForPayment(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors cursor-pointer"
                              title="Registrar abono"
                            >
                              <Coins size={13} weight="bold" />
                              <span>Abonar</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedPayableIdForDetail(item.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Ver detalles"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Móvil (tarjetas compactas para pantallas angostas) */}
            <div className="block md:hidden divide-y divide-gray-100">
              {items.map((item) => {
                const percentPaid =
                  item.originalAmount > 0
                    ? Math.min(100, Math.round((item.paidAmount / item.originalAmount) * 100))
                    : 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedPayableIdForDetail(item.id)}
                    className="p-4 space-y-2.5 active:bg-gray-50/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-gray-900 truncate">
                          {item.supplier.name}
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          {item.invoiceNumber || `Compra #${item.purchaseId.slice(-6)}`} •{' '}
                          {formatManaguaDate(item.purchaseDate)}
                        </p>
                      </div>
                      <div className="shrink-0">{renderStatusBadge(item)}</div>
                    </div>

                    {/* Barra de progreso de pago */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">
                          Vence: <strong className={item.isOverdue ? 'text-rose-600' : 'text-gray-700'}>{formatManaguaDate(item.dueDate)}</strong>
                        </span>
                        <span className="font-bold text-gray-900 font-mono text-xs">
                          {formatCurrency(item.balance, currency)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all"
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>Abonado: {formatCurrency(item.paidAmount, currency)} ({percentPaid}%)</span>
                        <span>Total: {formatCurrency(item.originalAmount, currency)}</span>
                      </div>
                    </div>

                    {/* Botones de acción móvil */}
                    <div
                      className="pt-1 flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setSelectedPayableIdForDetail(item.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Ver detalle
                      </button>
                      {item.balance > 0 && item.status !== 'PAID' && (
                        <button
                          onClick={() => setSelectedPayableForPayment(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors cursor-pointer"
                        >
                          <Coins size={13} weight="bold" />
                          <span>Abonar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
            <span>
              Total: <strong>{totalItems}</strong> cuentas
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white font-medium disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="px-2 font-semibold text-gray-800">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white font-medium disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      <RegisterPayablePaymentModal
        payable={selectedPayableForPayment}
        isOpen={Boolean(selectedPayableForPayment)}
        onClose={() => setSelectedPayableForPayment(null)}
        currency={currency}
      />

      <PayableDetailModal
        payableId={selectedPayableIdForDetail}
        isOpen={Boolean(selectedPayableIdForDetail)}
        onClose={() => setSelectedPayableIdForDetail(null)}
        onRegisterPayment={() => {
          if (selectedPayableIdForDetail) {
            const found = items.find((i) => i.id === selectedPayableIdForDetail);
            if (found) {
              setSelectedPayableForPayment(found);
            }
          }
        }}
        currency={currency}
      />
    </div>
  );
};
