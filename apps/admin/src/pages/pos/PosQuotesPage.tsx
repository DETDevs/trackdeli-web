import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  MagnifyingGlass,
  CircleNotch,
  WarningCircle,
  WifiSlash,
  Eye,
  PencilSimple,
  PaperPlaneTilt,
  Printer,
  Copy,
  Prohibit,
  CheckCircle,
  CaretLeft,
  CaretRight,
  X,
  Car,
  ShoppingCart,
  WhatsappLogo,
} from '@phosphor-icons/react';
import {
  canConvertQuote,
  canPrintQuote,
  canShareQuote,
  duplicatePosQuote,
  formatQuoteApiError,
  getMyBusiness,
  getPosQuoteById,
  getPosQuotes,
  getPosSettings,
  QUOTE_STATUS_META,
  updatePosQuoteStatus,
  type PosQuote,
  type PosQuoteStatus,
  type PosSettingsData,
  type PrepareQuoteConversionResponse,
  type QuoteListResponse,
} from 'api-client';
import { useAuthStore } from '../../store/auth.store';
import { usePosCartStore } from '../../store/posCart.store';
import { usePosWebAccess } from '../../hooks/usePosWebAccess';
import { usePosPolicies } from '../../hooks/usePosPolicies';
import { formatManaguaDate } from '../../utils/dateManagua';
import { formatQuoteMoney, resolveQuoteCreatorName } from '../../utils/quoteReceiptHtml';
import type { QuoteEstimateBusinessContext } from '../../utils/quoteEstimate';
import { QuoteEditorModal } from '../../components/pos/quotes/QuoteEditorModal';
import { QuoteDetailModal } from '../../components/pos/quotes/QuoteDetailModal';
import { QuotePrintModal } from '../../components/pos/quotes/QuotePrintModal';
import { CancelQuoteModal } from '../../components/pos/quotes/CancelQuoteModal';
import { ConvertQuoteModal } from '../../components/pos/quotes/ConvertQuoteModal';
import { ShareQuoteModal } from '../../components/pos/quotes/ShareQuoteModal';

