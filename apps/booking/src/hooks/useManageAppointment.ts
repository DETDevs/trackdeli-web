import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { bookingApi } from '../services/bookingApi';

export const useAppointmentDetail = (token?: string) => {
  return useQuery({
    queryKey: ['booking', 'manage', token],
    queryFn: () => bookingApi.getAppointmentByToken(token!),
    enabled: !!token,
    staleTime: 1000 * 30,
    retry: 1,
  });
};

export const useCancelAppointment = (token?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => bookingApi.cancelAppointmentByToken(token!),
    onSuccess: (data) => {
      toast.success(data.message || 'Cita cancelada exitosamente.');
      queryClient.invalidateQueries({ queryKey: ['booking', 'manage', token] });
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response) {
        const msg = error.response.data?.message;
        // Mostrar mensaje del backend tal cual (ej. ventana de cancelación)
        toast.error(
          typeof msg === 'string'
            ? msg
            : 'No fue posible cancelar la cita. Contactá al negocio.'
        );
      } else {
        toast.error('Error de red al intentar cancelar la cita.');
      }
    },
  });
};

export const useRescheduleAppointment = (token?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newScheduledAt: string) =>
      bookingApi.rescheduleAppointmentByToken(token!, newScheduledAt),
    onSuccess: (data) => {
      toast.success(data.message || 'Cita reagendada con éxito.');
      queryClient.invalidateQueries({ queryKey: ['booking', 'manage', token] });
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response) {
        const msg = error.response.data?.message;
        // Mostrar mensaje del backend tal cual (ej. límite de reagendamientos o ventana mínima)
        toast.error(
          typeof msg === 'string'
            ? msg
            : 'No fue posible reagendar la cita. Contactá al negocio.'
        );
      } else {
        toast.error('Error de red al reagendar la cita.');
      }
    },
  });
};
