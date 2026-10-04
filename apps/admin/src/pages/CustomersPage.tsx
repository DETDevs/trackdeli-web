import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCustomers,
  getCustomerHistory,
  updateCustomer,
  getOrders,
  type Customer,
  type Order,
} from 'api-client';
import {
  User,
  MagnifyingGlass,
  MapPin,
  PencilSimple,
  X,
  CircleNotch,
  MapTrifold,
  Keyboard,
  Check,
  Clock,
  WhatsappLogo,
  Package,
  CaretLeft,
  CaretRight,
  ClockCounterClockwise,
  ArrowSquareOut,
  CalendarCheck,
  Prohibit,
  Copy,
} from '@phosphor-icons/react';
import { PinPicker } from 'map';
import { toast } from 'react-hot-toast';
import { StatusBadge } from '../components/StatusBadge';
import { formatRelative, formatDateTime } from '../utils/formatDate';

export const CustomersPage = () => {
  const { id: routeCustomerId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editLocationMode, setEditLocationMode] = useState<'text' | 'map'>('text');
  const [editIsBlocked, setEditIsBlocked] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Query customers
  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search: debouncedSearch, page, limit }],
    queryFn: () => getCustomers({ search: debouncedSearch, page, limit }),
    placeholderData: (prev) => prev,
  });

  const customers = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Open detail if route param exists
  useEffect(() => {
    if (routeCustomerId) {
      const match = customers.find((c) => c.id === routeCustomerId);
      if (match) {
        setSelectedCustomer(match);
        setIsHistoryOpen(true);
      }
    }
  }, [routeCustomerId, customers]);

  // Query orders for order history matching (only when history is open to avoid massive payload on load)
  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(),
    staleTime: 30000,
    enabled: Boolean(selectedCustomer && isHistoryOpen),
  });

  // Query history for selected customer
  const { data: historyData } = useQuery({
    queryKey: ['customer-history', selectedCustomer?.id],
    queryFn: () => (selectedCustomer ? getCustomerHistory(selectedCustomer.id) : null),
    enabled: Boolean(selectedCustomer && isHistoryOpen),
  });

  // Filter orders for the selected customer by phone digits
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    const customerPhoneDigits = selectedCustomer.phone.replace(/\D/g, '');
    if (!customerPhoneDigits) return [];

    return allOrders.filter((order: Order) => {
      const orderPhoneDigits = (order.customerPhone || '').replace(/\D/g, '');
      return (
        orderPhoneDigits === customerPhoneDigits ||
        (orderPhoneDigits.length >= 8 &&
          customerPhoneDigits.length >= 8 &&
          (orderPhoneDigits.includes(customerPhoneDigits) || customerPhoneDigits.includes(orderPhoneDigits)))
      );
    });
  }, [allOrders, selectedCustomer]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCustomer(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (selectedCustomer) {
        queryClient.invalidateQueries({ queryKey: ['customer-history', selectedCustomer.id] });
        setSelectedCustomer((prev) => (prev ? { ...prev, ...updated } : updated));
      }
      toast.success('Cliente actualizado correctamente');
      setIsEditModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al actualizar el cliente');
    },
  });

  const handleOpenHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsHistoryOpen(true);
  };

  const handleCloseHistory = () => {
    setIsHistoryOpen(false);
    if (routeCustomerId) {
      navigate('/customers', { replace: true });
    }
  };

  const handleOpenEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditName(customer.name || '');
    setEditPhone(customer.phone || '');
    setEditAddress(customer.lastAddressText || '');
    setEditNotes(customer.notes || '');
    setEditLat(customer.lastLatitude ?? null);
    setEditLng(customer.lastLongitude ?? null);
    setEditLocationMode(customer.lastLatitude ? 'map' : 'text');
    setEditIsBlocked(Boolean(customer.isBlocked));
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    if (!editName.trim()) {
      toast.error('El nombre del cliente es requerido');
      return;
    }

    const cleanPhone = editPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 8) {
      toast.error('El WhatsApp debe tener 8 dígitos');
      return;
    }

    const payload = {
      name: editName.trim(),
      phone: cleanPhone,
      address: editAddress.trim() || undefined,
      notes: editNotes.trim() || undefined,
      latitude: editLat ?? undefined,
      longitude: editLng ?? undefined,
      isBlocked: editIsBlocked,
    };

    updateMutation.mutate({ id: selectedCustomer.id, data: payload });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 leading-tight flex items-center gap-2">
            <span>Clientes Finales</span>
            <span className="text-xs font-normal px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {total} {total === 1 ? 'cliente' : 'clientes'}
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Personas destinatarias de pedidos y servicios registrados en tu negocio.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
        <MagnifyingGlass size={18} className="text-gray-400 shrink-0 ml-1" />
        <input
          type="text"
          placeholder="Buscar cliente por nombre o número de WhatsApp..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 cursor-pointer"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50">
              <th className="py-3.5 px-5">Cliente</th>
              <th className="py-3.5 px-4">WhatsApp / Teléfono</th>
              <th className="py-3.5 px-4">Última Dirección</th>
              <th className="py-3.5 px-4">Última Actividad</th>
              <th className="py-3.5 px-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs text-gray-600">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  <CircleNotch size={24} className="animate-spin mx-auto mb-2 text-gray-300" />
                  Cargando clientes...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400 space-y-1">
                  <User size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="font-medium text-gray-700">No se encontraron clientes</p>
                  <p className="text-[11px] text-gray-400">
                    {debouncedSearch
                      ? 'No hay clientes que coincidan con la búsqueda'
                      : 'Los clientes finales se registran automáticamente con cada pedido'}
                  </p>
                </td>
              </tr>
            ) : (
              customers.map((customer) => {
                const initials = customer.name
                  ? customer.name
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                  : 'CL';

                return (
                  <tr key={customer.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                            <span>{customer.name}</span>
                            {customer.isBlocked && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                                <Prohibit size={10} /> Bloqueado
                              </span>
                            )}
                          </div>
                          {customer.email && (
                            <p className="text-[11px] text-gray-400">{customer.email}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-800 font-medium">
                          +505 {customer.phone}
                        </span>
                        <a
                          href={`https://wa.me/505${customer.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Abrir chat en WhatsApp"
                        >
                          <WhatsappLogo size={15} weight="fill" />
                        </a>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {customer.lastAddressText ? (
                        <div className="flex items-start gap-1.5">
                          <MapPin
                            size={14}
                            className={`shrink-0 mt-0.5 ${
                              customer.lastLatitude ? 'text-brand-600' : 'text-gray-400'
                            }`}
                          />
                          <span className="truncate text-gray-700 font-medium" title={customer.lastAddressText}>
                            {customer.lastAddressText}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Sin dirección registrada</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {customer.lastConfirmedAt ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <Clock size={11} />
                          <span>{formatRelative(customer.lastConfirmedAt)}</span>
                        </span>
                      ) : customer.createdAt ? (
                        <span className="text-gray-500 text-[11px]">
                          {formatRelative(customer.createdAt)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenHistory(customer)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                          title="Ver Historial de Pedidos"
                        >
                          <ClockCounterClockwise size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                          title="Editar Cliente"
                        >
                          <PencilSimple size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500">
            <div>
              Página <span className="font-semibold text-gray-900">{page}</span> de{' '}
              <span className="font-semibold text-gray-900">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CaretLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CaretRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-xl p-8 border border-gray-100 text-center text-gray-400">
            <CircleNotch size={24} className="animate-spin mx-auto mb-2 text-gray-300" />
            Cargando clientes...
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-gray-100 text-center text-gray-400">
            <User size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="font-medium text-gray-700">No se encontraron clientes</p>
          </div>
        ) : (
          customers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                    <span>{customer.name}</span>
                    {customer.isBlocked && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700">
                        Bloqueado
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-600 font-mono">+505 {customer.phone}</span>
                    <a
                      href={`https://wa.me/505${customer.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 p-0.5"
                    >
                      <WhatsappLogo size={14} weight="fill" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenHistory(customer)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                    title="Ver Historial"
                  >
                    <ClockCounterClockwise size={16} />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(customer)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                    title="Editar"
                  >
                    <PencilSimple size={16} />
                  </button>
                </div>
              </div>

              {customer.lastAddressText && (
                <div className="text-xs text-gray-600 flex items-start gap-1.5 bg-gray-50 p-2.5 rounded-lg">
                  <MapPin
                    size={14}
                    className={`shrink-0 mt-0.5 ${
                      customer.lastLatitude ? 'text-brand-600' : 'text-gray-400'
                    }`}
                  />
                  <span className="line-clamp-2">{customer.lastAddressText}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-50">
                <span>Última actividad:</span>
                <span className="font-medium text-gray-600">
                  {customer.lastConfirmedAt
                    ? formatRelative(customer.lastConfirmedAt)
                    : customer.createdAt
                    ? formatRelative(customer.createdAt)
                    : '—'}
                </span>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 text-xs text-gray-500">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail & History Modal */}
      {isHistoryOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div
            onClick={handleCloseHistory}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl border border-gray-100 shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                  {selectedCustomer.name
                    ? selectedCustomer.name
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    : 'CL'}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 leading-tight flex items-center gap-2">
                    <span>{selectedCustomer.name}</span>
                    {selectedCustomer.isBlocked && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                        Bloqueado
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span className="font-mono text-gray-700">+505 {selectedCustomer.phone}</span>
                    <button
                      onClick={() => copyToClipboard(selectedCustomer.phone)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                      title="Copiar teléfono"
                    >
                      <Copy size={13} />
                    </button>
                    <a
                      href={`https://wa.me/505${selectedCustomer.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      <WhatsappLogo size={14} weight="fill" /> WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleCloseHistory();
                    handleOpenEdit(selectedCustomer);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <PencilSimple size={14} />
                  <span>Editar</span>
                </button>
                <button
                  onClick={handleCloseHistory}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
              {/* Location Card */}
              <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={14} className="text-brand-600" />
                    <span>Ubicación Guardada</span>
                  </span>
                  {selectedCustomer.lastConfirmedAt && (
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Confirmada {formatRelative(selectedCustomer.lastConfirmedAt)}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-gray-800 font-medium">
                  {selectedCustomer.lastAddressText || 'Sin dirección de entrega registrada'}
                </p>

                {selectedCustomer.lastLatitude && selectedCustomer.lastLongitude ? (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200/50">
                    <span className="text-gray-500 text-[11px]">
                      Coordenadas: {Number(selectedCustomer.lastLatitude).toFixed(5)},{' '}
                      {Number(selectedCustomer.lastLongitude).toFixed(5)}
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${selectedCustomer.lastLatitude},${selectedCustomer.lastLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium text-xs"
                    >
                      <ArrowSquareOut size={13} />
                      <span>Abrir en Google Maps</span>
                    </a>
                  </div>
                ) : null}
              </div>

              {/* Order History Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={15} className="text-gray-500" />
                    <span>Historial de Pedidos ({customerOrders.length})</span>
                  </h4>
                </div>

                {customerOrders.length === 0 ? (
                  <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-gray-100 text-gray-400">
                    <Package size={24} className="mx-auto mb-1 text-gray-300" />
                    <p className="text-xs font-medium text-gray-600">
                      No hay pedidos registrados para este cliente
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((order: Order) => (
                      <div
                        key={order.id}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="p-3 bg-white hover:bg-gray-50/80 rounded-xl border border-gray-100 shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-gray-900">
                              #{order.id.slice(0, 8)}
                            </span>
                            <StatusBadge status={order.status} />
                            {order.originBusinessName && (
                              <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                De: {order.originBusinessName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 truncate max-w-sm">
                            {order.destinationAddress}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-semibold text-gray-900 block">
                            C${Number(order.deliveryFee || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-brand-600 flex items-center gap-0.5 justify-end mt-1">
                            <span>Ver</span> <ArrowSquareOut size={11} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional History: Appointments (if any) */}
              {historyData?.appointments && historyData.appointments.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarCheck size={15} className="text-gray-500" />
                    <span>Citas y Reservas ({historyData.appointments.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {historyData.appointments.map((apt: any) => (
                      <div
                        key={apt.id}
                        className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-gray-800">{apt.service?.name}</p>
                          <p className="text-gray-500 text-[11px]">
                            {apt.scheduledAt ? formatDateTime(apt.scheduledAt) : 'Sin fecha'}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                          {apt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {isEditModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div
            onClick={() => setIsEditModalOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative w-full max-w-xl bg-white rounded-t-2xl sm:rounded-2xl border border-gray-100 shadow-2xl overflow-hidden z-10 max-h-[94vh] sm:max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
                  Editar Cliente Final
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Actualiza el teléfono y la ubicación habitual de entrega de este cliente.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Alexander Fonseca"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-gray-900 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Teléfono WhatsApp * (8 dígitos)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500 font-mono">
                    +505
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="8888 7777"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-r-lg px-3 py-2 text-sm focus:border-gray-900 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Dirección Habitual de Entrega
                  </label>
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEditLocationMode('text')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        editLocationMode === 'text'
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Keyboard size={13} />
                      <span>Manual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditLocationMode('map')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        editLocationMode === 'map'
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <MapTrifold size={13} />
                      <span>Pin en Mapa</span>
                    </button>
                  </div>
                </div>

                {editLocationMode === 'map' ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">
                      Arrastrá el pin para fijar la ubicación exacta del domicilio del cliente.
                    </p>
                    <PinPicker
                      mapboxToken={(import.meta as any).env.VITE_MAPBOX_TOKEN}
                      initialLat={editLat || 12.1328}
                      initialLng={editLng || -86.2504}
                      onConfirm={(lat, lng, addr) => {
                        setEditLat(lat);
                        setEditLng(lng);
                        if (addr) setEditAddress(addr);
                        toast.success('Ubicación fijada en el mapa');
                      }}
                    />
                    {(editLat && editLng) || editAddress ? (
                      <div className="text-[11px] text-gray-600 bg-emerald-50/70 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-2">
                        <MapPin size={14} className="text-emerald-600 shrink-0" weight="fill" />
                        <span className="truncate flex-1 font-medium">
                          {editAddress || `Coordenadas: ${editLat?.toFixed(5)}, ${editLng?.toFixed(5)}`}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold shrink-0 flex items-center gap-1">
                          <Check size={12} weight="bold" /> Guardado
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <textarea
                    placeholder="Ej. De la Farmacia 1c abajo, casa esquinera color verde"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-gray-900 outline-none transition-colors h-20 resize-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Notas / Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Llamar antes de llegar / Portón blanco"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-gray-900 outline-none transition-colors"
                />
              </div>

              {/* Blocked Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editIsBlocked}
                    onChange={(e) => setEditIsBlocked(e.target.checked)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span className="text-xs text-gray-700 font-medium">
                    Bloquear este cliente (no permitir nuevos pedidos)
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {updateMutation.isPending && (
                    <CircleNotch size={14} className="animate-spin" />
                  )}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
