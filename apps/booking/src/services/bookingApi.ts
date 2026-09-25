import axios from 'axios';
import type {
  AvailabilityResponse,
  BookingServiceItem,
  BusinessPublicInfo,
  CreateAppointmentPayload,
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
   * Consulta los slots disponibles para un servicio y una fecha específica (YYYY-MM-DD).
   * Opcionalmente filtra por especialista asignado (o evalúa todos si no se envía).
   */
  async getAvailability(
    businessId: string,
    serviceId: string,
    date: string,
    specialistId?: string
  ): Promise<AvailabilityResponse> {
    const res = await apiClient.get<AvailabilityResponse>(
      `/booking/${businessId}/services/${serviceId}/availability`,
      {
        params: {
          date,
          ...(specialistId ? { specialistId } : {}),
        },
      }
    );
    return res.data;
  },

  /**
   * Crea una nueva cita pública.
   */
  async createAppointment(
    businessId: string,
    payload: CreateAppointmentPayload
  ): Promise<AppointmentDetail> {
    const res = await apiClient.post<AppointmentDetail>(
      `/booking/${businessId}/appointments`,
      payload
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
