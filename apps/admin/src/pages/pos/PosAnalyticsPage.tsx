import React, { useState, useMemo } from 'react';
import {
  TrendUp,
  Tag,
  ArrowsClockwise,
  Package,
  Trophy,
  ChartPie,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  useBackofficeTopProducts,
  useBackofficeSalesByCategory,
  useBackofficeDashboard,
} from '../../hooks/useBackoffice';
import { useBackofficeDateFilter } from '../../hooks/useBackofficeDateFilter';
import { PosDateFilterPills } from '../../components/pos/PosDateFilterPills';
import { ModuleNotEnabledAlert } from '../../components/pos/ModuleNotEnabledAlert';
import { formatCurrency } from '../../utils/formatters';

export const PosAnalyticsPage: React.FC = () => {
  const { preset, setPreset, from, to, customFrom, customTo, setCustomRange } =
    useBackofficeDateFilter('month');

  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [productSortBy, setProductSortBy] = useState<'revenue' | 'quantity'>('revenue');

  const { data: dashboardData } = useBackofficeDashboard();
  const currency = dashboardData?.currency || 'NIO';

  const dateParams = useMemo(() => ({ from, to, limit: 20 }), [from, to]);

  const {
    data: topProducts = [],
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
    error: errorProducts,
    refetch: refetchProducts,
  } = useBackofficeTopProducts(dateParams);

  const {
    data: categoryData,
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
    error: errorCategories,
    refetch: refetchCategories,
  } = useBackofficeSalesByCategory(dateParams);

  const sortedProducts = useMemo(() => {
    return [...topProducts].sort((a, b) => {
      if (productSortBy === 'revenue') {
        return b.revenue - a.revenue;
      }
      return b.quantity - a.quantity;
    });
  }, [topProducts, productSortBy]);

  const maxProductVal = useMemo(() => {
    if (sortedProducts.length === 0) return 1;
    return productSortBy === 'revenue' ? sortedProducts[0].revenue : sortedProducts[0].quantity;
  }, [sortedProducts, productSortBy]);

  const handleRefresh = () => {
    refetchProducts();
    refetchCategories();
  };

  const isModuleNotEnabled =
    (errorProducts as any)?.response?.data?.code === 'MODULE_NOT_ENABLED' ||
    (errorCategories as any)?.response?.data?.code === 'MODULE_NOT_ENABLED';

  if (isModuleNotEnabled) {
    return <ModuleNotEnabledAlert message="El módulo de Punto de Venta no está habilitado para este negocio." />;
  }

  return (
    <div className="space-y-4 pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-base shadow-2xs">
            <TrendUp size={22} weight="duotone" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              Más Vendidos y Por Categoría
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Ranking de productos con mayor rotación e ingresos por línea
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors shadow-2xs"
        >
          <ArrowsClockwise
            size={13}
            className={isLoadingProducts || isLoadingCategories ? 'animate-spin' : ''}
          />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Selector de Rango de Fechas & Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <PosDateFilterPills
            preset={preset}
            setPreset={setPreset}
            from={from}
            to={to}
            customFrom={customFrom}
            customTo={customTo}
            setCustomRange={setCustomRange}
          />

          {/* Selector de Pestaña */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'products'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Trophy size={14} />
              <span>Productos Top</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'categories'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ChartPie size={14} />
              <span>Por Categoría</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido: Pestaña 1 - Productos Top */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          {/* Barra de ordenamiento */}
          <div className="px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50/50">
            <span className="text-xs font-semibold text-gray-700">
              Ranking de Productos ({sortedProducts.length})
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">Ordenar por:</span>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-gray-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setProductSortBy('revenue')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    productSortBy === 'revenue'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Ingresos ({currency === 'USD' ? '$' : 'C$'})
                </button>
                <button
                  type="button"
                  onClick={() => setProductSortBy('quantity')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    productSortBy === 'quantity'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cantidad
                </button>
              </div>
            </div>
          </div>

          {isLoadingProducts ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-400">Calculando ranking de productos...</p>
            </div>
          ) : isErrorProducts ? (
            <div className="p-8 text-center text-red-700">
              <WarningCircle size={24} className="mx-auto mb-1 text-red-500" />
              <p className="text-xs font-medium">Error al cargar productos más vendidos</p>
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Package size={32} className="mx-auto text-gray-300" />
              <p className="font-semibold text-xs text-gray-900">No hay ventas registradas</p>
              <p className="text-[11px] text-gray-400">
                No se registraron ventas en el rango de fechas seleccionado.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedProducts.map((p, index) => {
                const currentVal = productSortBy === 'revenue' ? p.revenue : p.quantity;
                const progressPct = maxProductVal > 0 ? Math.round((currentVal / maxProductVal) * 100) : 0;

                return (
                  <div key={p.productId || p.productName} className="p-4 hover:bg-gray-50/50 transition-colors space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Badge de posición */}
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                            index === 0
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : index === 1
                              ? 'bg-gray-200 text-gray-800'
                              : index === 2
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-50 text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-gray-900 truncate">
                            {p.productName}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                            <span>{p.category}</span>
                            {p.barcode && <span>· Cod: {p.barcode}</span>}
                            <span>· {p.timesSold} {p.timesSold === 1 ? 'ticket' : 'tickets'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Montos y Cantidad */}
                      <div className="text-right shrink-0">
                        <span className="font-bold text-xs text-gray-900 block">
                          {formatCurrency(p.revenue, currency)}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {p.quantity.toLocaleString('es-NI')} unid.
                        </span>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${progressPct}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          index === 0
                            ? 'bg-amber-500'
                            : index === 1
                            ? 'bg-purple-600'
                            : index === 2
                            ? 'bg-blue-600'
                            : 'bg-gray-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Contenido: Pestaña 2 - Por Categoría */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <span className="text-xs font-semibold text-gray-700">Ventas por Categoría</span>
              <p className="text-[11px] text-gray-400">Participación en la facturación total</p>
            </div>
            {categoryData && (
              <span className="font-bold text-xs text-gray-900">
                Total: {formatCurrency(categoryData.totalRevenue, currency)}
              </span>
            )}
          </div>

          {isLoadingCategories ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-400">Analizando categorías...</p>
            </div>
          ) : isErrorCategories ? (
            <div className="p-8 text-center text-red-700">
              <WarningCircle size={24} className="mx-auto mb-1 text-red-500" />
              <p className="text-xs font-medium">Error al cargar categorías</p>
            </div>
          ) : !categoryData || categoryData.categories.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Tag size={32} className="mx-auto text-gray-300" />
              <p className="font-semibold text-xs text-gray-900">Sin datos de categorías</p>
              <p className="text-[11px] text-gray-400">No hubo ventas registradas en este período.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categoryData.categories.map((cat) => (
                <div key={cat.categoryId || cat.categoryName} className="p-4 hover:bg-gray-50/50 transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span className="font-semibold text-xs text-gray-900">
                        {cat.categoryName}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        ({cat.quantity.toLocaleString('es-NI')} unid.)
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xs text-gray-900">
                        {formatCurrency(cat.revenue, currency)}
                      </span>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md min-w-[50px] text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Barra porcentual */}
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(1, cat.percentage))}%` }}
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
