import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package, Motorcycle, CheckCircle, Users, MapPin } from '@phosphor-icons/react';
import { getOrders, getUsers } from 'api-client';
import { isToday } from 'date-fns';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { formatRelative } from '../utils/formatDate';

export const DashboardPage = () => {
  const navigate = useNavigate();

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(),
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const pendientes = orders.filter(o => o.status === 'PENDIENTE').length;
  const enCamino = orders.filter(o => o.status === 'EN_CAMINO').length;
  const entregadosHoy = orders.filter(o => o.deliveredAt && isToday(new Date(o.deliveredAt))).length;
  const repartidoresActivos = users.filter(u => u.isActive).length;
  const recientes = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ordersLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl h-24 animate-pulse" />
          ))
        ) : (
          <>
            <StatCard
              title="Pendientes"
              value={pendientes}
              subtitle="Esperando repartidor"
              icon={<Package size={16} />}
            />
            <StatCard
              title="En camino"
              value={enCamino}
              subtitle="En proceso de entrega"
              icon={<Motorcycle size={16} />}
            />
            <StatCard
              title="Entregados hoy"
              value={entregadosHoy}
              subtitle="Completados este día"
              icon={<CheckCircle size={16} />}
            />
            <StatCard
              title="Repartidores"
              value={usersLoading ? '—' : repartidoresActivos}
              subtitle="Activos ahora"
              icon={<Users size={16} />}
            />
          </>
        )}
      </div>

      {/* Map Placeholder */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl h-80 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
          <MapPin size={24} className="text-gray-400" weight="regular" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Mapa en vivo</p>
          <p className="text-xs text-gray-400 mt-0.5">Se integrará Mapbox en la próxima actualización</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pedidos recientes</h2>
          <button
            onClick={() => navigate('/orders')}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            Ver todos →
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {ordersLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse ml-auto" />
              </div>
            ))
          ) : recientes.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">No hay pedidos aún.</div>
          ) : (
            recientes.map(order => (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{order.customerName}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{order.destinationAddress}</p>
                </div>
                <StatusBadge status={order.status} />
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {order.deliveryUser?.name ?? <span className="text-gray-300">Sin asignar</span>}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap w-20 text-right">
                  {formatRelative(order.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
