import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrder, getOrderPhotos, type OrderStatus } from 'api-client';
import { ArrowLeft, Copy, Image } from '@phosphor-icons/react';
import { toast } from 'react-hot-toast';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/formatDate';

const STATUS_SEQUENCE: OrderStatus[] = [
  'PENDIENTE', 'TOMADO', 'EN_CAMINO', 'CERCA_DEL_DESTINO',
  'VERIFICANDO_ENTREGA', 'ENTREGADO',
];

const statusLabel: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  TOMADO: 'Tomado',
  EN_CAMINO: 'En camino',
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

  const { data: photos = [] } = useQuery({
    queryKey: ['order-photos', id],
    queryFn: () => getOrderPhotos(id!),
    enabled: !!id,
  });

  const copyTrackingLink = () => {
    if (!order?.trackingToken) return;
    const link = `${window.location.origin.replace('5173', '5174')}/track/${order.trackingToken}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado al portapapeles');
  };

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

  // Build timeline — merge status history with the canonical sequence
  const history = order.statusHistory ?? [];
  const completedStatuses = history.map(h => h.status);

  const timeline = STATUS_SEQUENCE.map(s => {
    const historyEntry = history.find(h => h.status === s);
    const isCompleted = !!historyEntry || completedStatuses.indexOf(s) <= completedStatuses.indexOf(order.status as OrderStatus);
    return { status: s, completedAt: historyEntry?.createdAt ?? null, isCompleted };
  });

  // If cancelled or incidence, add it at the end
  if (order.status === 'CANCELADO' || order.status === 'INCIDENCIA') {
    const entry = history.find(h => h.status === order.status);
    timeline.push({ status: order.status, completedAt: entry?.createdAt ?? null, isCompleted: true });
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
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Fotos del pedido</div>
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Image size={24} className="text-gray-300" />
                <p className="text-sm text-gray-400">Sin fotos aún</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {photos.map(photo => (
                  <img
                    key={photo.id}
                    src={photo.url}
                    alt="Foto del pedido"
                    className="w-24 h-24 object-cover rounded-lg border border-gray-100"
                  />
                ))}
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
                    <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${item.isCompleted ? 'bg-brand-600' : 'bg-gray-200'}`} />
                    {idx < timeline.length - 1 && (
                      <div className={`w-0.5 flex-1 my-1 ${item.isCompleted ? 'bg-brand-200' : 'bg-gray-100'}`} style={{ minHeight: '24px' }} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={`text-sm font-medium ${item.isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {statusLabel[item.status] ?? item.status}
                    </p>
                    {item.completedAt ? (
                      <p className="text-xs text-gray-400">{formatDateTime(item.completedAt)}</p>
                    ) : (
                      <p className="text-xs text-gray-300">Pendiente</p>
                    )}
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
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                  {initials(order.deliveryUser.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.deliveryUser.name}</p>
                  <p className="text-xs text-gray-400">Repartidor</p>
                </div>
              </div>
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
