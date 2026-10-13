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
import { formatRelativeTime } from '../utils/format';

export const DashboardPage = () => {
  const { data: summary, isLoading: loadingSummary } = useSuperAdminSummary();
  const { data: logs = [], isLoading: loadingLogs } = useLogs();

  const [paymentTarget, setPaymentTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeliveryExpanded, setIsDeliveryExpanded] = useState(false);

  const pendingCollections = summary?.pending_collections || [];
  const inGraceCount = summary?.in_grace?.count || 0;
  const overdueCount = summary?.overdue?.count || 0;
  const totalOverdueRisk = inGraceCount + overdueCount;
  const overdueRiskAmount = (summary?.in_grace?.amount || 0) + (summary?.overdue?.amount || 0);

  return (
    <div>
      <TopBar
        title="Dashboard Global"
        subtitle="Métricas de cobro, riesgo de membresías y adopción de la plataforma"
      />

      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 max-w-7xl mx-auto">
        {/* 1. Fila de 4 tarjetas principales */}
        {loadingSummary || !summary ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3 shadow-xs">
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-7 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {/* Tarjeta 1: MRR */}
            <StatCard
              title="Ingreso Mensual (MRR)"
              value={`$${summary.mrr.toFixed(2)}`}
              subtitle="Mensual recurrente activo"
              icon={<CurrencyDollar size={18} className="text-emerald-600" />}
            />

            {/* Tarjeta 2: Por cobrar en 7 días */}
            <StatCard
              title="Por cobrar en 7 días"
              value={`${summary.due_next_7_days.count} ${summary.due_next_7_days.count === 1 ? 'negocio' : 'negocios'}`}
              subtitle={`$${summary.due_next_7_days.amount.toFixed(2)} por ingresar`}
              icon={<CalendarBlank size={18} className="text-amber-600" />}
            />

            {/* Tarjeta 3: En gracia / vencidos (con acento cuando > 0) */}
            <div
              className={`bg-white rounded-xl p-5 shadow-xs transition-all hover:shadow-sm border ${
                totalOverdueRisk > 0
                  ? 'border-red-200 bg-red-50/20'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  En gracia / Vencidos
                </span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    totalOverdueRisk > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  <WarningCircle size={18} weight={totalOverdueRisk > 0 ? 'fill' : 'regular'} />
                </div>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className={`text-2xl font-semibold tracking-tight ${
                    totalOverdueRisk > 0 ? 'text-red-600 font-bold' : 'text-gray-900'
                  }`}
                >
                  {totalOverdueRisk}
                </span>
                {totalOverdueRisk > 0 && (
                  <span className="text-[11px] font-semibold text-red-600 bg-red-100/80 px-1.5 py-0.5 rounded">
                    ¡Atención!
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-2 truncate">
                {overdueCount} vencidos · {inGraceCount} en gracia
                {overdueRiskAmount > 0 && ` ($${overdueRiskAmount.toFixed(2)})`}
              </p>
            </div>

            {/* Tarjeta 4: Negocios activos */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs transition-all hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Negocios Activos
                </span>
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-brand-600">
                  <Storefront size={18} />
                </div>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-900 tracking-tight">
                  {summary.active_businesses.total}
                </span>
              </div>

              <div className="mt-2 text-xs flex items-center justify-between gap-1 text-gray-500">
                <span className="text-emerald-700 font-medium">
                  +{summary.active_businesses.new_this_month} este mes
                </span>
                <span className="text-purple-700 font-medium text-[11px] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                  {summary.trials} en prueba
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2 y 3. Grid central: Cobros pendientes (bloque principal ancho) + Columna lateral */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Bloque principal ancho: Cobros pendientes (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-5 lg:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                  <Receipt size={18} weight="duotone" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Cobros pendientes
                    </h3>
                    {pendingCollections.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                        {pendingCollections.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Negocios con membresía vencida, en gracia o por vencer ordenada por urgencia
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
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                  <CheckCircle size={26} weight="fill" />
                </div>
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
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/70 rounded-xl px-2.5 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/businesses/${item.id}`}
                            className="font-semibold text-xs sm:text-sm text-gray-900 hover:text-brand-600 transition-colors truncate"
                          >
                            {item.name}
                          </Link>
                          <Badge variant={pill.variant} dot size="sm">
                            {pill.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                          {dueText}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <div className="text-right">
                          <span className="font-bold text-xs sm:text-sm text-gray-900 block">
                            ${Number(item.amount || 0).toFixed(2)}
                            <span className="text-[11px] font-normal text-gray-500"> / mes</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPaymentTarget({ id: item.id, name: item.name })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <CreditCard size={14} />
                          <span>Registrar pago</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Columna lateral: Negocios por tipo & Riesgo de adopción (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Negocios por tipo */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Negocios por tipo
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  {summary ? Object.values(summary.by_type || {}).reduce((a, b) => a + b, 0) : 0} activos
                </span>
              </div>

              {loadingSummary || !summary ? (
                <div className="py-4 text-xs text-gray-400 animate-pulse">Cargando tipos...</div>
              ) : Object.keys(summary.by_type || {}).length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">Sin datos de tipos de negocio.</p>
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
                            <span className="text-gray-500 font-mono text-[11px]">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-brand-600 h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Adopción: Sin actividad en 7 días */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-3">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Riesgo de adopción
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Sin actividad en 7 días · Nota: señal basada en la última venta registrada en POS
                </p>
              </div>

              {loadingSummary || !summary ? (
                <div className="py-4 text-xs text-gray-400 animate-pulse">Verificando adopción...</div>
              ) : summary.inactive_adoption.businesses.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-emerald-700 font-medium">
                    Todos los negocios activos registran ventas recientes.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto pr-1">
                  {summary.inactive_adoption.businesses.map((biz) => (
                    <div key={biz.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <Link
                          to={`/businesses/${biz.id}`}
                          className="font-semibold text-gray-900 hover:text-brand-600 truncate block"
                        >
                          {biz.name}
                        </Link>
                        <span className="text-[11px] text-gray-400">
                          {biz.last_activity_at
                            ? `Última venta ${formatRelativeTime(biz.last_activity_at)}`
                            : 'Sin ventas registradas'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60 shrink-0">
                        {biz.days_inactive}d inactivo
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Pagos recientes (últimos 10) y Actividad reciente compacta */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pagos recientes (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 p-5 lg:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-emerald-600" weight="duotone" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Pagos recientes
                </h3>
              </div>
              <span className="text-xs text-gray-400">
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
                        className="font-semibold text-gray-900 hover:text-brand-600 truncate block text-xs sm:text-sm"
                      >
                        {payment.business_name}
                      </Link>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-gray-700">{payment.payment_method}</span>
                        <span>·</span>
                        <span>{payment.period}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-gray-900 block text-xs sm:text-sm">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDateClean(payment.paid_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actividad reciente (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 p-5 lg:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-gray-700" weight="duotone" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Actividad reciente
                </h3>
              </div>
              <Link
                to="/logs"
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
              >
                <span>Ver todos los logs</span>
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
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {log.businessName || log.userName || log.entity || 'Sistema'}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {formatRelativeTime(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5. Delivery: sección secundaria colapsada al final solo si el API devuelve el bloque */}
        {summary?.delivery && summary.delivery.active_businesses_count > 0 && (
          <div className="border border-gray-200/80 rounded-2xl bg-white overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setIsDeliveryExpanded(!isDeliveryExpanded)}
              className="w-full p-4 flex items-center justify-between bg-gray-50/70 hover:bg-gray-100/60 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Motorcycle size={18} className="text-amber-600" weight="duotone" />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Métricas de Delivery ({summary.delivery.active_businesses_count} negocios)
                </span>
              </div>
              <div className="text-gray-500">
                {isDeliveryExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
              </div>
            </button>

            {isDeliveryExpanded && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-200/80 bg-white">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[11px] text-gray-500 uppercase block font-medium">
                    Repartidores activos
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {summary.delivery.active_riders}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[11px] text-gray-500 uppercase block font-medium">
                    Pedidos creados hoy
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {summary.delivery.orders_today}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[11px] text-gray-500 uppercase block font-medium">
                    Tasa de entrega (30d)
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {summary.delivery.delivery_rate_30d}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para registrar pago */}
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
