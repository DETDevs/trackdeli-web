export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export interface BookingSpecialistInfo {
  id: string;
  name: string;
  specialty?: string | null;
}

export interface BookingServiceItem {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  hasCustomSchedule: boolean;
  specialistId?: string | null;
  specialist?: BookingSpecialistInfo | null;
}

export interface AvailableSlot {
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:00"
  scheduledAt: string; // ISO 8601 string
}

export interface AvailabilityResponse {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0-6
  service: {
    id: string;
    name: string;
    durationMinutes: number;
  };
  availableSlots: AvailableSlot[];
}

export interface CreateAppointmentPayload {
  serviceId: string;
  scheduledAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}

export interface BusinessPublicInfo {
  id: string;
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  posAddress?: string | null;
  whatsappNumber?: string | null;
  posPhone?: string | null;
}

export interface AppointmentCustomer {
  id: string;
  name: string;
  phone: string;
  isBlocked?: boolean;
}

export interface AppointmentDetail {
  id: string;
  businessId: string;
  serviceId: string;
  customerId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  price: number;
  customerEmail: string | null;
  manageToken: string;
  rescheduleCount: number;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  service: BookingServiceItem;
  customer: AppointmentCustomer;
  business: BusinessPublicInfo;
}

export interface CancelAppointmentResponse {
  message: string;
  appointment: AppointmentDetail;
}

export interface RescheduleAppointmentResponse {
  message: string;
  appointment: AppointmentDetail;
}
