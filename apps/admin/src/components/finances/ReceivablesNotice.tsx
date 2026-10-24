import React, { useState, useMemo } from 'react';
import {
  Wallet,
  WarningCircle,
  Clock,
  Users,
  ArrowsClockwise,
  MagnifyingGlass,
  CheckCircle,
  Eye,
  CalendarBlank,
  Percent,
} from '@phosphor-icons/react';
import {
  useCreditPortfolioSummary,
  usePosCreditPolicies,
} from '../../hooks/useFinances';
import { formatCurrency } from '../../utils/formatters';
import { formatManaguaDate } from '../../utils/dateManagua';
import { CreditAccountDetailModal } from './CreditAccountDetailModal';

interface ReceivablesNoticeProps {
  currency?: string;
}

export const ReceivablesNotice: React.FC<ReceivablesNoticeProps> = ({ currency = 'NIO' }) => {
  const { data: summary, isLoading, isFetching, refetch } = useCreditPortfolioSummary();
  const { data: creditPolicies } = usePosCreditPolicies();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OVERDUE' | 'CURRENT'>('ALL');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);

  // Aplanar todas las cuentas de los clientes para la tabla
  const allAccounts = useMemo(() => {
    if (!summary?.breakdownByCustomer) return [];
    return summary.breakdownByCustomer.flatMap((cust) =>
      cust.accounts.map((acc) => ({
        ...acc,
        customer: cust.customer,
      }))
    );
  }, [summary]);

  // Métricas agregadas de cuentas y cuotas (Ticket 189c: contar cuotas vencidas, no solo cuentas)
  const {
    pendingInstallmentsCount,
    overdueInstallmentsCount,
    overdueAccountsCount,
  } = useMemo(() => {
    let pendingInst = 0;
    let overdueInst = 0;
    let overdueAccs = 0;

    for (const acc of allAccounts) {
      const isAccOverdue = acc.isOverdue || acc.status === 'OVERDUE' || new Date(acc.dueDate) < now;
      if (isAccOverdue) {
        overdueAccs++;
      }
      const insts = acc.installments || [];
      for (const inst of insts) {
        const isPaid = inst.status === 'PAID';
        if (!isPaid) {
          pendingInst++;
          const isInstOverdue =
            inst.status === 'OVERDUE' || (new Date(inst.dueDate) < now && inst.status !== 'PAID');
          if (isInstOverdue) {
            overdueInst++;
          }
        }
      }
    }

    return {
      pendingInstallmentsCount: pendingInst,
      overdueInstallmentsCount: overdueInst,
      overdueAccountsCount: overdueAccs,
    };
  }, [allAccounts, now]);

  // Cuentas filtradas por búsqueda y estado
  const filteredAccounts = useMemo(() => {
    return allAccounts.filter((acc) => {
      const isAccOverdue = acc.isOverdue || acc.status === 'OVERDUE' || new Date(acc.dueDate) < now;
      if (filterStatus === 'OVERDUE' && !isAccOverdue) return false;
      if (filterStatus === 'CURRENT' && isAccOverdue) return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase();
      const customerName = acc.customer?.name?.toLowerCase() || '';
      const invoiceNumber = (acc.invoiceNumber || '').toLowerCase();
      return customerName.includes(term) || invoiceNumber.includes(term);
    });
  }, [allAccounts, search, filterStatus, now]);

  const getAccountStatusBadge = (acc: (typeof allAccounts)[0]) => {
    const isOverdue = acc.isOverdue || acc.status === 'OVERDUE' || new Date(acc.dueDate) < now;
    if (acc.balance <= 0.005 || acc.status === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle size={11} weight="fill" />
          <span>Saldada</span>
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <WarningCircle size={11} weight="fill" />
          <span>Vencida</span>
        </span>
      );
    }
    if (acc.status === 'PARTIALLY_PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={11} weight="fill" />
          <span>Parcial</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
        <Clock size={11} weight="fill" />
        <span>Pendiente</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards de Lectura (Ticket 189c: cuotas vencidas y cuentas) */}
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
          <p className="text-[11px] text-gray-400">
            {allAccounts.length} cuenta{allAccounts.length === 1 ? '' : 's'} en cartera
          </p>
        </div>

        {/* Cartera vencida (con conteo de cuotas vencidas y cuentas) */}
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
          <p className="text-[11px] text-rose-600/90 font-medium">
            {overdueInstallmentsCount} cuota{overdueInstallmentsCount === 1 ? '' : 's'} vencida{overdueInstallmentsCount === 1 ? '' : 's'} ({overdueAccountsCount} cuenta{overdueAccountsCount === 1 ? '' : 's'})
          </p>
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
          <p className="text-[11px] text-gray-400">
            {Math.max(0, pendingInstallmentsCount - overdueInstallmentsCount)} cuotas al día
          </p>
        </div>

        {/* Cuentas y Cuotas pendientes */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Cuentas pendientes</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 font-mono">
            {isLoading ? '—' : summary?.unpaidAccountsCount ?? allAccounts.length}
          </div>
          <p className="text-[11px] text-gray-400">
            {pendingInstallmentsCount} cuotas ({summary?.customersCount ?? 0} clientes)
          </p>
        </div>
      </div>

      {/* Configuración de Crédito (Solo lectura - Ticket 189c) */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-purple-50 text-purple-700">
              <Percent size={16} weight="duotone" />
            </div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Políticas de Crédito
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
            Se configura desde el POS → Configuración → Crédito
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Interés en crédito
            </span>
            <span className={`font-bold ${creditPolicies?.creditInterestEnabled ? 'text-emerald-700' : 'text-gray-600'}`}>
              {creditPolicies?.creditInterestEnabled ? 'Habilitado' : 'Desactivado'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Modalidad y Tasa
            </span>
            <span className="font-bold text-gray-900">
              {creditPolicies?.creditInterestEnabled
                ? `${creditPolicies.creditInterestType === 'FLAT' ? 'Flat' : 'Mensual'} ${creditPolicies.creditInterestRate}%`
                : 'Sin interés'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Plazo máximo
            </span>
            <span className="font-bold text-gray-900">
              {creditPolicies?.creditMaxInstallments ? `${creditPolicies.creditMaxInstallments} cuotas` : '12 cuotas'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Frecuencias
            </span>
            <span className="font-semibold text-gray-700 truncate block">
              {creditPolicies?.creditAllowedFrequencies
                ? creditPolicies.creditAllowedFrequencies.split(',').join(' • ')
                : 'Semanal • Quincenal • Mensual'}
            </span>
          </div>
        </div>
      </div>

      {/* Controles de búsqueda y filtros para la tabla de cuentas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Buscador */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por cliente o factura..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro de estado */}
          <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl gap-0.5 text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Todas ({allAccounts.length})
            </button>
            <button
              onClick={() => setFilterStatus('OVERDUE')}
              className={`px-3 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                filterStatus === 'OVERDUE'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-gray-500 hover:text-rose-600'
              }`}
            >
              Vencidas ({overdueAccountsCount})
            </button>
            <button
              onClick={() => setFilterStatus('CURRENT')}
              className={`px-3 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                filterStatus === 'CURRENT'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-gray-500 hover:text-emerald-700'
              }`}
            >
              Al corriente ({Math.max(0, allAccounts.length - overdueAccountsCount)})
            </button>
          </div>

          {/* Botón Refrescar */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            title="Actualizar datos"
          >
            <ArrowsClockwise size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabla de Cuentas por Cobrar (Ticket 189c: Próxima cuota, cuotas pendientes/vencidas, desglose) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Factura</th>
                <th className="py-3 px-4 text-right">Saldo / Total</th>
                <th className="py-3 px-4">Próxima cuota</th>
                <th className="py-3 px-4 text-center">Cuotas</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Users size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-semibold text-gray-600">No se encontraron cuentas por cobrar</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {search ? 'Prueba con otros términos de búsqueda.' : 'No hay cuentas con el filtro seleccionado.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const insts = acc.installments || [];
                  const pendingInsts = insts.filter((i) => i.status !== 'PAID');
                  const nextInst = pendingInsts[0];
                  const overdueCount = insts.filter(
                    (i) => i.status === 'OVERDUE' || (new Date(i.dueDate) < now && i.status !== 'PAID')
                  ).length;
                  const isNextOverdue = nextInst && (nextInst.status === 'OVERDUE' || new Date(nextInst.dueDate) < now);

                  return (
                    <tr
                      key={acc.id}
                      onClick={() => setSelectedAccountId(acc.id)}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer group"
                    >
                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                          {acc.customer?.name || 'Cliente sin nombre'}
                        </div>
                        {acc.customer?.phone && (
                          <div className="text-[11px] text-gray-400">{acc.customer.phone}</div>
                        )}
                      </td>

                      {/* Factura */}
                      <td className="py-3 px-4 font-mono font-medium text-gray-700">
                        {acc.invoiceNumber ? `#${acc.invoiceNumber}` : '—'}
                      </td>

                      {/* Saldo / Total */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-gray-900">
                          {formatCurrency(acc.balance, currency)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          de {formatCurrency(acc.originalAmount, currency)}
                        </div>
                      </td>

                      {/* Próxima Cuota (Fecha y Monto) */}
                      <td className="py-3 px-4">
                        {nextInst ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-medium text-gray-900">
                              <CalendarBlank size={13} className="text-gray-400 shrink-0" />
                              <span>{formatManaguaDate(nextInst.dueDate)}</span>
                              {isNextOverdue && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                                  Vencida
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-gray-500 mt-0.5">
                              {formatCurrency(Math.max(0, nextInst.amount - nextInst.paidAmount), currency)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-semibold text-[11px]">Al día</span>
                        )}
                      </td>

                      {/* Conteo de Cuotas (Créditos viejos = 1 cuota) */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-gray-800">
                          {pendingInsts.length} de {insts.length || 1} pend.
                        </span>
                        {overdueCount > 0 && (
                          <span className="text-[10px] text-rose-600 font-bold block">
                            ({overdueCount} vencida{overdueCount > 1 ? 's' : ''})
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">{getAccountStatusBadge(acc)}</td>

                      {/* Acción */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAccountId(acc.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Detalle</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer de la tabla */}
        <div className="px-6 py-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <span>
            Mostrando {filteredAccounts.length} de {allAccounts.length} cuenta{allAccounts.length === 1 ? '' : 's'}
          </span>
          <span>💡 Haz clic en una cuenta para ver el desglose y el plan de cuotas</span>
        </div>
      </div>

      {/* Modal de Detalle de Cuenta por Cobrar */}
      <CreditAccountDetailModal
        accountId={selectedAccountId}
        isOpen={Boolean(selectedAccountId)}
        onClose={() => setSelectedAccountId(null)}
        currency={currency}
      />
    </div>
  );
};
