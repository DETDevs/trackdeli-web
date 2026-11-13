import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  MagnifyingGlass,
  WarningCircle,
  ArrowsClockwise,
  Plus,
  Tag,
  PencilSimple,
  Trash,
  ArrowsDownUp,
  CaretLeft,
  CaretRight,
  SlidersHorizontal,
  Info,
} from '@phosphor-icons/react';
import {
  PosProductItem,
  PosCategory,
  PosSettingsData,
  PosPoliciesData,
  PosInventoryAdjustmentType,
  getPosProducts,
  getPosCategories,
  getMyBusiness,
  getPosSettings,
  getPosPolicies,
} from 'api-client';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { getExpiryRelativeInfo } from '../../utils/batchStatus';
import { getManaguaTodayYMD } from '../../utils/dateManagua';
import { ProductModal } from '../../components/pos/inventory/ProductModal';
import { ProductBatchesModal } from '../../components/pos/inventory/ProductBatchesModal';
import { CategoriesModal } from '../../components/pos/inventory/CategoriesModal';
import { StockAdjustmentModal } from '../../components/pos/inventory/StockAdjustmentModal';
import { DeleteProductConfirmModal } from '../../components/pos/inventory/DeleteProductConfirmModal';
import {
  CategorySelector,
  normalizeCategorySearch,
  type CategorySelectorItem,
} from '../../components/pos/CategorySelector';

type StockFilterType = 'all' | 'low' | 'out' | 'no_cost';
type SortOrderType = 'name_asc' | 'name_desc' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc';

