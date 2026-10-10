import React, { useState } from 'react';
import {
  Package,
  MagnifyingGlass,
  WarningCircle,
  ArrowsClockwise,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { useBackofficeInventory, useBackofficeDashboard } from '../../hooks/useBackoffice';
import { ModuleNotEnabledAlert } from '../../components/pos/ModuleNotEnabledAlert';
import { WebAccessDisabledView } from '../../components/pos/WebAccessDisabledView';
import { formatCurrency, formatQuantity } from '../../utils/formatters';

export const PosInventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: dashboardData } = useBackofficeDashboard();
  const currency = dashboardData?.currency || 'NIO';

  const {
    data: inventoryResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useBackofficeInventory({
    search: searchTerm.trim() ? searchTerm.trim() : undefined,
    onlyLowStock: onlyLowStock ? true : undefined,
    page,
    limit: pageSize,
  });

  const products = inventoryResponse?.data || [];
  const pagination = inventoryResponse?.pagination;

  if (
    (error as any)?.response?.data?.code === 'WEB_ACCESS_DISABLED' ||
    (error as any)?.response?.status === 403
  ) {
    return <WebAccessDisabledView />;
  }

  if ((error as any)?.response?.data?.code === 'MODULE_NOT_ENABLED') {
    return <ModuleNotEnabledAlert message="El módulo de Punto de Venta no está habilitado para este negocio." />;
  }

  const renderStatusBadge = (status: 'normal' | 'bajo' | 'agotado', isService: boolean) => {
    if (isService) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
          Servicio
        </span>
      );
    }

    switch (status) {
      case 'agotado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
            Agotado
          </span>
        );
      case 'bajo':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            Bajo mínimo
          </span>
        );
      case 'normal':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Normal
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base shadow-2xs">
            <Package size={22} weight="duotone" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              Consulta de Inventario
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Existencias actuales, unidades de medida y alertas de stock bajo
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors shadow-2xs"
        >
          <ArrowsClockwise size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Barra de Filtros: Buscador + Checkbox Solo Bajo Mínimo */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Input Buscador */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre, código de barras o SKU..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 bg-gray-50/50 focus:bg-white focus:outline-none focus:border-gray-900 shadow-2xs"
            />
          </div>

          {/* Toggle Solo bajo mínimo */}
          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 shadow-2xs shrink-0">
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={(e) => {
                setOnlyLowStock(e.target.checked);
                setPage(1);
              }}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
            />
            <span className="font-medium text-gray-800">Solo bajo mínimo o agotado</span>
          </label>
        </div>
      </div>

      {/* Contenido: Desktop Table + Mobile Cards */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center space-y-3 shadow-2xs">
          <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-xs">Cargando inventario...</p>
        </div>
      ) : isError ? (
        <div className="bg-white rounded-2xl border border-red-200 p-6 text-center text-red-700 shadow-2xs space-y-1">
          <WarningCircle size={24} className="mx-auto text-red-500 mb-1" />
          <p className="font-semibold text-xs">Error al cargar el inventario</p>
          <p className="text-[11px] text-red-500">
            {(error as any)?.response?.data?.message || 'Intente nuevamente más tarde.'}
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-2xs space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mx-auto">
            <Package size={24} />
          </div>
          <h4 className="font-semibold text-sm text-gray-900">No se encontraron productos</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {onlyLowStock
              ? '¡Excelente! No hay productos con existencia por debajo del stock mínimo.'
              : 'No hay productos que coincidan con la búsqueda.'}
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
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Código / SKU</th>
                    <th className="px-4 py-3 text-right">Existencia</th>
                    <th className="px-4 py-3 text-right">Mínimo</th>
                    <th className="px-4 py-3 text-right">Precio Ref.</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{p.name}</p>
                      </td>

                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {p.category?.name || 'Sin categoría'}
                      </td>

                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-[11px]">
                        {p.barcode || p.sku || '—'}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {p.isService ? (
                          <span className="text-gray-400 font-medium">Ilimitado</span>
                        ) : (
                          <span
                            className={`font-bold ${
                              p.status === 'agotado'
                                ? 'text-red-700'
                                : p.status === 'bajo'
                                ? 'text-amber-800'
                                : 'text-gray-900'
                            }`}
                          >
                            {formatQuantity(p.stock, p.unit)}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                        {p.isService ? '—' : formatQuantity(p.minStock, p.unit)}
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(p.price, currency)}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {renderStatusBadge(p.status, p.isService)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista Celular: Tarjetas legibles */}
          <div className="md:hidden space-y-2.5">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-gray-900 truncate">{p.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {p.category?.name || 'Sin categoría'}
                      {p.barcode && ` · ${p.barcode}`}
                    </p>
                  </div>

                  <div>{renderStatusBadge(p.status, p.isService)}</div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block">Existencia</span>
                    {p.isService ? (
                      <span className="font-semibold text-gray-600">Servicio</span>
                    ) : (
                      <span
                        className={`font-bold ${
                          p.status === 'agotado'
                            ? 'text-red-700'
                            : p.status === 'bajo'
                            ? 'text-amber-800'
                            : 'text-gray-900'
                        }`}
                      >
                        {formatQuantity(p.stock, p.unit)}
                      </span>
                    )}
                  </div>

                  {!p.isService && (
                    <div className="text-center">
                      <span className="text-[10px] text-gray-400 uppercase block">Mínimo</span>
                      <span className="text-gray-600 font-medium">
                        {formatQuantity(p.minStock, p.unit)}
                      </span>
                    </div>
                  )}

                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 uppercase block">Precio</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(p.price, currency)}
                    </span>
                  </div>
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
                de <span className="font-semibold text-gray-900">{pagination.total}</span> productos
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {/* Selector de cantidad por página */}
                <div className="flex items-center gap-1.5 text-gray-500">
                  <span className="hidden sm:inline text-[11px]">Por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-8 px-2 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-700 focus:outline-none focus:border-gray-900 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Botones de navegación */}
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
            </div>
          )}
        </>
      )}
    </div>
  );
};
