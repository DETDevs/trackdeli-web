import React, { useState, useMemo } from 'react';
import {
  Motorcycle,
  DeviceMobile,
  Receipt,
  DownloadSimple,
  WarningCircle,
  Coins,
  CreditCard,
  Bank,
  Plus,
  X,
  Storefront,
  Users,
  MapPin,
  Tag,
  CalendarBlank,
} from '@phosphor-icons/react';
import {
  PeriodType,
  ReportQueryParams,
  SaleChannelCode,
} from '../../types/reports';
import {
  useSalesByChannel,
  useDomicilioReport,
  usePedidosYaReport,
  usePedidosYaSettlementPending,
  usePedidosYaSettlementsList,
  useChannelDrivers,
  usePosBanks,
  useRegisterPedidosYaSettlement,
  downloadReportCsv,
} from '../../hooks/useBackofficeReports';
import { ChannelConfigResponse } from 'api-client';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { formatManaguaDate, formatManaguaTime, getManaguaTodayYMD } from '../../utils/dateManagua';
import { toast } from 'react-hot-toast';

interface ChannelsReportTabProps {
  queryParams: ReportQueryParams;
  period: PeriodType;
  channelConfig: ChannelConfigResponse;
}

type ChannelSubTab = 'summary' | 'domicilio' | 'pedidosya' | 'settlements';

