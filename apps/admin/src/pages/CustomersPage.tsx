import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCustomers,
  getCustomer,
  updateCustomerStatus,
  type Customer,
} from 'api-client';
import {
  User,
  UserPlus,
  UserMinus,
  UserCheck,
  MagnifyingGlass,
  MapPin,
  PencilSimple,
  CircleNotch,
  Clock,
  WhatsappLogo,
  CaretLeft,
  CaretRight,
  ClockCounterClockwise,
  Prohibit,
  IdentificationCard,
  Buildings,
  Receipt,
} from '@phosphor-icons/react';
import { toast } from 'react-hot-toast';
import { formatRelative } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatters';
import { CustomerFormModal } from '../components/customers/CustomerFormModal';
import { CustomerStatusModal } from '../components/customers/CustomerStatusModal';
import { CustomerDetailModal } from '../components/customers/CustomerDetailModal';
import { useAuthStore } from '../store/auth.store';
import { useMyProducts } from '../hooks/useMyProducts';

const formatPhoneDisplay = (phone?: string | null): string => {
  const clean = (phone ?? '').trim();
  if (!clean) return 'Sin teléfono';
  if (clean.startsWith('+') || clean.startsWith('505')) return clean;
  return `+505 ${clean}`;
};

const getWhatsAppUrl = (phone?: string | null): string | null => {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 7) return null;
  if (digits.length === 8) return `https://wa.me/505${digits}`;
  return `https://wa.me/${digits}`;
};

