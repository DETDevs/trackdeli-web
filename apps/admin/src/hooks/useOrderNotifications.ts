import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/auth.store';

export const useOrderNotifications = () => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore(state => state.accessToken);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // @ts-ignore: Vite injects import.meta.env
    const baseUrl = import.meta.env?.VITE_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

    const socket = io(`${baseUrl}/tracking`, {
      query: { token: accessToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WS] Conectado al namespace /tracking');
    });

    socket.on('order_status_changed', (payload: { customerName: string; status: string; orderId: string }) => {
      toast(`📦 ${payload.customerName}: ${payload.status.replace(/_/g, ' ')}`, {
        duration: 4000,
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', payload.orderId] });
    });

    socket.on('disconnect', () => {
      console.log('[WS] Desconectado');
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, queryClient]);
};
