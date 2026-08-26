import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package, Motorcycle, CheckCircle, Users, ArrowRight } from '@phosphor-icons/react';
import { getOrders, getUsers, getMyBusiness } from 'api-client';
import { isToday } from 'date-fns';
import { StatCard } from '../components/StatCard';
import { formatRelativeCompact } from '../utils/formatDate';
import LiveMap from '../components/LiveMap';
import { useMapStore } from '../store/map.store';
import { useSocketStore } from '../store/socket.store';
import { useEffect, useState, useRef, useMemo } from 'react';

const CompactStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'ACEPTADO':
    case 'EN_CAMINO_AL_NEGOCIO':
    case 'EN_EL_NEGOCIO':
    case 'EN_CAMINO':
    case 'CERCA_DEL_DESTINO':
      return (
        <div className="flex items-center gap-1.5 text-[#0284C7] font-medium text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0284C7] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0284C7]"></span>
          </span>
          {status === 'EN_CAMINO_AL_NEGOCIO' || status === 'ACEPTADO' ? 'Hacia negocio' : 
           status === 'EN_EL_NEGOCIO' ? 'En el negocio' : 'En camino'}
        </div>
      );
    case 'ENTREGADO':
      return (
        <div className="flex items-center gap-1.5 text-[#16A34A] font-medium text-xs">
          <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
          Entregado
        </div>
      );
    case 'CANCELADO':
      return (
        <div className="flex items-center gap-1.5 text-[#6B7280] font-medium text-xs">
          <span className="w-2 h-2 rounded-full bg-[#6B7280]"></span>
          Cancelado
        </div>
      );
    case 'INCIDENCIA':
      return (
        <div className="flex items-center gap-1.5 text-[#DC2626] font-medium text-xs">
          <span className="w-2 h-2 rounded-full bg-[#DC2626]"></span>
          Incidencia
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1.5 text-[#D97706] font-medium text-xs">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
          Pendiente
        </div>
      );
  }
};

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
  const enCamino = orders.filter(o => ['ACEPTADO', 'EN_CAMINO_AL_NEGOCIO', 'EN_EL_NEGOCIO', 'EN_CAMINO', 'CERCA_DEL_DESTINO', 'VERIFICANDO_ENTREGA'].includes(o.status)).length;
  const entregadosHoy = orders.filter(o => o.deliveredAt && isToday(new Date(o.deliveredAt))).length;
  const repartidoresActivosCount = users.filter(u => u.isActive).length;
  const recientes = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const { socket } = useSocketStore();

  const joinedRooms = useRef<Set<string>>(new Set());

  const activeOrderIds = useMemo(() => {
    return orders
      .filter(o => ['ACEPTADO', 'EN_CAMINO_AL_NEGOCIO', 'EN_EL_NEGOCIO', 'EN_CAMINO', 'CERCA_DEL_DESTINO', 'VERIFICANDO_ENTREGA'].includes(o.status))
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
        ['ACEPTADO', 'EN_CAMINO_AL_NEGOCIO', 'EN_EL_NEGOCIO', 'EN_CAMINO', 'CERCA_DEL_DESTINO'].includes(o.status) && 
        o.destinationLat && o.destinationLng
      )
      .map(o => ({
        id: o.id,
        status: o.status,
        destinationLat: ((o.status as string) === 'EN_CAMINO_AL_NEGOCIO' || (o.status as string) === 'EN_EL_NEGOCIO' || (o.status as string) === 'ACEPTADO') ? Number(business?.latitude ?? o.destinationLat) : Number(o.destinationLat),
        destinationLng: ((o.status as string) === 'EN_CAMINO_AL_NEGOCIO' || (o.status as string) === 'EN_EL_NEGOCIO' || (o.status as string) === 'ACEPTADO') ? Number(business?.longitude ?? o.destinationLng) : Number(o.destinationLng),
      }));
  }, [orders, business]);

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
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium text-[#0F0F0F] uppercase tracking-wider">Pedidos Recientes</h2>
            <p className="text-xs text-[#6B7280] mt-1">{enCamino} en camino · {entregadosHoy} entregados hoy</p>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="text-xs font-medium text-[#6B7280] hover:text-[#0F0F0F] transition-colors"
          >
            Ver todos →
          </button>
        </div>
        
        <div className="space-y-3">
          {ordersLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white p-3 rounded-lg border border-gray-100 animate-pulse h-20" />
            ))
          ) : recientes.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-100 px-5 py-10 text-center text-sm text-[#9CA3AF]">
              No hay pedidos aún.
            </div>
          ) : (
            recientes.map(order => (
              <div
                key={order.id}
                onClick={() => setFocusedOrderId(order.id)}
                className={`bg-white rounded-lg border p-3 cursor-pointer transition-all ${
                  focusedOrderId === order.id 
                    ? 'border-brand-500 ring-1 ring-brand-500/20 shadow-sm' 
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <CompactStatusBadge status={order.status} />
                  <span className="text-[11px] text-[#9CA3AF] font-normal">{formatRelativeCompact(order.createdAt)}</span>
                </div>
                
                <div className="flex items-end justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[13px] font-medium text-[#0F0F0F] truncate">{order.customerName}</p>
                    <p className="text-[11px] text-[#6B7280] truncate mt-0.5">{order.destinationAddress}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-[11px] font-normal text-[#6B7280]">
                      {order.deliveryUser?.name ?? <span className="text-gray-300">Sin asignar</span>}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-[#0F0F0F] hover:bg-gray-50 px-2.5 py-1.5 rounded transition-colors border border-transparent hover:border-gray-200"
                    >
                      Ver <ArrowRight size={12} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
