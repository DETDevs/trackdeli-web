import React, { useState, useRef, useEffect } from 'react';
import {
  Receipt,
  ArrowsClockwise,
  Wrench,
  Car,
  ArrowRight,
  WarningCircle,
  CaretLeft,
  CaretRight,
  Printer,
  ArrowUUpLeft,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, getMyBusiness } from 'api-client';
import { useAuthStore } from '../../store/auth.store';
import { useBackofficeSales, useBackofficeDashboard } from '../../hooks/useBackoffice';
import { useBackofficeDateFilter } from '../../hooks/useBackofficeDateFilter';
import { PosDateFilterPills } from '../../components/pos/PosDateFilterPills';
import { SaleDetailModal } from '../../components/pos/SaleDetailModal';
import { ModuleNotEnabledAlert } from '../../components/pos/ModuleNotEnabledAlert';
import { WebAccessDisabledView } from '../../components/pos/WebAccessDisabledView';
import { ReportPrintModal } from '../../components/reports/ReportPrintModal';
import { ReportDocument } from '../../types/report';
import { buildPeriodFromYmdRange } from '../../utils/reportHelpers';
import {
  buildSalesHistoryReportDocument,
  buildReturnsHistoryReportDocument,
  formatPaymentMethodDisplay,
} from '../../utils/salesReportBuilder';
import { formatCurrency } from '../../utils/formatters';
import { formatDateTime } from '../../utils/formatDate';
import { formatManaguaDate } from '../../utils/dateManagua';

