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
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    border: 'border-amber-500/20',
  },
  CONFIRMED: {
    label: 'Confirmada',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/20',
  },
  CANCELLED: {
    label: 'Cancelada',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
    border: 'border-rose-500/20',
  },
  COMPLETED: {
    label: 'Completada',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
    border: 'border-blue-500/20',
  },
  NO_SHOW: {
    label: 'No asistió',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    dot: 'bg-purple-400',
    border: 'border-purple-500/20',
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
