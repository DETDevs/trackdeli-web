import React from 'react';
import type { AppointmentStatus } from '../types/booking';

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

const statusConfig: Record<
  AppointmentStatus,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  PENDING: {
    label: 'Pendiente de confirmación',
    bg: 'bg-amber-50',
    text: 'text-amber-900 font-semibold',
    dot: 'bg-amber-500',
    border: 'border-amber-200',
  },
  CONFIRMED: {
    label: 'Confirmada',
    bg: 'bg-emerald-50',
    text: 'text-emerald-900 font-semibold',
    dot: 'bg-emerald-600',
    border: 'border-emerald-200',
  },
  CANCELLED: {
    label: 'Cancelada',
    bg: 'bg-rose-50',
    text: 'text-rose-900 font-semibold',
    dot: 'bg-rose-500',
    border: 'border-rose-200',
  },
  COMPLETED: {
    label: 'Completada',
    bg: 'bg-blue-50',
    text: 'text-blue-900 font-semibold',
    dot: 'bg-blue-600',
    border: 'border-blue-200',
  },
  NO_SHOW: {
    label: 'No asistió',
    bg: 'bg-purple-50',
    text: 'text-purple-900 font-semibold',
    dot: 'bg-purple-600',
    border: 'border-purple-200',
  },
};

export const AppointmentStatusBadge: React.FC<AppointmentStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