export const PosSalesPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const branches = useAuthStore((s) => s.branches);
  const activeBranch = branches?.find((b) => b.id === user?.businessId);
  const isAllowedRole = user?.role === 'SUPERADMIN' || user?.role === 'ENCARGADO';

  const { preset, setPreset, from, to, customFrom, customTo, setCustomRange } =
    useBackofficeDateFilter('today');

  const [activeTab, setActiveTab] = useState<'SALES' | 'RETURNS'>('SALES');
  const [paymentMethod, setPaymentMethod] = useState<string>('ALL');
  const [excludeVoided, setExcludeVoided] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Estados de impresión
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPreparingReport, setIsPreparingReport] = useState(false);
  const [includeItems, setIncludeItems] = useState(false);
  const [reportDocument, setReportDocument] = useState<ReportDocument | null>(null);

  const cachedSalesRef = useRef<any[]>([]);
  const cachedReturnsRef = useRef<any[]>([]);

  // Datos del negocio para comprobantes y reportes
  const { data: businessData } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    staleTime: 5 * 60 * 1000,
  });

  // Consultar configuración para saber moneda y perfil de salón
  const { data: dashboardData } = useBackofficeDashboard();
  const currency = dashboardData?.currency || 'NIO';
  const isTallerProfile = dashboardData?.salonProfile === 'TALLER';

  // Consulta de ventas paginada para la vista en pantalla
  const {
    data: salesResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useBackofficeSales({
    from,
    to,
    paymentMethod: paymentMethod !== 'ALL' ? paymentMethod : undefined,
    excludeVoided: excludeVoided ? true : undefined,
    page,
    limit: 20,
  });

  const sales = salesResponse?.data || [];
  const pagination = salesResponse?.pagination;

  // Consulta de devoluciones para la pestaña de devoluciones
  const {
    data: returnsList = [],
    isLoading: isLoadingReturns,
    refetch: refetchReturns,
  } = useQuery<any[]>({
    queryKey: ['pos', 'returns', from, to],
    queryFn: async () => {
      const res = await apiClient.get<any[]>('/pos/returns', {
        params: { from, to },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: isAllowedRole,
    staleTime: 30000,
  });

  // Reconstruir el reporte en memoria cuando cambia el checkbox "includeItems"
  useEffect(() => {
    if (isPrintModalOpen && cachedSalesRef.current.length > 0 && activeTab === 'SALES') {
      const periodInfo = buildPeriodFromYmdRange(
        from,
        to,
        preset === 'today' ? 'Hoy' : preset === 'month' ? 'Este mes' : 'Personalizado'
      );
      const doc = buildSalesHistoryReportDocument({
        sales: cachedSalesRef.current,
        matchingReturns: cachedReturnsRef.current,
        period: periodInfo,
        methodFilter: paymentMethod,
        statusFilter: excludeVoided ? 'COMPLETED' : 'ALL',
        includeItems,
        business: businessData,
        branchName: activeBranch?.name,
        user,
      });
      setReportDocument(doc);
    }
  }, [includeItems]);

  const handleOpenPrintModal = async () => {
    setIsPrintModalOpen(true);
    setIsPreparingReport(true);
    setReportDocument(null);

    const periodLabel =
      preset === 'today'
        ? 'Hoy'
        : preset === 'week'
        ? 'Esta semana'
        : preset === 'month'
        ? 'Este mes'
        : 'Personalizado';

    const periodInfo = buildPeriodFromYmdRange(from, to, periodLabel);

    try {
      if (activeTab === 'RETURNS') {
        const res = await apiClient.get<any[]>('/pos/returns', {
          params: { from, to },
        });
        const returnsData = Array.isArray(res.data) ? res.data : [];
        cachedReturnsRef.current = returnsData;

        const doc = buildReturnsHistoryReportDocument({
          returns: returnsData,
          period: periodInfo,
          business: businessData,
          branchName: activeBranch?.name,
          user,
        });
        setReportDocument(doc);
      } else {
        // Pedimos todas las filas del filtro activo paginando de 200 en 200
        const allSales: any[] = [];
        const seenIds = new Set<string>();
        const batchLimit = 200;
        const maxPages = 50;

        for (let p = 1; p <= maxPages; p++) {
          const res = await apiClient.get<any[]>('/pos/sales', {
            params: {
              from,
              to,
              paymentMethod: paymentMethod !== 'ALL' ? paymentMethod : undefined,
              status: excludeVoided ? 'COMPLETED' : undefined,
              limit: batchLimit,
              page: p,
            },
          });
          const batch = Array.isArray(res.data) ? res.data : [];
          for (const s of batch) {
            if (s && s.id && !seenIds.has(s.id)) {
              seenIds.add(s.id);
              allSales.push(s);
            }
          }
          if (batch.length < batchLimit) break;
        }

        // Consultamos devoluciones del mismo período para el resumen
        let periodReturns: any[] = [];
        try {
          const retRes = await apiClient.get<any[]>('/pos/returns', {
            params: { from, to },
          });
          periodReturns = Array.isArray(retRes.data) ? retRes.data : [];
        } catch {
          periodReturns = [];
        }

        cachedSalesRef.current = allSales;
        cachedReturnsRef.current = periodReturns;

        const doc = buildSalesHistoryReportDocument({
          sales: allSales,
          matchingReturns: periodReturns,
          period: periodInfo,
          methodFilter: paymentMethod,
          statusFilter: excludeVoided ? 'COMPLETED' : 'ALL',
          includeItems,
          business: businessData,
          branchName: activeBranch?.name,
          user,
        });
        setReportDocument(doc);
      }
    } catch (err) {
      console.error('[PosSalesPage] Error generando reporte para impresión:', err);
    } finally {
      setIsPreparingReport(false);
    }
  };

  if (
    (error as any)?.response?.data?.code === 'WEB_ACCESS_DISABLED' ||
    (error as any)?.response?.status === 403
  ) {
    return <WebAccessDisabledView />;
  }

  if ((error as any)?.response?.data?.code === 'MODULE_NOT_ENABLED') {
    return <ModuleNotEnabledAlert message="El módulo de Punto de Venta no está habilitado para este negocio." />;
  }

  return (
    <div className="space-y-4 pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-base shadow-2xs">
            <Receipt size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                Ventas del Punto de Venta
              </h2>
              {isTallerProfile && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Wrench size={11} />
                  Perfil Taller
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Consulta de comprobantes emitidos, devoluciones y detalle de órdenes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Botón Imprimir */}
          <button
            type="button"
            onClick={handleOpenPrintModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors shadow-2xs cursor-pointer"
            title="Imprimir reporte en hoja carta o guardar PDF"
          >
            <Printer size={14} weight="bold" />
            <span>Imprimir</span>
          </button>

          {/* Botón Actualizar */}
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'RETURNS') {
                refetchReturns();
              } else {
                refetch();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowsClockwise
              size={13}
              className={isLoading || isLoadingReturns ? 'animate-spin' : ''}
            />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Selector de Pestañas: Ventas vs Devoluciones (solo encargado/admin) */}
      {isAllowedRole && (
        <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('SALES');
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'SALES'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Receipt size={14} weight="bold" />
            <span>Ventas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('RETURNS');
              refetchReturns();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'RETURNS'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ArrowUUpLeft size={14} weight="bold" />
            <span>Devoluciones</span>
            {returnsList.length > 0 && (
              <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-bold">
                {returnsList.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Barra de Filtros (Fechas + Método de pago + Excluir anuladas) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Selector de Fechas Rápido */}
          <PosDateFilterPills
            preset={preset}
            setPreset={(p) => {
              setPreset(p);
              setPage(1);
            }}
            from={from}
            to={to}
            customFrom={customFrom}
            customTo={customTo}
            setCustomRange={(f, t) => {
              setCustomRange(f, t);
              setPage(1);
            }}
          />

          {/* Filtros complementarios para ventas */}
          {activeTab === 'SALES' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Método de pago */}
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setPage(1);
                }}
                className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-800 bg-white focus:outline-none focus:border-gray-900 shadow-2xs"
              >
                <option value="ALL">Todos los métodos</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="OTROS">Otros</option>
              </select>

              {/* Checkbox Excluir Anuladas */}
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none px-2 py-1 rounded-lg border border-gray-100 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={excludeVoided}
                  onChange={(e) => {
                    setExcludeVoided(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                />
                <span className="text-[11px] font-medium text-gray-700">Sin anuladas</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Contenido: Si está en Pestaña Devoluciones */}
      {activeTab === 'RETURNS' ? (
        isLoadingReturns ? (
          <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center space-y-3 shadow-2xs">
            <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-400 text-xs">Cargando devoluciones...</p>
          </div>
        ) : returnsList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-2xs space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mx-auto">
              <ArrowUUpLeft size={24} weight="duotone" />
            </div>
            <h4 className="font-semibold text-sm text-gray-900">Sin devoluciones en este período</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              No se registraron devoluciones ni reembolsos entre el {formatManaguaDate(from)} y el{' '}
              {formatManaguaDate(to)}.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Comp. original</th>
                    <th className="px-4 py-3">Fecha y Hora</th>
                    <th className="px-4 py-3">Productos devueltos</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Reintegro</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {returnsList.map((ret: any) => {
                    const origInvoice = ret.sale?.invoiceNumber ? `#${ret.sale.invoiceNumber}` : '—';
                    const itemsDesc = Array.isArray(ret.items) && ret.items.length > 0
                      ? ret.items
                          .map((i: any) => `${i.quantity ?? 1} × ${i.productName || 'Producto'}`)
                          .join(', ')
                      : 'Productos varios';

                    return (
                      <tr key={ret.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">{origInvoice}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDateTime(ret.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-[220px] truncate" title={itemsDesc}>
                          {itemsDesc}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{ret.reason || 'Sin motivo'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-200/60">
                            {formatPaymentMethodDisplay(ret.refundMethod)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-700 whitespace-nowrap">
                          {formatCurrency(ret.totalAmount ?? ret.refundAmount ?? 0, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Contenido: Pestaña Ventas (Desktop Table + Mobile Cards) */
        <>
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center space-y-3 shadow-2xs">
              <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 text-xs">Cargando ventas...</p>
            </div>
          ) : isError ? (
            <div className="bg-white rounded-2xl border border-red-200 p-8 text-center shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 mx-auto">
                <WarningCircle size={26} weight="duotone" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-sm text-gray-900">Error al cargar las ventas</h4>
                <p className="text-xs text-red-600 max-w-sm mx-auto">
                  {(error as any)?.response?.data?.message ||
                    'No se pudieron consultar los comprobantes. Por favor intente nuevamente.'}
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <ArrowsClockwise size={14} weight="bold" />
                  <span>Reintentar</span>
                </button>
              </div>
            </div>
          ) : sales.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-2xs space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mx-auto">
                <Receipt size={24} weight="duotone" />
              </div>
              <h4 className="font-semibold text-sm text-gray-900">Sin ventas en este período</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {from === to
                  ? `No se registraron comprobantes el ${formatManaguaDate(from)}.`
                  : `No se registraron comprobantes entre el ${formatManaguaDate(from)} y el ${formatManaguaDate(to)}.`}
              </p>
            </div>
          ) : (
            <>
              {/* Vista Escritorio: Tabla */}
              <div className="hidden md:block bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Comprobante</th>
                        <th className="px-4 py-3">Fecha y Hora</th>
                        <th className="px-4 py-3">
                          {isTallerProfile ? 'Cliente / Vehículo' : 'Cliente'}
                        </th>
                        <th className="px-4 py-3">Método</th>
                        <th className="px-4 py-3">Cajero</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-center">Estado</th>
                        <th className="px-4 py-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sales.map((sale) => (
                        <tr
                          key={sale.id}
                          onClick={() => setSelectedSaleId(sale.id)}
                          className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            #{sale.invoiceNumber}
                          </td>

                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {formatDateTime(sale.createdAt)}
                          </td>

                          <td className="px-4 py-3 max-w-[200px]">
                            {isTallerProfile && (sale.taller?.placa || sale.taller?.vehiculo) ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 font-semibold text-gray-900 truncate">
                                  <Car size={13} className="text-amber-700 shrink-0" />
                                  <span>{sale.taller.placa || 'Sin placa'}</span>
                                  {sale.taller.vehiculo && (
                                    <span className="text-gray-500 font-normal truncate">
                                      · {sale.taller.vehiculo}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 truncate">
                                  {sale.customer?.name || 'Cliente general'}
                                  {sale.taller.tecnico && ` · Tec: ${sale.taller.tecnico}`}
                                </p>
                              </div>
                            ) : (
                              <div className="truncate">
                                <p className="font-medium text-gray-900 truncate">
                                  {sale.customer?.name || 'Cliente general'}
                                </p>
                                {sale.customer?.phone && (
                                  <p className="text-[11px] text-gray-400">{sale.customer.phone}</p>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-200/60">
                              {sale.paymentMethod || 'Efectivo'}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-gray-600 truncate max-w-[120px]">
                            {sale.cashier?.name || 'Cajero'}
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                            {formatCurrency(sale.netTotal, currency)}
                          </td>

                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {sale.isVoided ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                Anulada
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Pagada
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSaleId(sale.id);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
                            >
                              <span>Ver</span>
                              <ArrowRight size={11} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vista Celular: Tarjetas legibles y optimizadas */}
              <div className="md:hidden space-y-2.5">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => setSelectedSaleId(sale.id)}
                    className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-2.5 active:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-900">
                            #{sale.invoiceNumber}
                          </span>
                          {sale.isVoided ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                              Anulada
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Pagada
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {formatDateTime(sale.createdAt)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900 block">
                          {formatCurrency(sale.netTotal, currency)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {sale.itemsCount} {sale.itemsCount === 1 ? 'ítem' : 'ítems'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                      <span className="truncate max-w-[160px]">
                        {sale.customer?.name || 'Cliente general'}
                      </span>

                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-50 text-gray-700 border border-gray-200/60">
                        {sale.paymentMethod || 'Efectivo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {pagination && pagination.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-4 py-3.5 rounded-2xl border border-gray-200/80 shadow-2xs text-xs">
                  <div className="text-gray-500 text-center sm:text-left">
                    Mostrando{' '}
                    <span className="font-semibold text-gray-900">
                      {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}
                    </span>{' '}
                    a{' '}
                    <span className="font-semibold text-gray-900">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    de <span className="font-semibold text-gray-900">{pagination.total}</span> ventas totales
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium shadow-2xs"
                      title="Página anterior"
                    >
                      <CaretLeft size={14} weight="bold" />
                      <span className="hidden sm:inline">Anterior</span>
                    </button>

                    {/* Números de página */}
                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter((p) => {
                          return (
                            p === 1 ||
                            p === pagination.totalPages ||
                            Math.abs(p - pagination.page) <= 1
                          );
                        })
                        .map((p, idx, arr) => {
                          const prev = arr[idx - 1];
                          const showEllipsis = prev && p - prev > 1;
                          return (
                            <React.Fragment key={p}>
                              {showEllipsis && <span className="text-gray-400 px-1">…</span>}
                              <button
                                type="button"
                                onClick={() => setPage(p)}
                                className={`w-7 h-7 rounded-xl text-xs font-semibold transition-colors ${
                                  pagination.page === p
                                    ? 'bg-gray-900 text-white shadow-xs'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                {p}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>

                    <button
                      type="button"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium shadow-2xs"
                      title="Página siguiente"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <CaretRight size={14} weight="bold" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modal de Detalle de Venta */}
      <SaleDetailModal
        saleId={selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
        currency={currency}
        isTallerProfile={isTallerProfile}
      />

      {/* Modal de Impresión de Reporte */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        document={reportDocument}
        isPreparing={isPreparingReport}
        options={
          activeTab === 'SALES'
            ? [
                {
                  id: 'includeItems',
                  label: 'Incluir productos de cada venta',
                  checked: includeItems,
                  onChange: setIncludeItems,
                },
              ]
            : []
        }
      />
    </div>
  );
};
