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
  Coins,
  Printer,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { getMyBusiness } from 'api-client';
import { useAuthStore } from '../../store/auth.store';
import { ReportPrintModal } from '../reports/ReportPrintModal';
import { ReportDocument } from '../../types/report';
import { buildReceivablesReportDocument } from '../../utils/financesTabsPrintBuilders';
import {
  useCreditPortfolioSummary,
  usePosCreditPolicies,
} from '../../hooks/useFinances';
import { formatCurrency } from '../../utils/formatters';
import { formatManaguaDate } from '../../utils/dateManagua';
import { CreditAccountDetailModal } from './CreditAccountDetailModal';
import { RegisterCreditPaymentModal } from './RegisterCreditPaymentModal';

interface ReceivablesNoticeProps {
  currency?: string;
}

export const ReceivablesNotice: React.FC<ReceivablesNoticeProps> = ({ currency = 'NIO' }) => {
  const { data: summary, isLoading, isFetching, refetch } = useCreditPortfolioSummary();
  const { data: creditPolicies } = usePosCreditPolicies();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OVERDUE' | 'CURRENT'>('ALL');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountForPayment, setSelectedAccountForPayment] = useState<any | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [reportDocument, setReportDocument] = useState<ReportDocument | null>(null);

  const user = useAuthStore((s) => s.user);
  const branches = useAuthStore((s) => s.branches);
  const activeBranch = branches?.find((b) => b.id === user?.businessId);

  const { data: businessData } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    staleTime: 5 * 60 * 1000,
  });


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

  const handlePrint = () => {
    const doc = buildReceivablesReportDocument({
      metrics: summary
        ? {
            totalPortfolio: summary.totalPortfolio,
            overduePortfolio: summary.overduePortfolio,
            currentPortfolio: summary.currentPortfolio,
            unpaidAccountsCount: summary.unpaidAccountsCount,
            customersCount: summary.customersCount ?? 0,
          }
        : null,
      accounts: filteredAccounts,
      searchQuery: search,
      filterStatus,
      business: businessData,
      branchName: activeBranch?.name,
      user,
      currency,
    });
    setReportDocument(doc);
    setIsPrintModalOpen(true);
  };

  const getAccountStatusBadge = (acc: (typeof allAccounts)[0]) => {
    const isOverdue = acc.isOverdue || acc.status === 'OVERDUE' || new Date(acc.dueDate) < now;
    if (acc.balance <= 0.005 || acc.status === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
          <CheckCircle size={12} weight="fill" />
          <span>Saldada</span>
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
          <WarningCircle size={12} weight="fill" />
          <span>Vencida</span>
        </span>
      );
    }
    if (acc.status === 'PARTIALLY_PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
          <Clock size={12} weight="fill" />
          <span>Parcial</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
        <Clock size={12} weight="fill" />
        <span>Pendiente</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards de Lectura (Ticket 189c: cuotas vencidas y cuentas) */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total por cobrar */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-gray-600">Total por cobrar</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Wallet size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold text-gray-900 font-mono whitespace-nowrap tabular-nums">
            {isLoading ? '—' : formatCurrency(summary?.totalPortfolio || 0, currency)}
          </div>
          <p className="text-xs text-gray-600">
            {allAccounts.length} cuenta{allAccounts.length === 1 ? '' : 's'} en cartera
          </p>
        </div>

        {/* Cartera vencida (con conteo de cuotas vencidas y cuentas) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-rose-700">Cartera vencida</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
              <WarningCircle size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold text-rose-700 font-mono whitespace-nowrap tabular-nums">
            {isLoading ? '—' : formatCurrency(summary?.overduePortfolio || 0, currency)}
          </div>
          <p className="text-xs text-rose-700 font-medium">
            {overdueInstallmentsCount} cuota{overdueInstallmentsCount === 1 ? '' : 's'} vencida{overdueInstallmentsCount === 1 ? '' : 's'} ({overdueAccountsCount} cuenta{overdueAccountsCount === 1 ? '' : 's'})
          </p>
        </div>

        {/* Cartera al corriente */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-emerald-700">Al corriente</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Clock size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold text-emerald-700 font-mono whitespace-nowrap tabular-nums">
            {isLoading ? '—' : formatCurrency(summary?.currentPortfolio || 0, currency)}
          </div>
          <p className="text-xs text-gray-600">
            {Math.max(0, pendingInstallmentsCount - overdueInstallmentsCount)} cuotas al día
          </p>
        </div>

        {/* Cuentas y Cuotas pendientes */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-gray-600">Cuentas pendientes</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Users size={15} weight="duotone" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold text-gray-900 font-mono whitespace-nowrap tabular-nums">
            {isLoading ? '—' : summary?.unpaidAccountsCount ?? allAccounts.length}
          </div>
          <p className="text-xs text-gray-600">
            {pendingInstallmentsCount} cuotas ({summary?.customersCount ?? 0} clientes)
          </p>
        </div>
      </div>

      {/* Configuración de Crédito (Solo lectura - Ticket 189c) */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-purple-50 text-purple-700 shrink-0">
              <Percent size={16} weight="duotone" />
            </div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Políticas de Crédito
            </h4>
          </div>
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-100 leading-snug">
            Se configura desde el POS → Configuración → Crédito
          </span>
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 min-w-0">
            <span className="text-xs font-bold text-gray-600 block mb-0.5">
              Interés en crédito
            </span>
            <span className={`font-bold ${creditPolicies?.creditInterestEnabled ? 'text-emerald-700' : 'text-gray-700'}`}>
              {creditPolicies?.creditInterestEnabled ? 'Habilitado' : 'Desactivado'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 min-w-0">
            <span className="text-xs font-bold text-gray-600 block mb-0.5">
              Modalidad y Tasa
            </span>
            <span className="font-bold text-gray-900 tabular-nums">
              {creditPolicies?.creditInterestEnabled
                ? `${creditPolicies.creditInterestType === 'FLAT' ? 'Flat' : 'Mensual'} ${creditPolicies.creditInterestRate}%`
                : 'Sin interés'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 min-w-0">
            <span className="text-xs font-bold text-gray-600 block mb-0.5">
              Plazo máximo
            </span>
            <span className="font-bold text-gray-900 tabular-nums">
              {creditPolicies?.creditMaxInstallments ? `${creditPolicies.creditMaxInstallments} cuotas` : '12 cuotas'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 min-w-0">
            <span className="text-xs font-bold text-gray-600 block mb-0.5">
              Frecuencias
            </span>
            <span className="font-semibold text-gray-800 block leading-snug break-words">
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Buscar por cliente o comprobante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-9 pr-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          {/* Filtro de estado */}
          <div className="inline-flex flex-wrap items-center bg-gray-100 p-1 rounded-xl gap-1 text-xs max-w-full">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 min-h-[38px] font-semibold rounded-lg transition-all cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todas ({allAccounts.length})
            </button>
            <button
              onClick={() => setFilterStatus('OVERDUE')}
              className={`px-3 py-1.5 min-h-[38px] font-semibold rounded-lg transition-all cursor-pointer ${
                filterStatus === 'OVERDUE'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-gray-600 hover:text-rose-600'
              }`}
            >
              Vencidas ({overdueAccountsCount})
            </button>
            <button
              onClick={() => setFilterStatus('CURRENT')}
              className={`px-3 py-1.5 min-h-[38px] font-semibold rounded-lg transition-all cursor-pointer ${
                filterStatus === 'CURRENT'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-gray-600 hover:text-emerald-700'
              }`}
            >
              Al corriente ({Math.max(0, allAccounts.length - overdueAccountsCount)})
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            {/* Botón Imprimir */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading || isFetching}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Imprimir cartera por cobrar en hoja carta o guardar PDF"
            >
              <Printer size={15} weight="bold" />
              <span>Imprimir</span>
            </button>

            {/* Botón Refrescar */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Actualizar datos"
              aria-label="Actualizar datos"
            >
              <ArrowsClockwise size={16} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Cuentas por Cobrar (Ticket 189c: Próxima cuota, cuotas pendientes/vencidas, desglose) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-100 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Comprobante</th>
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
                          <span className="text-xs text-rose-700 font-bold block">
                            ({overdueCount} vencida{overdueCount > 1 ? 's' : ''})
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">{getAccountStatusBadge(acc)}</td>

                      {/* Acción */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {acc.balance > 0.005 && (
                            <button
                              type="button"
                              onClick={() => setSelectedAccountForPayment(acc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              title="Registrar abono"
                            >
                              <Coins size={13} weight="bold" />
                              <span>Abonar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedAccountId(acc.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>Detalle</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Vista Móvil: Tarjetas legibles a 375 px (<md) */}
        <div className="block md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Users size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="font-semibold text-gray-600 text-xs">No se encontraron cuentas por cobrar</p>
            </div>
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
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className="p-4 space-y-2.5 active:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-gray-900 leading-snug break-words">
                        {acc.customer?.name || 'Cliente general'}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {acc.invoiceNumber ? `Comprobante #${acc.invoiceNumber}` : 'Sin comprobante'}
                        {acc.customer?.phone ? ` · ${acc.customer.phone}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-wrap items-center gap-1">
                      {overdueCount > 0 && (
                        <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-xs border border-rose-200 whitespace-nowrap">
                          {overdueCount} vencida{overdueCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {getAccountStatusBadge(acc)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-gray-600 block">Saldo pendiente</span>
                      <span className="text-sm font-bold text-gray-900 font-mono whitespace-nowrap tabular-nums">
                        {formatCurrency(acc.balance, currency)}
                      </span>
                    </div>
                    <div className="text-right ml-auto">
                      <span className="text-xs text-gray-600 block">Total crédito</span>
                      <span className="text-xs font-semibold text-gray-700 font-mono whitespace-nowrap tabular-nums">
                        {formatCurrency(acc.originalAmount, currency)}
                      </span>
                    </div>
                  </div>

                  {nextInst && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <CalendarBlank size={13} className="text-gray-500 shrink-0" />
                        <span>Próx. vencimiento: {formatManaguaDate(nextInst.dueDate)}</span>
                      </span>
                      {isNextOverdue ? (
                        <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-xs whitespace-nowrap">
                          Vencida
                        </span>
                      ) : (
                        <span className="font-mono text-gray-800 font-semibold whitespace-nowrap tabular-nums ml-auto">
                          {formatCurrency(Math.max(0, nextInst.amount - nextInst.paidAmount), currency)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Acciones móvil con altura >= 44 px */}
                  <div
                    className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedAccountId(acc.id)}
                      className="min-h-[44px] px-3.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors"
                    >
                      Ver detalle
                    </button>
                    {acc.balance > 0.005 && (
                      <button
                        type="button"
                        onClick={() => setSelectedAccountForPayment(acc)}
                        className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Coins size={16} weight="bold" />
                        <span>Registrar abono</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer de la tabla */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
          <span>
            Mostrando {filteredAccounts.length} de {allAccounts.length} cuenta{allAccounts.length === 1 ? '' : 's'}
          </span>
          <span className="hidden sm:inline">💡 Tocá una cuenta para ver el desglose y el plan de cuotas</span>
        </div>
      </div>

      {/* Modal de Detalle de Cuenta por Cobrar */}
      <CreditAccountDetailModal
        accountId={selectedAccountId}
        isOpen={Boolean(selectedAccountId)}
        onClose={() => setSelectedAccountId(null)}
        currency={currency}
      />

      {/* Modal de Registro de Abono directo desde Receivables */}
      {selectedAccountForPayment && (
        <RegisterCreditPaymentModal
          isOpen={Boolean(selectedAccountForPayment)}
          onClose={() => setSelectedAccountForPayment(null)}
          account={{
            id: selectedAccountForPayment.id,
            invoiceNumber: selectedAccountForPayment.invoiceNumber,
            sale: selectedAccountForPayment.sale,
            customer: selectedAccountForPayment.customer,
            balance: selectedAccountForPayment.balance,
            originalAmount: selectedAccountForPayment.originalAmount,
            installments: selectedAccountForPayment.installments,
          }}
          onSuccess={() => {
            setSelectedAccountForPayment(null);
            refetch();
          }}
          currency={currency}
        />
      )}

      {/* Modal de Impresión de Reporte */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        document={reportDocument}
      />
    </div>
  );
};
