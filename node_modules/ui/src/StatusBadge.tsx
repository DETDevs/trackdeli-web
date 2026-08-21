export const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    PENDIENTE: 'bg-yellow-500',
    TOMADO: 'bg-blue-500',
    EN_CAMINO: 'bg-orange-500',
    CERCA_DEL_DESTINO: 'bg-purple-500',
    VERIFICANDO_ENTREGA: 'bg-indigo-500',
    ENTREGADO: 'bg-green-500',
    CANCELADO: 'bg-red-500',
    INCIDENCIA: 'bg-red-800'
  };
  return <span className={`px-2 py-1 text-xs text-white rounded ${colors[status] || 'bg-gray-500'}`}>{status}</span>;
};
