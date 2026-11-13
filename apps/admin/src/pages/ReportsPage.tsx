import React, { useState, useMemo } from "react";
import {
  ChartBar,
  TrendUp,
  ShieldCheck,
  Wrench,
  WarningCircle,
  ArrowsClockwise,
  Users,
  Motorcycle,
  Printer,
} from "@phosphor-icons/react";
import { useAuthStore } from "../store/auth.store";
import {
  PeriodType,
  ReportsSummary,
  SalesByTimeReport,
  SalesByCategoryReport,
  SalesByCashierReport,
  ProfitReport,
} from "../types/reports";
import { PeriodSelector } from "../components/reports/PeriodSelector";
import { SalesOperationsTab } from "../components/reports/SalesOperationsTab";
import { ProfitReportTab } from "../components/reports/ProfitReportTab";
import { ControlReportTab } from "../components/reports/ControlReportTab";
import { WorkshopReportTab } from "../components/reports/WorkshopReportTab";
import { SellerReportTab } from "../components/reports/SellerReportTab";
import { ChannelsReportTab } from "../components/reports/ChannelsReportTab";
import { ReportPrintModal } from "../components/reports/ReportPrintModal";
import { ReportDocument } from "../types/report";
import {
  buildSalesOperationsReportDocument,
  buildChannelsReportDocument,
  buildProfitReportDocument,
  ProfitSummaryReport,
  ProfitProductsResponse,
} from "../utils/reportsTabsPrintBuilders";
import {
  useReportsOverview,
  useSalesByTime,
  useSalesByCategory,
  useSalesByCashier,
  useProfitReport,
  useControlReport,
  useWorkshopReport,
  useSalesBySeller,
  useSalesByChannel,
  buildReportQueryString,
} from "../hooks/useBackofficeReports";
import { useQuery } from "@tanstack/react-query";
import { apiClient, getMyBusiness, getChannelConfig } from "api-client";
import { getVisibleChannels } from "../utils/visibleChannels";
import { toast } from "react-hot-toast";

export type ReportTabKey =
  | "sales"
  | "channels"
  | "profit"
  | "control"
  | "workshop"
  | "sellers";

