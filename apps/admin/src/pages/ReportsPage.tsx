import React, { useState, useMemo } from 'react';
import {
  ChartBar,
  TrendUp,
  ShieldCheck,
  Wrench,
  WarningCircle,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useAuthStore } from '../store/auth.store';
import { PeriodType } from '../types/reports';
import { PeriodSelector } from '../components/reports/PeriodSelector';
import { SalesOperationsTab } from '../components/reports/SalesOperationsTab';
import { ProfitReportTab } from '../components/reports/ProfitReportTab';
import { ControlReportTab } from '../components/reports/ControlReportTab';
import { WorkshopReportTab } from '../components/reports/WorkshopReportTab';
import {
  useReportsOverview,
  useSalesByTime,
  useSalesByCategory,
  useSalesByCashier,
  useProfitReport,
  useControlReport,
  useWorkshopReport,
} from '../hooks/useBackofficeReports';
import { useQuery } from '@tanstack/react-query';
import { getMyBusiness } from 'api-client';

export type ReportTabKey = 'sales' | 'profit' | 'control' | 'workshop';

export const ReportsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  // Verificación de rol: Solo Encargado y Superadmin pueden consultar reportes
  const isAllowedRole = user?.role === 'ENCARGADO' || user?.role === 'SUPERADMIN';

  // Perfil del negocio para saber si es Taller
  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    staleTime: 60000,
  });

  // Estado del período (se preserva al alternar entre pestañas)
  const [period, setPeriod] = useState<PeriodType>('today');
  const [customFrom, setCustomFrom] = useState<string | undefined>();
  const [customTo, setCustomTo] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<ReportTabKey>('sales');

  const queryParams = useMemo(
    () => ({
      period,
      from: customFrom,
      to: customTo,
    }),
    [period, customFrom, customTo]
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
  } = useSalesByTime(queryParams, isAllowedRole && activeTab === 'sales');

  const {
    data: categoryData,
    isLoading: isLoadingCategory,
    refetch: refetchCategory,
  } = useSalesByCategory(queryParams, isAllowedRole && activeTab === 'sales');

  const {
    data: cashierData,
    isLoading: isLoadingCashier,
    refetch: refetchCashier,
  } = useSalesByCashier(queryParams, isAllowedRole && activeTab === 'sales');

  const {
    data: profitData,
    isLoading: isLoadingProfit,
    isError: isErrorProfit,
    error: errorProfit,
    refetch: refetchProfit,
    isFetching: isFetchingProfit,
  } = useProfitReport(queryParams, isAllowedRole && (activeTab === 'profit' || !reportsData));

  const {
    data: controlData,
    isLoading: isLoadingControl,
    isError: isErrorControl,
    error: errorControl,
    refetch: refetchControl,
    isFetching: isFetchingControl,
  } = useControlReport(queryParams, isAllowedRole && (activeTab === 'control' || !reportsData));

  const {
    data: workshopData,
    isLoading: isLoadingWorkshop,
    isError: isErrorWorkshop,
    error: errorWorkshop,
    refetch: refetchWorkshop,
    isFetching: isFetchingWorkshop,
  } = useWorkshopReport(queryParams, isAllowedRole);

  // Determinar si el negocio es taller
  const isWorkshop = Boolean(
    workshopData?.isWorkshop || (business as any)?.salonProfile === 'TALLER'
  );

  // Si no es taller y estaba en la pestaña de taller, regresar a ventas
  React.useEffect(() => {
    if (!isWorkshop && activeTab === 'workshop') {
      setActiveTab('sales');
    }
  }, [isWorkshop, activeTab]);

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
  };

  const isRefreshing =
    isFetchingOverview || isFetchingProfit || isFetchingControl || isFetchingWorkshop;

  // Validación de permiso de usuario
  if (!isAllowedRole) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 max-w-lg mx-auto text-center space-y-3 mt-12 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
          <ShieldCheck size={26} weight="duotone" />
        </div>
        <h3 className="text-base font-bold text-gray-900">Acceso restringido</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          No tienes permisos para consultar los reportes del negocio. Esta sección es exclusiva
          para el Encargado o Administrador.
        </p>
      </div>
    );
  }

  // Captura de errores de API (ej: exceder 366 días)
  const currentError =
    (activeTab === 'sales' && isErrorOverview ? errorOverview : null) ||
    (activeTab === 'profit' && isErrorProfit ? errorProfit : null) ||
    (activeTab === 'control' && isErrorControl ? errorControl : null) ||
    (activeTab === 'workshop' && isErrorWorkshop ? errorWorkshop : null);

  const getErrorMessage = (err: any) => {
    if (!err) return 'Ocurrió un error al cargar el reporte.';
    return (
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      'Error de comunicación con el servidor.'
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
            {activeTab === 'sales'
              ? 'Rendimiento de ventas, cobros, horas pico, categorías y cajeros'
              : activeTab === 'profit'
              ? 'Margen operativo, costo de lo vendido y rentabilidad de ventas'
              : activeTab === 'control'
              ? 'Auditoría de anulaciones, devoluciones, descuentos y arqueos'
              : 'Rendimiento de órdenes de taller, servicios y mecánicos'}
          </p>
        </div>

        {/* Selector de Período Global */}
        <PeriodSelector
          period={period}
          from={customFrom}
          to={customTo}
          onChange={handlePeriodChange}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </div>

      {/* Pestañas de Navegación (4 pestañas) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs px-2 pt-1.5 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max border-b border-gray-100 pb-1">
          {/* Pestaña 1: Ventas y Operaciones */}
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-gray-900 text-white shadow-2xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ChartBar size={16} weight={activeTab === 'sales' ? 'bold' : 'regular'} />
            <span>Ventas y Operaciones</span>
          </button>

          {/* Pestaña 2: Ganancias */}
          <button
            type="button"
            onClick={() => setActiveTab('profit')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'profit'
                ? 'bg-gray-900 text-white shadow-2xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <TrendUp size={16} weight={activeTab === 'profit' ? 'bold' : 'regular'} />
            <span>Ganancias</span>
          </button>

          {/* Pestaña 3: Control */}
          <button
            type="button"
            onClick={() => setActiveTab('control')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'control'
                ? 'bg-gray-900 text-white shadow-2xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ShieldCheck size={16} weight={activeTab === 'control' ? 'bold' : 'regular'} />
            <span>Control</span>
          </button>

          {/* Pestaña 4: Taller (solo aparece si isWorkshop es true) */}
          {isWorkshop && (
            <button
              type="button"
              onClick={() => setActiveTab('workshop')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'workshop'
                  ? 'bg-gray-900 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Wrench size={16} weight={activeTab === 'workshop' ? 'bold' : 'regular'} />
              <span>Taller</span>
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
          <h3 className="text-base font-bold text-gray-900">No se pudieron cargar los datos</h3>
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
          {activeTab === 'sales' && (
            <SalesOperationsTab
              reportsData={reportsData}
              timeData={timeData}
              categoryData={categoryData}
              cashierData={cashierData}
              period={period}
              isLoading={isLoadingOverview || isLoadingTime || isLoadingCategory || isLoadingCashier}
            />
          )}

          {/* Pestaña 2: Ganancias */}
          {activeTab === 'profit' && (
            <ProfitReportTab
              profitData={profitData}
              period={period}
              isLoading={isLoadingProfit}
            />
          )}

          {/* Pestaña 3: Control */}
          {activeTab === 'control' && (
            <ControlReportTab
              controlData={controlData}
              period={period}
              isLoading={isLoadingControl}
            />
          )}

          {/* Pestaña 4: Taller */}
          {activeTab === 'workshop' && isWorkshop && (
            <WorkshopReportTab
              workshopData={workshopData}
              period={period}
              isLoading={isLoadingWorkshop}
            />
          )}
        </>
      )}
    </div>
  );
};
export default ReportsPage;
