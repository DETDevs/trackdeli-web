import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CaretDown, Check, MagnifyingGlass, Tag, X } from '@phosphor-icons/react';

export const CATEGORY_SELECTOR_THRESHOLD = 6;
const MAX_RECENT_CATEGORIES = 3;

export interface CategorySelectorItem {
  id: string;
  name: string;
  count?: number;
  parentId?: string | null;
}

export const normalizeCategorySearch = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const readRecentCategoryIds = (storageKey?: string): string[] => {
  if (!storageKey || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_RECENT_CATEGORIES);
  } catch {
    return [];
  }
};

const writeRecentCategoryIds = (storageKey: string | undefined, categoryId: string): string[] => {
  const current = readRecentCategoryIds(storageKey);
  const next = [categoryId, ...current.filter((id) => id !== categoryId)].slice(
    0,
    MAX_RECENT_CATEGORIES,
  );
  if (!storageKey || typeof window === 'undefined') return next;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Si localStorage falla (modo privado o cuota llena), funciona sin recientes persistidos.
  }
  return next;
};

interface CategorySelectorProps {
  categories: CategorySelectorItem[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  totalProductsCount: number;
  allValue?: string;
  compactVariant?: 'chips' | 'select';
  recentStorageKey?: string;
  className?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  totalProductsCount,
  allValue = 'ALL',
  compactVariant = 'chips',
  recentStorageKey,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>(() =>
    readRecentCategoryIds(recentStorageKey),
  );
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(min-width: 768px)').matches;
  });
  const [viewportMetrics, setViewportMetrics] = useState<{ height: number; offsetBottom: number }>({
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    offsetBottom: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);
  const titleId = useId();
  const listboxId = useId();

  useEffect(() => {
    setRecentIds(readRecentCategoryIds(recentStorageKey));
  }, [recentStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  // Ajusta la altura del bottom sheet al visualViewport para que el teclado virtual no tape la lista
  useEffect(() => {
    if (!isOpen || isDesktop || typeof window === 'undefined') return;
    const updateViewport = () => {
      const vv = window.visualViewport;
      if (vv) {
        const offsetBottom = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
        setViewportMetrics({ height: vv.height, offsetBottom });
      } else {
        setViewportMetrics({ height: window.innerHeight, offsetBottom: 0 });
      }
    };
    updateViewport();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', updateViewport);
    vv?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      vv?.removeEventListener('resize', updateViewport);
      vv?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, [isOpen, isDesktop]);

  // Bloquea el scroll del fondo en mobile bottom sheet y devuelve el foco al cerrar
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      setSearchTerm('');
      const frame = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      let previousOverflow = '';
      if (!isDesktop && typeof document !== 'undefined') {
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      return () => {
        cancelAnimationFrame(frame);
        if (!isDesktop && typeof document !== 'undefined') {
          document.body.style.overflow = previousOverflow;
        }
      };
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
  }, [isOpen, isDesktop]);

  // Cerrar popover desktop con clic fuera
  useEffect(() => {
    if (!isOpen || !isDesktop) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen, isDesktop]);

  const categoriesById = useMemo(() => {
    const map = new Map<string, CategorySelectorItem>();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  const sortedCategories = useMemo(() => {
    const copy = [...categories];
    copy.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

    // Si el API devuelve jerarquía (parentId), ordenamos padres con sus subcategorías debajo
    const hasHierarchy = copy.some((c) => Boolean(c.parentId));
    if (!hasHierarchy) return copy;

    const childrenByParent = new Map<string, CategorySelectorItem[]>();
    const roots: CategorySelectorItem[] = [];
    copy.forEach((c) => {
      if (c.parentId && categoriesById.has(c.parentId)) {
        const list = childrenByParent.get(c.parentId) || [];
        list.push(c);
        childrenByParent.set(c.parentId, list);
      } else {
        roots.push(c);
      }
    });

    const flattened: CategorySelectorItem[] = [];
    const visit = (item: CategorySelectorItem) => {
      flattened.push(item);
      const children = childrenByParent.get(item.id);
      if (children) {
        children.forEach(visit);
      }
    };
    roots.forEach(visit);
    return flattened;
  }, [categories, categoriesById]);

  const recentCategories = useMemo(() => {
    return recentIds
      .map((id) => categoriesById.get(id))
      .filter((c): c is CategorySelectorItem => Boolean(c))
      .slice(0, MAX_RECENT_CATEGORIES);
  }, [recentIds, categoriesById]);

  const normalizedQuery = normalizeCategorySearch(searchTerm.trim());

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return sortedCategories;
    return sortedCategories.filter((c) =>
      normalizeCategorySearch(c.name).includes(normalizedQuery),
    );
  }, [sortedCategories, normalizedQuery]);

  const selectedCategory =
    selectedCategoryId !== allValue ? categoriesById.get(selectedCategoryId) : undefined;

  const handleChooseCategory = (categoryId: string) => {
    if (categoryId !== allValue) {
      const nextRecents = writeRecentCategoryIds(recentStorageKey, categoryId);
      setRecentIds(nextRecents);
    }
    onSelectCategory(categoryId);
    setIsOpen(false);
  };

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      return;
    }

    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusables = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);

    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !dialogRef.current.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !dialogRef.current.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  };

  // Para 6 categorías o menos, mantener el selector original de cada pantalla
  if (categories.length <= CATEGORY_SELECTOR_THRESHOLD) {
    if (compactVariant === 'select') {
      return (
        <div className={className}>
          <select
            aria-label="Filtrar por categoría"
            value={selectedCategoryId}
            onChange={(e) => onSelectCategory(e.target.value)}
            className="w-full min-h-[44px] h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-700 bg-gray-50/50 focus:bg-white focus:outline-none focus:border-purple-600 shadow-2xs cursor-pointer"
          >
            <option value={allValue}>Todas las categorías ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2 overflow-x-auto pr-8 pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => onSelectCategory(allValue)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap min-h-[44px] cursor-pointer ${
              selectedCategoryId === allValue
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todos ({totalProductsCount})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCategory(c.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap min-h-[44px] cursor-pointer ${
                selectedCategoryId === c.id
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c.name} ({c.count ?? 0})
            </button>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#FAFAFA] to-transparent"
        />
      </div>
    );
  }

  const triggerDisplayCount = selectedCategory
    ? (selectedCategory.count ?? 0)
    : totalProductsCount;

  const renderCategoryRow = (category: CategorySelectorItem, keyPrefix: string) => {
    const isSelected = selectedCategoryId === category.id;
    const isSubcategory = Boolean(category.parentId && categoriesById.has(category.parentId));
    return (
      <button
        key={`${keyPrefix}-${category.id}`}
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={() => handleChooseCategory(category.id)}
        className={`w-full min-h-[48px] px-3 py-2.5 ${
          isSubcategory ? 'pl-7' : ''
        } rounded-xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
          isSelected
            ? 'bg-gray-900 text-white'
            : 'bg-white text-gray-800 hover:bg-gray-100 active:bg-gray-200/70'
        }`}
      >
        <span className="text-sm font-medium leading-snug break-words min-w-0 flex-1">
          {category.name}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span
            className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full ${
              isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {category.count ?? 0}
          </span>
          {isSelected && <Check size={16} weight="bold" aria-hidden="true" />}
        </span>
      </button>
    );
  };

  const sheetMaxHeightPx = Math.max(240, Math.floor(viewportMetrics.height * 0.9));

  const selectorContent = (
    <>
      {/* Encabezado y buscador fijo arriba */}
      <div className="shrink-0 bg-white border-b border-gray-100">
        {!isDesktop && (
          <div className="flex flex-col items-center pt-2.5 px-4 pb-2">
            <div className="w-10 h-1 rounded-full bg-gray-300 mb-2" aria-hidden="true" />
            <div className="w-full flex items-center justify-between gap-2">
              <h2 id={titleId} className="text-sm font-bold text-gray-900">
                Seleccionar categoría
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar selector de categorías"
                className="min-h-[44px] min-w-[44px] -mr-2 rounded-xl flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
              >
                <X size={20} weight="bold" />
              </button>
            </div>
          </div>
        )}

        <div className={`px-3 ${isDesktop ? 'pt-3' : 'pt-1'} pb-2.5 space-y-2`}>
          {isDesktop && (
            <span id={titleId} className="sr-only">
              Seleccionar categoría
            </span>
          )}
          <div className="relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar categoría..."
              aria-label="Buscar categoría"
              className="w-full min-h-[44px] pl-10 pr-11 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-500 focus:bg-white focus:outline-hidden focus:border-gray-900 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Limpiar búsqueda de categorías"
                className="absolute right-0.5 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900 rounded-xl cursor-pointer"
              >
                <X size={16} weight="bold" />
              </button>
            )}
          </div>

          {/* Arriba fija: "Todas las categorías (N)" */}
          <button
            type="button"
            role="option"
            aria-selected={selectedCategoryId === allValue}
            onClick={() => handleChooseCategory(allValue)}
            className={`w-full min-h-[48px] px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
              selectedCategoryId === allValue
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-900 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span className="text-sm font-semibold">
              Todas las categorías ({totalProductsCount})
            </span>
            {selectedCategoryId === allValue && (
              <Check size={16} weight="bold" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Lista scrollable */}
      <div
        id={listboxId}
        role="listbox"
        aria-labelledby={titleId}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 space-y-3"
      >
        {filteredCategories.length === 0 ? (
          <div className="py-8 px-4 text-center space-y-2.5">
            <Tag size={28} className="mx-auto text-gray-400" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-900">
              No encontramos categorías con ese nombre
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                searchInputRef.current?.focus();
              }}
              className="min-h-[44px] px-4 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-black cursor-pointer inline-flex items-center gap-1.5"
            >
              <X size={14} weight="bold" />
              <span>Limpiar búsqueda</span>
            </button>
          </div>
        ) : normalizedQuery ? (
          <div className="space-y-1">
            <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Resultados ({filteredCategories.length})
            </div>
            {filteredCategories.map((c) => renderCategoryRow(c, 'search'))}
          </div>
        ) : (
          <>
            {recentCategories.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 pb-0.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Recientes
                </div>
                {recentCategories.map((c) => renderCategoryRow(c, 'recent'))}
              </div>
            )}

            <div className="space-y-1">
              <div className="px-2 pb-0.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Todas ({sortedCategories.length})
              </div>
              {sortedCategories.map((c) => renderCategoryRow(c, 'all'))}
            </div>
          </>
        )}
      </div>
    </>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-1.5 w-full">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          className={`flex-1 min-w-0 min-h-[44px] px-3.5 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors shadow-2xs cursor-pointer ${
            selectedCategory
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span className="text-xs sm:text-sm font-semibold truncate">
            Categoría: {selectedCategory ? selectedCategory.name : 'Todas'} ({triggerDisplayCount})
          </span>
          <CaretDown
            size={16}
            weight="bold"
            className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {selectedCategory && (
          <button
            type="button"
            onClick={() => onSelectCategory(allValue)}
            aria-label="Quitar filtro de categoría"
            title="Ver todas las categorías"
            className="min-h-[44px] min-w-[44px] shrink-0 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
          >
            <X size={16} weight="bold" />
          </button>
        )}
      </div>

      {/* Mobile (< 768 px): bottom sheet */}
      {isOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-end justify-center"
          style={{ paddingBottom: `${viewportMetrics.offsetBottom}px` }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={handleDialogKeyDown}
            style={{ maxHeight: `min(90dvh, ${sheetMaxHeightPx}px)` }}
            className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {selectorContent}
          </div>
        </div>
      )}

      {/* Tablet / desktop (≥ 768 px): dropdown popover */}
      {isOpen && isDesktop && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={handleDialogKeyDown}
          className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-[280px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-200 shadow-xl flex flex-col overflow-hidden max-h-[min(460px,70vh)]"
        >
          {selectorContent}
        </div>
      )}
    </div>
  );
};
