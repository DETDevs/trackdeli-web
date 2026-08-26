import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrder, type OrderStatus, apiClient, getMyBusiness } from 'api-client';
import { ArrowLeft, Copy } from '@phosphor-icons/react';
import { toast } from 'react-hot-toast';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/formatDate';
import LiveMap from '../components/LiveMap';
import { useMapStore } from '../store/map.store';
import { useSocketStore } from '../store/socket.store';
import { useEffect } from 'react';

const STATUS_SEQUENCE: string[] = [
  'PENDIENTE', 'ACEPTADO', 'EN_CAMINO_AL_NEGOCIO', 'EN_EL_NEGOCIO', 'EN_CAMINO', 'CERCA_DEL_DESTINO',
  'VERIFICANDO_ENTREGA', 'ENTREGADO',
];

const statusLabel: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADO: 'Aceptado',
  EN_CAMINO_AL_NEGOCIO: 'Hacia el negocio',
  EN_EL_NEGOCIO: 'En el negocio',
  EN_CAMINO: 'En camino al cliente',
  CERCA_DEL_DESTINO: 'Cerca del destino',
  VERIFICANDO_ENTREGA: 'Verificando entrega',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  INCIDENCIA: 'Incidencia',
  CERRADO: 'Cerrado',
};

const paymentLabel: Record<string, string> = {
  PAGADO: 'Pagado',
  CONTRA_ENTREGA: 'Contra entrega',
  GRATIS: 'Gratis',
};

