import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Phone, CheckCircle, Warning, Package, Motorcycle, MapPin, XCircle } from '@phosphor-icons/react';
import TrackingMap from '../components/TrackingMap';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';

const statusConfig: Record<string, { icon: React.ReactNode; title: string; description: string; bgColor: string; textColor: string; }> = {
  PENDIENTE: {
    icon: <Package size={24} weight="fill" />,
    title: 'Preparando tu pedido',
    description: 'Tu pedido está siendo preparado por el negocio',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  TOMADO: {
    icon: <Package size={24} weight="fill" />,
    title: 'Repartidor asignado',
    description: 'Un repartidor ha recogido tu pedido',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  EN_CAMINO: {
    icon: <Motorcycle size={24} weight="fill" />,
    title: 'En camino',
    description: 'Tu pedido está en camino hacia vos',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
  },
  CERCA_DEL_DESTINO: {
    icon: <MapPin size={24} weight="fill" />,
    title: '¡Ya casi llega!',
    description: 'El repartidor está muy cerca de tu ubicación',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
  },
  VERIFICANDO_ENTREGA: {
    icon: <CheckCircle size={24} weight="fill" />,
    title: 'Verificando entrega',
    description: 'El repartidor está confirmando la entrega',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
  },
  ENTREGADO: {
    icon: <CheckCircle size={24} weight="fill" />,
    title: '¡Pedido entregado!',
    description: 'Tu pedido fue entregado exitosamente',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
  },
  CANCELADO: {
    icon: <XCircle size={24} weight="fill" />,
    title: 'Pedido cancelado',
    description: 'Tu pedido fue cancelado',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
  },
  INCIDENCIA: {
    icon: <Warning size={24} weight="fill" />,
    title: 'Problema con el pedido',
    description: 'Hubo un inconveniente con tu pedido. El negocio te contactará.',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
  },
};

const TIMELINE_STEPS = [
  { status: 'PENDIENTE',            label: 'Pedido recibido' },
  { status: 'TOMADO',               label: 'Repartidor asignado' },
  { status: 'EN_CAMINO',            label: 'En camino' },
  { status: 'CERCA_DEL_DESTINO',    label: 'Cerca del destino' },
  { status: 'VERIFICANDO_ENTREGA',  label: 'Verificando entrega' },
  { status: 'ENTREGADO',            label: 'Entregado' },
];

const STATUS_ORDER = [
  'PENDIENTE', 'TOMADO', 'EN_CAMINO',
  'CERCA_DEL_DESTINO', 'VERIFICANDO_ENTREGA', 'ENTREGADO',
];

export const TrackingPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [repartidorPosition, setRepartidorPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isNear, setIsNear] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tracking', token],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/tracking/${token}`);
      return res.data;
    },
    refetchInterval: 15000,
    retry: 1,
  });

  useEffect(() => {
    if (error) {
      navigate('/expired', { replace: true });
    }
  }, [error, navigate]);

  useEffect(() => {
    if (data?.status === 'ENTREGADO' || data?.status === 'CERRADO') {
      navigate(`/${token}/delivered`, { replace: true });
    }
    if (data?.lastPosition && !repartidorPosition) {
      setRepartidorPosition(data.lastPosition);
    }
  }, [data?.status, data?.lastPosition, navigate, token, repartidorPosition]);

  useEffect(() => {
    if (!data?.orderId || data?.status === 'ENTREGADO' || data?.status === 'CERRADO') return;

    const socket = io(`${WS_URL}/tracking`, {
      path: '/socket.io',
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('join_order', { orderId: data.orderId });
    });

    socket.on('order_status_changed', ({ status }) => {
      queryClient.invalidateQueries({ queryKey: ['tracking', token] });
      if (status === 'ENTREGADO' || status === 'CERRADO') {
        navigate(`/${token}/delivered`, { replace: true });
      }
    });

    socket.on('location_updated', (position: { lat: number; lng: number }) => {
      setRepartidorPosition(position);
    });

    socket.on('geofence_triggered', () => {
      setIsNear(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [data?.orderId, queryClient, navigate, token]);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="w-full max-w-[430px] mx-auto bg-white min-h-screen flex flex-col shadow-sm">
          <div className="h-16 bg-gray-100 animate-pulse" />
          <div className="h-24 bg-gray-50 animate-pulse mx-4 mt-4 rounded-xl" />
          <div className="h-52 bg-gray-100 animate-pulse mx-4 mt-4 rounded-xl" />
          <div className="px-6 mt-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-gray-50 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = data.status;
  const config = statusConfig[currentStatus] || statusConfig.PENDIENTE;
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const isCompleted = (stepStatus: string) => STATUS_ORDER.indexOf(stepStatus) < currentIndex;
  const isCurrent = (stepStatus: string) => stepStatus === currentStatus;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full max-w-[430px] mx-auto bg-white min-h-screen flex flex-col shadow-sm pb-10">
        
        {/* HEADER */}
        <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-100">
          <div className="w-8 h-8 bg-gray-900 text-white rounded-md flex items-center justify-center font-bold text-xs shrink-0">
            TD
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm text-gray-900 truncate">TrackDeli</h1>
            <p className="text-xs text-gray-500 truncate">Hola, {data.customerName.split(' ')[0]}</p>
          </div>
        </div>

        {/* STATUS BANNER */}
        <div className="px-4 mt-4">
          <div className={`${config.bgColor} rounded-2xl p-5 border border-black/5`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center ${config.textColor} shrink-0 shadow-sm`}>
                {config.icon}
              </div>
              <div>
                <h2 className={`font-bold text-lg ${config.textColor} leading-tight mb-1`}>
                  {config.title}
                </h2>
                <p className={`text-sm ${config.textColor} opacity-90 leading-snug`}>
                  {config.description}
                  {data.deliveryUser && (
                    <span className="block mt-0.5 font-medium">Repartidor: {data.deliveryUser.name}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MAPA */}
        <div className="px-4 mt-4">
          {data?.destinationLat && data?.destinationLng ? (
            <TrackingMap
              destinationLat={data.destinationLat}
              destinationLng={data.destinationLng}
              repartidorLat={repartidorPosition?.lat}
              repartidorLng={repartidorPosition?.lng}
              businessLat={data.business?.latitude}
              businessLng={data.business?.longitude}
            />
          ) : (
            <div className="h-[240px] bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
              <p className="text-sm text-gray-400">Sin ubicación disponible</p>
            </div>
          )}
        </div>

        {/* TIMELINE */}
        <div className="px-6 py-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">
            Estado del pedido
          </p>

          {isNear && currentStatus !== 'ENTREGADO' && (
            <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-start gap-3">
              <MapPin size={20} className="text-purple-600 shrink-0 mt-0.5" weight="fill" />
              <div>
                <p className="text-sm font-semibold text-purple-900">¡El repartidor está cerca!</p>
                <p className="text-xs text-purple-700 mt-0.5">Por favor, prepárate para recibir tu pedido.</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-0">
            {TIMELINE_STEPS.map((step, index) => {
              let completed = false;
              let current = false;
              let pending = true;

              if (currentStatus === 'CANCELADO' || currentStatus === 'INCIDENCIA') {
                if (index === 0) completed = true; // Assume PENDIENTE was completed
              } else {
                completed = isCompleted(step.status);
                current = isCurrent(step.status);
                pending = !completed && !current;
              }

              const isLast = index === TIMELINE_STEPS.length - 1;

              return (
                <div key={step.status} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                      ${completed ? 'bg-[#22C55E]' : ''}
                      ${current ? 'bg-gray-900 ring-4 ring-gray-900/10' : ''}
                      ${pending ? 'bg-gray-100 border-2 border-gray-200' : ''}
                    `}>
                      {completed && (
                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 h-10 my-1 ${completed ? 'bg-[#22C55E]/40' : 'bg-gray-100'}`} />
                    )}
                  </div>
                  <div className="pb-10 pt-0.5">
                    <p className={`text-[15px] font-semibold ${
                      completed ? 'text-[#16A34A]' :
                      current ? 'text-gray-900' :
                      'text-gray-400'
                    }`}>
                      {step.label}
                    </p>
                    {current && (
                      <p className="text-xs font-medium text-gray-500 mt-0.5">Estado actual</p>
                    )}
                  </div>
                </div>
              );
            })}

            {(currentStatus === 'CANCELADO' || currentStatus === 'INCIDENCIA') && (
              <div className="flex items-start gap-4 -mt-6">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500 ring-4 ring-red-500/20">
                    <Warning size={14} weight="bold" className="text-white" />
                  </div>
                </div>
                <div className="pb-4 pt-0.5">
                  <p className="text-[15px] font-semibold text-red-600">
                    {currentStatus === 'CANCELADO' ? 'Cancelado' : 'Incidencia'}
                  </p>
                  <p className="text-xs font-medium text-red-500 mt-0.5">Estado actual</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOTOS */}
        {data.photos?.filter((p: any) => p.type === 'ARMADO').length > 0 && (
          <div className="px-6 py-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Así salió tu pedido
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {data.photos
                .filter((p: any) => p.type === 'ARMADO')
                .map((photo: any) => (
                  <a
                    key={photo.id}
                    href={photo.photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <img
                      src={photo.photoUrl}
                      alt="Foto del pedido"
                      className="w-24 h-24 object-cover rounded-xl border border-gray-200 shadow-sm"
                      loading="lazy"
                    />
                  </a>
                ))
              }
            </div>
          </div>
        )}

        {/* LLAMAR REPARTIDOR */}
        {data.deliveryUser && (
          <div className="px-6 mt-4">
            <a
              href={`tel:+50588887777`} // Idealmente el teléfono vendría del backend
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border-2 border-gray-900 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <Phone size={18} weight="bold" />
              Llamar al repartidor
            </a>
          </div>
        )}

      </div>
    </div>
  );
};
