import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrders, getUsers } from 'api-client';
import { isToday, isThisMonth, differenceInMinutes } from 'date-fns';
import { CheckCircle, Clock, Package } from '@phosphor-icons/react';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';

const BAR_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-amber-400',
  EN_CAMINO: 'bg-indigo-400',
  ENTREGADO: 'bg-green-500',
  CANCELADO: 'bg-red-400',
  TOMADO: 'bg-blue-400',
  CERCA_DEL_DESTINO: 'bg-purple-400',
  VERIFICANDO_ENTREGA: 'bg-orange-400',
  INCIDENCIA: 'bg-red-500',
  CERRADO: 'bg-gray-300',
};

export const ReportsPage = () => {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  });

  const stats = useMemo(() => {
    const entregadosHoy = orders.filter(o =>
      o.status === 'ENTREGADO' && o.deliveredAt && isToday(new Date(o.deliveredAt))
    );
    const totalMes = orders.filter(o => isThisMonth(new Date(o.createdAt)));

    const tiempos = orders
      .filter(o => o.status === 'ENTREGADO' && o.takenAt && o.deliveredAt)
      .map(o => differenceInMinutes(new Date(o.deliveredAt!), new Date(o.takenAt!)))
      .filter(t => t > 0);

    const avgMinutes = tiempos.length
      ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length)
      : null;

    // Count by status
    const byStatus: Record<string, number> = {};
    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    }

    return { entregadosHoy: entregadosHoy.length, totalMes: totalMes.length, avgMinutes, byStatus };
  }, [orders]);

  // Delivery performance per user
  const staffPerformance = useMemo(() => {
    return users.map(u => {
      const myOrders = orders.filter(o => o.deliveryUserId === u.id);
      const today = myOrders.filter(o =>
        o.status === 'ENTREGADO' && o.deliveredAt && isToday(new Date(o.deliveredAt))
      ).length;
      const inProgress = myOrders.filter(o =>
        ['TOMADO', 'EN_CAMINO', 'CERCA_DEL_DESTINO', 'VERIFICANDO_ENTREGA'].includes(o.status)
      ).length;
      return { ...u, entregadosHoy: today, enCurso: inProgress };
    });
  }, [users, orders]);

  const maxStatusCount = Math.max(...Object.values(stats.byStatus), 1);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))
        ) : (
          <>
            <StatCard
              title="Entregas hoy"
              value={stats.entregadosHoy}
              subtitle="Pedidos entregados hoy"
              icon={<CheckCircle size={16} />}
            />
            <StatCard
              title="Tiempo promedio"
              value={stats.avgMinutes != null ? `${stats.avgMinutes} min` : '—'}
              subtitle="Promedio de entrega"
              icon={<Clock size={16} />}
            />
            <StatCard
              title="Total del mes"
              value={stats.totalMes}
              subtitle="Pedidos este mes"
              icon={<Package size={16} />}
            />
          </>
        )}
      </div>

      {/* Orders by status */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5">Pedidos por estado</div>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 mb-3">
              <div className="w-32 h-4 bg-gray-100 rounded animate-pulse" />
              <div className="flex-1 h-3 bg-gray-100 rounded animate-pulse" />
            </div>
          ))
        ) : Object.keys(stats.byStatus).length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No hay datos aún.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(stats.byStatus)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <div key={status} className="flex items-center gap-4">
                  <div className="w-36 shrink-0">
                    <StatusBadge status={status} />
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${BAR_COLORS[status] ?? 'bg-gray-400'} transition-all`}
                        style={{ width: `${(count / maxStatusCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Staff performance */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Rendimiento por repartidor</div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Entregas hoy</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">En curso</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staffPerformance.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">
                  No hay repartidores registrados.
                </td>
              </tr>
            ) : (
              staffPerformance.map(u => (
                <tr key={u.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                        {u.name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700 font-medium">{u.entregadosHoy}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{u.enCurso}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <span className={`text-xs ${u.isActive ? 'text-green-700' : 'text-gray-400'}`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
