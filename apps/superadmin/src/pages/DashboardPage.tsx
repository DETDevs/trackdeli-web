import { Link } from 'react-router-dom';
import {
  Storefront,
  Motorcycle,
  Package,
  Clock,
  ArrowUpRight,
  Star,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react';
import { TopBar } from '../components/layout/TopBar';
import { StatCard } from '../components/ui/StatCard';
import { OrdersChart } from '../components/ui/Chart';
import { Badge } from '../components/ui/Badge';
import { useGlobalMetrics } from '../hooks/useMetrics';
import { useLogs } from '../hooks/useLogs';
import { formatRelativeTime } from '../utils/format';

export const DashboardPage = () => {
  const { data: metrics, isLoading: loadingMetrics } = useGlobalMetrics();
  const { data: logs = [], isLoading: loadingLogs } = useLogs();

  return (
    <div>
      <TopBar
        title="Dashboard Global"
        subtitle="Métricas en tiempo real y rendimiento de la plataforma"
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* 1. StatCards Fila Superior */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Negocios Activos"
            value={metrics?.totals.businessesActive ?? (loadingMetrics ? '...' : 0)}
            subtitle={`${metrics?.totals.businesses ?? 0} registrados en total`}
            icon={<Storefront size={18} />}
          />
          <StatCard
            title="Repartidores Activos"
            value={metrics?.totals.ridersActive ?? (loadingMetrics ? '...' : 0)}
            subtitle={`${metrics?.totals.riders ?? 0} registrados en total`}
            icon={<Motorcycle size={18} />}
          />
          <StatCard
            title="Pedidos Históricos"
            value={metrics?.totals.ordersAllTime ?? (loadingMetrics ? '...' : 0)}
            subtitle={`${metrics?.today.ordersCreated ?? 0} pedidos creados hoy`}
            icon={<Package size={18} />}
          />
          <StatCard
            title="En Curso Ahora"
            value={metrics?.today.ordersActive ?? (loadingMetrics ? '...' : 0)}
            subtitle={`${metrics?.today.ordersDelivered ?? 0} entregados hoy`}
            icon={<Clock size={18} />}
          />
        </div>

        {/* 2. Gráfico de Órdenes & Resumen Hoy */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 30 Días */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Volumen de Pedidos (Últimos 30 días)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Comparativa de pedidos creados vs entregados
                </p>
              </div>
              <Badge variant="success" size="sm">
                Tasa de éxito: {metrics?.last30Days.deliveryRate ?? 0}%
              </Badge>
            </div>

            {metrics?.ordersPerDay && metrics.ordersPerDay.length > 0 ? (
              <OrdersChart data={metrics.ordersPerDay} />
            ) : (
              <div className="h-72 flex items-center justify-center text-xs text-gray-400">
                {loadingMetrics ? 'Cargando gráfico...' : 'No hay datos de los últimos 30 días'}
              </div>
            )}
          </div>

          {/* Resumen 30 días & Hoy */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Rendimiento de Entrega
              </h3>
              <p className="text-xs text-gray-400 mb-5">
                Promedios acumulados del último mes
              </p>

              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500">Tiempo prom. entrega</span>
                    <p className="text-base font-semibold text-gray-900 mt-0.5">
                      {metrics?.last30Days.avgDeliveryTimeMinutes
                        ? `${metrics.last30Days.avgDeliveryTimeMinutes} min`
                        : 'N/A'}
                    </p>
                  </div>
                  <Clock size={20} className="text-gray-400" />
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500">Entregas exitosas (30d)</span>
                    <p className="text-base font-semibold text-brand-700 mt-0.5">
                      {metrics?.last30Days.ordersDelivered ?? 0} pedidos
                    </p>
                  </div>
                  <CheckCircle size={20} className="text-brand-500" />
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500">Cancelaciones (30d)</span>
                    <p className="text-base font-semibold text-red-600 mt-0.5">
                      {metrics?.last30Days.ordersCancelled ?? 0} pedidos
                    </p>
                  </div>
                  <XCircle size={20} className="text-red-500" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Nuevos repartidores hoy:</span>
              <span className="font-semibold text-gray-900">
                +{metrics?.today.newRiders ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Top Rankings: Negocios y Repartidores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Negocios */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Top Negocios</h3>
                <p className="text-xs text-gray-400">Por volumen de pedidos en 30 días</p>
              </div>
              <Link
                to="/businesses"
                className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <span>Ver todos</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {metrics?.topBusinesses && metrics.topBusinesses.length > 0 ? (
                metrics.topBusinesses.map((biz, idx) => (
                  <div
                    key={biz.id}
                    className="py-3 flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-xs font-semibold text-gray-400">
                        #{idx + 1}
                      </span>
                      <Link
                        to={`/businesses/${biz.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {biz.name}
                      </Link>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                      {biz.ordersCount} pedidos
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-xs text-gray-400">
                  {loadingMetrics ? 'Cargando ranking...' : 'No hay datos suficientes'}
                </p>
              )}
            </div>
          </div>

          {/* Top Repartidores */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Top Repartidores</h3>
                <p className="text-xs text-gray-400">Por entregas completadas en 30 días</p>
              </div>
              <Link
                to="/riders"
                className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <span>Ver todos</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {metrics?.topRiders && metrics.topRiders.length > 0 ? (
                metrics.topRiders.map((rider, idx) => (
                  <div
                    key={rider.id}
                    className="py-3 flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-xs font-semibold text-gray-400">
                        #{idx + 1}
                      </span>
                      <span className="font-medium text-gray-900">{rider.name}</span>
                      {rider.averageRating && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          <Star size={12} weight="fill" />
                          {rider.averageRating}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                      {rider.deliveriesCount} entregas
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-xs text-gray-400">
                  {loadingMetrics ? 'Cargando ranking...' : 'No hay datos suficientes'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 4. Actividad Reciente Rápida */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Actividad Reciente</h3>
              <p className="text-xs text-gray-400">Últimos eventos registrados en el sistema</p>
            </div>
            <Link
              to="/logs"
              className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <span>Ver todos los logs</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {logs.slice(0, 5).map((log) => {
              const isDelivered = log.type === 'ORDER_DELIVERED';
              const isIncidencia = log.type === 'INCIDENCIA';
              const isCancelled = log.type === 'ORDER_CANCELLED';

              return (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isDelivered
                          ? 'bg-brand-500'
                          : isIncidencia || isCancelled
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <span className="text-gray-900 font-medium">{log.description}</span>
                  </div>
                  <span className="text-gray-400 shrink-0">
                    {formatRelativeTime(log.createdAt)}
                  </span>
                </div>
              );
            })}
            {!loadingLogs && logs.length === 0 && (
              <p className="py-6 text-center text-xs text-gray-400">
                No hay actividad registrada aún
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