export const ReportsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  // Verificación de rol: Solo Encargado y Superadmin pueden consultar reportes
  const isAllowedRole =
    user?.role === "ENCARGADO" || user?.role === "SUPERADMIN";

  // Perfil del negocio para saber si es Taller
  const { data: business } = useQuery({
    queryKey: ["business", "me"],
    queryFn: getMyBusiness,
    staleTime: 60000,
  });

  // Configuración de canales de venta (221c)
  const { data: channelConfig } = useQuery({
    queryKey: ["pos", "channels-config"],
    queryFn: () => getChannelConfig(),
    enabled: isAllowedRole,
    staleTime: 60000,
  });

  // Estado del período (se preserva al alternar entre pestañas)
  const [period, setPeriod] = useState<PeriodType>("today");
  const [customFrom, setCustomFrom] = useState<string | undefined>();
  const [customTo, setCustomTo] = useState<string | undefined>();
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ReportTabKey>("sales");

  const queryParams = useMemo(
    () => ({
      period,
      from: customFrom,
      to: customTo,
      channel: selectedChannel || undefined,
    }),
    [period, customFrom, customTo, selectedChannel],
  );

  // Hooks para cada pestaña
  const {
    data: reportsData,
    isLoading: isLoadingOverview,
    isError: isErrorOverview,
    error: errorOverview,
    refetch: refetchOverview,
    isFetching: isFetchingOverview,
  } = useReportsOverview(queryParams, isAllowedRole);

  const {
    data: timeData,
    isLoading: isLoadingTime,
    refetch: refetchTime,
  } = useSalesByTime(queryParams, isAllowedRole && activeTab === "sales");

  const {
    data: categoryData,
    isLoading: isLoadingCategory,
    refetch: refetchCategory,
  } = useSalesByCategory(queryParams, isAllowedRole && activeTab === "sales");

  const {
    data: cashierData,
    isLoading: isLoadingCashier,
    refetch: refetchCashier,
  } = useSalesByCashier(queryParams, isAllowedRole && activeTab === "sales");

  const {
    data: profitData,
    isLoading: isLoadingProfit,
    isError: isErrorProfit,
    error: errorProfit,
    refetch: refetchProfit,
    isFetching: isFetchingProfit,
  } = useProfitReport(
    queryParams,
    isAllowedRole && (activeTab === "profit" || !reportsData),
  );

  const {
    data: controlData,
    isLoading: isLoadingControl,
    isError: isErrorControl,
    error: errorControl,
    refetch: refetchControl,
    isFetching: isFetchingControl,
  } = useControlReport(
    queryParams,
    isAllowedRole && (activeTab === "control" || !reportsData),
  );

  const {
    data: workshopData,
    isLoading: isLoadingWorkshop,
    isError: isErrorWorkshop,
    error: errorWorkshop,
    refetch: refetchWorkshop,
    isFetching: isFetchingWorkshop,
  } = useWorkshopReport(queryParams, isAllowedRole);

  // Modo Venta en dos pasos del negocio
  const hasTwoStepSale = Boolean(business?.twoStepSaleEnabled);

  const {
    data: sellerData,
    isLoading: isLoadingSeller,
    isError: isErrorSeller,
    error: errorSeller,
    refetch: refetchSeller,
    isFetching: isFetchingSeller,
  } = useSalesBySeller(
    queryParams,
    Boolean(
      isAllowedRole &&
      hasTwoStepSale &&
      (activeTab === "sellers" || !reportsData),
    ),
  );

  // Consulta de resumen por canal para evaluar la regla de visibilidad
  const { data: channelReportData } = useSalesByChannel(
    queryParams,
    isAllowedRole,
  );

  const salesByChannelMap = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    if (channelReportData?.summary) {
      for (const item of channelReportData.summary) {
        map[item.channel] = { count: item.count, total: item.gross };
      }
    }
    return map;
  }, [channelReportData]);

  // Regla de visibilidad Ticket 232c: activo en config O con ventas en el período
  const channelsVisibility = useMemo(() => {
    return getVisibleChannels(channelConfig, salesByChannelMap);
  }, [channelConfig, salesByChannelMap]);

  // Determinar si el negocio es taller
  const isWorkshop = Boolean(
    workshopData?.isWorkshop || (business as any)?.salonProfile === "TALLER",
  );

  // Si no es taller y estaba en la pestaña de taller, regresar a ventas
  React.useEffect(() => {
    if (!isWorkshop && activeTab === "workshop") {
      setActiveTab("sales");
    }
    if (!hasTwoStepSale && activeTab === "sellers") {
      setActiveTab("sales");
    }
    if (
      !channelsVisibility.hasAnyNonMostradorChannel &&
      activeTab === "channels"
    ) {
      setActiveTab("sales");
    }
  }, [
    isWorkshop,
    hasTwoStepSale,
    channelsVisibility.hasAnyNonMostradorChannel,
    activeTab,
  ]);

  // Si el canal seleccionado ya no es visible en el período actual, resetear a Todos
  React.useEffect(() => {
    if (
      selectedChannel === "DOMICILIO" &&
      !channelsVisibility.isDeliveryVisible
    ) {
      setSelectedChannel("");
    } else if (
      selectedChannel === "PEDIDOSYA" &&
      !channelsVisibility.isPedidosYaVisible
    ) {
      setSelectedChannel("");
    }
  }, [selectedChannel, channelsVisibility]);

  const handlePeriodChange = (p: PeriodType, f?: string, t?: string) => {
    setPeriod(p);
    setCustomFrom(f);
    setCustomTo(t);
  };

  const handleRefresh = () => {
    refetchOverview();
    refetchTime();
    refetchCategory();
    refetchCashier();
    refetchProfit();
    refetchControl();
    refetchWorkshop();
    refetchSeller();
  };

  const isRefreshing =
    isFetchingOverview ||
    isFetchingProfit ||
    isFetchingControl ||
    isFetchingWorkshop ||
    isFetchingSeller;

  // Estados para impresión de reportes (Ticket 257d)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPreparingReport, setIsPreparingReport] = useState(false);
  const [reportDocument, setReportDocument] = useState<ReportDocument | null>(null);

  const handleTriggerPrint = async () => {
    setIsPrintModalOpen(true);
    setIsPreparingReport(true);
    setReportDocument(null);

    const qs = buildReportQueryString(queryParams);

    try {
      if (activeTab === "sales") {
        const [repRes, tRes, catRes, cashRes] = await Promise.all([
          reportsData
            ? Promise.resolve({ data: reportsData })
            : apiClient.get<ReportsSummary>(`/pos/reports?${qs}`),
          timeData
            ? Promise.resolve({ data: timeData })
            : apiClient.get<SalesByTimeReport>(`/pos/reports/sales-by-time?${qs}`),
          categoryData
            ? Promise.resolve({ data: categoryData })
            : apiClient.get<SalesByCategoryReport>(`/pos/reports/sales-by-category?${qs}`),
          cashierData
            ? Promise.resolve({ data: cashierData })
            : apiClient.get<SalesByCashierReport>(`/pos/reports/sales-by-cashier?${qs}`),
        ]);

        const doc = buildSalesOperationsReportDocument({
          reportsData: repRes.data,
          timeData: tRes.data,
          categoryData: catRes.data,
          cashierData: cashRes.data,
          period,
          from: customFrom,
          to: customTo,
          channel: selectedChannel || undefined,
          business,
          branchName: null,
          user,
        });
        setReportDocument(doc);
      } else if (activeTab === "channels") {
        const [chRes, domRes, pyRes, settRes] = await Promise.all([
          channelReportData
            ? Promise.resolve({ data: channelReportData })
            : apiClient.get<any>(`/pos/reports/sales-by-channel?${qs}`),
          apiClient.get<any>(`/pos/reports/domicilio?${qs}`).catch(() => ({ data: null })),
          apiClient.get<any>(`/pos/reports/pedidosya?${qs}`).catch(() => ({ data: null })),
          apiClient
            .get<any>(`/pos/reports/pedidosya/settlements/pending?status=PENDIENTE`)
            .catch(() => ({ data: null })),
        ]);

        const doc = buildChannelsReportDocument({
          channelSummary: chRes.data,
          domicilioData: domRes.data,
          pedidosYaData: pyRes.data,
          settlementData: settRes.data,
          period,
          from: customFrom,
          to: customTo,
          business,
          branchName: null,
          user,
        });
        setReportDocument(doc);
      } else if (activeTab === "profit") {
        const [sumRes, prodRes, profRes] = await Promise.all([
          apiClient
            .get<ProfitSummaryReport>(`/pos/reports/profit/summary?${qs}`)
            .catch(() => ({ data: null })),
          apiClient
            .get<ProfitProductsResponse>(`/pos/reports/profit/products?${qs}&pageSize=5000`)
            .catch(() => ({ data: null })),
          profitData
            ? Promise.resolve({ data: profitData })
            : apiClient
                .get<ProfitReport>(`/pos/reports/profit?${qs}`)
                .catch(() => ({ data: null })),
        ]);

        const doc = buildProfitReportDocument({
          summary: sumRes.data,
          allProductsResponse: prodRes.data,
          profitData: profRes.data,
          period,
          from: customFrom,
          to: customTo,
          business,
          branchName: null,
          user,
        });
        setReportDocument(doc);
      }
    } catch (err: any) {
      console.error("[ReportsPage] Error al generar documento de impresión:", err);
      toast.error("Error al preparar la impresión del reporte.");
      setIsPrintModalOpen(false);
    } finally {
      setIsPreparingReport(false);
    }
  };

  // Validación de permiso de usuario
  if (!isAllowedRole) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 max-w-lg mx-auto text-center space-y-3 mt-12 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
          <ShieldCheck size={26} weight="duotone" />
        </div>
        <h3 className="text-base font-bold text-gray-900">
          Acceso restringido
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          No tienes permisos para consultar los reportes del negocio. Esta
          sección es exclusiva para el Encargado o Administrador.
        </p>
      </div>
    );
  }

  // Captura de errores de API (ej: exceder 366 días)
  const currentError =
    (activeTab === "sales" && isErrorOverview ? errorOverview : null) ||
    (activeTab === "profit" && isErrorProfit ? errorProfit : null) ||
    (activeTab === "control" && isErrorControl ? errorControl : null) ||
    (activeTab === "workshop" && isErrorWorkshop ? errorWorkshop : null) ||
    (activeTab === "sellers" && isErrorSeller ? errorSeller : null);

  const getErrorMessage = (err: any) => {
    if (!err) return "Ocurrió un error al cargar el reporte.";
    return (
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Error de comunicación con el servidor."
    );
  };

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto">
      {/* Header y Controladores Globales: Selector de Período y Refrescar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
            Reportes y Analítica
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeTab === "sales"
              ? "Rendimiento de ventas, cobros, horas pico, categorías y cajeros"
              : activeTab === "channels"
                ? "Resumen por canal, pedidos a domicilio, ventas por PedidosYa y conciliación de liquidaciones"
                : activeTab === "profit"
                  ? "Margen operativo, costo de lo vendido y rentabilidad de ventas"
                  : activeTab === "control"
                    ? "Auditoría de anulaciones, devoluciones, descuentos y arqueos"
                    : activeTab === "workshop"
                      ? "Rendimiento de órdenes de taller, servicios y mecánicos"
                      : "Rendimiento por vendedor, tickets enviados vs. cobrados y productos más vendidos"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro de Canal (solo visible si el negocio tiene canales activos o con ventas en el período y está en Ventas o Vendedores) */}
          {channelsVisibility.hasAnyNonMostradorChannel &&
            (activeTab === "sales" || activeTab === "sellers") && (
              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                <span className="text-xs font-semibold text-gray-600 pl-2 pr-1">
                  Canal:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedChannel("")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedChannel === ""
                      ? "bg-white text-gray-900 shadow-2xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChannel("MOSTRADOR")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedChannel === "MOSTRADOR"
                      ? "bg-white text-gray-900 shadow-2xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Mostrador
                </button>
                {channelsVisibility.isDeliveryVisible && (
                  <button
                    type="button"
                    onClick={() => setSelectedChannel("DOMICILIO")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedChannel === "DOMICILIO"
                        ? "bg-white text-blue-600 shadow-2xs"
                        : "text-gray-500 hover:text-blue-600"
                    }`}
                  >
                    Domicilio
                  </button>
                )}
                {channelsVisibility.isPedidosYaVisible && (
                  <button
                    type="button"
                    onClick={() => setSelectedChannel("PEDIDOSYA")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedChannel === "PEDIDOSYA"
                        ? "bg-white text-red-600 shadow-2xs"
                        : "text-gray-500 hover:text-red-600"
                    }`}
                  >
                    PedidosYa
                  </button>
                )}
              </div>
            )}

          {/* Selector de Período Global */}
          <PeriodSelector
            period={period}
            from={customFrom}
            to={customTo}
            onChange={handlePeriodChange}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />

          {/* Botón Imprimir (solo para pestañas con soporte: sales, channels, profit; Control, Vendedores y Taller NO) */}
          {(activeTab === "sales" || activeTab === "channels" || activeTab === "profit") && (
            <button
              type="button"
              onClick={handleTriggerPrint}
              disabled={isPreparingReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              title="Imprimir reporte con el período y filtros activos"
            >
              <Printer size={15} weight="bold" />
              <span>{isPreparingReport ? "Preparando..." : "Imprimir"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-2">
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 pb-1.5">
          {/* Pestaña 1: Ventas y Operaciones */}
          <button
            type="button"
            onClick={() => setActiveTab("sales")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "sales"
                ? "bg-gray-900 text-white shadow-2xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <ChartBar
              size={16}
              weight={activeTab === "sales" ? "bold" : "regular"}
            />
            <span>Ventas y Operaciones</span>
          </button>

          {/* Pestaña: Canales (solo si hay canales activos o con ventas en el período) */}
          {channelsVisibility.hasAnyNonMostradorChannel && (
            <button
              type="button"
              onClick={() => setActiveTab("channels")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "channels"
                  ? "bg-gray-900 text-white shadow-2xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Motorcycle
                size={16}
                weight={activeTab === "channels" ? "bold" : "regular"}
              />
              <span>Canales</span>
            </button>
          )}

          {/* Pestaña 2: Ganancias */}
          <button
            type="button"
            onClick={() => setActiveTab("profit")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "profit"
                ? "bg-gray-900 text-white shadow-2xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <TrendUp
              size={16}
              weight={activeTab === "profit" ? "bold" : "regular"}
            />
            <span>Ganancias</span>
          </button>

          {/* Pestaña 3: Control */}
          <button
            type="button"
            onClick={() => setActiveTab("control")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "control"
                ? "bg-gray-900 text-white shadow-2xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <ShieldCheck
              size={16}
              weight={activeTab === "control" ? "bold" : "regular"}
            />
            <span>Control</span>
          </button>

          {/* Pestaña 4: Taller (solo aparece si isWorkshop es true) */}
          {isWorkshop && (
            <button
              type="button"
              onClick={() => setActiveTab("workshop")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "workshop"
                  ? "bg-gray-900 text-white shadow-2xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Wrench
                size={16}
                weight={activeTab === "workshop" ? "bold" : "regular"}
              />
              <span>Taller</span>
            </button>
          )}

          {/* Pestaña 5: Vendedores (solo aparece si hasTwoStepSale es true) */}
          {hasTwoStepSale && (
            <button
              type="button"
              onClick={() => setActiveTab("sellers")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "sellers"
                  ? "bg-gray-900 text-white shadow-2xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Users
                size={16}
                weight={activeTab === "sellers" ? "bold" : "regular"}
              />
              <span>Vendedores</span>
            </button>
          )}
        </div>
      </div>

      {/* Manejo de Error Global con botón de reintentar */}
      {currentError ? (
        <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-2xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <WarningCircle size={26} weight="fill" />
          </div>
          <h3 className="text-base font-bold text-gray-900">
            No se pudieron cargar los datos
          </h3>
          <p className="text-xs text-red-600 max-w-md mx-auto">
            {getErrorMessage(currentError)}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowsClockwise size={14} weight="bold" />
              <span>Reintentar</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Pestaña 1: Ventas y Operaciones */}
          {activeTab === "sales" && (
            <SalesOperationsTab
              reportsData={reportsData}
              timeData={timeData}
              categoryData={categoryData}
              cashierData={cashierData}
              period={period}
              queryParams={queryParams}
              isLoading={
                isLoadingOverview ||
                isLoadingTime ||
                isLoadingCategory ||
                isLoadingCashier
              }
              onPrint={handleTriggerPrint}
              isPreparingPrint={isPreparingReport}
            />
          )}

          {/* Pestaña: Canales (221c) */}
          {activeTab === "channels" &&
            channelsVisibility.hasAnyNonMostradorChannel &&
            channelConfig && (
              <ChannelsReportTab
                queryParams={queryParams}
                period={period}
                channelConfig={channelConfig}
                onPrint={handleTriggerPrint}
                isPreparingPrint={isPreparingReport}
              />
            )}

          {/* Pestaña 2: Ganancias */}
          {activeTab === "profit" && (
            <ProfitReportTab
              profitData={profitData}
              period={period}
              isLoading={isLoadingProfit}
              hasActiveChannels={channelsVisibility.hasAnyNonMostradorChannel}
              hasActiveDelivery={channelsVisibility.isDeliveryVisible}
              hasActivePedidosYa={channelsVisibility.isPedidosYaVisible}
              onPrint={handleTriggerPrint}
              isPreparingPrint={isPreparingReport}
            />
          )}

          {/* Pestaña 3: Control */}
          {activeTab === "control" && (
            <ControlReportTab
              controlData={controlData}
              period={period}
              isLoading={isLoadingControl}
            />
          )}

          {/* Pestaña 4: Taller */}
          {activeTab === "workshop" && isWorkshop && (
            <WorkshopReportTab
              workshopData={workshopData}
              period={period}
              isLoading={isLoadingWorkshop}
            />
          )}

          {/* Pestaña 5: Vendedores */}
          {activeTab === "sellers" && hasTwoStepSale && (
            <SellerReportTab
              sellerData={sellerData}
              period={period}
              isLoading={isLoadingSeller}
            />
          )}
        </>
      )}

      {/* Modal de Impresión de Reporte */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        document={reportDocument}
        isPreparing={isPreparingReport}
      />
    </div>
  );
};
export default ReportsPage;
