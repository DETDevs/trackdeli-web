import React, { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Plus,
  MagnifyingGlass,
  ArrowsClockwise,
  Eye,
  Trash,
  WarningCircle,
  CaretLeft,
  CaretRight,
  CalendarBlank,
} from '@phosphor-icons/react';
import {
  type PosPurchase,
  type PosSupplier,
  getPosPurchases,
  getPosSuppliers,
  getMyBusiness,
} from 'api-client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/formatters';
import { formatManaguaDate, getManaguaTodayYMD } from '../../utils/dateManagua';
import { extractApiErrorMessage } from '../../utils/productCost';
import { CreatePurchaseModal } from '../../components/purchases/CreatePurchaseModal';
import { PurchaseDetailModal } from '../../components/purchases/PurchaseDetailModal';
import { VoidPurchaseModal } from '../../components/purchases/VoidPurchaseModal';
import { SuppliersListModal } from '../../components/pos/inventory/SuppliersListModal';
import { ModuleNotEnabledAlert } from '../../components/pos/ModuleNotEnabledAlert';
import { WebAccessDisabledView } from '../../components/pos/WebAccessDisabledView';

type PurchaseDatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

const calcManaguaDaysAgo = (todayYmd: string, days: number): string => {
  const [y, m, d] = todayYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  dt.setDate(dt.getDate() - days);
  const resY = dt.getFullYear();
  const resM = String(dt.getMonth() + 1).padStart(2, '0');
  const resD = String(dt.getDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
};

const formatDateOnly = (val?: string | null): string => {
  if (!val) return '—';
  const s = String(val).trim();
  return formatManaguaDate(/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s);
};

export const PosPurchasesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userRole = String(user?.role || '').toUpperCase();

  // Protección de ruta adicional para roles no autorizados
  if (userRole === 'CAJERO') {
    return <Navigate to="/pos/cobrar" replace />;
  }
  if (userRole === 'VENDEDOR') {
    return <Navigate to="/pos/quotes" replace />;
  }

  const isAuthorized = userRole === 'ENCARGADO' || userRole === 'SUPERADMIN';

  const todayYmd = useMemo(() => getManaguaTodayYMD(), []);
  const [datePreset, setDatePreset] = useState<PurchaseDatePreset>('all');
  const [customFrom, setCustomFrom] = useState<string>(todayYmd);
  const [customTo, setCustomTo] = useState<string>(todayYmd);

  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RECEIVED' | 'VOIDED'>('ALL');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSuppliersModalOpen, setIsSuppliersModalOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<PosPurchase | null>(null);
  const [voidTarget, setVoidTarget] = useState<PosPurchase | null>(null);

  const { fromParam, toParam } = useMemo(() => {
    switch (datePreset) {
      case 'today':
        return { fromParam: todayYmd, toParam: todayYmd };
      case 'week':
        return { fromParam: calcManaguaDaysAgo(todayYmd, 6), toParam: todayYmd };
      case 'month': {
        const [y, m] = todayYmd.split('-');
        return { fromParam: `${y}-${m}-01`, toParam: todayYmd };
      }
      case 'custom':
        return {
          fromParam: customFrom || undefined,
          toParam: customTo || undefined,
        };
      case 'all':
      default:
        return { fromParam: undefined, toParam: undefined };
    }
  }, [datePreset, customFrom, customTo, todayYmd]);

  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    enabled: isAuthorized,
    staleTime: 60000,
  });
  const currency = (business as any)?.currency || 'NIO';

  const { data: suppliers = [] } = useQuery<PosSupplier[]>({
    queryKey: ['pos', 'suppliers'],
    queryFn: () => getPosSuppliers(),
    enabled: isAuthorized,
    staleTime: 60000,
  });

  const apiSupplierParam =
    supplierFilter !== 'ALL' && supplierFilter !== 'NONE' ? supplierFilter : undefined;
  const apiStatusParam = statusFilter !== 'ALL' ? statusFilter : undefined;

  const {
    data: purchasesResponse,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'pos',
      'purchases',
      {
        from: fromParam,
        to: toParam,
        supplierId: apiSupplierParam,
        status: apiStatusParam,
        page,
        limit,
      },
    ],
    queryFn: () =>
      getPosPurchases({
        from: fromParam,
        to: toParam,
        supplierId: apiSupplierParam,
        status: apiStatusParam,
        page,
        limit,
      }),
    enabled: isAuthorized,
    staleTime: 10000,
  });

  if (!isAuthorized) {
    return (
      <ModuleNotEnabledAlert message="Solo encargados y administradores pueden acceder al historial de compras." />
    );
  }

  if (
    (error as any)?.response?.data?.code === 'WEB_ACCESS_DISABLED' ||
    (error as any)?.response?.status === 403
  ) {
    return <WebAccessDisabledView />;
  }

  if ((error as any)?.response?.data?.code === 'MODULE_NOT_ENABLED') {
    return (
      <ModuleNotEnabledAlert message="El módulo de Punto de Venta no está habilitado para este negocio." />
    );
  }

  const rawPurchases = purchasesResponse?.data || [];
  const pagination = purchasesResponse?.pagination || {
    page,
    limit,
    total: rawPurchases.length,
    totalPages: 1,
  };

  // Filtrado en cliente solo para búsqueda textual y "Sin proveedor" (parámetros no presentes en GET /pos/purchases)
  const visiblePurchases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rawPurchases.filter((p) => {
      if (supplierFilter === 'NONE' && (p.supplierId || p.supplier)) {
        return false;
      }
      if (!q) return true;
      const invoiceMatch = (p.invoiceNumber || '').toLowerCase().includes(q);
      const supplierMatch = (p.supplier?.name || 'sin proveedor').toLowerCase().includes(q);
      return invoiceMatch || supplierMatch;
    });
  }, [rawPurchases, searchQuery, supplierFilter]);

  const invalidateAfterMutation = () => {
    queryClient.invalidateQueries({ queryKey: ['pos', 'purchases'] });
    queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
    queryClient.invalidateQueries({ queryKey: ['pos', 'inventory'] });
    queryClient.invalidateQueries({ queryKey: ['pos', 'batches'] });
    queryClient.invalidateQueries({ queryKey: ['pos', 'expiring-batches'] });
    queryClient.invalidateQueries({ queryKey: ['pos', 'payables'] });
    queryClient.invalidateQueries({ queryKey: ['backoffice'] });
  };

  const handlePresetChange = (next: PurchaseDatePreset) => {
    setDatePreset(next);
    setPage(1);
  };

  return (
    <div className="space-y-4 pb-10 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Truck size={22} weight="duotone" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight truncate">
              Compras
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Historial de ingresos a inventario, comprobantes de proveedores y anulaciones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="min-h-[44px] px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ArrowsClockwise size={16} className={isFetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSuppliersModalOpen(true)}
            className="min-h-[44px] px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Truck size={16} weight="bold" />
            <span>Proveedores</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="min-h-[44px] px-4 rounded-xl bg-[#0F0F0F] hover:bg-gray-800 text-white text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} weight="bold" />
            <span>Registrar compra</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        {/* Pills de fecha */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-600 flex items-center gap-1 mr-1">
            <CalendarBlank size={15} />
            <span>Período:</span>
          </span>
          {(
            [
              { id: 'all', label: 'Todas las fechas' },
              { id: 'today', label: 'Hoy' },
              { id: 'week', label: 'Últimos 7 días' },
              { id: 'month', label: 'Este mes' },
              { id: 'custom', label: 'Rango personalizado' },
            ] as { id: PurchaseDatePreset; label: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handlePresetChange(opt.id)}
              className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                datePreset === opt.id
                  ? 'bg-[#0F0F0F] text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Desde</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Hasta</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  setPage(1);
                }}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>
        )}

        {/* Buscador, proveedor y estado */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
          <div className="relative md:col-span-2">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por n.º de comprobante o proveedor..."
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
            />
          </div>

          <select
            value={supplierFilter}
            onChange={(e) => {
              setSupplierFilter(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white text-xs text-gray-800 focus:outline-none focus:border-gray-900 cursor-pointer"
          >
            <option value="ALL">Todos los proveedores</option>
            <option value="NONE">Sin proveedor</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'ALL' | 'RECEIVED' | 'VOIDED');
              setPage(1);
            }}
            className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white text-xs text-gray-800 focus:outline-none focus:border-gray-900 cursor-pointer"
          >
            <option value="ALL">Todos los estados</option>
            <option value="RECEIVED">Recibidas</option>
            <option value="VOIDED">Anuladas</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start justify-between gap-2 text-xs text-red-800">
          <div className="flex items-start gap-2">
            <WarningCircle size={18} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
            <span>
              {extractApiErrorMessage(error, 'No se pudo cargar el listado de compras.')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="font-semibold underline shrink-0 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Listado */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            Cargando historial de compras...
          </div>
        ) : visiblePurchases.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Truck size={36} className="text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">No se encontraron compras</p>
            <p className="text-xs text-gray-500">
              {searchQuery.trim() || supplierFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Probá cambiando los filtros o el término de búsqueda.'
                : 'Registrá tus compras a proveedores para abastecer tu inventario.'}
            </p>
          </div>
        ) : (
          <>
            {/* Tarjetas móvil (< md, seguro en 375 px) */}
            <div className="md:hidden divide-y divide-gray-100">
              {visiblePurchases.map((purchase) => {
                const isVoided = purchase.status === 'VOIDED';
                const itemsCount = purchase.items?.length || 0;
                return (
                  <div key={purchase.id} className="p-4 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-mono font-bold text-gray-900 break-all">
                          {purchase.invoiceNumber || `Compra #${purchase.id.slice(0, 8)}`}
                        </p>
                        <p className="text-gray-700 font-medium break-words">
                          {purchase.supplier?.name || 'Sin proveedor asignado'}
                        </p>
                        <p className="text-gray-500">
                          {formatDateOnly(purchase.purchaseDate)} ·{' '}
                          {itemsCount} {itemsCount === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <p className="font-mono font-bold text-sm text-gray-900">
                          {formatCurrency(Number(purchase.total), currency)}
                        </p>
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                              isVoided
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isVoided ? 'Anulada' : 'Recibida'}
                          </span>
                          {purchase.payableAccount && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                              Crédito
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-gray-500 truncate">
                        Por: {purchase.createdBy?.name || 'Usuario'}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDetailTarget(purchase)}
                          className="min-h-[44px] px-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-800 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye size={15} weight="bold" />
                          <span>Ver detalle</span>
                        </button>
                        {!isVoided && (
                          <button
                            type="button"
                            onClick={() => setVoidTarget(purchase)}
                            className="min-h-[44px] px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash size={15} weight="bold" />
                            <span>Anular</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabla escritorio (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">N.º de comprobante</th>
                    <th className="py-3 px-4">Proveedor</th>
                    <th className="py-3 px-4 text-center">Ítems</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4">Registrado por</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {visiblePurchases.map((purchase) => {
                    const isVoided = purchase.status === 'VOIDED';
                    return (
                      <tr key={purchase.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                          {formatDateOnly(purchase.purchaseDate)}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-gray-900">
                          {purchase.invoiceNumber || (
                            <span className="text-gray-400 font-normal">Sin número</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {purchase.supplier?.name || (
                            <span className="text-gray-400 font-normal">Sin proveedor</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {purchase.items?.length || 0}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                          {formatCurrency(Number(purchase.total), currency)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                isVoided
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {isVoided ? 'Anulada' : 'Recibida'}
                            </span>
                            {purchase.payableAccount && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                                Crédito
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {purchase.createdBy?.name || 'Usuario'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailTarget(purchase)}
                              className="min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye size={15} weight="bold" />
                              <span>Ver</span>
                            </button>
                            {!isVoided && (
                              <button
                                type="button"
                                onClick={() => setVoidTarget(purchase)}
                                className="min-h-[44px] px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Trash size={15} weight="bold" />
                                <span>Anular</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Paginación del servidor */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
            <span>
              Total de compras registradas: <strong>{pagination.total}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <CaretLeft size={14} weight="bold" />
                <span>Anterior</span>
              </button>
              <span className="px-2 font-semibold text-gray-900">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <span>Siguiente</span>
                <CaretRight size={14} weight="bold" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      <CreatePurchaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currency={currency}
        onSuccess={() => {
          invalidateAfterMutation();
          refetch();
        }}
      />

      <PurchaseDetailModal
        isOpen={Boolean(detailTarget)}
        purchaseId={detailTarget?.id || null}
        initialPurchase={detailTarget}
        currency={currency}
        onClose={() => setDetailTarget(null)}
        onRequestVoid={(purchase) => {
          setVoidTarget(purchase);
        }}
      />

      <VoidPurchaseModal
        isOpen={Boolean(voidTarget)}
        purchase={voidTarget}
        currency={currency}
        onClose={() => setVoidTarget(null)}
        onSuccess={() => {
          invalidateAfterMutation();
          refetch();
          toast.success('Compra anulada correctamente');
        }}
      />

      <SuppliersListModal
        isOpen={isSuppliersModalOpen}
        onClose={() => setIsSuppliersModalOpen(false)}
        onSuppliersChanged={() => {
          queryClient.invalidateQueries({ queryKey: ['pos', 'suppliers'] });
          refetch();
        }}
      />
    </div>
  );
};