export const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id!),
    refetchInterval: 15_000,
    enabled: !!id,
  });

  const { data: business } = useQuery({
    queryKey: ['business'],
    queryFn: () => getMyBusiness(),
  });

  // Agregar query para fotos
  const { data: photos = [] } = useQuery({
    queryKey: ['order-photos', id],
    queryFn: async () => {
      const response = await apiClient.get(`/orders/${id}/photos`);
      return response.data as Array<{
        id: string;
        photoUrl: string;
        type: 'ARMADO' | 'ENTREGA';
        createdAt: string;
      }>;
    },
    enabled: !!id,
  });

  // Separar fotos por tipo
  const fotosArmado = photos.filter(p => p.type === 'ARMADO');
  const fotosEntrega = photos.filter(p => p.type === 'ENTREGA');

  const copyTrackingLink = () => {
    if (!order?.trackingToken) return;
    const link = `${window.location.origin.replace('5173', '5174')}/${order.trackingToken}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado al portapapeles');
  };

  const { socket } = useSocketStore();

  useEffect(() => {
    if (socket && order?.id) {
      if (['ACEPTADO', 'EN_CAMINO_AL_NEGOCIO', 'EN_EL_NEGOCIO', 'EN_CAMINO', 'CERCA_DEL_DESTINO', 'VERIFICANDO_ENTREGA'].includes(order.status)) {
        socket.emit('join_order', { orderId: order.id });
      }
    }
  }, [socket, order?.id, order?.status]);

  const { repartidoresActivos } = useMapStore();
  const orderRepartidor = repartidoresActivos.find(r => r.orderId === order?.id);
  const repList = orderRepartidor ? [{
    ...orderRepartidor,
    name: order?.deliveryUser?.name || orderRepartidor.name,
    customerName: order?.customerName || orderRepartidor.customerName,
  }] : [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
        No se pudo cargar el pedido. <button onClick={() => navigate('/orders')} className="underline">Volver a pedidos</button>
      </div>
    );
  }

  // Build timeline dynamically based on current status index
  const currentStatusIndex = STATUS_SEQUENCE.indexOf(order.status as OrderStatus);
  
  let timeline = STATUS_SEQUENCE.map((s, idx) => {
    let completedAt: string | null = null;
    
    if (s === 'PENDIENTE') completedAt = order.createdAt;
    if (s === 'ACEPTADO') completedAt = order.takenAt ?? null;
    if (s === 'EN_EL_NEGOCIO') completedAt = (order as any).arrivedAtBusinessAt ?? null;
    if (s === 'EN_CAMINO') completedAt = (order as any).pickedUpAt ?? null;
    if (s === 'ENTREGADO') completedAt = order.deliveredAt ?? null;

    const isCompleted = currentStatusIndex > idx;
    const isCurrent = currentStatusIndex === idx;
    const isFuture = currentStatusIndex !== -1 && currentStatusIndex < idx;
    
    let label = 'Pendiente';
    if (isCompleted || isCurrent) {
        label = completedAt ? formatDateTime(completedAt) : 'Completado';
    }

    return { 
      status: s, 
      label,
      isCompleted,
      isCurrent,
      isFuture,
      isErrorState: false
    };
  });

  // Handle cut-off for CANCELADO / INCIDENCIA
  if (order.status === 'CANCELADO' || order.status === 'INCIDENCIA') {
    const cutoffIndex = order.takenAt ? 1 : 0;
    
    timeline = timeline.slice(0, cutoffIndex + 1).map(t => ({
        ...t, 
        isCompleted: true, 
        isCurrent: false, 
        isFuture: false
    }));
    
    timeline.push({
        status: order.status,
        label: order.updatedAt ? formatDateTime(order.updatedAt) : 'Completado',
        isCompleted: false,
        isCurrent: true,
        isFuture: false,
        isErrorState: true
    });
  }

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <button
        onClick={() => navigate('/orders')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver a pedidos
      </button>

      {/* Title */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{order.customerName}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Pedido #{order.id.slice(0, 8)}...</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Info + Photos */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-4">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Información</div>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Cliente</dt>
                <dd className="text-sm font-medium text-gray-900">{order.customerName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">WhatsApp</dt>
                <dd className="text-sm font-medium text-gray-900">{order.customerPhone}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-gray-500 shrink-0">Dirección</dt>
                <dd className="text-sm font-medium text-gray-900 text-right">{order.destinationAddress}</dd>
              </div>
              {order.description && (
                <div className="flex justify-between gap-4">
                  <dt className="text-sm text-gray-500 shrink-0">Descripción</dt>
                  <dd className="text-sm font-medium text-gray-900 text-right">{order.description}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Pago</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {paymentLabel[order.deliveryPaymentStatus] ?? order.deliveryPaymentStatus}
                </dd>
              </div>
              {order.deliveryPaymentStatus !== 'GRATIS' && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Monto</dt>
                  <dd className="text-sm font-medium text-gray-900">C$ {order.deliveryFee.toFixed(2)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Creado</dt>
                <dd className="text-sm font-medium text-gray-900">{formatDateTime(order.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Photos */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            {fotosArmado.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Fotos del pedido armado
                </p>
                <div className="flex gap-2 flex-wrap">
                  {fotosArmado.map((foto) => (
                    <a
                      key={foto.id}
                      href={foto.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={foto.photoUrl}
                        alt="Foto del pedido"
                        className="w-24 h-24 object-cover rounded-lg border border-gray-100 hover:opacity-90 transition-opacity cursor-pointer"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin fotos de armado</p>
            )}

            {/* Renderizar fotos de entrega: */}
            {fotosEntrega.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Fotos de entrega
                </p>
                <div className="flex gap-2 flex-wrap">
                  {fotosEntrega.map((foto) => (
                    <a key={foto.id} href={foto.photoUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={foto.photoUrl}
                        alt="Foto de entrega"
                        className="w-24 h-24 object-cover rounded-lg border border-gray-100 hover:opacity-90 transition-opacity cursor-pointer"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Timeline + Repartidor + Tracking */}
        <div className="space-y-4">
          {/* Timeline */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5">Timeline de estados</div>
            <div className="space-y-0">
              {timeline.map((item, idx) => (
                <div key={item.status} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div 
                      className={`rounded-full mt-0.5 shrink-0 transition-all duration-300
                        ${item.isCompleted ? 'w-3 h-3 bg-[#22C55E]' : ''}
                        ${item.isCurrent && !item.isErrorState ? 'w-3.5 h-3.5 bg-white border-[3px] border-[#22C55E] ring-4 ring-[#22C55E]/10' : ''}
                        ${item.isCurrent && item.isErrorState ? 'w-3.5 h-3.5 bg-white border-[3px] border-red-500 ring-4 ring-red-500/10' : ''}
                        ${item.isFuture ? 'w-3 h-3 bg-gray-200' : ''}
                      `} 
                    />
                    {idx < timeline.length - 1 && (
                      <div 
                        className={`w-0.5 flex-1 my-1 transition-colors duration-300 ${item.isCompleted ? 'bg-[#22C55E]/30' : 'bg-gray-100'}`} 
                        style={{ minHeight: '24px' }} 
                      />
                    )}
                  </div>
                  <div className="pb-4 pt-0.5">
                    <p className={`text-sm font-medium ${item.isCompleted || item.isCurrent ? 'text-gray-900' : 'text-gray-400'} ${item.isErrorState ? '!text-red-600' : ''}`}>
                      {statusLabel[item.status] ?? item.status}
                    </p>
                    <p className={`text-xs ${item.isFuture ? 'text-gray-300' : 'text-gray-400'} ${item.isErrorState ? '!text-red-400' : ''}`}>
                      {item.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Repartidor */}
          {order.deliveryUser && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Repartidor asignado</div>
              <div className="flex items-center gap-3">
                {(order.deliveryUser as any).profilePhotoUrl ? (
                  <img src={(order.deliveryUser as any).profilePhotoUrl} className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-100" alt="Foto perfil" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-base font-medium text-gray-600 shrink-0">
                    {initials(order.deliveryUser.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{order.deliveryUser.name}</p>
                  <p className="text-xs text-gray-400">Repartidor</p>
                  {((order.deliveryUser as any).vehicleType) && (
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                      {((order.deliveryUser as any).vehicleType === 'MOTO' ? '🏍️' : 
                        (order.deliveryUser as any).vehicleType === 'BICICLETA' ? '🚲' : 
                        (order.deliveryUser as any).vehicleType === 'CARRO' ? '🚗' : '🚶')}{' '}
                      <span className="truncate">
                        {((order.deliveryUser as any).vehicleType.charAt(0).toUpperCase() + (order.deliveryUser as any).vehicleType.slice(1).toLowerCase())}
                        {((order.deliveryUser as any).vehicleColor ? ' · ' + (order.deliveryUser as any).vehicleColor : '')}
                        {((order.deliveryUser as any).vehiclePlate ? ' · ' + (order.deliveryUser as any).vehiclePlate : '')}
                      </span>
                    </p>
                  )}
                  {((order.deliveryUser as any).phone) && (
                    <p className="text-xs text-gray-500 mt-0.5">📞 {((order.deliveryUser as any).phone)}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mapa de Tracking */}
          {['EN_CAMINO_AL_NEGOCIO', 'EN_EL_NEGOCIO', 'EN_CAMINO', 'CERCA_DEL_DESTINO'].includes(order.status) && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Ubicación en tiempo real</div>
              </div>
              <LiveMap 
                repartidores={repList}
                activeOrders={order.destinationLat && order.destinationLng ? [{
                  id: order.id,
                  status: order.status,
                  destinationLat: (order.status as string) === 'EN_CAMINO_AL_NEGOCIO' || (order.status as string) === 'EN_EL_NEGOCIO' 
                    ? Number(business?.latitude ?? order.destinationLat) : Number(order.destinationLat),
                  destinationLng: (order.status as string) === 'EN_CAMINO_AL_NEGOCIO' || (order.status as string) === 'EN_EL_NEGOCIO'
                    ? Number(business?.longitude ?? order.destinationLng) : Number(order.destinationLng),
                }] : []}
                businessLocation={
                  ((order.status as string) === 'EN_CAMINO_AL_NEGOCIO' || (order.status as string) === 'EN_EL_NEGOCIO') && repList.length > 0
                    ? { lat: repList[0].lat, lng: repList[0].lng }
                    : (business?.latitude && business?.longitude ? { lat: business.latitude, lng: business.longitude } : undefined)
                }
                centerLat={order.destinationLat || 12.1364}
                centerLng={order.destinationLng || -86.2504}
                focusedOrderId={order.id}
              />
            </div>
          )}

          {/* Tracking link */}
          {order.trackingToken && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Link de tracking</div>
              <button
                onClick={copyTrackingLink}
                className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Copy size={16} />
                Copiar link de tracking
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