export const ChannelsReportTab: React.FC<ChannelsReportTabProps> = ({
  queryParams,
  period,
  channelConfig,
}) => {
  const isDeliveryEnabled = Boolean(channelConfig.delivery?.enabled);
  const isPedidosYaEnabled = Boolean(channelConfig.pedidosYa?.enabled);

  const [activeSubTab, setActiveSubTab] = useState<ChannelSubTab>('summary');

  // Filtros internos
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

  // Modal de Liquidación
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState<boolean>(false);
  const [depositDate, setDepositDate] = useState<string>(getManaguaTodayYMD());
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [depositReference, setDepositReference] = useState<string>('');
  const [depositNotes, setDepositNotes] = useState<string>('');
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);

  // Queries
  const {
    data: channelSummaryData,
    isLoading: isLoadingSummary,
  } = useSalesByChannel(queryParams, activeSubTab === 'summary');

  const domicilioParams = useMemo(
    () => ({
      ...queryParams,
      driverId: selectedDriverId || undefined,
    }),
    [queryParams, selectedDriverId]
  );

  const {
    data: domicilioData,
    isLoading: isLoadingDomicilio,
  } = useDomicilioReport(domicilioParams, isDeliveryEnabled && activeSubTab === 'domicilio');

  const {
    data: pedidosYaData,
    isLoading: isLoadingPedidosYa,
  } = usePedidosYaReport(queryParams, isPedidosYaEnabled && activeSubTab === 'pedidosya');

  const {
    data: pendingSettlementData,
    isLoading: isLoadingPendingSettlement,
    refetch: refetchPendingSettlement,
  } = usePedidosYaSettlementPending(
    { from: queryParams.from, to: queryParams.to },
    isPedidosYaEnabled && activeSubTab === 'settlements'
  );

  const {
    data: settlementsListData,
    isLoading: isLoadingSettlementsList,
    refetch: refetchSettlementsList,
  } = usePedidosYaSettlementsList(isPedidosYaEnabled && activeSubTab === 'settlements');

  const { data: driversList } = useChannelDrivers(isDeliveryEnabled);
  const { data: banksList } = usePosBanks(isPedidosYaEnabled);

  const registerSettlementMutation = useRegisterPedidosYaSettlement();

  // Inicializar selección de pedidos para el modal cuando se abre
  const handleOpenSettlementModal = () => {
    const orders = pendingSettlementData?.orders || [];
    setSelectedSaleIds(orders.map((o) => o.id));
    setDepositAmount(
      pendingSettlementData?.netPayout ? String(pendingSettlementData.netPayout) : ''
    );
    setDepositDate(getManaguaTodayYMD());
    setSelectedBankId(banksList?.[0]?.id || '');
    setDepositReference('');
    setDepositNotes('');
    setIsSettlementModalOpen(true);
  };

  // Cálculo de diferencia esperada en el modal
  const expectedAmountInModal = useMemo(() => {
    if (!pendingSettlementData?.orders) return 0;
    return pendingSettlementData.orders
      .filter((o) => selectedSaleIds.includes(o.id))
      .reduce((sum, o) => sum + (o.netPayout || 0), 0);
  }, [pendingSettlementData, selectedSaleIds]);

  const parsedDepositAmount = parseFloat(depositAmount) || 0;
  const settlementDifference = parsedDepositAmount - expectedAmountInModal;

  const handleToggleSaleSelection = (id: string) => {
    setSelectedSaleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllSales = () => {
    const orders = pendingSettlementData?.orders || [];
    if (selectedSaleIds.length === orders.length) {
      setSelectedSaleIds([]);
    } else {
      setSelectedSaleIds(orders.map((o) => o.id));
    }
  };

  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSaleIds.length === 0) {
      toast.error('Selecciona al menos un pedido para liquidar');
      return;
    }
    if (parsedDepositAmount <= 0) {
      toast.error('Ingresa un monto depositado válido');
      return;
    }

    try {
      await registerSettlementMutation.mutateAsync({
        depositDate,
        depositAmount: parsedDepositAmount,
        bankId: selectedBankId || undefined,
        reference: depositReference.trim() || undefined,
        notes: depositNotes.trim() || undefined,
        saleIds: selectedSaleIds,
      });
      toast.success('Liquidación registrada con éxito');
      setIsSettlementModalOpen(false);
      refetchPendingSettlement();
      refetchSettlementsList();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al registrar liquidación';
      toast.error(msg);
    }
  };

  // Descargas CSV
  const handleExportSummaryCsv = async () => {
    try {
      setIsExportingCsv(true);
      await downloadReportCsv(
        '/pos/reports/sales-by-channel',
        queryParams,
        `ventas_por_canal_${period}.csv`
      );
      toast.success('Reporte descargado correctamente');
    } catch (error) {
      toast.error('Error al descargar el archivo CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportDomicilioCsv = async () => {
    try {
      setIsExportingCsv(true);
      await downloadReportCsv(
        '/pos/reports/domicilio',
        domicilioParams,
        `reporte_domicilio_${period}.csv`
      );
      toast.success('Reporte descargado correctamente');
    } catch (error) {
      toast.error('Error al descargar el archivo CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPedidosYaCsv = async () => {
    try {
      setIsExportingCsv(true);
      await downloadReportCsv(
        '/pos/reports/pedidosya',
        queryParams,
        `reporte_pedidosya_${period}.csv`
      );
      toast.success('Reporte descargado correctamente');
    } catch (error) {
      toast.error('Error al descargar el archivo CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const channelLabel = (c: SaleChannelCode | string) => {
    switch (c) {
      case 'MOSTRADOR':
        return 'Mostrador';
      case 'DOMICILIO':
        return 'A Domicilio';
      case 'PEDIDOSYA':
        return 'PedidosYa';
      default:
        return c;
    }
  };

  const channelIcon = (c: SaleChannelCode | string) => {
    switch (c) {
      case 'MOSTRADOR':
        return <Storefront size={16} className="text-gray-700" />;
      case 'DOMICILIO':
        return <Motorcycle size={16} className="text-blue-600" />;
      case 'PEDIDOSYA':
        return <DeviceMobile size={16} className="text-red-500" />;
      default:
        return <Storefront size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navegación de Canales */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('summary')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'summary'
              ? 'bg-gray-900 text-white shadow-2xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Storefront size={15} weight={activeSubTab === 'summary' ? 'bold' : 'regular'} />
          <span>Resumen por canal</span>
        </button>

        {isDeliveryEnabled && (
          <button
            type="button"
            onClick={() => setActiveSubTab('domicilio')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'domicilio'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <Motorcycle size={15} weight={activeSubTab === 'domicilio' ? 'bold' : 'regular'} />
            <span>A Domicilio</span>
          </button>
        )}

        {isPedidosYaEnabled && (
          <button
            type="button"
            onClick={() => setActiveSubTab('pedidosya')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'pedidosya'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            <DeviceMobile size={15} weight={activeSubTab === 'pedidosya' ? 'bold' : 'regular'} />
            <span>PedidosYa</span>
          </button>
        )}

        {isPedidosYaEnabled && (
          <button
            type="button"
            onClick={() => setActiveSubTab('settlements')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'settlements'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Bank size={15} weight={activeSubTab === 'settlements' ? 'bold' : 'regular'} />
            <span>Liquidaciones PedidosYa</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* 1. RESUMEN POR CANAL                                      */}
      {/* ========================================================= */}
      {activeSubTab === 'summary' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Ventas Consolidadas por Canal</h2>
              <p className="text-xs text-gray-500">
                Comparativa de comprobantes, venta bruta, IVA y ticket promedio por canal de venta.
              </p>
            </div>
            <button
              type="button"
              disabled={isExportingCsv || isLoadingSummary}
              onClick={handleExportSummaryCsv}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <DownloadSimple size={15} weight="bold" />
              <span>{isExportingCsv ? 'Descargando...' : 'Descargar CSV'}</span>
            </button>
          </div>

          {isLoadingSummary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100" />
              ))}
            </div>
          ) : (
            <>
              {/* KPIs de Resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Venta Bruta Total
                  </span>
                  <p className="text-2xl font-bold text-gray-900 font-mono mt-1">
                    {formatCurrency(channelSummaryData?.totalGross || 0)}
                  </p>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Todos los canales activos
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Total Comprobantes
                  </span>
                  <p className="text-2xl font-bold text-gray-900 font-mono mt-1">
                    {channelSummaryData?.summary?.reduce((sum, s) => sum + s.count, 0) || 0}
                  </p>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Ventas facturadas en el período
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Total IVA Recaudado
                  </span>
                  <p className="text-2xl font-bold text-gray-900 font-mono mt-1">
                    {formatCurrency(
                      channelSummaryData?.summary?.reduce((sum, s) => sum + s.tax, 0) || 0
                    )}
                  </p>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Impuesto sobre las ventas
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Unidades Vendidas
                  </span>
                  <p className="text-2xl font-bold text-gray-900 font-mono mt-1">
                    {formatQuantity(
                      channelSummaryData?.summary?.reduce((sum, s) => sum + s.units, 0) || 0
                    )}
                  </p>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Artículos en comprobantes
                  </span>
                </div>
              </div>

              {/* Tabla Resumen por Canal */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Desglose por Canal
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {channelSummaryData?.summary?.length || 0} canales registrados
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Canal</th>
                        <th className="py-3 px-4 text-right">Comprobantes</th>
                        <th className="py-3 px-4 text-right">Venta Bruta</th>
                        <th className="py-3 px-4 text-right">IVA</th>
                        <th className="py-3 px-4 text-right">Venta Neta</th>
                        <th className="py-3 px-4 text-right">Unidades</th>
                        <th className="py-3 px-4 text-right">Ticket Promedio</th>
                        <th className="py-3 px-4 text-right">% del Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {channelSummaryData?.summary?.map((row) => (
                        <tr key={row.channel} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {channelIcon(row.channel)}
                              <span>{channelLabel(row.channel)}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-gray-700">
                            {row.count}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-gray-900">
                            {formatCurrency(row.gross)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                            {formatCurrency(row.tax)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-gray-900">
                            {formatCurrency(row.net)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-gray-700">
                            {formatQuantity(row.units)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-gray-700">
                            {formatCurrency(row.avgTicket)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand-600 rounded-full"
                                  style={{ width: `${Math.min(row.pctOfTotal, 100)}%` }}
                                />
                              </div>
                              <span className="font-mono font-semibold text-gray-900 w-10 text-right">
                                {row.pctOfTotal}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50/90 border-t-2 border-gray-200 font-bold text-gray-900">
                        <td className="py-3 px-4">TOTAL</td>
                        <td className="py-3 px-4 text-right font-mono">
                          {channelSummaryData?.summary?.reduce((sum, s) => sum + s.count, 0) || 0}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatCurrency(channelSummaryData?.totalGross || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatCurrency(
                            channelSummaryData?.summary?.reduce((sum, s) => sum + s.tax, 0) || 0
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatCurrency(
                            channelSummaryData?.summary?.reduce((sum, s) => sum + s.net, 0) || 0
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatQuantity(
                            channelSummaryData?.summary?.reduce((sum, s) => sum + s.units, 0) || 0
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatCurrency(
                            (channelSummaryData?.summary?.reduce((sum, s) => sum + s.count, 0) || 0) > 0
                              ? (channelSummaryData?.totalGross || 0) /
                                  (channelSummaryData?.summary?.reduce((sum, s) => sum + s.count, 0) || 1)
                              : 0
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Gráfico diario de ventas por canal */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <CalendarBlank size={16} className="text-gray-500" />
                    <span>Ventas por Día y Canal</span>
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {channelSummaryData?.byDay?.length || 0} días con movimiento
                  </span>
                </div>

                {channelSummaryData?.byDay && channelSummaryData.byDay.length > 0 ? (
                  <div className="space-y-2">
                    {channelSummaryData.byDay.map((d, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-semibold text-gray-900 w-24">
                            {d.date}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                            {channelIcon(d.channel)}
                            <span>{channelLabel(d.channel)}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-gray-500">{d.count} comprobante(s)</span>
                          <span className="font-bold text-gray-900">
                            {formatCurrency(d.gross)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-6">
                    No se registran ventas por canal en el período seleccionado.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. A DOMICILIO                                            */}
      {/* ========================================================= */}
      {activeSubTab === 'domicilio' && isDeliveryEnabled && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Ventas a Domicilio</h2>
              <p className="text-xs text-gray-500">
                Pedidos despachados con entrega, desglose de envíos cobrados y rendimiento por repartidor.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Filtro por Repartidor */}
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:border-gray-900"
              >
                <option value="">Todos los repartidores</option>
                {driversList?.map((drv) => (
                  <option key={drv.id} value={drv.id}>
                    {drv.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={isExportingCsv || isLoadingDomicilio}
                onClick={handleExportDomicilioCsv}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                <DownloadSimple size={15} weight="bold" />
                <span>{isExportingCsv ? 'Descargando...' : 'Descargar CSV'}</span>
              </button>
            </div>
          </div>

          {isLoadingDomicilio ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100" />
              ))}
            </div>
          ) : (
            <>
              {/* KPIs Domicilio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Pedidos a Domicilio
                  </span>
                  <p className="text-2xl font-bold text-gray-900 font-mono mt-1">
                    {domicilioData?.totalOrders || 0}
                  </p>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Entregas completadas
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Ventas Totales
                  </span>
                  <p className="text-2xl font-bold text-gray-900 font-mono mt-1">
                    {formatCurrency(domicilioData?.totalSales || 0)}
                  </p>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Monto facturado en entregas
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Envíos Cobrados
                  </span>
                  <p className="text-2xl font-bold text-blue-600 font-mono mt-1">
                    {formatCurrency(domicilioData?.totalDeliveryFees || 0)}
                  </p>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Total tarifa de entrega recibida
                  </span>
                </div>
              </div>

              {/* Repartidores */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-gray-500" />
                    <span>Rendimiento por Repartidor</span>
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {domicilioData?.byDriver?.length || 0} repartidores con entregas
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Repartidor</th>
                        <th className="py-3 px-4 text-right">Pedidos</th>
                        <th className="py-3 px-4 text-right">Venta Total</th>
                        <th className="py-3 px-4 text-right">Envíos Cobrados</th>
                        <th className="py-3 px-4 text-right">Ticket Promedio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {domicilioData?.byDriver?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-400">
                            No hay entregas asignadas a repartidores en este período.
                          </td>
                        </tr>
                      ) : (
                        domicilioData?.byDriver?.map((row) => (
                          <tr key={row.driverId} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-medium text-gray-900 flex items-center gap-2">
                              <Motorcycle size={15} className="text-gray-400 shrink-0" />
                              <span>{row.driverName || 'Sin asignar'}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-gray-700">
                              {row.ordersCount}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-semibold text-gray-900">
                              {formatCurrency(row.totalSales)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-blue-600 font-semibold">
                              {formatCurrency(row.totalFees)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-gray-700">
                              {formatCurrency(row.averageTicket)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Zonas y Direcciones */}
              {domicilioData?.byAddress && domicilioData.byAddress.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <MapPin size={16} className="text-gray-500" />
                      <span>Destinos Frecuentes</span>
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Dirección</th>
                          <th className="py-3 px-4 text-right">Pedidos</th>
                          <th className="py-3 px-4 text-right">Venta Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {domicilioData.byAddress.map((addr, i) => (
                          <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-4 text-gray-800 font-medium">
                              {addr.address || 'Sin dirección especificada'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-gray-700">
                              {addr.ordersCount}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900">
                              {formatCurrency(addr.totalSales)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Listado de Pedidos */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Receipt size={16} className="text-gray-500" />
                    <span>Historial de Comprobantes a Domicilio</span>
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {domicilioData?.orders?.length || 0} comprobantes
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Fecha y Hora</th>
                        <th className="py-3 px-4">N.º Comprobante</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Repartidor</th>
                        <th className="py-3 px-4">Dirección</th>
                        <th className="py-3 px-4 text-right">Envío Cobrado</th>
                        <th className="py-3 px-4 text-right">Total Pedido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {domicilioData?.orders?.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-gray-400">
                            No hay comprobantes a domicilio en este período.
                          </td>
                        </tr>
                      ) : (
                        domicilioData?.orders?.map((ord) => (
                          <tr key={ord.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                              {formatManaguaDate(ord.createdAt)} {formatManaguaTime(ord.createdAt)}
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-gray-900">
                              {ord.invoiceNumber}
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {ord.customerName || 'Cliente general'}
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {ord.driverName || 'Sin asignar'}
                            </td>
                            <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                              {ord.deliveryAddress || '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-blue-600 font-medium">
                              {formatCurrency(ord.deliveryFee)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                              {formatCurrency(ord.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. PEDIDOSYA                                              */}
      {/* ========================================================= */}
      {activeSubTab === 'pedidosya' && isPedidosYaEnabled && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Ventas por PedidosYa</h2>
              <p className="text-xs text-gray-500">
                Ventas brutas, deducciones de comisión e impuestos, y neto estimado a recibir.
              </p>
            </div>
            <button
              type="button"
              disabled={isExportingCsv || isLoadingPedidosYa}
              onClick={handleExportPedidosYaCsv}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <DownloadSimple size={15} weight="bold" />
              <span>{isExportingCsv ? 'Descargando...' : 'Descargar CSV'}</span>
            </button>
          </div>

          {isLoadingPedidosYa ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100" />
              ))}
            </div>
          ) : (
            <>
              {/* KPIs PedidosYa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Pedidos
                  </span>
                  <p className="text-2xl font-bold text-gray-900 font-mono mt-1">
                    {pedidosYaData?.summary?.totalOrders || 0}
                  </p>
                  <span className="text-[11px] text-gray-400 mt-1 block">Órdenes recibidas</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Venta Bruta
                  </span>
                  <p className="text-2xl font-bold text-gray-900 font-mono mt-1">
                    {formatCurrency(pedidosYaData?.summary?.grossTotal || 0)}
                  </p>
                  <span className="text-[11px] text-gray-400 mt-1 block">Precio al cliente</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Comisión App
                  </span>
                  <p className="text-2xl font-bold text-amber-600 font-mono mt-1">
                    {formatCurrency(pedidosYaData?.summary?.totalCommission || 0)}
                  </p>
                  <span className="text-[11px] text-gray-400 mt-1 block">Tarifa comercial</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Impuesto
                  </span>
                  <p className="text-2xl font-bold text-gray-700 font-mono mt-1">
                    {formatCurrency(pedidosYaData?.summary?.totalTax || 0)}
                  </p>
                  <span className="text-[11px] text-gray-400 mt-1 block">Retención impositiva</span>
                </div>

                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                    Neto a Recibir
                  </span>
                  <p className="text-2xl font-bold text-emerald-700 font-mono mt-1">
                    {formatCurrency(pedidosYaData?.summary?.netPayout || 0)}
                  </p>
                  <span className="text-[11px] text-emerald-600 mt-1 block">
                    Depósito neto final
                  </span>
                </div>
              </div>

              {/* Comparativas: Forma de Cobro y Estado Liquidación */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Por Forma de Cobro */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard size={16} className="text-gray-500" />
                    <span>Por Forma de Cobro</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-[11px] font-semibold text-gray-500 block">
                        Pago por la App
                      </span>
                      <p className="text-lg font-bold text-gray-900 font-mono mt-0.5">
                        {formatCurrency(pedidosYaData?.byPaymentMode?.APP?.total || 0)}
                      </p>
                      <span className="text-[11px] text-gray-500 block mt-1">
                        {pedidosYaData?.byPaymentMode?.APP?.count || 0} pedidos
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                        Neto: {formatCurrency(pedidosYaData?.byPaymentMode?.APP?.netPayout || 0)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-[11px] font-semibold text-gray-500 block">
                        Efectivo al Repartidor
                      </span>
                      <p className="text-lg font-bold text-gray-900 font-mono mt-0.5">
                        {formatCurrency(pedidosYaData?.byPaymentMode?.EFECTIVO?.total || 0)}
                      </p>
                      <span className="text-[11px] text-gray-500 block mt-1">
                        {pedidosYaData?.byPaymentMode?.EFECTIVO?.count || 0} pedidos
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                        Neto: {formatCurrency(pedidosYaData?.byPaymentMode?.EFECTIVO?.netPayout || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Por Estado de Liquidación */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Bank size={16} className="text-gray-500" />
                    <span>Estado de Liquidación</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                      <span className="text-[11px] font-semibold text-amber-800 block">
                        Pendiente
                      </span>
                      <p className="text-lg font-bold text-amber-900 font-mono mt-0.5">
                        {formatCurrency(pedidosYaData?.bySettlementStatus?.PENDIENTE?.total || 0)}
                      </p>
                      <span className="text-[11px] text-amber-700 block mt-1">
                        {pedidosYaData?.bySettlementStatus?.PENDIENTE?.count || 0} pedidos por cobrar
                      </span>
                      <span className="text-[11px] text-emerald-800 font-semibold block mt-0.5">
                        Neto: {formatCurrency(pedidosYaData?.bySettlementStatus?.PENDIENTE?.netPayout || 0)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                      <span className="text-[11px] font-semibold text-emerald-800 block">
                        Liquidado
                      </span>
                      <p className="text-lg font-bold text-emerald-900 font-mono mt-0.5">
                        {formatCurrency(pedidosYaData?.bySettlementStatus?.LIQUIDADO?.total || 0)}
                      </p>
                      <span className="text-[11px] text-emerald-700 block mt-1">
                        {pedidosYaData?.bySettlementStatus?.LIQUIDADO?.count || 0} pedidos liquidados
                      </span>
                      <span className="text-[11px] text-emerald-800 font-semibold block mt-0.5">
                        Neto: {formatCurrency(pedidosYaData?.bySettlementStatus?.LIQUIDADO?.netPayout || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Productos Más Vendidos */}
              {pedidosYaData?.topProducts && pedidosYaData.topProducts.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <Tag size={16} className="text-gray-500" />
                      <span>Productos Más Vendidos en PedidosYa</span>
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Producto</th>
                          <th className="py-3 px-4 text-right">Unidades Vendidas</th>
                          <th className="py-3 px-4 text-right">Venta Bruta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pedidosYaData.topProducts.map((p, i) => (
                          <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-4 text-gray-800 font-medium">{p.productName}</td>
                            <td className="py-3 px-4 text-right font-mono text-gray-700">
                              {formatQuantity(p.units)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900">
                              {formatCurrency(p.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Listado de Pedidos PedidosYa */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Receipt size={16} className="text-gray-500" />
                    <span>Listado de Pedidos de PedidosYa</span>
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {pedidosYaData?.orders?.length || 0} pedidos
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Fecha y Hora</th>
                        <th className="py-3 px-4">N.º Comprobante</th>
                        <th className="py-3 px-4">N.º Pedido App</th>
                        <th className="py-3 px-4">Forma de Cobro</th>
                        <th className="py-3 px-4">Estado Liquidación</th>
                        <th className="py-3 px-4 text-right">Venta Bruta</th>
                        <th className="py-3 px-4 text-right">Comisión</th>
                        <th className="py-3 px-4 text-right">Impuesto</th>
                        <th className="py-3 px-4 text-right">Neto a Recibir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pedidosYaData?.orders?.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-gray-400">
                            No hay pedidos de PedidosYa registrados en este período.
                          </td>
                        </tr>
                      ) : (
                        pedidosYaData?.orders?.map((ord) => (
                          <tr key={ord.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                              {formatManaguaDate(ord.createdAt)} {formatManaguaTime(ord.createdAt)}
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-gray-900">
                              {ord.invoiceNumber}
                            </td>
                            <td className="py-3 px-4 font-mono text-gray-700">
                              {ord.orderNumber ? `#${ord.orderNumber}` : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  ord.paymentMode === 'APP'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {ord.paymentMode === 'APP' ? 'Pago App' : 'Efectivo'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  ord.settlementStatus === 'LIQUIDADO'
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {ord.settlementStatus === 'LIQUIDADO' ? 'Liquidado' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900">
                              {formatCurrency(ord.grossTotal)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-amber-600">
                              {formatCurrency(ord.commissionAmount)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-gray-600">
                              {formatCurrency(ord.taxAmount)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                              {formatCurrency(ord.netPayout)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. LIQUIDACIONES DE PEDIDOSYA                            */}
      {/* ========================================================= */}
      {activeSubTab === 'settlements' && isPedidosYaEnabled && (
        <div className="space-y-6">
          {/* Header y Acción */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Liquidaciones y Conciliación de PedidosYa
              </h2>
              <p className="text-xs text-gray-500">
                Verifica pedidos pendientes de cobro, registra el depósito recibido y concilia la
                diferencia contra el esperado.
              </p>
            </div>
            <button
              type="button"
              disabled={isLoadingPendingSettlement || (pendingSettlementData?.ordersCount || 0) === 0}
              onClick={handleOpenSettlementModal}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Plus size={16} weight="bold" />
              <span>Registrar Liquidación</span>
            </button>
          </div>

          {/* Resumen de Pendientes */}
          {isLoadingPendingSettlement ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100" />
              ))}
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Coins size={16} className="text-amber-600" />
                  <span>Pendiente de Depósito (Pedidos sin Liquidar)</span>
                </h3>
                <span className="text-xs font-semibold text-gray-500">
                  {pendingSettlementData?.ordersCount || 0} pedidos pendientes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-[11px] text-gray-500 block">Venta Bruta</span>
                  <p className="text-base font-bold font-mono text-gray-900 mt-0.5">
                    {formatCurrency(pendingSettlementData?.grossTotal || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-[11px] text-gray-500 block">Comisión Total</span>
                  <p className="text-base font-bold font-mono text-amber-600 mt-0.5">
                    {formatCurrency(pendingSettlementData?.commissionTotal || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-[11px] text-gray-500 block">Impuesto</span>
                  <p className="text-base font-bold font-mono text-gray-700 mt-0.5">
                    {formatCurrency(pendingSettlementData?.taxTotal || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 sm:col-span-2">
                  <span className="text-[11px] text-emerald-800 font-semibold block">
                    Monto Neto Esperado a Recibir
                  </span>
                  <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                    {formatCurrency(pendingSettlementData?.netPayout || 0)}
                  </p>
                  <span className="text-[10px] text-emerald-600 mt-0.5 block">
                    Ventas App ({formatCurrency(pendingSettlementData?.appSales?.net || 0)}) −
                    Comisiones aplicadas
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Historial de Liquidaciones Registradas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Bank size={16} className="text-gray-500" />
                <span>Historial de Liquidaciones Conciliadas</span>
              </h3>
              <span className="text-[11px] text-gray-400">
                {settlementsListData?.length || 0} liquidaciones
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Fecha Depósito</th>
                    <th className="py-3 px-4">Banco</th>
                    <th className="py-3 px-4">Referencia</th>
                    <th className="py-3 px-4 text-right">Monto Depositado</th>
                    <th className="py-3 px-4 text-right">Monto Esperado</th>
                    <th className="py-3 px-4 text-right">Diferencia</th>
                    <th className="py-3 px-4 text-center">Pedidos</th>
                    <th className="py-3 px-4">Registrado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoadingSettlementsList ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-gray-400">
                        Cargando historial de liquidaciones...
                      </td>
                    </tr>
                  ) : settlementsListData?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-gray-400">
                        No hay liquidaciones registradas en el historial.
                      </td>
                    </tr>
                  ) : (
                    settlementsListData?.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-gray-900">
                          {s.depositDate}
                        </td>
                        <td className="py-3 px-4 text-gray-800 font-medium">
                          {s.bank?.name || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-600">
                          {s.reference || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                          {formatCurrency(s.depositAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-600">
                          {formatCurrency(s.expectedAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${
                              s.difference === 0
                                ? 'bg-gray-100 text-gray-700'
                                : s.difference > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {s.difference > 0 ? `+${formatCurrency(s.difference)}` : formatCurrency(s.difference)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-gray-700">
                          {s.ordersCount ?? s.sales?.length ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-[11px]">
                          {s.createdBy?.name || 'Sistema'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MODAL: Registrar Liquidación */}
          {isSettlementModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Bank size={20} weight="duotone" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Registrar Depósito de Liquidación
                      </h3>
                      <p className="text-xs text-gray-500">
                        Concilia el monto transferido por PedidosYa con los pedidos emitidos
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettlementModalOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSubmitSettlement} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Fecha del Depósito *
                      </label>
                      <input
                        type="date"
                        required
                        value={depositDate}
                        onChange={(e) => setDepositDate(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-mono text-gray-900 focus:outline-none focus:border-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Monto Depositado (C$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0.00"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Banco Destino
                      </label>
                      <select
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                      >
                        <option value="">Seleccionar banco...</option>
                        {banksList?.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        N.º de Referencia / Comprobante Bancario
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. DEP-948123"
                        value={depositReference}
                        onChange={(e) => setDepositReference(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Notas u Observaciones (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Comentarios adicionales sobre el depósito..."
                      value={depositNotes}
                      onChange={(e) => setDepositNotes(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                    />
                  </div>

                  {/* Conciliación en vivo */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Monto Esperado ({selectedSaleIds.length} pedidos):</span>
                      <span className="font-mono font-bold text-gray-900">
                        {formatCurrency(expectedAmountInModal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Monto Depositado:</span>
                      <span className="font-mono font-bold text-gray-900">
                        {formatCurrency(parsedDepositAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-700">Diferencia:</span>
                      <span
                        className={`font-mono font-bold ${
                          settlementDifference >= 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {settlementDifference > 0 ? `+${formatCurrency(settlementDifference)}` : formatCurrency(settlementDifference)}
                      </span>
                    </div>
                    {settlementDifference < -0.01 && (
                      <p className="text-[11px] text-amber-700 flex items-center gap-1.5 mt-1 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <WarningCircle size={14} className="shrink-0" weight="fill" />
                        <span>
                          El depósito es inferior al monto esperado. La diferencia quedará registrada
                          en la liquidación.
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Selección de Pedidos */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-700">
                        Pedidos a liquidar ({selectedSaleIds.length} seleccionados)
                      </label>
                      <button
                        type="button"
                        onClick={handleSelectAllSales}
                        className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
                      >
                        {selectedSaleIds.length === (pendingSettlementData?.orders?.length || 0)
                          ? 'Deseleccionar todos'
                          : 'Seleccionar todos'}
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                      {pendingSettlementData?.orders?.map((ord) => {
                        const isChecked = selectedSaleIds.includes(ord.id);
                        return (
                          <div
                            key={ord.id}
                            onClick={() => handleToggleSaleSelection(ord.id)}
                            className="p-2.5 flex items-center justify-between text-xs hover:bg-gray-50 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSaleSelection(ord.id)}
                                className="rounded text-brand-600"
                              />
                              <span className="font-mono font-semibold text-gray-900">
                                {ord.invoiceNumber}
                              </span>
                              {ord.orderNumber && (
                                <span className="font-mono text-gray-500">
                                  (#{ord.orderNumber})
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">
                                {ord.paymentMode === 'APP' ? 'App' : 'Efectivo'}
                              </span>
                            </div>
                            <span className="font-mono font-semibold text-emerald-700">
                              {formatCurrency(ord.netPayout)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsSettlementModalOpen(false)}
                      className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={registerSettlementMutation.isPending || selectedSaleIds.length === 0}
                      className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {registerSettlementMutation.isPending
                        ? 'Registrando...'
                        : 'Confirmar y Liquidar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
