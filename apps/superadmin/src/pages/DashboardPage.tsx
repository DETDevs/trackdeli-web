import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Storefront,
  CurrencyDollar,
  CalendarBlank,
  WarningCircle,
  CheckCircle,
  Receipt,
  Wallet,
  CreditCard,
  CaretDown,
  CaretUp,
  FileText,
  ArrowUpRight,
  Motorcycle,
} from '@phosphor-icons/react';
import { TopBar } from '../components/layout/TopBar';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { useSuperAdminSummary } from '../hooks/useSuperAdminSummary';
import { useLogs } from '../hooks/useLogs';
import { RegisterMembershipModal } from '../components/modals/RegisterMembershipModal';
import { formatDueText, getMembershipPillInfo, formatDateClean } from '../utils/membershipDates';
import { formatRelativeTime, formatCurrency } from '../utils/format';

export const DashboardPage = () => {
  const { data: summary, isLoading: loadingSummary } = useSuperAdminSummary();
  const { data: logs = [], isLoading: loadingLogs } = useLogs();

  const [paymentTarget, setPaymentTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeliveryExpanded, setIsDeliveryExpanded] = useState(false);

  const pendingCollections = summary?.pending_collections || [];
  const inGraceCount = summary?.counts?.enGracia ?? summary?.in_grace?.count ?? 0;
  const overdueCount = summary?.counts?.vencidos ?? summary?.overdue?.count ?? 0;
  const totalOverdueRisk = inGraceCount + overdueCount;
  const overdueRiskAmount = (summary?.in_grace?.amount || 0) + (summary?.overdue?.amount || 0);
  const demosCount = summary?.counts?.demos ?? 0;
  const internosCount = summary?.counts?.internos ?? 0;
  const monthlyUsd = summary?.monthlyRevenueUsd ?? summary?.mrr ?? 0;
  const monthlyNio = summary?.maintenanceMonthlyNio ?? summary?.mrr_nio ?? 0;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <TopBar
        title="Resumen general"
        subtitle="Métricas de clientes reales, cobros pendientes y adopción de la plataforma"
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* 1. Fila de 4 tarjetas principales (solo clientes, 307a) */}
        {loadingSummary || !summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200/80 p-4 sm:p-5 space-y-3">
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-7 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
            {/* Tarjeta 1: Ingreso mensual */}
            <StatCard
              title="Ingreso mensual"
              value={`$${monthlyUsd.toFixed(2)}`}
              subtitle={
                <span>
                  {monthlyNio > 0
                    ? `+ ${formatCurrency(monthlyNio, 'NIO')} mant. · Las demos no cuentan`
                    : `${summary.payingClientsCount ?? 0} clientes que pagan · Las demos no cuentan`}
                </span>
              }
              icon={<CurrencyDollar size={18} className="text-emerald-600" />}
            />

            {/* Tarjeta 2: Por cobrar en 7 días */}
            <StatCard
              title="Por cobrar en 7 días"
              value={`${summary.due_next_7_days.count} ${summary.due_next_7_days.count === 1 ? 'cliente' : 'clientes'}`}
              subtitle={`$${summary.due_next_7_days.amount.toFixed(2)} por ingresar`}
              icon={<CalendarBlank size={18} className="text-amber-600" />}
            />

            {/* Tarjeta 3: En gracia o vencidos */}
            <div
              className={`bg-white rounded-xl p-4 sm:p-5 border ${
                totalOverdueRisk > 0 ? 'border-red-200' : 'border-gray-200/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-gray-500 min-w-0">
                  En gracia o vencidos
                </span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    totalOverdueRisk > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  <WarningCircle size={18} weight={totalOverdueRisk > 0 ? 'fill' : 'regular'} />
                </div>
              </div>

              <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
                <span
                  className={`text-xl sm:text-2xl font-semibold tracking-tight ${
                    totalOverdueRisk > 0 ? 'text-red-600' : 'text-gray-900'
                  }`}
                >
                  {totalOverdueRisk}
                </span>
              </div>

              <p className="text-[13px] text-gray-500 mt-1">
                {overdueCount} vencidos · {inGraceCount} en gracia
                {overdueRiskAmount > 0 && ` ($${overdueRiskAmount.toFixed(2)})`}
              </p>
            </div>

            {/* Tarjeta 4: Clientes activos y demos aparte */}
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-gray-500 min-w-0">
                  Clientes activos
                </span>
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-700 shrink-0">
                  <Storefront size={18} />
                </div>
              </div>

              <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
                  {summary.active_businesses.total}
                </span>
                <span className="text-xs text-emerald-700 font-medium">
                  +{summary.active_businesses.new_this_month} este mes
                </span>
              </div>

              <div className="mt-1.5 text-xs flex items-center gap-2 flex-wrap text-gray-500">
                <Link
                  to="/businesses?tab=demos"
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200/80 font-medium hover:bg-gray-200/70 transition-colors"
                >
                  {demosCount} {demosCount === 1 ? 'demo aparte' : 'demos aparte'}
                  {internosCount > 0 ? ` · ${internosCount} int.` : ''}
                </Link>
                {summary.trials > 0 && (
                  <span className="text-gray-600">{summary.trials} en prueba</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2 y 3. Grid central: Cobros pendientes + Columna lateral */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200/80 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <Receipt size={18} className="text-gray-600" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-gray-900">
                      Cobros pendientes
                    </h3>
                    {pendingCollections.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                        {pendingCollections.length}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-gray-500 mt-0.5">
                    Clientes con membresía vencida, en gracia o por vencer ordenados por urgencia
                  </p>
                </div>
              </div>
            </div>

            {loadingSummary ? (
              <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
                Cargando cobros pendientes...
              </div>
            ) : pendingCollections.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center space-y-2">
                <CheckCircle size={26} weight="fill" className="text-emerald-600" />
                <p className="text-sm font-semibold text-gray-900">Todo al día</p>
                <p className="text-xs text-gray-500 max-w-sm">
                  No hay cobros pendientes ni cuentas vencidas en este momento.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingCollections.map((item) => {
                  const pill = getMembershipPillInfo(item.status);
                  const dueText = formatDueText(item.due_date, item.days_until_due);

                  return (
                    <div
                      key={item.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/70 rounded-lg px-2 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/businesses/${item.id}`}
                            className="font-semibold text-sm text-gray-900 hover:text-gray-700 transition-colors truncate"
                          >
                            {item.name}
                          </Link>
                          <Badge variant={pill.variant} dot size="sm">
                            {pill.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{dueText}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="font-semibold text-sm text-gray-900 font-mono">
                          ${Number(item.amount || 0).toFixed(2)}
                          <span className="text-xs font-normal text-gray-500"> / mes</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setPaymentTarget({ id: item.id, name: item.name })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <CreditCard size={14} />
                          <span>Cobrar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Columna lateral */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-gray-900">
                  Clientes por rubro
                </h3>
                <span className="text-xs text-gray-500 font-mono">
                  {summary ? Object.values(summary.by_type || {}).reduce((a, b) => a + b, 0) : 0} activos
                </span>
              </div>

              {loadingSummary || !summary ? (
                <div className="py-4 text-xs text-gray-400 animate-pulse">Cargando rubros...</div>
              ) : Object.keys(summary.by_type || {}).length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">Sin datos de rubros.</p>
              ) : (
                <div className="space-y-2.5 pt-1">
                  {Object.entries(summary.by_type)
                    .sort(([, a], [, b]) => b - a)
                    .map(([typeKey, count]) => {
                      const total =
                        Object.values(summary.by_type).reduce((a, b) => a + b, 0) || 1;
                      const pct = Math.round((count / total) * 100);

                      return (
                        <div key={typeKey} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium text-gray-700">
                            <span className="capitalize">{typeKey.toLowerCase()}</span>
                            <span className="text-gray-500 font-mono">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gray-800 h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-3">
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">
                  Riesgo de adopción
                </h3>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  Sin ventas registradas en los últimos 7 días
                </p>
              </div>

              {loadingSummary || !summary ? (
                <div className="py-4 text-xs text-gray-400 animate-pulse">Verificando adopción...</div>
              ) : summary.inactive_adoption.businesses.length === 0 ? (
                <p className="text-xs text-emerald-700 font-medium py-3 text-center">
                  Todos los clientes activos registran ventas recientes.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto pr-1">
                  {summary.inactive_adoption.businesses.map((biz) => (
                    <div key={biz.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <Link
                          to={`/businesses/${biz.id}`}
                          className="font-semibold text-gray-900 hover:text-gray-700 truncate block"
                        >
                          {biz.name}
                        </Link>
                        <span className="text-xs text-gray-500">
                          {biz.last_activity_at
                            ? `Última venta ${formatRelativeTime(biz.last_activity_at)}`
                            : 'Sin ventas registradas'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70 shrink-0">
                        {biz.days_inactive} d
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Pagos recientes y Actividad reciente */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200/80 p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-emerald-600 shrink-0" />
                <h3 className="text-[15px] font-semibold text-gray-900">
                  Pagos recientes
                </h3>
              </div>
              <span className="text-xs text-gray-500">
                Últimos {summary?.recent_payments?.length || 0}
              </span>
            </div>

            {loadingSummary || !summary ? (
              <div className="py-6 text-xs text-gray-400 text-center animate-pulse">Cargando pagos...</div>
            ) : summary.recent_payments.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                No hay pagos registrados recientemente.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto pr-1">
                {summary.recent_payments.map((payment) => (
                  <div key={payment.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <Link
                        to={`/businesses/${payment.business_id}`}
                        className="font-semibold text-gray-900 hover:text-gray-700 truncate block text-sm"
                      >
                        {payment.business_name}
                      </Link>
                      <div className="text-xs text-gray-500 flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5">
                        <span className="font-medium text-gray-700">{payment.payment_method}</span>
                        <span>·</span>
                        <span>{payment.period}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-semibold text-gray-900 block text-sm font-mono">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDateClean(payment.paid_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200/80 p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-gray-700 shrink-0" />
                <h3 className="text-[15px] font-semibold text-gray-900">
                  Actividad reciente
                </h3>
              </div>
              <Link
                to="/logs"
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
              >
                <span>Ver bitácora</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>

            {loadingLogs ? (
              <div className="py-6 text-xs text-gray-400 text-center animate-pulse">Cargando actividad...</div>
            ) : logs.slice(0, 5).length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                No hay registros de actividad recientes.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {logs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {log.action || log.description || 'Evento registrado'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {log.businessName || log.userName || log.entity || 'Sistema'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatRelativeTime(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5. Delivery */}
        {summary?.delivery && summary.delivery.active_businesses_count > 0 && (
          <div className="border border-gray-200/80 rounded-xl bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setIsDeliveryExpanded(!isDeliveryExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Motorcycle size={18} className="text-amber-600" />
                <span className="text-[15px] font-semibold text-gray-900">
                  Métricas de delivery ({summary.delivery.active_businesses_count} clientes)
                </span>
              </div>
              <div className="text-gray-500">
                {isDeliveryExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
              </div>
            </button>

            {isDeliveryExpanded && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100">
                <div>
                  <span className="text-xs text-gray-500 block font-medium">
                    Repartidores activos
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    {summary.delivery.active_riders}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block font-medium">
                    Pedidos creados hoy
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    {summary.delivery.orders_today}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block font-medium">
                    Tasa de entrega (30 d)
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    {summary.delivery.delivery_rate_30d}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {paymentTarget && (
        <RegisterMembershipModal
          isOpen={Boolean(paymentTarget)}
          onClose={() => setPaymentTarget(null)}
          businessId={paymentTarget.id}
          businessName={paymentTarget.name}
        />
      )}
    </div>
  );
};
