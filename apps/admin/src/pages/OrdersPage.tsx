import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrders, type OrderStatus } from 'api-client';
import { Package, Plus, MagnifyingGlass, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { StatusBadge } from '../components/StatusBadge';
import { formatRelative } from '../utils/formatDate';

const ALL_STATUSES: OrderStatus[] = [
  'PENDIENTE', 'TOMADO', 'EN_CAMINO', 'CERCA_DEL_DESTINO',
  'VERIFICANDO_ENTREGA', 'ENTREGADO', 'CANCELADO', 'INCIDENCIA', 'CERRADO',
];

export const OrdersPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const filtered = useMemo(() => {
    return orders
      .filter(o => {
        const matchesSearch = o.customerName.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !statusFilter || o.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:border-gray-400 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value as OrderStatus | '');
            setCurrentPage(1);
          }}
          className="bg-white border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-gray-400 outline-none text-gray-700"
        >
          <option value="">Todos los estados</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button
          onClick={() => navigate('/orders/new')}
          className="ml-auto bg-gray-900 text-white hover:bg-gray-800 rounded-md px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Nuevo pedido
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {isError && (
          <div className="m-4 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 flex items-center justify-between">
            No se pudo cargar la información.
            <button onClick={() => refetch()} className="underline text-red-700">Reintentar</button>
          </div>
        )}

        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Dirección</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Tarifa / Distancia</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Repartidor</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + j * 10}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Package size={32} className="text-gray-300" weight="regular" />
                    <p className="mt-3 text-sm font-medium text-gray-900">No hay pedidos aún</p>
                    <p className="mt-1 text-sm text-gray-400">Crea el primer pedido para tu negocio</p>
                    <button
                      onClick={() => navigate('/orders/new')}
                      className="mt-4 bg-gray-900 text-white hover:bg-gray-800 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                    >
                      + Crear pedido
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(order => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                    <div className="text-xs text-gray-400">{order.customerPhone}</div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600 max-w-xs truncate">
                    {order.destinationAddress}
                  </td>
                  <td className="px-5 py-3 text-sm">
                    <div className="font-semibold text-gray-900 font-mono">
                      {order.deliveryPaymentStatus === 'GRATIS'
                        ? 'Gratis'
                        : `C$ ${Number(order.deliveryFee).toFixed(2)}`}
                    </div>
                    {order.distanceKm && order.distanceKm > 0 ? (
                      <div className="text-[11px] text-gray-400">
                        {order.distanceKm} km
                      </div>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-sm">
                    {order.deliveryUser?.name ? (
                      <span className="text-gray-700">{order.deliveryUser.name}</span>
                    ) : (
                      <span className="text-gray-300">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {formatRelative(order.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination controls */}
        {Math.ceil(filtered.length / itemsPerPage) > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-white">
            <div className="text-sm text-gray-500">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} pedidos
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <CaretLeft size={16} />
              </button>
              <span className="text-sm font-medium text-gray-700 px-2">
                Página {currentPage} de {Math.ceil(filtered.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filtered.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(filtered.length / itemsPerPage)}
                className="p-1.5 rounded border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <CaretRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
