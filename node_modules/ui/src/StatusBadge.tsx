export const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { bg: string, text: string, dot: string }> = {
    PENDIENTE:            { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'  },
    TOMADO:               { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-400'   },
    EN_CAMINO:            { bg: 'bg-indigo-50',  text: 'text-indigo-700', dot: 'bg-indigo-400' },
    CERCA_DEL_DESTINO:    { bg: 'bg-purple-50',  text: 'text-purple-700', dot: 'bg-purple-400' },
    VERIFICANDO_ENTREGA:  { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-400' },
    ENTREGADO:            { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-400'  },
    CANCELADO:            { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-400'    },
    INCIDENCIA:           { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-400'    },
    CERRADO:              { bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400'   },
  };

  const config = statusConfig[status] || statusConfig.CERRADO;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`}></span>
      {status.replace(/_/g, ' ')}
    </span>
  );
};
