import axios from 'axios';
import type {
  AvailabilityResponse,
  BookingServiceItem,
  BusinessPublicInfo,
  CreateAppointmentPayload,
  CreateHoldPayload,
  AppointmentHoldResponse,
  ReleaseHoldResponse,
  AppointmentDetail,
  CancelAppointmentResponse,
  RescheduleAppointmentResponse,
} from '../types/booking';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const bookingApi = {
  /**
   * Obtiene información pública del negocio (nombre, dirección, teléfono, whatsapp).
   */
  async getBusinessInfo(businessId: string): Promise<BusinessPublicInfo> {
    const res = await apiClient.get<BusinessPublicInfo>(`/booking/${businessId}/info`);
    return res.data;
  },

  /**
   * Obtiene la lista de servicios activos del negocio.
   */
  async getPublicServices(businessId: string): Promise<BookingServiceItem[]> {
    const res = await apiClient.get<BookingServiceItem[]>(`/booking/${businessId}/services`);
    return res.data;
  },

  /**
   * Consulta los slots disponibles para uno o múltiples servicios y una fecha específica (YYYY-MM-DD).
   * Opcionalmente filtra por especialista asignado (o evalúa todos si no se envía).
   */
  async getAvailability(
    businessId: string,
    serviceIds: string | string[],
    date: string,
    specialistId?: string
  ): Promise<AvailabilityResponse> {
    const rawIds = Array.isArray(serviceIds) ? serviceIds.filter(Boolean) : [serviceIds].filter(Boolean);
    const primaryId = rawIds[0] || '';
    const endpoint = rawIds.length > 1
      ? `/booking/${businessId}/availability`
      : `/booking/${businessId}/services/${primaryId}/availability`;

    const res = await apiClient.get<AvailabilityResponse>(
      endpoint,
      {
        params: {
          date,
          ...(specialistId ? { specialistId } : {}),
          serviceIds: rawIds.length > 1 ? rawIds.join(',') : undefined,
          serviceId: primaryId,
        },
      }
    );
    return res.data;
  },

  /**
   * 80b/85b: Crea una reserva temporal (hold) de horario para evitar doble reserva.
   * Llama a POST /businesses/:businessId/booking/holds
   */
  async createHold(
    businessId: string,
    payload: CreateHoldPayload
  ): Promise<AppointmentHoldResponse> {
    const rawIds = payload.serviceIds || (payload.serviceId ? [payload.serviceId] : []);
    const normalizedPayload: CreateHoldPayload = {
      ...payload,
      serviceIds: rawIds,
      serviceId: payload.serviceId || rawIds[0],
    };
    const res = await apiClient.post<AppointmentHoldResponse>(
      `/businesses/${businessId}/booking/holds`,
      normalizedPayload
    );
    return res.data;
  },

  /**
   * 80b: Libera una reserva temporal explícitamente al dar "Atrás" o cambiar horario.
   * Llama a DELETE /businesses/:businessId/booking/holds/:holdId
   */
  async releaseHold(
    businessId: string,
    holdId: string,
    holderToken: string
  ): Promise<ReleaseHoldResponse> {
    const res = await apiClient.delete<ReleaseHoldResponse>(
      `/businesses/${businessId}/booking/holds/${holdId}`,
      {
        headers: {
          'x-holder-token': holderToken,
        },
        params: {
          holderToken,
        },
        data: {
          holderToken,
        },
      }
    );
    return res.data;
  },

  /**
   * Crea una nueva cita pública (soporta múltiples servicios y holdId/holderToken).
   */
  async createAppointment(
    businessId: string,
    payload: CreateAppointmentPayload
  ): Promise<AppointmentDetail> {
    const rawIds = payload.serviceIds || (payload.serviceId ? [payload.serviceId] : []);
    const normalizedPayload: CreateAppointmentPayload = {
      ...payload,
      serviceIds: rawIds,
      serviceId: payload.serviceId || rawIds[0],
    };
    const res = await apiClient.post<AppointmentDetail>(
      `/booking/${businessId}/appointments`,
      normalizedPayload
    );
    return res.data;
  },

  /**
   * Obtiene el detalle de una cita mediante su token de gestión único.
   */
  async getAppointmentByToken(token: string): Promise<AppointmentDetail> {
    const res = await apiClient.get<AppointmentDetail>(`/booking/manage/${token}`);
    return res.data;
  },

  /**
   * Cancela una cita mediante su token de gestión.
   */
  async cancelAppointmentByToken(token: string): Promise<CancelAppointmentResponse> {
    const res = await apiClient.post<CancelAppointmentResponse>(
      `/booking/manage/${token}/cancel`
    );
    return res.data;
  },

  /**
   * Reagenda una cita a una nueva fecha y hora.
   */
  async rescheduleAppointmentByToken(
    token: string,
    newScheduledAt: string
  ): Promise<RescheduleAppointmentResponse> {
    const res = await apiClient.post<RescheduleAppointmentResponse>(
      `/booking/manage/${token}/reschedule`,
      { newScheduledAt }
    );
    return res.data;
  },
};
