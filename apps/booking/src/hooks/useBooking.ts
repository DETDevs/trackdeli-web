import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { bookingApi } from '../services/bookingApi';
import type { CreateAppointmentPayload } from '../types/booking';

export const useBusinessInfo = (businessId?: string) => {
  return useQuery({
    queryKey: ['booking', 'businessInfo', businessId],
    queryFn: () => bookingApi.getBusinessInfo(businessId!),
    enabled: !!businessId,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
};

export const usePublicServices = (businessId?: string) => {
  return useQuery({
    queryKey: ['booking', 'services', businessId],
    queryFn: () => bookingApi.getPublicServices(businessId!),
    enabled: !!businessId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export const useAvailability = (
  businessId?: string,
  serviceId?: string,
  date?: string,
  specialistId?: string
) => {
  return useQuery({
    queryKey: ['booking', 'availability', businessId, serviceId, date, specialistId],
    queryFn: () => bookingApi.getAvailability(businessId!, serviceId!, date!, specialistId),
    enabled: !!businessId && !!serviceId && !!date,
    staleTime: 1000 * 30, // 30 segundos
    refetchOnWindowFocus: true,
  });
};

export const useCreateAppointment = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) =>
      bookingApi.createAppointment(businessId, payload),
    onSuccess: (_, variables) => {
      // Invalidar slots del servicio
      queryClient.invalidateQueries({
        queryKey: ['booking', 'availability', businessId, variables.serviceId],
      });
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const msg = error.response.data?.message || '';

        // Paso 3: Bloqueo de cliente por inasistencias (mensaje neutral y genérico)
        if (
          status === 403 &&
          (typeof msg === 'string' && (msg.toLowerCase().includes('bloqueado') || msg.toLowerCase().includes('no-shows')))
        ) {
          toast.error(
            'No fue posible completar la reserva. Contactá directamente al negocio.',
            { duration: 5000 }
          );
          return;
        }

        // Paso 3: Conflicto de slot atómico (409) o solicitud duplicada pendiente
        if (status === 409) {
          if (error.response.data?.code === 'DUPLICATE_PENDING_APPOINTMENT') {
            // El error específico de duplicado pendiente se maneja en el formulario (BookingPage)
            // para ofrecer el enlace contextual al Portal de Autogestión
            return;
          }
          toast.error(
            'El horario seleccionado ya no se encuentra disponible. Actualizamos la lista para que elijas otro.',
            { duration: 5000 }
          );
          // Invalida inmediatamente disponibilidad para que el cliente elija otro
          queryClient.invalidateQueries({
            queryKey: ['booking', 'availability', businessId],
          });
          return;
        }

        // Negocio sin CITAS activo (403)
        if (status === 403) {
          toast.error(
            'El servicio de reservas online no está disponible actualmente para este negocio.',
            { duration: 5000 }
          );
          return;
        }

        const errorText = Array.isArray(msg)
          ? msg.join('. ')
          : typeof msg === 'string' && msg
          ? msg
          : 'Ocurrió un error al procesar tu reserva. Por favor verificá tus datos.';

        toast.error(errorText, { duration: 5000 });
      } else {
        toast.error('Ocurrió un error inesperado al conectar con el servidor.');
      }
    },
  });
};