const STATUS_FILTERS: Array<{ value: '' | PosQuoteStatus; label: string }> = [
  { value: '', label: 'Todas' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'SENT', label: 'Emitida' },
  { value: 'ACCEPTED', label: 'Aceptada' },
  { value: 'EXPIRED', label: 'Vencida' },
  { value: 'CONVERTED', label: 'Convertida' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

export const PosQuotesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const loadFromQuoteConversion = usePosCartStore((s) => s.loadFromQuoteConversion);
  const user = useAuthStore((s) => s.user);
  const role = user?.role || '';
  const isSuperAdmin = role === 'SUPERADMIN';
  const isPrivileged = role === 'ENCARGADO' || isSuperAdmin;
  const canUseQuotes = ['ENCARGADO', 'SUPERADMIN', 'CAJERO', 'VENDEDOR'].includes(role);
  const businessIdParam = isSuperAdmin ? user?.businessId : undefined;

  const { isPosActive, webAdminEnabled } = usePosWebAccess();
  const { policies } = usePosPolicies(
    Boolean(canUseQuotes && webAdminEnabled && role !== 'VENDEDOR'),
  );

  const { data: businessData } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    enabled: Boolean(canUseQuotes && role !== 'VENDEDOR'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: posSettingsData } = useQuery<PosSettingsData>({
    queryKey: ['pos', 'settings'],
    queryFn: () => getPosSettings(),
    enabled: Boolean(canUseQuotes && isPosActive && role !== 'VENDEDOR'),
    staleTime: 60 * 1000,
    retry: false,
  });

  const isTaller = useMemo(() => {
    const candidates = [
      (posSettingsData as any)?.salonProfile,
      posSettingsData?.posVertical,
      (businessData as any)?.salonProfile,
      (businessData as any)?.posVertical,
      (user as any)?.business?.salonProfile,
      (user as any)?.business?.posVertical,
    ];
    return candidates.some((v) => String(v || '').toUpperCase() === 'TALLER');
  }, [posSettingsData, businessData, user]);

  const businessContext = useMemo<QuoteEstimateBusinessContext>(() => {
    const b = (businessData as any) || (user as any)?.business || {};
    return {
      useListPrice: Boolean(b.useListPrice),
      taxEnabled: b.taxEnabled !== undefined ? Boolean(b.taxEnabled) : true,
      taxIncluded: Boolean(b.taxIncluded),
      taxRate: b.taxRate !== undefined && Number(b.taxRate) > 0 ? Number(b.taxRate) : 15,
      wholesaleEnabled: Boolean(b.wholesaleEnabled),
      currency: b.currency || 'NIO',
    };
  }, [businessData, user]);

  // Filtros y paginación
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | PosQuoteStatus>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const st = (location.state as any) || null;
    if (!st?.statusFilter) return;
    const valid = ['', 'DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'CONVERTED', 'CANCELLED'];
    if (valid.includes(st.statusFilter)) {
      setStatusFilter(st.statusFilter);
      setPage(1);
    }
  }, [location.state]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Estado online del navegador
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Modales y acciones rápidas
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<PosQuote | null>(null);
  const [detailQuoteId, setDetailQuoteId] = useState<string | null>(null);
  const [printQuoteTarget, setPrintQuoteTarget] = useState<PosQuote | null>(null);
  const [cancelQuoteTarget, setCancelQuoteTarget] = useState<PosQuote | null>(null);
  const [convertQuoteTarget, setConvertQuoteTarget] = useState<PosQuote | null>(null);
  const [shareQuoteTarget, setShareQuoteTarget] = useState<PosQuote | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const listQuery = useQuery<QuoteListResponse>({
    queryKey: [
      'pos',
      'quotes',
      { status: statusFilter, q: debouncedQuery, page, businessId: businessIdParam },
    ],
    queryFn: () =>
      getPosQuotes({
        status: statusFilter || undefined,
        q: debouncedQuery || undefined,
        page,
        limit: 20,
        businessId: businessIdParam,
      }),
    enabled: Boolean(canUseQuotes && isPosActive),
    retry: 1,
  });

  if (!canUseQuotes) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-2">
        <WarningCircle size={32} className="text-amber-600 mx-auto" weight="fill" />
        <h2 className="text-base font-bold text-slate-900">Sin acceso a proformas</h2>
        <p className="text-xs text-slate-600">
          Tu rol actual no tiene permiso para crear ni consultar proformas.
        </p>
      </div>
    );
  }

  const refreshQuotes = () => {
    void queryClient.invalidateQueries({ queryKey: ['pos', 'quotes'] });
  };

  const quotes = listQuery.data?.data || [];
  const pagination = listQuery.data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  };

  const parsedListError = listQuery.isError
    ? formatQuoteApiError(listQuery.error, 'No se pudieron cargar las proformas.')
    : null;
  const showOfflineBanner = !isOnline || parsedListError?.code === 'NETWORK_ERROR';

  const handleQuickEmit = async (q: PosQuote) => {
    if (rowBusyId) return;
    setRowBusyId(q.id);
    setNotice(null);
    try {
      const updated = await updatePosQuoteStatus(
        q.id,
        { status: 'SENT' },
        businessIdParam,
      );
      refreshQuotes();
      setNotice({
        type: 'success',
        message: `Proforma ${updated.quoteNumber} emitida correctamente.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        message: formatQuoteApiError(err, 'No se pudo emitir la proforma.').message,
      });
    } finally {
      setRowBusyId(null);
    }
  };

  const handleQuickDuplicate = async (q: PosQuote) => {
    if (rowBusyId) return;
    setRowBusyId(q.id);
    setNotice(null);
    try {
      const created = await duplicatePosQuote(q.id, {}, businessIdParam);
      refreshQuotes();
      setNotice({
        type: 'success',
        message: `Borrador ${created.quoteNumber} creado a partir de ${q.quoteNumber}.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        message: formatQuoteApiError(err, 'No se pudo duplicar la proforma.').message,
      });
    } finally {
      setRowBusyId(null);
    }
  };

  const handleEditFromList = async (q: PosQuote) => {
    if (rowBusyId) return;
    setRowBusyId(q.id);
    setNotice(null);
    try {
      const full = await getPosQuoteById(q.id, businessIdParam);
      setEditingQuote(full);
      setEditorOpen(true);
    } catch (err) {
      setNotice({
        type: 'error',
        message: formatQuoteApiError(err, 'No se pudo cargar el borrador para editar.').message,
      });
    } finally {
      setRowBusyId(null);
    }
  };

  const canActOnRow = (q: PosQuote) => isPrivileged || q.createdById === user?.id;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText size={24} className="text-emerald-600 shrink-0" weight="duotone" />
            Proformas
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Cotizá productos o servicios con vigencia sin descontar inventario ni registrar venta
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingQuote(null);
            setEditorOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer min-h-[42px] shrink-0"
        >
          <Plus size={17} weight="bold" />
          Nueva proforma
        </button>
      </div>

      {/* Banner offline */}
      {showOfflineBanner && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <WifiSlash size={18} className="text-amber-700 shrink-0" />
            <span>
              Sin conexión con el servidor. Las proformas requieren conexión a internet para
              crearse y consultarse.
            </span>
          </div>
          <button
            type="button"
            onClick={() => void listQuery.refetch()}
            className="px-3 py-1.5 rounded-lg bg-amber-900 text-white font-semibold cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Feedback de acciones */}
      {notice && (
        <div
          className={`rounded-xl px-4 py-3 border text-xs flex items-center justify-between gap-3 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle size={17} weight="fill" className="text-emerald-600 shrink-0" />
            ) : (
              <WarningCircle size={17} weight="fill" className="text-rose-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
            aria-label="Ocultar aviso"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Buscador y filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-3 shadow-2xs">
        <div className="relative">
          <MagnifyingGlass
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscá por folio (PRO-), cliente, teléfono, RUC o vehículo..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <button
                key={f.value || 'ALL'}
                type="button"
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista / Tabla */}
      {listQuery.isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 flex flex-col items-center justify-center gap-2 text-slate-600">
          <CircleNotch size={28} className="animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Cargando proformas...</span>
        </div>
      ) : listQuery.isError && !showOfflineBanner ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-2">
          <WarningCircle size={28} className="text-rose-600 mx-auto" weight="fill" />
          <p className="text-sm font-bold text-slate-900">Error al consultar proformas</p>
          <p className="text-xs text-slate-600">{parsedListError?.message}</p>
          <button
            type="button"
            onClick={() => void listQuery.refetch()}
            className="mt-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : quotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center space-y-3">
          <FileText size={36} className="text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {debouncedQuery || statusFilter
                ? 'No hay proformas con esos filtros'
                : 'Todavía no hay proformas registradas'}
            </h3>
            <p className="text-xs text-slate-600">
              {debouncedQuery || statusFilter
                ? 'Probá limpiando la búsqueda o cambiando el estado.'
                : 'Creá una proforma nueva para cotizar productos o servicios con vigencia.'}
            </p>
          </div>
          {debouncedQuery || statusFilter ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setDebouncedQuery('');
                setStatusFilter('');
                setPage(1);
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
            >
              Limpiar filtros
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingQuote(null);
                setEditorOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} weight="bold" />
              Crear primera proforma
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tabla desktop (md+) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-600 uppercase tracking-wide">
                  <th className="py-3 px-4">Folio</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Vigencia</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {quotes.map((q) => {
                  const meta = QUOTE_STATUS_META[q.status];
                  const isBusy = rowBusyId === q.id;
                  const allowed = canActOnRow(q);
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 align-top">
                        <button
                          type="button"
                          onClick={() => setDetailQuoteId(q.id)}
                          className="font-bold text-sm text-slate-900 hover:text-emerald-700 cursor-pointer whitespace-nowrap"
                        >
                          {q.quoteNumber}
                        </button>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {formatManaguaDate(q.createdAt)} · {resolveQuoteCreatorName(q, user)}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-slate-900">
                          {q.customerName || 'Cliente general'}
                        </div>
                        {(q.customerPhone || q.customerRuc) && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {[q.customerPhone, q.customerRuc].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {q.vehicleInfo && (
                          <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                            <Car size={13} className="shrink-0 text-slate-400" />
                            <span>{q.vehicleInfo}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div
                          className={`font-semibold ${
                            q.status === 'EXPIRED' ? 'text-amber-700' : 'text-slate-800'
                          }`}
                        >
                          Hasta {q.validUntilLabel}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {q.itemsCount ?? q.items?.length ?? 0}{' '}
                          {(q.itemsCount ?? q.items?.length ?? 0) === 1 ? 'línea' : 'líneas'}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top text-right font-bold text-sm text-slate-900 whitespace-nowrap">
                        {formatQuoteMoney(q.total, q.currency)}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailQuoteId(q.id)}
                            title="Ver detalle"
                            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                          >
                            <Eye size={16} />
                          </button>

                          {q.status === 'DRAFT' && allowed && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleEditFromList(q)}
                                title="Editar borrador"
                                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer disabled:opacity-50"
                              >
                                <PencilSimple size={16} />
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleQuickEmit(q)}
                                title="Emitir proforma"
                                className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer disabled:opacity-50"
                              >
                                {isBusy ? (
                                  <CircleNotch size={16} className="animate-spin" />
                                ) : (
                                  <PaperPlaneTilt size={16} />
                                )}
                              </button>
                            </>
                          )}

                          {canConvertQuote(q.status, role) && (
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => setConvertQuoteTarget(q)}
                              title={
                                !isOnline
                                  ? 'Esta proforma solo se puede convertir en venta con conexión a internet'
                                  : 'Convertir en venta'
                              }
                              className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ShoppingCart size={16} weight="bold" />
                            </button>
                          )}

                          {canShareQuote(q, role, user?.id) && (
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => setShareQuoteTarget(q)}
                              title={
                                !isOnline
                                  ? 'Requiere conexión a internet para compartir'
                                  : 'Compartir por WhatsApp'
                              }
                              className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <WhatsappLogo size={16} weight="fill" />
                            </button>
                          )}

                          {canPrintQuote(q.status) && (
                            <button
                              type="button"
                              onClick={() => setPrintQuoteTarget(q)}
                              title="Imprimir / PDF"
                              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              <Printer size={16} />
                            </button>
                          )}

                          {allowed && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleQuickDuplicate(q)}
                              title="Duplicar"
                              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                            >
                              <Copy size={16} />
                            </button>
                          )}

                          {['DRAFT', 'SENT', 'ACCEPTED'].includes(q.status) && allowed && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setCancelQuoteTarget(q)}
                              title="Cancelar"
                              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer disabled:opacity-50"
                            >
                              <Prohibit size={16} />
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

          {/* Tarjetas móvil (< md, óptimo a 375 px) */}
          <div className="md:hidden space-y-2.5">
            {quotes.map((q) => {
              const meta = QUOTE_STATUS_META[q.status];
              const isBusy = rowBusyId === q.id;
              const allowed = canActOnRow(q);
              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setDetailQuoteId(q.id)}
                        className="text-sm font-bold text-slate-900 hover:text-emerald-700 cursor-pointer"
                      >
                        {q.quoteNumber}
                      </button>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatManaguaDate(q.createdAt)} · Válida hasta {q.validUntilLabel}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${meta.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                      {meta.label}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {q.customerName || 'Cliente general'}
                      </p>
                      {q.vehicleInfo && (
                        <p className="text-xs text-slate-600 truncate flex items-center gap-1 mt-0.5">
                          <Car size={13} className="shrink-0 text-slate-400" />
                          <span>{q.vehicleInfo}</span>
                        </p>
                      )}
                    </div>
                    <span className="text-base font-extrabold text-slate-900 whitespace-nowrap shrink-0">
                      {formatQuoteMoney(q.total, q.currency)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDetailQuoteId(q.id)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={14} />
                      Ver
                    </button>

                    {q.status === 'DRAFT' && allowed && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleEditFromList(q)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                        >
                          <PencilSimple size={14} />
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleQuickEmit(q)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <PaperPlaneTilt size={14} />
                          Emitir
                        </button>
                      </>
                    )}

                    {canConvertQuote(q.status, role) && (
                      <button
                        type="button"
                        disabled={!isOnline}
                        onClick={() => setConvertQuoteTarget(q)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ShoppingCart size={14} weight="bold" />
                        Convertir
                      </button>
                    )}

                    {canShareQuote(q, role, user?.id) && (
                      <button
                        type="button"
                        disabled={!isOnline}
                        onClick={() => setShareQuoteTarget(q)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <WhatsappLogo size={14} weight="fill" />
                        WhatsApp
                      </button>
                    )}

                    {canPrintQuote(q.status) && (
                      <button
                        type="button"
                        onClick={() => setPrintQuoteTarget(q)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer size={14} />
                        Imprimir
                      </button>
                    )}

                    {allowed && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleQuickDuplicate(q)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy size={14} />
                        Duplicar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs text-slate-600">
                Página {pagination.page} de {pagination.totalPages} ({pagination.total} proformas)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <CaretLeft size={14} />
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  Siguiente
                  <CaretRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modales */}
      <QuoteEditorModal
        isOpen={editorOpen}
        editingQuote={editingQuote}
        businessContext={businessContext}
        policies={policies}
        isTaller={isTaller}
        userRole={role}
        businessId={businessIdParam}
        onClose={() => {
          setEditorOpen(false);
          setEditingQuote(null);
        }}
        onSaved={(saved, msg) => {
          refreshQuotes();
          setNotice({ type: 'success', message: msg });
          setDetailQuoteId(saved.id);
        }}
      />

      <QuoteDetailModal
        isOpen={Boolean(detailQuoteId)}
        quoteId={detailQuoteId}
        businessId={businessIdParam}
        userRole={role}
        currentUserId={user?.id}
        isOnline={isOnline}
        onClose={() => setDetailQuoteId(null)}
        onEditDraft={(q) => {
          setEditingQuote(q);
          setEditorOpen(true);
        }}
        onOpenPrint={(q) => setPrintQuoteTarget(q)}
        onOpenShare={(q) => setShareQuoteTarget(q)}
        onOpenConvert={(q) => setConvertQuoteTarget(q)}
        onOpenCancel={(q) => setCancelQuoteTarget(q)}
        onMutated={(updated, msg) => {
          refreshQuotes();
          if (msg) setNotice({ type: 'success', message: msg });
          setDetailQuoteId(updated.id);
        }}
      />

      <ConvertQuoteModal
        isOpen={Boolean(convertQuoteTarget)}
        quote={convertQuoteTarget}
        businessId={businessIdParam}
        onClose={() => setConvertQuoteTarget(null)}
        onConfirmConversion={(conversion: PrepareQuoteConversionResponse) => {
          loadFromQuoteConversion(conversion);
          setConvertQuoteTarget(null);
          navigate('/pos/cobrar');
        }}
      />

      <ShareQuoteModal
        isOpen={Boolean(shareQuoteTarget)}
        quote={shareQuoteTarget}
        businessName={(businessData as any)?.name || (user as any)?.business?.name || null}
        businessId={businessIdParam}
        onClose={() => setShareQuoteTarget(null)}
      />

      <QuotePrintModal
        isOpen={Boolean(printQuoteTarget)}
        quoteId={printQuoteTarget?.id || null}
        initialQuote={printQuoteTarget}
        businessId={businessIdParam}
        onClose={() => setPrintQuoteTarget(null)}
      />

      <CancelQuoteModal
        isOpen={Boolean(cancelQuoteTarget)}
        quote={cancelQuoteTarget}
        businessId={businessIdParam}
        onClose={() => setCancelQuoteTarget(null)}
        onCancelled={(updated) => {
          refreshQuotes();
          setNotice({
            type: 'success',
            message: `Proforma ${updated.quoteNumber} cancelada.`,
          });
          if (detailQuoteId === updated.id) {
            setDetailQuoteId(null);
          }
        }}
      />
    </div>
  );
};
