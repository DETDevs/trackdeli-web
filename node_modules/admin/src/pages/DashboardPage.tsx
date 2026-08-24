import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package, Motorcycle, CheckCircle, Users } from '@phosphor-icons/react';
import { getOrders, getUsers, getMyBusiness } from 'api-client';
import { isToday } from 'date-fns';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { formatRelative } from '../utils/formatDate';
import LiveMap from '../components/LiveMap';
import { useMapStore } from '../store/map.store';
import { useSocketStore } from '../store/socket.store';
import { useEffect, useState, useRef, useMemo } from 'react';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);

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

  const { data: business } = useQuery({
    queryKey: ['business'],
    queryFn: () => getMyBusiness(),
  });

  const pendientes = orders.filter(o => o.status === 'PENDIENTE').length;
  const enCamino = orders.filter(o => o.status === 'EN_CAMINO').length;
  const entregadosHoy = orders.filter(o => o.deliveredAt && isToday(new Date(o.deliveredAt))).length;
  const repartidoresActivosCount = users.filter(u => u.isActive).length;
  const recientes = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const { socket } = useSocketStore();

  const joinedRooms = useRef<Set<string>>(new Set());

  const activeOrderIds = useMemo(() => {
    return orders
      .filter(o => o.status === 'EN_CAMINO' || o.status === 'CERCA_DEL_DESTINO' || o.status === 'VERIFICANDO_ENTREGA')
      .map(o => o.id)
      .sort()
      .join(',');
  }, [orders]);

  useEffect(() => {
    if (!socket) return;

    const syncOrders = () => {
      const newIds = activeOrderIds ? activeOrderIds.split(',') : [];
      const newIdSet = new Set(newIds);

      // 1. Join nuevos que no estamos
      newIds.forEach(id => {
        if (!joinedRooms.current.has(id)) {
          socket.emit('join_order', { orderId: id });
          joinedRooms.current.add(id);
        }
      });

      // 2. Leave de rooms que ya no están activos
      joinedRooms.current.forEach(id => {
        if (!newIdSet.has(id)) {
          socket.emit('leave_order', { orderId: id });
          joinedRooms.current.delete(id);
        }
      });
    };

    if (socket.connected) {
      syncOrders();
    }

    // Al reconectar, volver a unirse a todos los rooms guardados
    const onConnect = () => {
      joinedRooms.current.forEach(id => {
        socket.emit('join_order', { orderId: id });
      });
    };

    socket.on('connect', onConnect);

    return () => {
      socket.off('connect', onConnect);
    };
  }, [socket, activeOrderIds]);

  const { repartidoresActivos } = useMapStore();
  
  const now = Date.now();
  const enrichedRepartidores = repartidoresActivos
    .filter(rep => (now - rep.lastUpdated) < 60000)
    .map(rep => {
      const order = orders.find(o => o.id === rep.orderId);
      if (order) {
        return {
          ...rep,
          name: order.deliveryUser?.name || rep.name,
          customerName: order.customerName || rep.customerName,
        };
      }
      return rep;
    });

  const activeOrdersForMap = useMemo(() => {
    return orders
      .filter(o => 
        (o.status === 'TOMADO' || o.status === 'EN_CAMINO' || o.status === 'CERCA_DEL_DESTINO') && 
        o.destinationLat && o.destinationLng
      )
      .map(o => ({
        id: o.id,
        status: o.status,
        destinationLat: Number(o.destinationLat),
        destinationLng: Number(o.destinationLng),
      }));
  }, [orders]);

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
              value={usersLoading ? '—' : repartidoresActivosCount}
              subtitle="Activos ahora"
              icon={<Users size={16} />}
            />
          </>
        )}
      </div>

      {/* Map Live */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">Repartidores activos</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {enrichedRepartidores.length} en tiempo real
          </p>
        </div>
        <LiveMap 
          repartidores={enrichedRepartidores} 
          activeOrders={activeOrdersForMap}
          businessLocation={business?.latitude && business?.longitude ? { lat: business.latitude, lng: business.longitude } : undefined}
          focusedOrderId={focusedOrderId}
          onMarkerClick={setFocusedOrderId}
        />
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
                onClick={() => setFocusedOrderId(order.id)}
                className={`px-5 py-3 flex items-center gap-4 cursor-pointer transition-colors ${focusedOrderId === order.id ? 'bg-gray-50 border-l-2 border-brand-500' : 'hover:bg-gray-50 border-l-2 border-transparent'}`}
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
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  Ver
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