export const CustomersPage = () => {
  const { id: routeCustomerId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const isPosManager = user?.role === 'ENCARGADO' || user?.role === 'SUPERADMIN';
  const { data: productsData } = useMyProducts(Boolean(user?.businessId));
  const hasCarteraCobro = Boolean(
    productsData?.products?.CARTERA_COBRO?.status === 'ACTIVE',
  );
  const isDeliveryActive = Boolean(
    productsData?.products?.DELIVERY?.status === 'ACTIVE',
  );
  const isCitasActive = Boolean(
    productsData?.products?.CITAS?.status === 'ACTIVE',
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [onlyWithBalance, setOnlyWithBalance] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Modal único Crear / Editar
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Modal de Desactivar y estado de Reactivar directo
  const [customerToDeactivate, setCustomerToDeactivate] = useState<Customer | null>(null);
  const [reactivatingCustomerId, setReactivatingCustomerId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Query customers (siempre envía status explícito, por defecto 'active')
  const { data, isLoading } = useQuery({
    queryKey: [
      'customers',
      {
        search: debouncedSearch,
        status: statusFilter,
        onlyWithBalance: hasCarteraCobro && onlyWithBalance ? true : undefined,
        page,
        limit,
      },
    ],
    queryFn: () =>
      getCustomers({
        search: debouncedSearch,
        status: statusFilter,
        onlyWithBalance: hasCarteraCobro && onlyWithBalance ? true : undefined,
        page,
        limit,
      }),
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

  const refreshCustomersList = (updatedCustomer?: Customer) => {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    if (updatedCustomer && selectedCustomer?.id === updatedCustomer.id) {
      queryClient.invalidateQueries({ queryKey: ['customer-history', updatedCustomer.id] });
      setSelectedCustomer((prev) => (prev ? { ...prev, ...updatedCustomer } : updatedCustomer));
    }
  };

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

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormModalOpen(true);
  };

  const handleViewCustomerById = async (customerId: string) => {
    const existing = customers.find((c) => c.id === customerId);
    if (existing) {
      handleOpenHistory(existing);
      return;
    }
    try {
      const fetched = await getCustomer(customerId);
      if (fetched) {
        handleOpenHistory(fetched);
      }
    } catch {
      toast.error('No se pudo abrir la ficha del cliente.');
    }
  };

  const handleReactivateDirect = async (customer: Customer) => {
    setReactivatingCustomerId(customer.id);
    try {
      const updated = await updateCustomerStatus(customer.id, true);
      toast.success('Cliente reactivado correctamente');
      refreshCustomersList(updated);
    } catch (err: any) {
      const rawMessage =
        err?.response?.data?.message || err?.message || 'Error al reactivar el cliente';
      toast.error(Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage));
    } finally {
      setReactivatingCustomerId(null);
    }
  };

  const renderActivitySummary = (customer: Customer) => {
    const salesCount = Number(customer._count?.sales ?? 0);
    const ordersCount = Number(customer._count?.orders ?? 0);
    const appointmentsCount = Number(customer._count?.appointments ?? 0);
    const creditAccountsCount = Number(customer._count?.creditAccounts ?? 0);

    const pills: string[] = [];
    if (salesCount > 0) {
      pills.push(`${salesCount} ${salesCount === 1 ? 'venta' : 'ventas'}`);
    }
    if (ordersCount > 0) {
      pills.push(`${ordersCount} ${ordersCount === 1 ? 'pedido' : 'pedidos'}`);
    }
    if (appointmentsCount > 0) {
      pills.push(`${appointmentsCount} ${appointmentsCount === 1 ? 'cita' : 'citas'}`);
    }
    if (pills.length === 0 && creditAccountsCount > 0) {
      pills.push(`${creditAccountsCount} ${creditAccountsCount === 1 ? 'crédito' : 'créditos'}`);
    }

    const relativeDate = customer.lastConfirmedAt
      ? formatRelative(customer.lastConfirmedAt)
      : customer.updatedAt
      ? formatRelative(customer.updatedAt)
      : customer.createdAt
      ? formatRelative(customer.createdAt)
      : '—';

    return (
      <div className="space-y-1">
        {pills.length > 0 ? (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            <Receipt size={12} />
            <span>{pills.join(' • ')}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400 block">Sin ventas aún</span>
        )}
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Clock size={12} className="text-gray-400 shrink-0" />
          <span>{relativeDate}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 leading-tight flex items-center gap-2">
            <span>Clientes</span>
            <span className="text-xs font-normal px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {total} {total === 1 ? 'cliente' : 'clientes'}
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Gestioná el directorio de clientes, direcciones de entrega y límites de crédito.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
        >
          <UserPlus size={16} weight="bold" />
          <span>+ Nuevo cliente</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs: Activos / Inactivos / Todos */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
            {(
              [
                { id: 'active', label: 'Activos' },
                { id: 'inactive', label: 'Inactivos' },
                { id: 'all', label: 'Todos' },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Filtro Solo con saldo (si tiene Cartera de Cobro) */}
          {hasCarteraCobro && (
            <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer select-none px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={onlyWithBalance}
                onChange={(e) => {
                  setOnlyWithBalance(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 h-4 w-4"
              />
              <span>Solo con saldo pendiente</span>
            </label>
          )}
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200/80">
          <MagnifyingGlass size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, cédula/RUC o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-xs text-gray-500 hover:text-gray-800 px-2 font-medium cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
              <th className="py-3.5 px-5">Cliente</th>
              <th className="py-3.5 px-4">Teléfono / Cédula</th>
              <th className="py-3.5 px-4">Dirección y referencia</th>
              {hasCarteraCobro && <th className="py-3.5 px-4">Crédito y saldo</th>}
              <th className="py-3.5 px-4">Actividad</th>
              <th className="py-3.5 px-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs text-gray-600">
            {isLoading ? (
              <tr>
                <td colSpan={hasCarteraCobro ? 6 : 5} className="py-12 text-center text-gray-400">
                  <CircleNotch size={24} className="animate-spin mx-auto mb-2 text-gray-300" />
                  Cargando clientes...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={hasCarteraCobro ? 6 : 5} className="py-12 text-center text-gray-400 space-y-1">
                  <User size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="font-medium text-gray-700 text-xs">No se encontraron clientes</p>
                  <p className="text-xs text-gray-400">
                    {debouncedSearch
                      ? 'No hay clientes que coincidan con la búsqueda.'
                      : 'Agregá tu primer cliente con el botón "+ Nuevo cliente".'}
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
                const isInactive = customer.isActive === false;
                const waUrl = getWhatsAppUrl(customer.phone);
                const balance = Number(customer.currentBalance ?? customer.balance ?? 0);
                const hasCreditLimit =
                  customer.creditLimit !== null && customer.creditLimit !== undefined;

                return (
                  <tr
                    key={customer.id}
                    className={`hover:bg-gray-50/60 transition-colors ${
                      isInactive ? 'opacity-75 bg-gray-50/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {initials}
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-gray-900 flex flex-wrap items-center gap-1.5">
                            <span>{customer.name}</span>
                            {isInactive && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                                Inactivo
                              </span>
                            )}
                            {customer.isBlocked && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                <Prohibit size={12} /> Bloqueado
                              </span>
                            )}
                          </div>
                          {customer.email && (
                            <p className="text-xs text-gray-500">{customer.email}</p>
                          )}
                          {(customer.group?.name || customer.externalCode) && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {customer.group?.name && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                  <Buildings size={12} />
                                  <span>{customer.group.name}</span>
                                </span>
                              )}
                              {customer.externalCode && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-gray-100 text-gray-700">
                                  Carnet: {customer.externalCode}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono ${
                              customer.phone ? 'text-gray-800 font-medium' : 'text-gray-400 italic'
                            }`}
                          >
                            {formatPhoneDisplay(customer.phone)}
                          </span>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Abrir chat en WhatsApp"
                            >
                              <WhatsappLogo size={15} weight="fill" />
                            </a>
                          )}
                        </div>
                        {customer.ruc && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <IdentificationCard size={13} className="text-gray-400 shrink-0" />
                            <span>{customer.ruc}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {customer.lastAddressText || customer.deliveryReference ? (
                        <div className="space-y-1">
                          {customer.lastAddressText && (
                            <div className="flex items-start gap-1.5">
                              <MapPin
                                size={14}
                                className={`shrink-0 mt-0.5 ${
                                  customer.lastLatitude ? 'text-brand-600' : 'text-gray-400'
                                }`}
                              />
                              <span
                                className="truncate text-gray-700 font-medium"
                                title={customer.lastAddressText}
                              >
                                {customer.lastAddressText}
                              </span>
                            </div>
                          )}
                          {customer.deliveryReference && (
                            <p
                              className="text-xs text-gray-500 truncate pl-5"
                              title={customer.deliveryReference}
                            >
                              Ref.: {customer.deliveryReference}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Sin dirección registrada</span>
                      )}
                    </td>

                    {hasCarteraCobro && (
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="text-xs">
                            <span className="text-gray-500">Saldo: </span>
                            <span
                              className={`font-mono font-bold ${
                                balance > 0.005 ? 'text-amber-700' : 'text-gray-700'
                              }`}
                            >
                              {formatCurrency(balance)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            <span>Límite: </span>
                            <span className="font-mono font-medium text-gray-700">
                              {hasCreditLimit
                                ? formatCurrency(Number(customer.creditLimit))
                                : 'Sin límite'}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    <td className="py-3.5 px-4">{renderActivitySummary(customer)}</td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenHistory(customer)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                          title="Ver historial del cliente"
                        >
                          <ClockCounterClockwise size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(customer)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                          title="Editar cliente"
                        >
                          <PencilSimple size={16} />
                        </button>
                        {isPosManager && (
                          isInactive ? (
                            <button
                              type="button"
                              onClick={() => handleReactivateDirect(customer)}
                              disabled={reactivatingCustomerId === customer.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
                              title="Reactivar cliente"
                            >
                              {reactivatingCustomerId === customer.id ? (
                                <CircleNotch size={14} className="animate-spin" />
                              ) : (
                                <UserCheck size={14} weight="bold" />
                              )}
                              <span>Reactivar</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCustomerToDeactivate(customer)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Desactivar cliente"
                            >
                              <UserMinus size={16} />
                            </button>
                          )
                        )}
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
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CaretLeft size={14} />
              </button>
              <button
                type="button"
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
          <div className="bg-white rounded-xl p-8 border border-gray-100 text-center text-xs text-gray-400">
            <CircleNotch size={24} className="animate-spin mx-auto mb-2 text-gray-300" />
            Cargando clientes...
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-gray-100 text-center text-xs text-gray-400">
            <User size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="font-medium text-gray-700">No se encontraron clientes</p>
          </div>
        ) : (
          customers.map((customer) => {
            const isInactive = customer.isActive === false;
            const waUrl = getWhatsAppUrl(customer.phone);
            const balance = Number(customer.currentBalance ?? customer.balance ?? 0);
            const hasCreditLimit =
              customer.creditLimit !== null && customer.creditLimit !== undefined;

            return (
              <div
                key={customer.id}
                className={`bg-white rounded-xl p-4 border border-gray-100 shadow-2xs space-y-3 ${
                  isInactive ? 'opacity-80 bg-gray-50/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm flex flex-wrap items-center gap-1.5">
                      <span className="break-words">{customer.name}</span>
                      {isInactive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                          Inactivo
                        </span>
                      )}
                      {customer.isBlocked && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          Bloqueado
                        </span>
                      )}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <span className="font-mono">{formatPhoneDisplay(customer.phone)}</span>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 p-0.5"
                          title="Abrir WhatsApp"
                        >
                          <WhatsappLogo size={15} weight="fill" />
                        </a>
                      )}
                      {customer.ruc && (
                        <span className="text-gray-500">• Cédula/RUC: {customer.ruc}</span>
                      )}
                    </div>

                    {customer.email && (
                      <p className="text-xs text-gray-500 break-all">{customer.email}</p>
                    )}

                    {(customer.group?.name || customer.externalCode) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {customer.group?.name && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            <Buildings size={12} />
                            <span>{customer.group.name}</span>
                          </span>
                        )}
                        {customer.externalCode && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-gray-100 text-gray-700">
                            Carnet: {customer.externalCode}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenHistory(customer)}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                      title="Ver historial"
                    >
                      <ClockCounterClockwise size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(customer)}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                      title="Editar"
                    >
                      <PencilSimple size={16} />
                    </button>
                    {isPosManager && (
                      isInactive ? (
                        <button
                          type="button"
                          onClick={() => handleReactivateDirect(customer)}
                          disabled={reactivatingCustomerId === customer.id}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 inline-flex items-center gap-1"
                          title="Reactivar"
                        >
                          {reactivatingCustomerId === customer.id ? (
                            <CircleNotch size={13} className="animate-spin" />
                          ) : (
                            <UserCheck size={13} weight="bold" />
                          )}
                          <span>Reactivar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCustomerToDeactivate(customer)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-amber-700 hover:bg-amber-50"
                          title="Desactivar"
                        >
                          <UserMinus size={16} />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {(customer.lastAddressText || customer.deliveryReference) && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg space-y-1">
                    {customer.lastAddressText && (
                      <div className="flex items-start gap-1.5">
                        <MapPin
                          size={14}
                          className={`shrink-0 mt-0.5 ${
                            customer.lastLatitude ? 'text-brand-600' : 'text-gray-400'
                          }`}
                        />
                        <span className="line-clamp-2">{customer.lastAddressText}</span>
                      </div>
                    )}
                    {customer.deliveryReference && (
                      <p className="text-xs text-gray-500 pl-5">
                        Ref.: {customer.deliveryReference}
                      </p>
                    )}
                  </div>
                )}

                {hasCarteraCobro && (
                  <div className="flex items-center justify-between text-xs bg-gray-50/70 px-3 py-2 rounded-lg border border-gray-100">
                    <div>
                      <span className="text-gray-500">Saldo: </span>
                      <span
                        className={`font-mono font-bold ${
                          balance > 0.005 ? 'text-amber-700' : 'text-gray-800'
                        }`}
                      >
                        {formatCurrency(balance)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Límite: </span>
                      <span className="font-mono font-medium text-gray-700">
                        {hasCreditLimit
                          ? formatCurrency(Number(customer.creditLimit))
                          : 'Sin límite'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-50">
                  <span>Actividad:</span>
                  <div>{renderActivitySummary(customer)}</div>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 text-xs text-gray-500">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
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

      {/* Modal de Ficha e Historial del Cliente */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={isHistoryOpen}
        onClose={handleCloseHistory}
        hasCarteraCobro={hasCarteraCobro}
        isDeliveryActive={isDeliveryActive}
        isCitasActive={isCitasActive}
        isPosManager={isPosManager}
        onEdit={(cust) => {
          handleCloseHistory();
          handleOpenEdit(cust);
        }}
        onDeactivate={(cust) => {
          handleCloseHistory();
          setCustomerToDeactivate(cust);
        }}
        onReactivate={(cust) => handleReactivateDirect(cust)}
        isReactivating={
          Boolean(selectedCustomer && reactivatingCustomerId === selectedCustomer.id)
        }
      />

      {/* Modal único Crear / Editar Cliente */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
        hasCarteraCobro={hasCarteraCobro}
        isPosManager={isPosManager}
        onSuccess={(saved) => refreshCustomersList(saved)}
        onViewCustomer={(id) => handleViewCustomerById(id)}
      />

      {/* Modal de confirmación para Desactivar Cliente */}
      <CustomerStatusModal
        isOpen={Boolean(customerToDeactivate)}
        onClose={() => setCustomerToDeactivate(null)}
        customer={customerToDeactivate}
        onSuccess={(updated) => refreshCustomersList(updated)}
      />
    </div>
  );
};
