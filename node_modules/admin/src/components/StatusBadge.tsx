import type { OrderStatus } from 'api-client';

const statusConfig: Record<OrderStatus, { label: string; className: string; dot: string; pulse: boolean }> = {
  PENDIENTE:            { label: 'Pendiente',           className: 'bg-amber-50 text-amber-700',   dot: 'bg-amber-400',   pulse: true  },
  TOMADO:               { label: 'Tomado',               className: 'bg-blue-50 text-blue-700',     dot: 'bg-blue-400',    pulse: true  },
  EN_CAMINO:            { label: 'En camino',            className: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-400',  pulse: true  },
  CERCA_DEL_DESTINO:    { label: 'Cerca del destino',   className: 'bg-purple-50 text-purple-700', dot: 'bg-purple-400',  pulse: true  },
  VERIFICANDO_ENTREGA:  { label: 'Verificando entrega', className: 'bg-orange-50 text-orange-700', dot: 'bg-orange-400',  pulse: false },
  ENTREGADO:            { label: 'Entregado',            className: 'bg-green-50 text-green-700',   dot: 'bg-green-400',   pulse: false },
  CANCELADO:            { label: 'Cancelado',            className: 'bg-red-50 text-red-700',       dot: 'bg-red-400',     pulse: false },
  INCIDENCIA:           { label: 'Incidencia',           className: 'bg-red-50 text-red-700',       dot: 'bg-red-400',     pulse: false },
  CERRADO:              { label: 'Cerrado',              className: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400',    pulse: false },
};

interface StatusBadgeProps {
  status: OrderStatus | string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status as OrderStatus] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-500',
    dot: 'bg-gray-400',
    pulse: false,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.pulse ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
};
