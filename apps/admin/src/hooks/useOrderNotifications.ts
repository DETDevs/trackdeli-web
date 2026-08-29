import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth.store';
import { useMapStore } from '../store/map.store';
import { useSocketStore } from '../store/socket.store';

export function useOrderNotifications() {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken || !user?.businessId) return;

    // Conectar al WebSocket
    // @ts-ignore: Vite injects import.meta.env during build
    const baseUrl = import.meta.env?.VITE_WS_URL || import.meta.env?.VITE_API_BASE_URL?.replace('/api/v1', '') || 'https://trackdeli-api-production.up.railway.app';
    const socket = io(`${baseUrl}/tracking`, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token: accessToken },
      query: { token: accessToken },
    });

    socketRef.current = socket;
    useSocketStore.getState().setSocket(socket);

    socket.on('connect', () => {
      console.log('[WS Admin] Conectado');
      // Unirse al room del negocio para recibir actualizaciones
      socket.emit('join_business', { businessId: user.businessId });
    });

    // Nuevo pedido creado → actualizar lista
    socket.on('orders_updated', () => {
      console.log('[WS Admin] orders_updated');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    // Estado de pedido cambiado → actualizar lista y detalle
    socket.on('order_status_changed', (data: { orderId: string; status: string }) => {
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // Toast de notificación
      const statusLabels: Record<string, string> = {
        COTIZANDO: '🏷️ Pedido en cotización de tarifas',
        TOMADO: '📦 Pedido tomado por un repartidor',
        ACEPTADO: '🛵 Repartidor asignado',
        EN_CAMINO: '🛵 Pedido en camino',
        CERCA_DEL_DESTINO: '📍 Repartidor cerca del destino',
        ENTREGADO: '✅ Pedido entregado',
        INCIDENCIA: '⚠️ Incidencia reportada',
        CANCELADO: '❌ Pedido cancelado',
      };

      const message = statusLabels[data.status];
      if (message) {
        toast(message, {
          duration: 4000,
          style: {
            background: '#0F0F0F',
            color: '#FFFFFF',
            fontSize: '14px',
            borderRadius: '8px',
          },
        });
      }
    });

    // Nueva propuesta de tarifa recibida
    socket.on('new_quote', (data: any) => {
      console.log('[WS Admin] new_quote', data);
      const orderId = data?.orderId || data?.quote?.orderId;
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['quotes', orderId] });
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      const riderName = data?.quote?.rider?.name || data?.quote?.riderName || data?.riderName || 'Un repartidor';
      const fee = data?.quote?.proposedFee ?? data?.proposedFee;
      toast.success(`${riderName} propuso C$ ${Number(fee || 0).toFixed(2)}`, {
        duration: 4000,
        style: {
          background: '#0F0F0F',
          color: '#FFFFFF',
          fontSize: '14px',
          borderRadius: '8px',
        },
      });
    });

    // Propuesta actualizada por el rider
    socket.on('quote_updated', (data: any) => {
      console.log('[WS Admin] quote_updated', data);
      const orderId = data?.orderId || data?.quote?.orderId;
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['quotes', orderId] });
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      }
      const newFee = data?.newFee ?? data?.quote?.proposedFee ?? data?.proposedFee;
      const riderName = data?.quote?.rider?.name || data?.riderName || 'El repartidor';
      toast.success(`${riderName} actualizó su precio a C$ ${Number(newFee || 0).toFixed(2)}`, {
        duration: 4000,
        style: {
          background: '#0F0F0F',
          color: '#FFFFFF',
          fontSize: '14px',
          borderRadius: '8px',
        },
      });
    });

    // Nuevo mensaje en la negociación
    socket.on('new_message', (data: any) => {
      console.log('[WS Admin] new_message', data);
      const quoteId = data?.quoteId || data?.message?.quoteId;
      const orderId = data?.orderId || data?.message?.orderId;
      if (quoteId) {
        queryClient.invalidateQueries({ queryKey: ['messages', quoteId] });
      }
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['quotes', orderId] });
      }
    });

    // Propuesta aceptada
    socket.on('quote_accepted', (data: any) => {
      console.log('[WS Admin] quote_accepted', data);
      const orderId = data?.orderId || data?.quote?.orderId;
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['quotes', orderId] });
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('location_updated', (data: any) => {
      console.log('[WS Admin] location_updated received!', data);

      const lat = parseFloat(data.latitude ?? data.lat);
      const lng = parseFloat(data.longitude ?? data.lng);
      const userId = data.repartidorId ?? data.userId ?? data.orderId;

      if (!isNaN(lat) && !isNaN(lng)) {
        useMapStore.getState().updateRepartidorLocation({
          orderId: data.orderId,
          userId,
          lat,
          lng
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('[WS Admin] Desconectado');
    });

    socket.on('connect_error', (err) => {
      console.error('[WS Admin] Error de conexión:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      useSocketStore.getState().setSocket(null);
    };
  }, [accessToken, user?.businessId, queryClient]);
}