export const PosInventoryPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const userRole = String(user?.role || '').toUpperCase();
  const canManageCatalog = userRole === 'SUPERADMIN' || userRole === 'ENCARGADO';
  const isReadOnlyRole = !canManageCatalog;

  // Data states
  const [products, setProducts] = useState<PosProductItem[]>([]);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [posSettings, setPosSettings] = useState<PosSettingsData | null>(null);
  const [policies, setPolicies] = useState<PosPoliciesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (persistencia de categoría en la sesión actual)
  const categorySessionKey = `pos_inventory_category_${user?.businessId || 'default'}`;
  const recentCategoriesKey = `pos_recent_categories_${user?.businessId || 'default'}`;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    try {
      return window.sessionStorage.getItem(categorySessionKey) || 'all';
    } catch {
      return 'all';
    }
  });
  const [stockFilter, setStockFilter] = useState<StockFilterType>('all');
  const [sortBy, setSortBy] = useState<SortOrderType>('name_asc');

  useEffect(() => {
    try {
      window.sessionStorage.setItem(categorySessionKey, selectedCategoryId);
    } catch {
      // Ignorar si sessionStorage no está disponible
    }
  }, [categorySessionKey, selectedCategoryId]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<PosProductItem | null>(null);

  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [productToAdjust, setProductToAdjust] = useState<PosProductItem | null>(null);
  const [adjustmentPreset, setAdjustmentPreset] = useState<{
    initialType?: PosInventoryAdjustmentType;
    initialBatchId?: string;
    initialBatchNumber?: string;
    initialQty?: number;
  } | null>(null);

  const [isBatchesModalOpen, setIsBatchesModalOpen] = useState(false);
  const [productForBatches, setProductForBatches] = useState<PosProductItem | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<PosProductItem | null>(null);

  // Currency & batch policy
  const currency = business?.currency || 'NIO';
  const businessTracksBatches = Boolean(
    business?.tracksBatches ?? (user as any)?.business?.tracksBatches,
  );
  const todayManagua = getManaguaTodayYMD();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [prodsData, catsData, bizData, settingsData, policiesData] = await Promise.all([
        getPosProducts({ isActive: true }),
        getPosCategories().catch(() => []),
        getMyBusiness().catch(() => null),
        getPosSettings().catch(() => null),
        getPosPolicies().catch(() => null),
      ]);
      setProducts(Array.isArray(prodsData) ? prodsData : []);
      const validCategories = Array.isArray(catsData) ? catsData : [];
      setCategories(validCategories);
      if (validCategories.length > 0) {
        setSelectedCategoryId((prev) =>
          prev !== 'all' && !validCategories.some((c) => c.id === prev) ? 'all' : prev,
        );
      }
      if (bizData) setBusiness(bizData);
      if (settingsData) setPosSettings(settingsData);
      if (policiesData) setPolicies(policiesData);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudo cargar el catálogo de productos. Inténtalo nuevamente.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectorCategories = useMemo<CategorySelectorItem[]>(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const catId = p.categoryId || p.category?.id;
      if (catId) counts[catId] = (counts[catId] || 0) + 1;
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      count: counts[c.id] ?? c._count?.products ?? 0,
    }));
  }, [categories, products]);

  // Client-side filtering & sorting
  const filteredProducts = useMemo(() => {
    const term = normalizeCategorySearch(searchTerm.trim());

    return products.filter((p) => {
      // Category filter
      if (selectedCategoryId !== 'all') {
        const catId = p.categoryId || p.category?.id;
        if (catId !== selectedCategoryId) return false;
      }

      // Stock status filter
      const isService = Boolean(p.isService || p.type === 'SERVICE');
      const st = p.stock ?? 0;
      const minSt = p.minStock ?? 0;

      if (stockFilter === 'low') {
        if (isService || st > minSt || st <= 0) return false;
      } else if (stockFilter === 'out') {
        if (isService || st > 0) return false;
      } else if (stockFilter === 'no_cost') {
        if (p.cost && p.cost > 0) return false;
      }

      // Search term filter (accent-insensitive)
      if (term) {
        const nameNorm = normalizeCategorySearch(p.name || '');
        const skuNorm = normalizeCategorySearch(p.sku || '');
        const barcodeNorm = normalizeCategorySearch(p.barcode || '');
        const catNorm = normalizeCategorySearch(p.category?.name || '');
        if (
          !nameNorm.includes(term) &&
          !skuNorm.includes(term) &&
          !barcodeNorm.includes(term) &&
          !catNorm.includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [products, searchTerm, selectedCategoryId, stockFilter]);

  // Sorted products
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    list.sort((a, b) => {
      switch (sortBy) {
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'stock_asc':
          return (a.stock ?? 0) - (b.stock ?? 0);
        case 'stock_desc':
          return (b.stock ?? 0) - (a.stock ?? 0);
        case 'price_asc':
          return (a.price ?? 0) - (b.price ?? 0);
        case 'price_desc':
          return (b.price ?? 0) - (a.price ?? 0);
        case 'name_asc':
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });
    return list;
  }, [filteredProducts, sortBy]);

  // Paginated products
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  // Handlers
  const handleOpenCreate = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEdit = (p: PosProductItem) => {
    setProductToEdit(p);
    setIsProductModalOpen(true);
  };

  const handleOpenAdjust = (
    p: PosProductItem,
    preset?: {
      initialType?: PosInventoryAdjustmentType;
      initialBatchId?: string;
      initialBatchNumber?: string;
      initialQty?: number;
    },
  ) => {
    setProductToAdjust(p);
    setAdjustmentPreset(preset || null);
    setIsAdjustStockModalOpen(true);
  };

  const handleOpenBatches = (p: PosProductItem) => {
    setProductForBatches(p);
    setIsBatchesModalOpen(true);
  };

  const renderBatchPill = (p: PosProductItem) => {
    const isTracked = Boolean(
      p.tracksBatches || p.hasBatches || (p.activeBatchCount ?? 0) > 0 || (p.batchesCount ?? 0) > 0,
    );
    if (!isTracked) return null;

    const count = p.activeBatchCount ?? p.batchesCount ?? 0;
    const countText = count > 0 ? `${count} ${count === 1 ? 'lote' : 'lotes'}` : 'Sin lotes';

    if (p.nextExpiryDate) {
      const rel = getExpiryRelativeInfo(p.nextExpiryDate, todayManagua);
      return (
        <button
          type="button"
          onClick={() => handleOpenBatches(p)}
          title="Ver y editar lotes y vencimientos"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border transition-opacity hover:opacity-90 ${rel.badgeClass}`}
        >
          <Tag size={12} weight="bold" />
          <span>
            {countText} · {rel.text}
          </span>
        </button>
      );
    }

    if (count > 0) {
      return (
        <button
          type="button"
          onClick={() => handleOpenBatches(p)}
          title="Ver y completar fechas de vencimiento"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
        >
          <Tag size={12} weight="bold" />
          <span>{countText} · Sin fecha</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleOpenBatches(p)}
        title="Gestionar lotes"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
      >
        <Tag size={12} weight="bold" />
        <span>Lotes · Sin stock</span>
      </button>
    );
  };

  const handleOpenDelete = (p: PosProductItem) => {
    setProductToDelete(p);
    setIsDeleteModalOpen(true);
  };

  const getProductStatus = (p: PosProductItem) => {
    const isService = Boolean(p.isService || p.type === 'SERVICE');
    if (isService) {
      return { label: 'Servicio', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    const st = p.stock ?? 0;
    const minSt = p.minStock ?? 0;

    if (st <= 0) {
      return { label: 'Agotado', color: 'bg-red-50 text-red-700 border-red-200' };
    }
    if (st <= minSt) {
      return { label: 'Bajo mínimo', color: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    return { label: 'Normal', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  };

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-base shadow-2xs">
            <Package size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                Catálogo de productos
              </h1>
              {isReadOnlyRole && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                  Solo lectura
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Administración de productos, precios, categorías y ajustes de existencias
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadData()}
            className="min-h-[44px] px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs flex items-center gap-1.5"
            title="Actualizar listado"
          >
            <ArrowsClockwise size={16} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {canManageCatalog && (
            <>
              <button
                type="button"
                onClick={() => setIsCategoriesModalOpen(true)}
                className="min-h-[44px] px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <Tag size={16} weight="bold" />
                <span>Categorías</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="min-h-[44px] px-4 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <Plus size={16} weight="bold" />
                <span>Nuevo producto</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-2.5 text-xs text-red-800 shadow-2xs">
          <WarningCircle size={20} className="shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => loadData()}
              className="mt-1 font-bold underline hover:text-red-900"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Filtros y Buscador */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        {/* Fila 1: Buscador y Selector de Categoría */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Buscador */}
          <div className="relative lg:col-span-2">
            <MagnifyingGlass
              size={16}
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
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 bg-gray-50/50 focus:bg-white focus:outline-none focus:border-purple-600 shadow-2xs"
            />
          </div>

          {/* Categoría */}
          <CategorySelector
            categories={selectorCategories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(categoryId) => {
              setSelectedCategoryId(categoryId);
              setPage(1);
            }}
            totalProductsCount={products.length}
            allValue="all"
            compactVariant="select"
            recentStorageKey={recentCategoriesKey}
          />

          {/* Orden */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOrderType)}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-700 bg-gray-50/50 focus:bg-white focus:outline-none focus:border-purple-600 shadow-2xs cursor-pointer"
            >
              <option value="name_asc">Nombre: A → Z</option>
              <option value="name_desc">Nombre: Z → A</option>
              <option value="stock_asc">Existencia: menor a mayor</option>
              <option value="stock_desc">Existencia: mayor a menor</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
            </select>
          </div>
        </div>

        {/* Fila 2: Pills de Estado de Stock */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">
            <SlidersHorizontal size={14} />
            <span>Filtro:</span>
          </span>

          <button
            type="button"
            onClick={() => {
              setStockFilter('all');
              setPage(1);
            }}
            className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold transition-colors shadow-2xs ${
              stockFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Todos ({products.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setStockFilter('low');
              setPage(1);
            }}
            className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold transition-colors shadow-2xs ${
              stockFilter === 'low'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Bajo mínimo
          </button>

          <button
            type="button"
            onClick={() => {
              setStockFilter('out');
              setPage(1);
            }}
            className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold transition-colors shadow-2xs ${
              stockFilter === 'out'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            Agotados
          </button>

          <button
            type="button"
            onClick={() => {
              setStockFilter('no_cost');
              setPage(1);
            }}
            className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold transition-colors shadow-2xs ${
              stockFilter === 'no_cost'
                ? 'bg-gray-700 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Sin costo
          </button>
        </div>
      </div>

      {/* Contenido: Tabla Desktop + Tarjetas Móvil */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center space-y-3 shadow-2xs">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-xs">Cargando catálogo de productos...</p>
        </div>
      ) : paginatedProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Package size={26} />
          </div>
          <h2 className="font-bold text-sm text-gray-900">No se encontraron productos</h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchTerm || selectedCategoryId !== 'all' || stockFilter !== 'all'
              ? 'No hay productos que coincidan con los filtros aplicados.'
              : 'Aún no has agregado productos a tu catálogo.'}
          </p>
          {searchTerm || selectedCategoryId !== 'all' || stockFilter !== 'all' ? (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategoryId('all');
                setStockFilter('all');
                setPage(1);
              }}
              className="min-h-[44px] px-4 rounded-xl bg-gray-900 text-white hover:bg-black text-xs font-semibold transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Limpiar filtros</span>
            </button>
          ) : canManageCatalog ? (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="min-h-[44px] px-4 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold transition-colors shadow-2xs inline-flex items-center gap-1.5"
            >
              <Plus size={16} weight="bold" />
              <span>Crear mi primer producto</span>
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Vista Escritorio: Tabla completa */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Producto</th>
                    <th className="px-4 py-3.5">Categoría</th>
                    <th className="px-4 py-3.5">Código / SKU</th>
                    {canManageCatalog && <th className="px-4 py-3.5 text-right">Costo</th>}
                    <th className="px-4 py-3.5 text-right">Precio venta</th>
                    <th className="px-4 py-3.5 text-right">Existencia</th>
                    <th className="px-4 py-3.5 text-center">Estado</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedProducts.map((p) => {
                    const status = getProductStatus(p);
                    const isService = Boolean(p.isService || p.type === 'SERVICE');
                    const wp = p.wholesalePrice ?? (p as any).wholesale_price;
                    const wmq = p.wholesaleMinQty ?? (p as any).wholesale_min_qty;
                    const hasBatches = Boolean(
                      p.hasBatches ||
                        p.tracksBatches ||
                        (p.activeBatchCount ?? 0) > 0 ||
                        (p.batchesCount ?? 0) > 0,
                    );
                    const hasComponents = Boolean(p.components && p.components.length > 0);

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                        {/* Nombre y pills */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-900">{p.name}</span>
                            {wp && wmq && wmq >= 2 && (
                              <span
                                title={`Precio mayorista ${formatCurrency(wp, currency)} a partir de ${wmq} unidades`}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                              >
                                Mayor ≥ {wmq}
                              </span>
                            )}
                            {hasBatches && renderBatchPill(p)}
                            {hasComponents && (
                              <span
                                title="Contiene receta de insumos"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                              >
                                <Info size={12} weight="bold" />
                                <span>Receta</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Categoría */}
                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                          {p.category?.name || 'Sin categoría'}
                        </td>

                        {/* SKU / Barcode */}
                        <td className="px-4 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">
                          {p.sku || p.barcode || '—'}
                        </td>

                        {/* Costo (solo Encargado/Superadmin) */}
                        {canManageCatalog && (
                          <td className="px-4 py-3.5 text-right whitespace-nowrap text-gray-600">
                            {p.cost != null && p.cost > 0
                              ? formatCurrency(p.cost, currency)
                              : '—'}
                          </td>
                        )}

                        {/* Precio */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="font-bold text-gray-900">
                            {formatCurrency(p.price, currency)}
                          </div>
                          {wp && wmq && (
                            <div className="text-xs text-purple-700">
                              Mayor: {formatCurrency(wp, currency)}
                            </div>
                          )}
                        </td>

                        {/* Existencia */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {isService ? (
                            <span className="text-gray-400 font-medium">Ilimitado</span>
                          ) : (
                            <div>
                              <span
                                className={`font-bold ${
                                  (p.stock ?? 0) <= 0
                                    ? 'text-red-700'
                                    : (p.stock ?? 0) <= (p.minStock ?? 0)
                                    ? 'text-amber-800'
                                    : 'text-gray-900'
                                }`}
                              >
                                {formatQuantity(p.stock, p.unit)}
                              </span>
                              {p.minStock != null && p.minStock > 0 && (
                                <div className="text-xs text-gray-400">
                                  Mín: {formatQuantity(p.minStock, p.unit)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {canManageCatalog ? (
                            <div className="flex items-center justify-end gap-1">
                              {!isService && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdjust(p)}
                                  className="min-h-[38px] px-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium transition-colors shadow-2xs flex items-center gap-1"
                                  title="Ajustar existencia"
                                >
                                  <ArrowsDownUp size={15} />
                                  <span>Ajustar</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                title="Editar producto"
                                aria-label="Editar"
                              >
                                <PencilSimple size={18} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDelete(p)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Desactivar producto"
                                aria-label="Desactivar"
                              >
                                <Trash size={18} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(p)}
                              className="min-h-[38px] px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors shadow-2xs inline-flex items-center gap-1"
                              title="Ver detalle del producto"
                            >
                              <MagnifyingGlass size={15} />
                              <span>Ver</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista Celular: Tarjetas legibles a 375 px */}
          <div className="lg:hidden space-y-3">
            {paginatedProducts.map((p) => {
              const status = getProductStatus(p);
              const isService = Boolean(p.isService || p.type === 'SERVICE');
              const wp = p.wholesalePrice ?? (p as any).wholesale_price;
              const wmq = p.wholesaleMinQty ?? (p as any).wholesale_min_qty;
              const hasBatches = Boolean(
                p.hasBatches ||
                  p.tracksBatches ||
                  (p.activeBatchCount ?? 0) > 0 ||
                  (p.batchesCount ?? 0) > 0,
              );
              const hasComponents = Boolean(p.components && p.components.length > 0);

              return (
                <div
                  key={p.id}
                  className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-3"
                >
                  {/* Encabezado de tarjeta */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-bold text-xs sm:text-sm text-gray-900 leading-snug">
                        {p.name}
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.category?.name || 'Sin categoría'}
                        {p.sku && ` · SKU: ${p.sku}`}
                        {p.barcode && ` · ${p.barcode}`}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Pills de Mayoreo / Lotes / Receta */}
                  {(Boolean(wp && wmq && wmq >= 2) || hasBatches || hasComponents) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {wp && wmq && wmq >= 2 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          Mayor: {formatCurrency(wp, currency)} (≥ {wmq})
                        </span>
                      )}
                      {hasBatches && renderBatchPill(p)}
                      {hasComponents && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Info size={12} weight="bold" />
                          <span>Receta</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Datos numéricos: Existencia y Precio */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                    <div>
                      <span className="text-gray-400 block font-medium">Existencia</span>
                      {isService ? (
                        <span className="font-semibold text-gray-600">Servicio</span>
                      ) : (
                        <div>
                          <span
                            className={`font-bold ${
                              (p.stock ?? 0) <= 0
                                ? 'text-red-700'
                                : (p.stock ?? 0) <= (p.minStock ?? 0)
                                ? 'text-amber-800'
                                : 'text-gray-900'
                            }`}
                          >
                            {formatQuantity(p.stock, p.unit)}
                          </span>
                          {p.minStock != null && p.minStock > 0 && (
                            <span className="text-gray-400 text-xs block">
                              Mínimo: {formatQuantity(p.minStock, p.unit)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-gray-400 block font-medium">Precio</span>
                      <span className="font-bold text-gray-900 text-xs sm:text-sm">
                        {formatCurrency(p.price, currency)}
                      </span>
                      {canManageCatalog && p.cost != null && p.cost > 0 && (
                        <span className="text-gray-500 text-xs block">
                          Costo: {formatCurrency(p.cost, currency)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción móvil (mínimo 44px) */}
                  {canManageCatalog ? (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      {!isService && (
                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(p)}
                          className="flex-1 min-h-[44px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <ArrowsDownUp size={16} />
                          <span>Ajustar stock</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="flex-1 min-h-[44px] rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-purple-200"
                      >
                        <PencilSimple size={16} />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDelete(p)}
                        className="w-11 h-11 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors"
                        title="Desactivar producto"
                        aria-label="Desactivar"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MagnifyingGlass size={16} />
                        <span>Ver detalle</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Paginación */}
          {sortedProducts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-4 py-3.5 rounded-2xl border border-gray-200/80 shadow-2xs text-xs">
              <div className="text-gray-500 text-center sm:text-left">
                Mostrando{' '}
                <span className="font-semibold text-gray-900">
                  {Math.min((currentPage - 1) * pageSize + 1, sortedProducts.length)}
                </span>{' '}
                a{' '}
                <span className="font-semibold text-gray-900">
                  {Math.min(currentPage * pageSize, sortedProducts.length)}
                </span>{' '}
                de <span className="font-semibold text-gray-900">{sortedProducts.length}</span> productos
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {/* Selector de cantidad por página */}
                <div className="flex items-center gap-1.5 text-gray-500">
                  <span className="hidden sm:inline">Por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-9 px-2 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-700 focus:outline-none focus:border-purple-600 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Botones de navegación */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="min-h-[44px] px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold shadow-2xs flex items-center gap-1"
                    title="Página anterior"
                  >
                    <CaretLeft size={16} weight="bold" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  <span className="px-2 font-bold text-gray-900 text-xs">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="min-h-[44px] px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold shadow-2xs flex items-center gap-1"
                    title="Página siguiente"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <CaretRight size={16} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modales */}
      {isProductModalOpen && (
        <ProductModal
          isOpen={isProductModalOpen}
          product={productToEdit}
          categories={categories}
          business={business}
          posSettings={posSettings}
          currency={currency}
          onClose={() => setIsProductModalOpen(false)}
          onSaved={() => {
            loadData();
          }}
          onOpenCategoriesModal={() => {
            setIsProductModalOpen(false);
            setIsCategoriesModalOpen(true);
          }}
          onRequestStockAdjustment={(prod, preset) => {
            setIsProductModalOpen(false);
            handleOpenAdjust(prod, preset);
          }}
        />
      )}

      {isBatchesModalOpen && productForBatches && (
        <ProductBatchesModal
          isOpen={isBatchesModalOpen}
          product={productForBatches}
          currency={currency}
          canManageCatalog={canManageCatalog}
          onClose={() => {
            setIsBatchesModalOpen(false);
            setProductForBatches(null);
          }}
          onBatchesUpdated={() => {
            loadData();
          }}
          onWriteOffBatch={(prod, batch) => {
            setIsBatchesModalOpen(false);
            handleOpenAdjust(prod, {
              initialType: 'EXPIRED',
              initialBatchId: batch.id,
              initialBatchNumber: batch.batchNumber,
              initialQty: batch.quantity,
            });
          }}
        />
      )}

      {isCategoriesModalOpen && (
        <CategoriesModal
          isOpen={isCategoriesModalOpen}
          onClose={() => setIsCategoriesModalOpen(false)}
          onCategoriesChanged={() => {
            loadData();
          }}
        />
      )}

      {isAdjustStockModalOpen && productToAdjust && (
        <StockAdjustmentModal
          isOpen={isAdjustStockModalOpen}
          product={productToAdjust}
          businessTracksBatches={businessTracksBatches}
          policies={policies}
          initialType={adjustmentPreset?.initialType}
          initialBatchId={adjustmentPreset?.initialBatchId}
          initialBatchNumber={adjustmentPreset?.initialBatchNumber}
          initialQty={adjustmentPreset?.initialQty}
          onClose={() => {
            setIsAdjustStockModalOpen(false);
            setProductToAdjust(null);
            setAdjustmentPreset(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {isDeleteModalOpen && productToDelete && (
        <DeleteProductConfirmModal
          isOpen={isDeleteModalOpen}
          product={productToDelete}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
